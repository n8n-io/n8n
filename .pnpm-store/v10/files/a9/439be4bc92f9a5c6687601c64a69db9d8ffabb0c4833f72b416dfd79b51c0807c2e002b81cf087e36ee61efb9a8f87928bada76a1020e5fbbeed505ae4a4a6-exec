#!/usr/bin/env node

const amqp = require('amqplib/callback_api');

const queue = 'hello';
const text = 'Hello World!';

amqp.connect((err, connection) => {
  if (err) return bail(err);
  connection.createChannel((err, channel) => {
    if (err) return bail(err, connection);
    channel.assertQueue(queue, { durable: false }, (err) => {
      if (err) return bail(err, connection);
      channel.sendToQueue(queue, Buffer.from(text));
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
