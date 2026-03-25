#!/usr/bin/env node

const amqp = require('amqplib/callback_api');

const exchange = 'topic_logs';
const args = process.argv.slice(2);
const routingKey = (args.length > 0) ? args[0] : 'info';
const text = args.slice(1).join(' ') || 'Hello World!';

amqp.connect((err, connection) => {
  if (err) return bail(err);
  connection.createChannel((err, channel) => {
    if (err) return bail(err, connection);
    channel.assertExchange(exchange, 'topic', { durable: false }, (err) => {
      if (err) return bail(err, connection);
      channel.publish(exchange, routingKey, Buffer.from(text));
      console.log(" [x] Sent '%s'", text);
      channel.close(() => {
        connection.close();
      });
    });
  });
});

function bail(err, connection) {
  console.error(err);
  if (connection) connection.close(() => {
    process.exit(1);
  });
}
