//
//
//

'use strict';

var defs = require('./defs');
var EventEmitter = require('events');
var BaseChannel = require('./channel').BaseChannel;
var acceptMessage = require('./channel').acceptMessage;
var Args = require('./api_args');

class CallbackModel extends EventEmitter {
  constructor (connection) {
    super();
    this.connection = connection;
    var self = this;
    ['error', 'close', 'blocked', 'unblocked'].forEach(function (ev) {
      connection.on(ev, self.emit.bind(self, ev));
    });
  }

  close (cb) {
    this.connection.close(cb);
  }

  updateSecret(newSecret, reason, cb) {
    this.connection._updateSecret(newSecret, reason, cb);
  }

  createChannel (options, cb) {
    if (arguments.length === 1) {
      cb = options;
      options = undefined;
    }
    var ch = new Channel(this.connection);
    ch.setOptions(options);
    ch.open(function (err, ok) {
      if (err === null)
        cb && cb(null, ch);
      else
        cb && cb(err);
    });
    return ch;
  }

  createConfirmChannel (options, cb) {
    if (arguments.length === 1) {
      cb = options;
      options = undefined;
    }
    var ch = new ConfirmChannel(this.connection);
    ch.setOptions(options);
    ch.open(function (err) {
      if (err !== null)
        return cb && cb(err);
      else {
        ch.rpc(defs.ConfirmSelect, { nowait: false },
          defs.ConfirmSelectOk, function (err, _ok) {
            if (err !== null)
              return cb && cb(err);
            else
              cb && cb(null, ch);
          });
      }
    });
    return ch;
  }
}

class Channel extends BaseChannel {
  constructor (connection) {
    super(connection);
    this.on('delivery', this.handleDelivery.bind(this));
    this.on('cancel', this.handleCancel.bind(this));
  }

  // This encodes straight-forward RPC: no side-effects and return the
  // fields from the server response. It wraps the callback given it, so
  // the calling method argument can be passed as-is. For anything that
  // needs to have side-effects, or needs to change the server response,
  // use `#_rpc(...)` and remember to dereference `.fields` of the
  // server response.
  rpc (method, fields, expect, cb0) {
    var cb = callbackWrapper(this, cb0);
    this._rpc(method, fields, expect, function (err, ok) {
      cb(err, ok && ok.fields); // in case of an error, ok will be

      // undefined
    });
    return this;
  }

  // === Public API ===
  open (cb) {
    try { this.allocate(); }
    catch (e) { return cb(e); }

    return this.rpc(defs.ChannelOpen, { outOfBand: "" },
      defs.ChannelOpenOk, cb);
  }

  close (cb) {
    return this.closeBecause("Goodbye", defs.constants.REPLY_SUCCESS,
      function () { cb && cb(null); });
  }

  assertQueue (queue, options, cb) {
    return this.rpc(defs.QueueDeclare,
      Args.assertQueue(queue, options),
      defs.QueueDeclareOk, cb);
  }

  checkQueue (queue, cb) {
    return this.rpc(defs.QueueDeclare,
      Args.checkQueue(queue),
      defs.QueueDeclareOk, cb);
  }

  deleteQueue (queue, options, cb) {
    return this.rpc(defs.QueueDelete,
      Args.deleteQueue(queue, options),
      defs.QueueDeleteOk, cb);
  }

  purgeQueue (queue, cb) {
    return this.rpc(defs.QueuePurge,
      Args.purgeQueue(queue),
      defs.QueuePurgeOk, cb);
  }

  bindQueue (queue, source, pattern, argt, cb) {
    return this.rpc(defs.QueueBind,
      Args.bindQueue(queue, source, pattern, argt),
      defs.QueueBindOk, cb);
  }

  unbindQueue (queue, source, pattern, argt, cb) {
    return this.rpc(defs.QueueUnbind,
      Args.unbindQueue(queue, source, pattern, argt),
      defs.QueueUnbindOk, cb);
  }

  assertExchange (ex, type, options, cb0) {
    var cb = callbackWrapper(this, cb0);
    this._rpc(defs.ExchangeDeclare,
      Args.assertExchange(ex, type, options),
      defs.ExchangeDeclareOk,
      function (e, _) { cb(e, { exchange: ex }); });
    return this;
  }

  checkExchange (exchange, cb) {
    return this.rpc(defs.ExchangeDeclare,
      Args.checkExchange(exchange),
      defs.ExchangeDeclareOk, cb);
  }

  deleteExchange (exchange, options, cb) {
    return this.rpc(defs.ExchangeDelete,
      Args.deleteExchange(exchange, options),
      defs.ExchangeDeleteOk, cb);
  }

  bindExchange (dest, source, pattern, argt, cb) {
    return this.rpc(defs.ExchangeBind,
      Args.bindExchange(dest, source, pattern, argt),
      defs.ExchangeBindOk, cb);
  }

  unbindExchange (dest, source, pattern, argt, cb) {
    return this.rpc(defs.ExchangeUnbind,
      Args.unbindExchange(dest, source, pattern, argt),
      defs.ExchangeUnbindOk, cb);
  }

  publish (exchange, routingKey, content, options) {
    var fieldsAndProps = Args.publish(exchange, routingKey, options);
    return this.sendMessage(fieldsAndProps, fieldsAndProps, content);
  }

  sendToQueue (queue, content, options) {
    return this.publish('', queue, content, options);
  }

  consume (queue, callback, options, cb0) {
    var cb = callbackWrapper(this, cb0);
    var fields = Args.consume(queue, options);
    var self = this;
    this._rpc(
      defs.BasicConsume, fields, defs.BasicConsumeOk,
      function (err, ok) {
        if (err === null) {
          self.registerConsumer(ok.fields.consumerTag, callback);
          cb(null, ok.fields);
        }
        else
          cb(err);
      });
    return this;
  }

  cancel (consumerTag, cb0) {
    var cb = callbackWrapper(this, cb0);
    var self = this;
    this._rpc(
      defs.BasicCancel, Args.cancel(consumerTag), defs.BasicCancelOk,
      function (err, ok) {
        if (err === null) {
          self.unregisterConsumer(consumerTag);
          cb(null, ok.fields);
        }
        else
          cb(err);
      });
    return this;
  }

  get (queue, options, cb0) {
    var self = this;
    var fields = Args.get(queue, options);
    var cb = callbackWrapper(this, cb0);
    this.sendOrEnqueue(defs.BasicGet, fields, function (err, f) {
      if (err === null) {
        if (f.id === defs.BasicGetEmpty) {
          cb(null, false);
        }
        else if (f.id === defs.BasicGetOk) {
          self.handleMessage = acceptMessage(function (m) {
            m.fields = f.fields;
            cb(null, m);
          });
        }
        else {
          cb(new Error("Unexpected response to BasicGet: " +
            inspect(f)));
        }
      }
    });
    return this;
  }

  ack (message, allUpTo) {
    this.sendImmediately(
      defs.BasicAck, Args.ack(message.fields.deliveryTag, allUpTo));
    return this;
  }

  ackAll () {
    this.sendImmediately(defs.BasicAck, Args.ack(0, true));
    return this;
  }

  nack (message, allUpTo, requeue) {
    this.sendImmediately(
      defs.BasicNack,
      Args.nack(message.fields.deliveryTag, allUpTo, requeue));
    return this;
  }

  nackAll (requeue) {
    this.sendImmediately(
      defs.BasicNack, Args.nack(0, true, requeue));
    return this;
  }

  reject (message, requeue) {
    this.sendImmediately(
      defs.BasicReject,
      Args.reject(message.fields.deliveryTag, requeue));
    return this;
  }

  prefetch (count, global, cb) {
    return this.rpc(defs.BasicQos,
      Args.prefetch(count, global),
      defs.BasicQosOk, cb);
  }

  recover (cb) {
    return this.rpc(defs.BasicRecover,
      Args.recover(),
      defs.BasicRecoverOk, cb);
  }
}


// Wrap an RPC callback to make sure the callback is invoked with
// either `(null, value)` or `(error)`, i.e., never two non-null
// values. Also substitutes a stub if the callback is `undefined` or
// otherwise falsey, for convenience in methods for which the callback
// is optional (that is, most of them).
function callbackWrapper(ch, cb) {
  return (cb) ? function(err, ok) {
    if (err === null) {
      cb(null, ok);
    }
    else cb(err);
  } : function() {};
}

class ConfirmChannel extends Channel {
  publish (exchange, routingKey,
    content, options, cb) {
    this.pushConfirmCallback(cb);
    return Channel.prototype.publish.call(
      this, exchange, routingKey, content, options);
  }

  sendToQueue (queue, content,
    options, cb) {
    return this.publish('', queue, content, options, cb);
  }

  waitForConfirms (k) {
    var awaiting = [];
    var unconfirmed = this.unconfirmed;
    unconfirmed.forEach(function (val, index) {
      if (val === null)
        ; // already confirmed
      else {
        var confirmed = new Promise(function (resolve, reject) {
          unconfirmed[index] = function (err) {
            if (val)
              val(err);
            if (err === null)
              resolve();
            else
              reject(err);
          };
        });
        awaiting.push(confirmed);
      }
    });
    return Promise.all(awaiting).then(function () { k(); },
      function (err) { k(err); });
  }
}

module.exports.CallbackModel = CallbackModel;
module.exports.Channel = Channel;
module.exports.ConfirmChannel = ConfirmChannel;
