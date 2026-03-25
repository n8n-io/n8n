#!/usr/bin/env node

const amqp = require('amqplib/callback_api');
const { basename } = require('path');

const exchange = 'topic_logs';
const severities = process.argv.slice(2);
if (severities.length < 1) {
  console.log('Usage %s [info] [warning] [error]', basename(process.argv[1]));
  process.exit(1);
}

amqp.connect((err, connection) => {
  if (err) return bail(err);
  connection.createChannel((err, channel) => {
    if (err) return bail(err, connection);

    process.once('SIGINT', () => {
      channel.close(() => {
        connection.close();
      });
    });

    channel.assertExchange(exchange, 'topic', { durable: false }, (err) => {
      if (err) return bail(err, connection);
      channel.assertQueue('', { exclusive: true }, (err, { queue }) => {
        if (err) return bail(err, connection);
        channel.consume(queue, (message) => {
          if (message) console.log(" [x] %s:'%s'", message.fields.routingKey, message.content.toString());
          else console.warn(' [x] Consumer cancelled');
        }, {noAck: true}, function(err) {
          if (err) return bail(err, connection);
          console.log(' [*] Waiting for logs. To exit press CTRL+C.');
          subscribeAll(channel, queue, severities, (err) => {
            if (err) return bail(err, connection);
          });
        });
      });
    });
  });
});

function subscribeAll(channel, queue, bindingKeys, cb) {
  if (bindingKeys.length === 0) return cb();
  const bindingKey = bindingKeys.shift();
  channel.bindQueue(queue, exchange, bindingKey, {}, (err) => {
    if (err) return cb(err);
    subscribeAll(channel, queue, bindingKeys, cb);
  });
}

function bail(err, connection) {
  console.error(err);
  if (connection) connection.close(() => {
    process.exit(1);
  });
}

