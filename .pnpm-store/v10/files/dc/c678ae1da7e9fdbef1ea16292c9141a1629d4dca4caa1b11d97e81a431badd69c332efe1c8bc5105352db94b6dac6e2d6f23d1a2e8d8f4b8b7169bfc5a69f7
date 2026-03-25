'use strict';

var assert = require('assert');
var crypto = require('crypto');
var api = require('../callback_api');
var util = require('./util');
var schedule = util.schedule;
var randomString = util.randomString;
var kCallback = util.kCallback;
var domain = require('domain');

var URL = process.env.URL || 'amqp://localhost';

function connect(cb) {
  api.connect(URL, {}, cb);
}

// Construct a node-style callback from a `done` function
function doneCallback(done) {
  return function(err, _) {
    if (err == null) done();
    else done(err);
  };
}

function ignore() {}

function twice(done) {
  var first = function(err) {
    if (err == undefined) second = done;
    else second = ignore, done(err);
  };
  var second = function(err) {
    if (err == undefined) first = done;
    else first = ignore, done(err);
  };
  return {first:  function(err) { first(err); },
          second: function(err) { second(err); }};
}

// Adapt 'done' to a callback that's expected to fail
function failCallback(done) {
  return function(err, _) {
    if (err == null) done(new Error('Expected failure, got ' + val));
    else done();
  };
}

function waitForMessages(ch, q, k) {
  ch.checkQueue(q, function(e, ok) {
    if (e != null) return k(e);
    else if (ok.messageCount > 0) return k(null, ok);
    else schedule(waitForMessages.bind(null, ch, q, k));
  });
}


suite('connect', function() {

  test('at all', function(done) {
    connect(doneCallback(done));
  });

});

suite('updateSecret', function() {
  test('updateSecret', function(done) {
    connect(kCallback(function(c) {
      c.updateSecret(Buffer.from('new secret'), 'no reason', doneCallback(done));
    }));
  });
});

function channel_test_fn(method) {
  return function(name, options, chfun) {
    if (arguments.length === 2) {
      chfun = options;
      options = {};
    }
    test(name, function(done) {
      connect(kCallback(function(c) {
        c[method](options, kCallback(function(ch) {
          chfun(ch, done);
        }, done));
      }, done));
    });
  };
}
var channel_test = channel_test_fn('createChannel');
var confirm_channel_test = channel_test_fn('createConfirmChannel');

suite('channel open', function() {

  channel_test('at all', function(ch, done) {
    done();
  });

  channel_test('open and close', function(ch, done) {
    ch.close(doneCallback(done));
  });

});

suite('assert, check, delete', function() {

  channel_test('assert, check, delete queue', function(ch, done) {
    ch.assertQueue('test.cb.queue', {}, kCallback(function(q) {
      ch.checkQueue('test.cb.queue', kCallback(function(ok) {
        ch.deleteQueue('test.cb.queue', {}, doneCallback(done));
      }, done));
    }, done));
  });

  channel_test('assert, check, delete exchange', function(ch, done) {
    ch.assertExchange(
      'test.cb.exchange', 'topic', {}, kCallback(function(ex) {
        ch.checkExchange('test.cb.exchange', kCallback(function(ok) {
          ch.deleteExchange('test.cb.exchange', {}, doneCallback(done));
        }, done));
      }, done));
  });

  channel_test('fail on check non-queue', function(ch, done) {
    var both = twice(done);
    ch.on('error', failCallback(both.first));
    ch.checkQueue('test.cb.nothere', failCallback(both.second));
  });

  channel_test('fail on check non-exchange', function(ch, done) {
    var both = twice(done);
    ch.on('error', failCallback(both.first));
    ch.checkExchange('test.cb.nothere', failCallback(both.second));
  });

});

suite('bindings', function() {

  channel_test('bind queue', function(ch, done) {
    ch.assertQueue('test.cb.bindq', {}, kCallback(function(q) {
      ch.assertExchange(
        'test.cb.bindex', 'fanout', {}, kCallback(function(ex) {
          ch.bindQueue(q.queue, ex.exchange, '', {},
                       doneCallback(done));
        }, done));
    }, done));
  });

  channel_test('bind exchange', function(ch, done) {
    ch.assertExchange(
      'test.cb.bindex1', 'fanout', {}, kCallback(function(ex1) {
        ch.assertExchange(
          'test.cb.bindex2', 'fanout', {}, kCallback(function(ex2) {
            ch.bindExchange(ex1.exchange,
                            ex2.exchange, '', {},
                            doneCallback(done));
          }, done));
      }, done));
  });

});

suite('sending messages', function() {

  channel_test('send to queue and consume noAck', function(ch, done) {
    var msg = randomString();
    ch.assertQueue('', {exclusive: true}, function(e, q) {
      if (e !== null) return done(e);
      ch.consume(q.queue, function(m) {
        if (m.content.toString() == msg) done();
        else done(new Error("message content doesn't match:" +
                            msg + " =/= " + m.content.toString()));
      }, {noAck: true, exclusive: true});
      ch.sendToQueue(q.queue, Buffer.from(msg));
    });
  });

  channel_test('send to queue and consume ack', function(ch, done) {
    var msg = randomString();
    ch.assertQueue('', {exclusive: true}, function(e, q) {
      if (e !== null) return done(e);
      ch.consume(q.queue, function(m) {
        if (m.content.toString() == msg) {
          ch.ack(m);
          done();
        }
        else done(new Error("message content doesn't match:" +
                            msg + " =/= " + m.content.toString()));
      }, {noAck: false, exclusive: true});
      ch.sendToQueue(q.queue, Buffer.from(msg));
    });
  });

  channel_test('send to and get from queue', function(ch, done) {
    ch.assertQueue('', {exclusive: true}, function(e, q) {
      if (e != null) return done(e);
      var msg = randomString();
      ch.sendToQueue(q.queue, Buffer.from(msg));
      waitForMessages(ch, q.queue, function(e, _) {
        if (e != null) return done(e);
        ch.get(q.queue, {noAck: true}, function(e, m) {
          if (e != null)
            return done(e);
          else if (!m)
            return done(new Error('Empty (false) not expected'));
          else if (m.content.toString() == msg)
            return done();
          else
            return done(
              new Error('Messages do not match: ' +
                        msg + ' =/= ' + m.content.toString()));
        });
      });
    });
  });

  var channelOptions = {};

  channel_test('find high watermark', function(ch, done) {
    var msg = randomString();
    var baseline = 0;
    ch.assertQueue('', {exclusive: true}, function(e, q) {
      if (e !== null) return done(e);
      while (ch.sendToQueue(q.queue, Buffer.from(msg))) {
        baseline++;
      };
      channelOptions.highWaterMark = baseline * 2;
      done();
    })
  });

  channel_test('set high watermark', channelOptions, function(ch, done) {
    var msg = randomString();
    ch.assertQueue('', {exclusive: true}, function(e, q) {
      if (e !== null) return done(e);
      var ok;
      for (var i = 0; i < channelOptions.highWaterMark; i++) {
        ok = ch.sendToQueue(q.queue, Buffer.from(msg));
        assert.equal(ok, true);
      }
      done();
    });
  });
});

suite('ConfirmChannel', function() {

  confirm_channel_test('Receive confirmation', function(ch, done) {
    // An unroutable message, on the basis that you're not allowed a
    // queue with an empty name, and you can't make bindings to the
    // default exchange. Tricky eh?
    ch.publish('', '', Buffer.from('foo'), {}, done);
  });

  confirm_channel_test('Wait for confirms', function(ch, done) {
    for (var i=0; i < 1000; i++) {
      ch.publish('', '', Buffer.from('foo'), {});
    }
    ch.waitForConfirms(done);
  });

  var channelOptions = {};

  confirm_channel_test('find high watermark', function(ch, done) {
    var msg = randomString();
    var baseline = 0;
    ch.assertQueue('', {exclusive: true}, function(e, q) {
      if (e !== null) return done(e);
      while (ch.sendToQueue(q.queue, Buffer.from(msg))) {
        baseline++;
      };
      channelOptions.highWaterMark = baseline * 2;
      done();
    })
  });

  confirm_channel_test('set high watermark', channelOptions, function(ch, done) {
    var msg = randomString();
    ch.assertQueue('', {exclusive: true}, function(e, q) {
      if (e !== null) return done(e);
      var ok;
      for (var i = 0; i < channelOptions.highWaterMark; i++) {
        ok = ch.sendToQueue(q.queue, Buffer.from(msg));
        assert.equal(ok, true);
      }
      done();
    });
  });

});

suite("Error handling", function() {

  /*
  I don't like having to do this, but there appears to be something
  broken about domains in Node.JS v0.8 and mocha. Apparently it has to
  do with how mocha and domains hook into error propogation:
  https://github.com/visionmedia/mocha/issues/513 (summary: domains in
  Node.JS v0.8 don't prevent uncaughtException from firing, and that's
  what mocha uses to detect .. an uncaught exception).

  Using domains with amqplib *does* work in practice in Node.JS v0.8:
  that is, it's possible to throw an exception in a callback and deal
  with it in the active domain, and thereby avoid it crashing the
  program.
   */
  if (util.versionGreaterThan(process.versions.node, '0.8')) {
    test('Throw error in connection open callback', function(done) {
      var dom = domain.createDomain();
      dom.on('error', failCallback(done));
      connect(dom.bind(function(err, conn) {
        throw new Error('Spurious connection open callback error');
      }));
    });
  }

  // TODO: refactor {error_test, channel_test}
  function error_test(name, fun) {
    test(name, function(done) {
      var dom = domain.createDomain();
      dom.run(function() {
        connect(kCallback(function(c) {
          // Seems like there were some unironed wrinkles in 0.8's
          // implementation of domains; explicitly adding the connection
          // to the domain makes sure any exception thrown in the course
          // of processing frames is handled by the domain. For other
          // versions of Node.JS, this ends up being belt-and-braces.
          dom.add(c);
          c.createChannel(kCallback(function(ch) {
            fun(ch, done, dom);
          }, done));
        }, done));
      });
    });
  }

  error_test('Channel open callback throws an error', function(ch, done, dom) {
    dom.on('error', failCallback(done));
    throw new Error('Error in open callback');
  });

  error_test('RPC callback throws error', function(ch, done, dom) {
    dom.on('error', failCallback(done));
    ch.prefetch(0, false, function(err, ok) {
      throw new Error('Spurious callback error');
    });
  });

  error_test('Get callback throws error', function(ch, done, dom) {
    dom.on('error', failCallback(done));
    ch.assertQueue('test.cb.get-with-error', {}, function(err, ok) {
      ch.get('test.cb.get-with-error', {noAck: true}, function() {
        throw new Error('Spurious callback error');
      });
    });
  });

  error_test('Consume callback throws error', function(ch, done, dom) {
    dom.on('error', failCallback(done));
    ch.assertQueue('test.cb.consume-with-error', {}, function(err, ok) {
      ch.consume('test.cb.consume-with-error', ignore, {noAck: true}, function() {
        throw new Error('Spurious callback error');
      });
    });
  });

  error_test('Get from non-queue invokes error k', function(ch, done, dom) {
    var both = twice(failCallback(done));
    dom.on('error', both.first);
    ch.get('', {}, both.second);
  });

  error_test('Consume from non-queue invokes error k', function(ch, done, dom) {
    var both = twice(failCallback(done));
    dom.on('error', both.first);
    ch.consume('', both.second);
  });

});
