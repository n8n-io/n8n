'use strict';

var connect = require('../lib/connect').connect;
var credentialsFromUrl = require('../lib/connect').credentialsFromUrl;
var defs = require('../lib/defs');
var assert = require('assert');
var util = require('./util');
var net = require('net');
var fail = util.fail, succeed = util.succeed, latch = util.latch,
    kCallback = util.kCallback,
    succeedIfAttributeEquals = util.succeedIfAttributeEquals;
var format = require('util').format;

var URL = process.env.URL || 'amqp://localhost';

var urlparse = require('url-parse');

suite("Credentials", function() {

  function checkCreds(creds, user, pass, done) {
    if (creds.mechanism != 'PLAIN') {
      return done('expected mechanism PLAIN');
    }
    if (creds.username != user || creds.password != pass) {
      return done(format("expected '%s', '%s'; got '%s', '%s'",
                         user, pass, creds.username, creds.password));
    }
    done();
  }

  test("no creds", function(done) {
    var parts = urlparse('amqp://localhost');
    var creds = credentialsFromUrl(parts);
    checkCreds(creds, 'guest', 'guest', done);
  });
  test("usual user:pass", function(done) {
    var parts = urlparse('amqp://user:pass@localhost')
    var creds = credentialsFromUrl(parts);
    checkCreds(creds, 'user', 'pass', done);
  });
  test("missing user", function(done) {
    var parts = urlparse('amqps://:password@localhost');
    var creds = credentialsFromUrl(parts);
    checkCreds(creds, '', 'password', done);
  });
  test("missing password", function(done) {
    var parts = urlparse('amqps://username:@localhost');
    var creds = credentialsFromUrl(parts);
    checkCreds(creds, 'username', '', done);
  });
  test("escaped colons", function(done) {
    var parts = urlparse('amqp://user%3Aname:pass%3Aword@localhost')
    var creds = credentialsFromUrl(parts);
    checkCreds(creds, 'user:name', 'pass:word', done);
  });
});

suite("Connect API", function() {

  test("Connection refused", function(done) {
    connect('amqp://localhost:23450', {},
            kCallback(fail(done), succeed(done)));
  });

  // %% this ought to fail the promise, rather than throwing an error
  test("bad URL", function() {
    assert.throws(function() {
      connect('blurble');
    });
  });

  test("wrongly typed open option", function(done) {
    var url = require('url');
    var parts = url.parse(URL, true);
    var q = parts.query || {};
    q.frameMax = 'NOT A NUMBER';
    parts.query = q;
    var u = url.format(parts);
    connect(u, {}, kCallback(fail(done), succeed(done)));
  });

  test("serverProperties", function(done) {
    var url = require('url');
    var parts = url.parse(URL, true);
    var config = parts.query || {};
    connect(config, {}, function(err, connection) {
      if (err) { return done(err); }
      assert.equal(connection.serverProperties.product, 'RabbitMQ');
      done();
    });
  });

  test("using custom heartbeat option", function(done) {
    var url = require('url');
    var parts = url.parse(URL, true);
    var config = parts.query || {};
    config.heartbeat = 20;
    connect(config, {}, kCallback(succeedIfAttributeEquals('heartbeat', 20, done), fail(done)));
  });

  test("wrongly typed heartbeat option", function(done) {
    var url = require('url');
    var parts = url.parse(URL, true);
    var config = parts.query || {};
    config.heartbeat = 'NOT A NUMBER';
    connect(config, {}, kCallback(fail(done), succeed(done)));
  });

  test("using plain credentials", function(done) {
    var url = require('url');
    var parts = url.parse(URL, true);
    var u = 'guest', p = 'guest';
    if (parts.auth) {
      var auth = parts.auth.split(":");
      u = auth[0], p = auth[1];
    }
    connect(URL, {credentials: require('../lib/credentials').plain(u, p)},
            kCallback(succeed(done), fail(done)));
  });

  test("using amqplain credentials", function(done) {
    var url = require('url');
    var parts = url.parse(URL, true);
    var u = 'guest', p = 'guest';
    if (parts.auth) {
      var auth = parts.auth.split(":");
      u = auth[0], p = auth[1];
    }
    connect(URL, {credentials: require('../lib/credentials').amqplain(u, p)},
            kCallback(succeed(done), fail(done)));
  });

  test("using unsupported mechanism", function(done) {
    var creds = {
      mechanism: 'UNSUPPORTED',
      response: function() { return Buffer.from(''); }
    };
    connect(URL, {credentials: creds},
            kCallback(fail(done), succeed(done)));
  });

  test("with a given connection timeout", function(done) {
    var timeoutServer = net.createServer(function() {}).listen(31991);

    connect('amqp://localhost:31991', {timeout: 50}, function(err, val) {
        timeoutServer.close();
        if (val) done(new Error('Expected connection timeout, did not'));
        else done();
    });
  });
});

suite('Errors on connect', function() {
  var server
  teardown(function() {
    if (server) {
      server.close();
    }
  })

  test("closes underlying connection on authentication error", function(done) {
    var bothDone = latch(2, done);
    server = net.createServer(function(socket) {
      socket.once('data', function(protocolHeader) {
        assert.deepStrictEqual(
          protocolHeader,
          Buffer.from("AMQP" + String.fromCharCode(0,0,9,1))
        );
        util.runServer(socket, function(send, wait) {
          send(defs.ConnectionStart,
            {versionMajor: 0,
              versionMinor: 9,
              serverProperties: {},
              mechanisms: Buffer.from('PLAIN'),
              locales: Buffer.from('en_US')});
          wait(defs.ConnectionStartOk)().then(function() {
            send(defs.ConnectionClose,
              {replyCode: 403,
              replyText: 'ACCESS_REFUSED - Login was refused using authentication mechanism PLAIN',
              classId: 0,
              methodId: 0});
          });
        });
      });

      // Wait for the connection to be closed after the authentication error
      socket.once('end', function() {
        bothDone();
      });
    }).listen(0);

    connect('amqp://localhost:' + server.address().port, {}, function(err) {
      if (!err) bothDone(new Error('Expected authentication error'));
      bothDone();
    });
  });
});
