#!/usr/bin/env node

const amqp = require('amqplib/callback_api');
const { basename } = require('path');
const { v4: uuid } = require('uuid');

const queue = 'rpc_queue';

const n = parseInt(process.argv[2], 10);
if (isNaN(n)) {
  console.warn('Usage: %s number', basename(process.argv[1]));
  process.exit(1);
}

amqp.connect((err, connection) => {
  if (err) return bail(err);
  connection.createChannel((err, channel) => {
    if (err) return bail(err, connection);
    channel.assertQueue('', { exclusive: true }, (err, { queue: replyTo }) => {
      if (err) return bail(err, connection);

      const correlationId = uuid();
      channel.consume(replyTo, (message) => {
        if (!message) console.warn(' [x] Consumer cancelled');
        else if (message.properties.correlationId === correlationId) {
          console.log(' [.] Got %d', message.content.toString());
          channel.close(() => {
            connection.close();
          })
        }
      }, { noAck: true });

      channel.assertQueue(queue, { durable: false }, (err) => {
        if (err) return bail(err, connection);
        console.log(' [x] Requesting fib(%d)', n);
        channel.sendToQueue(queue, Buffer.from(n.toString()), {
          correlationId,
          replyTo
        });
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

