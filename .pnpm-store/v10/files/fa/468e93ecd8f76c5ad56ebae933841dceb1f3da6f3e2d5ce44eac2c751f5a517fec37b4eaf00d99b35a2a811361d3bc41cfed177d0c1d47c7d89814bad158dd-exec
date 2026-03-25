#!/usr/bin/env node

const amqp = require('amqplib/callback_api');

const queue = 'task_queue';

amqp.connect((err, connection) => {
  if (err) return bail(err);
  connection.createChannel((err, channel) => {
    if (err) return bail(err, connection);

    process.once('SIGINT', () => {
      channel.close(() => {
        connection.close();
      });
    });

    channel.assertQueue(queue, { durable: true }, (err, { queue }) => {
      if (err) return bail(err, connection);
      channel.consume(queue, (message) => {
        const text = message.content.toString();
        console.log(" [x] Received '%s'", text);
        const seconds = text.split('.').length - 1;
        setTimeout(() => {
          console.log(" [x] Done");
          channel.ack(message);
        }, seconds * 1000);
      }, { noAck: false });
      console.log(" [*] Waiting for messages. To exit press CTRL+C");
    });
  });
});

function bail(err, connection) {
  console.error(err);
  if (connection) connection.close(() => {
    process.exit(1);
  });
}
