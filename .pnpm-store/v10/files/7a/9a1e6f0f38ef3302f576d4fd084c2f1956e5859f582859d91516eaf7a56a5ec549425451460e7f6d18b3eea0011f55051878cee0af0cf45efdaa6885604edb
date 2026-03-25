//
//
//

'use strict';

const EventEmitter = require('events');
const promisify = require('util').promisify;
const defs = require('./defs');
const {BaseChannel} = require('./channel');
const {acceptMessage} = require('./channel');
const Args = require('./api_args');
const {inspect} = require('./format');

class ChannelModel extends EventEmitter {
  constructor(connection) {
    super();
    this.connection = connection;

    ['error', 'close', 'blocked', 'unblocked'].forEach(ev => {
      connection.on(ev, this.emit.bind(this, ev));
    });
  }

  close() {
    return promisify(this.connection.close.bind(this.connection))();
  }

  updateSecret(newSecret, reason) {
    return promisify(this.connection._updateSecret.bind(this.connection))(newSecret, reason);
  }

  async createChannel(options) {
    const channel = new Channel(this.connection);
    channel.setOptions(options);
    await channel.open();
    return channel;
  }

  async createConfirmChannel(options) {
    const channel = new ConfirmChannel(this.connection);
    channel.setOptions(options);
    await channel.open();
    await channel.rpc(defs.ConfirmSelect, {nowait: false}, defs.ConfirmSelectOk);
    return channel;
  }
}

// Channels

class Channel extends BaseChannel {
  constructor(connection) {
    super(connection);
    this.on('delivery', this.handleDelivery.bind(this));
    this.on('cancel', this.handleCancel.bind(this));
  }

  // An RPC that returns a 'proper' promise, which resolves to just the
  // response's fields; this is intended to be suitable for implementing
  // API procedures.
  async rpc(method, fields, expect) {
    const f = await promisify(cb => {
      return this._rpc(method, fields, expect, cb);
    })();

    return f.fields;
  }

  // Do the remarkably simple channel open handshake
  async open() {
    const ch = await this.allocate.bind(this)();
    return ch.rpc(defs.ChannelOpen, {outOfBand: ""},
                  defs.ChannelOpenOk);
  }

  close() {
    return promisify(cb => {
      return this.closeBecause("Goodbye", defs.constants.REPLY_SUCCESS,
                      cb);
    })();
  }

  // === Public API, declaring queues and stuff ===

  assertQueue(queue, options) {
    return this.rpc(defs.QueueDeclare,
                    Args.assertQueue(queue, options),
                    defs.QueueDeclareOk);
  }

  checkQueue(queue) {
    return this.rpc(defs.QueueDeclare,
                    Args.checkQueue(queue),
                    defs.QueueDeclareOk);
  }

  deleteQueue(queue, options) {
    return this.rpc(defs.QueueDelete,
                    Args.deleteQueue(queue, options),
                    defs.QueueDeleteOk);
  }

  purgeQueue(queue) {
    return this.rpc(defs.QueuePurge,
                    Args.purgeQueue(queue),
                    defs.QueuePurgeOk);
  }

  bindQueue(queue, source, pattern, argt) {
    return this.rpc(defs.QueueBind,
                    Args.bindQueue(queue, source, pattern, argt),
                    defs.QueueBindOk);
  }

  unbindQueue(queue, source, pattern, argt) {
    return this.rpc(defs.QueueUnbind,
                    Args.unbindQueue(queue, source, pattern, argt),
                    defs.QueueUnbindOk);
  }

  assertExchange(exchange, type, options) {
    // The server reply is an empty set of fields, but it's convenient
    // to have the exchange name handed to the continuation.
    return this.rpc(defs.ExchangeDeclare,
                    Args.assertExchange(exchange, type, options),
                    defs.ExchangeDeclareOk)
      .then(_ok => { return { exchange }; });
  }

  checkExchange(exchange) {
    return this.rpc(defs.ExchangeDeclare,
                    Args.checkExchange(exchange),
                    defs.ExchangeDeclareOk);
  }

  deleteExchange(name, options) {
    return this.rpc(defs.ExchangeDelete,
                    Args.deleteExchange(name, options),
                    defs.ExchangeDeleteOk);
  }

  bindExchange(dest, source, pattern, argt) {
    return this.rpc(defs.ExchangeBind,
                    Args.bindExchange(dest, source, pattern, argt),
                    defs.ExchangeBindOk);
  }

  unbindExchange(dest, source, pattern, argt) {
    return this.rpc(defs.ExchangeUnbind,
                    Args.unbindExchange(dest, source, pattern, argt),
                    defs.ExchangeUnbindOk);
  }

  // Working with messages

  publish(exchange, routingKey, content, options) {
    const fieldsAndProps = Args.publish(exchange, routingKey, options);
    return this.sendMessage(fieldsAndProps, fieldsAndProps, content);
  }

  sendToQueue(queue, content, options) {
    return this.publish('', queue, content, options);
  }

  consume(queue, callback, options) {
    // NB we want the callback to be run synchronously, so that we've
    // registered the consumerTag before any messages can arrive.
    const fields = Args.consume(queue, options);
    return new Promise((resolve, reject) => {
      this._rpc(defs.BasicConsume, fields, defs.BasicConsumeOk, (err, ok) => {
        if (err) return reject(err);
        this.registerConsumer(ok.fields.consumerTag, callback);
        resolve(ok.fields);
      });
    });
  }

  async cancel(consumerTag) {
    const ok = await promisify(cb => {
      this._rpc(defs.BasicCancel, Args.cancel(consumerTag),
            defs.BasicCancelOk,
            cb);
    })()
    .then(ok => {
      this.unregisterConsumer(consumerTag);
      return ok.fields;
    });
  }

  get(queue, options) {
    const fields = Args.get(queue, options);
    return new Promise((resolve, reject) => {
      this.sendOrEnqueue(defs.BasicGet, fields, (err, f) => {
        if (err) return reject(err);
        if (f.id === defs.BasicGetEmpty) {
          return resolve(false);
        }
        else if (f.id === defs.BasicGetOk) {
          const fields = f.fields;
          this.handleMessage = acceptMessage(m => {
            m.fields = fields;
            resolve(m);
          });
        }
        else {
          reject(new Error(`Unexpected response to BasicGet: ${inspect(f)}`));
        }
      });
    });
  }

  ack(message, allUpTo) {
    this.sendImmediately(
      defs.BasicAck,
      Args.ack(message.fields.deliveryTag, allUpTo));
  }

  ackAll() {
    this.sendImmediately(defs.BasicAck, Args.ack(0, true));
  }

  nack(message, allUpTo, requeue) {
    this.sendImmediately(
      defs.BasicNack,
      Args.nack(message.fields.deliveryTag, allUpTo, requeue));
  }

  nackAll(requeue) {
    this.sendImmediately(defs.BasicNack,
                         Args.nack(0, true, requeue));
  }

  // `Basic.Nack` is not available in older RabbitMQ versions (or in the
  // AMQP specification), so you have to use the one-at-a-time
  // `Basic.Reject`. This is otherwise synonymous with
  // `#nack(message, false, requeue)`.
  reject(message, requeue) {
    this.sendImmediately(
      defs.BasicReject,
      Args.reject(message.fields.deliveryTag, requeue));
  }

  recover() {
    return this.rpc(defs.BasicRecover,
                    Args.recover(),
                    defs.BasicRecoverOk);
  }

  qos(count, global) {
    return this.rpc(defs.BasicQos,
                    Args.prefetch(count, global),
                    defs.BasicQosOk);
  }
}

// There are more options in AMQP than exposed here; RabbitMQ only
// implements prefetch based on message count, and only for individual
// channels or consumers. RabbitMQ v3.3.0 and after treat prefetch
// (without `global` set) as per-consumer (for consumers following),
// and prefetch with `global` set as per-channel.
Channel.prototype.prefetch = Channel.prototype.qos

// Confirm channel. This is a channel with confirms 'switched on',
// meaning sent messages will provoke a responding 'ack' or 'nack'
// from the server. The upshot of this is that `publish` and
// `sendToQueue` both take a callback, which will be called either
// with `null` as its argument to signify 'ack', or an exception as
// its argument to signify 'nack'.

class ConfirmChannel extends Channel {
  publish(exchange, routingKey, content, options, cb) {
    this.pushConfirmCallback(cb);
    return super.publish(exchange, routingKey, content, options);
  }

  sendToQueue(queue, content, options, cb) {
    return this.publish('', queue, content, options, cb);
  }

  waitForConfirms() {
    const awaiting = [];
    const unconfirmed = this.unconfirmed;
    unconfirmed.forEach((val, index) => {
      if (val !== null) {
        const confirmed = new Promise((resolve, reject) => {
          unconfirmed[index] = err => {
            if (val) val(err);
            if (err === null) resolve();
            else reject(err);
          };
        });
        awaiting.push(confirmed);
      }
    });
    // Channel closed
    if (!this.pending) {
      var cb;
      while (cb = this.unconfirmed.shift()) {
        if (cb) cb(new Error('channel closed'));
      }
    }
    return Promise.all(awaiting);
  }
}

module.exports.ConfirmChannel = ConfirmChannel;
module.exports.Channel = Channel;
module.exports.ChannelModel = ChannelModel;
