#!/usr/bin/env node

const amqp = require('amqplib/callback_api');

const exchange = 'logs';
const text = process.argv.slice(2).join(' ') || 'info: Hello World!';

amqp.connect((err, connection) => {
  if (err) return bail(err);
  connection.createChannel((err, channel) => {
    if (err) return bail(err, connection);
    channel.assertExchange(exchange, 'fanout', { durable: false }, (err) => {
      if (err) return bail(err, connection);
      channel.publish(exchange, '', Buffer.from(text));
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
