// Test the channel machinery

'use strict';

var assert = require('assert');
var promisify = require('util').promisify;
var Channel = require('../lib/channel').Channel;
var Connection = require('../lib/connection').Connection;
var util = require('./util');
var succeed = util.succeed, fail = util.fail, latch = util.latch;
var completes = util.completes;
var defs = require('../lib/defs');
var conn_handshake = require('./connection').connection_handshake;
var OPEN_OPTS = require('./connection').OPEN_OPTS;

var LOG_ERRORS = process.env.LOG_ERRORS;

function baseChannelTest(client, server) {
  return function(done) {
    var bothDone = latch(2, done);
    var pair = util.socketPair();
    var c = new Connection(pair.client);

    if (LOG_ERRORS) c.on('error', console.warn);

    c.open(OPEN_OPTS, function(err, ok) {
      if (err === null) client(c, bothDone);
      else fail(bothDone);
    });

    pair.server.read(8); // discard the protocol header
    var s = util.runServer(pair.server, function(send, wait) {
      conn_handshake(send, wait)
        .then(function() {
          server(send, wait, bothDone);
        }, fail(bothDone));
    });
  };
}

function channelTest(client, server) {
  return baseChannelTest(
    function(conn, done) {
      var ch = new Channel(conn);
      if (LOG_ERRORS) ch.on('error', console.warn);
      client(ch, done, conn);
    },
    function(send, wait, done) {
      channel_handshake(send, wait)
      .then(function(ch) {
        return server(send, wait, done, ch);
      }).then(null, fail(done)); // so you can return a promise to let
                                 // errors bubble out
    }
  );
};

function channel_handshake(send, wait) {
  return wait(defs.ChannelOpen)()
    .then(function(open) {
      assert.notEqual(0, open.channel);
      send(defs.ChannelOpenOk, {channelId: Buffer.from('')}, open.channel);
      return open.channel;
    });
}

// fields for deliver and publish and get-ok
var DELIVER_FIELDS = {
  consumerTag: 'fake',
  deliveryTag: 1,
  redelivered: false,
  exchange: 'foo',
  routingKey: 'bar',
  replyCode: defs.constants.NO_ROUTE,
  replyText: 'derp',
};

function open(ch) {
  ch.allocate();
  return promisify(function(cb) {
    ch._rpc(defs.ChannelOpen, {outOfBand: ''}, defs.ChannelOpenOk, cb);
  })();
}

suite("channel open and close", function() {

test("open", channelTest(
  function(ch, done) {
    open(ch).then(succeed(done), fail(done));
  },
  function(send, wait, done) {
    done();
  }));

test("bad server", baseChannelTest(
  function(c, done) {
    var ch = new Channel(c);
    open(ch).then(fail(done), succeed(done));
  },
  function(send, wait, done) {
    return wait(defs.ChannelOpen)()
      .then(function(open) {
        send(defs.ChannelCloseOk, {}, open.channel);
      }).then(succeed(done), fail(done));
  }));

test("open, close", channelTest(
  function(ch, done) {
    open(ch)
      .then(function() {
        return new Promise(function(resolve) {
          ch.closeBecause("Bye", defs.constants.REPLY_SUCCESS, resolve);
        });
      })
      .then(succeed(done), fail(done));
  },
  function(send, wait, done, ch) {
    return wait(defs.ChannelClose)()
      .then(function(close) {
        send(defs.ChannelCloseOk, {}, ch);
      }).then(succeed(done), fail(done));
  }));

test("server close", channelTest(
  function(ch, done) {
    ch.on('error', function(error) {
      assert.strictEqual(504, error.code);
      assert.strictEqual(0, error.classId);
      assert.strictEqual(0, error.methodId);
      succeed(done)();
    });
    open(ch);
  },
  function(send, wait, done, ch) {
    send(defs.ChannelClose, {
      replyText: 'Forced close',
      replyCode: defs.constants.CHANNEL_ERROR,
      classId: 0, methodId: 0
    }, ch);
    wait(defs.ChannelCloseOk)()
      .then(succeed(done), fail(done));
  }));

test("overlapping channel/server close", channelTest(
  function(ch, done, conn) {
    var both = latch(2, done);
    conn.on('error', succeed(both));
    ch.on('close', succeed(both));
    open(ch).then(function() {
      ch.closeBecause("Bye", defs.constants.REPLY_SUCCESS);
    }, fail(both));
  },
  function(send, wait, done, ch) {
    wait(defs.ChannelClose)()
      .then(function() {
        send(defs.ConnectionClose, {
          replyText: 'Got there first',
          replyCode: defs.constants.INTERNAL_ERROR,
          classId: 0, methodId: 0
        }, 0);
      })
      .then(wait(defs.ConnectionCloseOk))
      .then(succeed(done), fail(done));
  }));

test("double close", channelTest(
  function(ch, done) {
    open(ch).then(function() {
      ch.closeBecause("First close", defs.constants.REPLY_SUCCESS);
      // NB no synchronisation, we do this straight away
      assert.throws(function() {
        ch.closeBecause("Second close", defs.constants.REPLY_SUCCESS);
      });
    }).then(succeed(done), fail(done));
  },
  function(send, wait, done, ch) {
    wait(defs.ChannelClose)()
      .then(function() {
        send(defs.ChannelCloseOk, {
        }, ch);
      })
      .then(succeed(done), fail(done));
  }));

}); //suite

suite("channel machinery", function() {

test("RPC", channelTest(
  function(ch, done) {
    var rpcLatch = latch(3, done);
    open(ch).then(function() {

      function wheeboom(err, f) {
        if (err !== null) rpcLatch(err);
        else rpcLatch();
      }

      var fields = {
        prefetchCount: 10,
        prefetchSize: 0,
        global: false
      };

      ch._rpc(defs.BasicQos, fields, defs.BasicQosOk, wheeboom);
      ch._rpc(defs.BasicQos, fields, defs.BasicQosOk, wheeboom);
      ch._rpc(defs.BasicQos, fields, defs.BasicQosOk, wheeboom);
    }).then(null, fail(rpcLatch));
  },
  function(send, wait, done, ch) {
    function sendOk(f) {
      send(defs.BasicQosOk, {}, ch);
    }

    return wait(defs.BasicQos)()
      .then(sendOk)
      .then(wait(defs.BasicQos))
      .then(sendOk)
      .then(wait(defs.BasicQos))
      .then(sendOk)
      .then(succeed(done), fail(done));
  }));

test("Bad RPC", channelTest(
  function(ch, done) {
    // We want to see the RPC rejected and the channel closed (with an
    // error)
    var errLatch = latch(2, done);
    ch.on('error', function(error) {
      assert.strictEqual(505, error.code);
      assert.strictEqual(60, error.classId);
      assert.strictEqual(72, error.methodId);
      succeed(errLatch)();
    });

    open(ch)
      .then(function() {
        ch._rpc(defs.BasicRecover, {requeue: true}, defs.BasicRecoverOk,
                function(err) {
                  if (err !== null) errLatch();
                  else errLatch(new Error('Expected RPC failure'));
                });
      }, fail(errLatch));
  },
  function(send, wait, done, ch) {
    return wait()()
      .then(function() {
        send(defs.BasicGetEmpty, {clusterId: ''}, ch);
      }) // oh wait! that was wrong! expect a channel close
      .then(wait(defs.ChannelClose))
      .then(function() {
        send(defs.ChannelCloseOk, {}, ch);
      }).then(succeed(done), fail(done));
  }));

test("RPC on closed channel", channelTest(
  function(ch, done) {
    open(ch);

    var close = new Promise(function(resolve) {
        ch.on('error', function(error) {
          assert.strictEqual(504, error.code);
          assert.strictEqual(0, error.classId);
          assert.strictEqual(0, error.methodId);
          resolve();
      });
    });

    function failureCb(resolve, reject) {
      return function(err) {
        if (err !== null) resolve();
        else reject();
      }
    }

    var fail1 = new Promise(function(resolve, reject) {
      return ch._rpc(defs.BasicRecover, {requeue:true}, defs.BasicRecoverOk,
        failureCb(resolve, reject));
    });

    var fail2 = new Promise(function(resolve, reject) {
      return ch._rpc(defs.BasicRecover, {requeue:true}, defs.BasicRecoverOk,
        failureCb(resolve, reject));
    });

    Promise.all([close, fail1, fail2])
      .then(succeed(done))
      .catch(fail(done));
  },
  function(send, wait, done, ch) {
    wait(defs.BasicRecover)()
      .then(function() {
        send(defs.ChannelClose, {
          replyText: 'Nuh-uh!',
          replyCode: defs.constants.CHANNEL_ERROR,
          methodId: 0, classId: 0
        }, ch);
        return wait(defs.ChannelCloseOk);
      })
      .then(succeed(done))
      .catch(fail(done));
  }));

test("publish all < single chunk threshold", channelTest(
  function(ch, done) {
    open(ch)
      .then(function() {
        ch.sendMessage({
          exchange: 'foo', routingKey: 'bar',
          mandatory: false, immediate: false, ticket: 0
        }, {}, Buffer.from('foobar'));
      })
      .then(succeed(done), fail(done));
  },
  function(send, wait, done, ch) {
    wait(defs.BasicPublish)()
      .then(wait(defs.BasicProperties))
      .then(wait(undefined)) // content frame
      .then(function(f) {
        assert.equal('foobar', f.content.toString());
      }).then(succeed(done), fail(done));
  }));

test("publish content > single chunk threshold", channelTest(
  function(ch, done) {
    open(ch);
    completes(function() {
      ch.sendMessage({
        exchange: 'foo', routingKey: 'bar',
        mandatory: false, immediate: false, ticket: 0
      }, {}, Buffer.alloc(3000));
    }, done);
  },
  function(send, wait, done, ch) {
    wait(defs.BasicPublish)()
      .then(wait(defs.BasicProperties))
      .then(wait(undefined)) // content frame
      .then(function(f) {
        assert.equal(3000, f.content.length);
      }).then(succeed(done), fail(done));
  }));

test("publish method & headers > threshold", channelTest(
  function(ch, done) {
    open(ch);
    completes(function() {
      ch.sendMessage({
        exchange: 'foo', routingKey: 'bar',
        mandatory: false, immediate: false, ticket: 0
      }, {
        headers: {foo: Buffer.alloc(3000)}
      }, Buffer.from('foobar'));
    }, done);
  },
  function(send, wait, done, ch) {
    wait(defs.BasicPublish)()
      .then(wait(defs.BasicProperties))
      .then(wait(undefined)) // content frame
      .then(function(f) {
        assert.equal('foobar', f.content.toString());
      }).then(succeed(done), fail(done));
  }));

test("publish zero-length message", channelTest(
  function(ch, done) {
    open(ch);
    completes(function() {
      ch.sendMessage({
        exchange: 'foo', routingKey: 'bar',
        mandatory: false, immediate: false, ticket: 0
      }, {}, Buffer.alloc(0));
      ch.sendMessage({
        exchange: 'foo', routingKey: 'bar',
        mandatory: false, immediate: false, ticket: 0
      }, {}, Buffer.alloc(0));
    }, done);
  },
  function(send, wait, done, ch) {
    wait(defs.BasicPublish)()
      .then(wait(defs.BasicProperties))
    // no content frame for a zero-length message
      .then(wait(defs.BasicPublish))
      .then(succeed(done), fail(done));
  }));

test("delivery", channelTest(
  function(ch, done) {
    open(ch);
    ch.on('delivery', function(m) {
      completes(function() {
        assert.equal('barfoo', m.content.toString());
      }, done);
    });
  },
  function(send, wait, done, ch) {
    completes(function() {
      send(defs.BasicDeliver, DELIVER_FIELDS, ch, Buffer.from('barfoo'));
    }, done);
  }));

test("zero byte msg", channelTest(
  function(ch, done) {
    open(ch);
    ch.on('delivery', function(m) {
      completes(function() {
        assert.deepEqual(Buffer.alloc(0), m.content);
      }, done);
    });
  },
  function(send, wait, done, ch) {
    completes(function() {
      send(defs.BasicDeliver, DELIVER_FIELDS, ch, Buffer.from(''));
    }, done);
  }));

test("bad delivery", channelTest(
  function(ch, done) {
    var errorAndClose = latch(2, done);
    ch.on('error', function(error) {
      assert.strictEqual(505, error.code);
      assert.strictEqual(60, error.classId);
      assert.strictEqual(60, error.methodId);
      succeed(errorAndClose)();
    });
    ch.on('close', succeed(errorAndClose));
    open(ch);
  },
  function(send, wait, done, ch) {
    send(defs.BasicDeliver, DELIVER_FIELDS, ch);
    // now send another deliver without having sent the content
    send(defs.BasicDeliver, DELIVER_FIELDS, ch);
    return wait(defs.ChannelClose)()
      .then(function() {
        send(defs.ChannelCloseOk, {}, ch);
      }).then(succeed(done), fail(done));
  }));

test("bad content send", channelTest(
  function(ch, done) {
    completes(function() {
      open(ch);
      assert.throws(function() {
        ch.sendMessage({routingKey: 'foo',
                        exchange: 'amq.direct'},
                       {}, null);
      });
    }, done);
  },
  function(send, wait, done, ch) {
    done();
  }));

test("bad properties send", channelTest(
  function(ch, done) {
    completes(function() {
      open(ch);
      assert.throws(function() {
        ch.sendMessage({routingKey: 'foo',
                        exchange: 'amq.direct'},
                       {contentEncoding: 7},
                       Buffer.from('foobar'));
      });
    }, done);
  },
  function(send, wait, done, ch) {
    done();
  }));

test("bad consumer", channelTest(
  function(ch, done) {
    var errorAndClose = latch(2, done);
    ch.on('delivery', function() {
      throw new Error("I am a bad consumer");
    });
    ch.on('error', function(error) {
      assert.strictEqual(541, error.code);
      assert.strictEqual(undefined, error.classId);
      assert.strictEqual(undefined, error.methodId);
      succeed(errorAndClose)();
    });
    ch.on('close', succeed(errorAndClose));
    open(ch);
  },
  function(send, wait, done, ch) {
    send(defs.BasicDeliver, DELIVER_FIELDS, ch, Buffer.from('barfoo'));
    return wait(defs.ChannelClose)()
      .then(function() {
        send(defs.ChannelCloseOk, {}, ch);
      }).then(succeed(done), fail(done));
  }));

test("bad send in consumer", channelTest(
  function(ch, done) {
    var errorAndClose = latch(2, done);
    ch.on('close', succeed(errorAndClose));
    ch.on('error', function(error) {
      assert.strictEqual(541, error.code);
      assert.strictEqual(undefined, error.classId);
      assert.strictEqual(undefined, error.methodId);
      succeed(errorAndClose)();
    });

    ch.on('delivery', function() {
      ch.sendMessage({routingKey: 'foo',
                      exchange: 'amq.direct'},
                     {}, null); // can't send null
    });

    open(ch);
  },
  function(send, wait, done, ch) {
    completes(function() {
      send(defs.BasicDeliver, DELIVER_FIELDS, ch,
           Buffer.from('barfoo'));
    }, done);
    return wait(defs.ChannelClose)()
      .then(function() {
        send(defs.ChannelCloseOk, {}, ch);
      }).then(succeed(done), fail(done));
  }));

test("return", channelTest(
  function(ch, done) {
    ch.on('return', function(m) {
      completes(function() {
        assert.equal('barfoo', m.content.toString());
      }, done);
    });
    open(ch);
  },
  function(send, wait, done, ch) {
    completes(function() {
      send(defs.BasicReturn, DELIVER_FIELDS, ch, Buffer.from('barfoo'));
    }, done);
  }));

test("cancel", channelTest(
  function(ch, done) {
    ch.on('cancel', function(f) {
      completes(function() {
        assert.equal('product of society', f.consumerTag);
      }, done);
    });
    open(ch);
  },
  function(send, wait, done, ch) {
    completes(function() {
      send(defs.BasicCancel, {
        consumerTag: 'product of society',
        nowait: false
      }, ch);
    }, done);
  }));

function confirmTest(variety, Method) {
  return test('confirm ' + variety, channelTest(
    function(ch, done) {
      ch.on(variety, function(f) {
        completes(function() {
          assert.equal(1, f.deliveryTag);
        }, done);
      });
      open(ch);
    },
    function(send, wait, done, ch) {
      completes(function() {
        send(Method, {
          deliveryTag: 1,
          multiple: false
        }, ch);
      }, done);
    }));
}

confirmTest("ack", defs.BasicAck);
confirmTest("nack", defs.BasicNack);

test("out-of-order acks", channelTest(
  function(ch, done) {
    var allConfirms = latch(3, function() {
      completes(function() {
        assert.equal(0, ch.unconfirmed.length);
        assert.equal(4, ch.lwm);
      }, done);
    });
    ch.pushConfirmCallback(allConfirms);
    ch.pushConfirmCallback(allConfirms);
    ch.pushConfirmCallback(allConfirms);
    open(ch);
  },
  function(send, wait, done, ch) {
    completes(function() {
      send(defs.BasicAck, {deliveryTag: 2, multiple: false}, ch);
      send(defs.BasicAck, {deliveryTag: 3, multiple: false}, ch);
      send(defs.BasicAck, {deliveryTag: 1, multiple: false}, ch);
    }, done);
  }));

test("not all out-of-order acks", channelTest(
  function(ch, done) {
    var allConfirms = latch(2, function() {
      completes(function() {
        assert.equal(1, ch.unconfirmed.length);
        assert.equal(3, ch.lwm);
      }, done);
    });
    ch.pushConfirmCallback(allConfirms); // tag = 1
    ch.pushConfirmCallback(allConfirms); // tag = 2
    ch.pushConfirmCallback(function() {
      done(new Error('Confirm callback should not be called'));
    });
    open(ch);
  },
  function(send, wait, done, ch) {
    completes(function() {
      send(defs.BasicAck, {deliveryTag: 2, multiple: false}, ch);
      send(defs.BasicAck, {deliveryTag: 1, multiple: false}, ch);
    }, done);
  }));

});
