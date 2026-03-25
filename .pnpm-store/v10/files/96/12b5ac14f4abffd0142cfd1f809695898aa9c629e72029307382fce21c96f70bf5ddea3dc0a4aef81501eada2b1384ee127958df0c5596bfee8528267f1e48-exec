#!/usr/bin/env node

const amqp = require('amqplib/callback_api');

const queue = 'hello';

amqp.connect((err, connection) => {
  if (err) return bail(err);
  connection.createChannel((err, channel) => {
    if (err) return bail(err, connection);

    process.once('SIGINT', () => {
      channel.close(() => {
        connection.close();
      });
    });

    channel.assertQueue(queue, { durable: false }, (err) => {
      if (err) return bail(err, connection);
      channel.consume(queue, (message) => {
        if (message) console.log(" [x] Received '%s'", message.content.toString());
        else console.warn(' [x] Consumer cancelled');
      }, { noAck: true }, (err) => {
        if (err) return bail(err, connection);
        console.log(" [*] Waiting for logs. To exit press CTRL+C.");
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
