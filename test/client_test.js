'use strict';

var assert = require('chai').assert;
var errors = require('../src/errors');
var query = require('../src/query');
var util = require('./util');

var client;

describe('Client', function () {
  before(function () {
    // Hideous way to ensure that the client is initialized.
    client = util.client();

    return client.query(query.CreateClass({ name: 'my_class' }));
  });

  it('invalid key', function () {
    var badClient = util.getClient({ secret: { user: 'bad_key' } });
    return util.assertRejected(badClient.query(util.dbRef), errors.Unauthorized);
  });

  it('ping', function () {
    return client.ping('node').then(function(res) {
      assert.equal(res, 'Scope node is OK');
    });
  });

  it('paginates', function() {
    return createInstance().then(function(instance) {
      return client.paginate(instance.ref).each(function(page) {
        page.forEach(function(i) {
          assert.deepEqual(instance.ref, i);
        });
      });
    });
  });

  it('updates the last txntime for a query', function() {
    var firstSeen = client.getLastTxnTime();

    var pEcho = client.query(42).then(function (res) {
      assert.isAtLeast(client.getLastTxnTime(), firstSeen);
    });

    var pCreate = client.query(query.CreateClass({ name: 'foo_class' })).then(function (res) {
      assert.isAbove(client.getLastTxnTime(), firstSeen);
    });

    return Promise.all([pEcho, pCreate]);
  })

  it('manually updates the last txntime for a bigger time', function() {
    var firstSeen = client.getLastTxnTime();
    
    client.syncLastTxnTime(firstSeen - 1200);
    assert.equal(firstSeen, client.getLastTxnTime());

    var lastSeen = firstSeen + 1200;
    client.syncLastTxnTime(lastSeen);
    assert.equal(lastSeen, client.getLastTxnTime());
  })

});

function createInstance() {
  return client.query(query.Create(query.Class('my_class'), {}));
}
