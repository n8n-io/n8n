#!/usr/bin/env node

const amqp = require('amqplib/callback_api');

const queue = 'rpc_queue';

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
      channel.prefetch(1);
      channel.consume(queue, (message) => {
        const n = parseInt(message.content.toString(), 10);
        console.log(' [.] fib(%d)', n);
        const response = fib(n);
        channel.sendToQueue(message.properties.replyTo, Buffer.from(response.toString()), {
          correlationId: message.properties.correlationId
        });
        channel.ack(message);
      }, { noAck: false }, function(err) {
        if (err) return bail(err, conn);
        console.log(' [x] Awaiting RPC requests. To exit press CTRL+C.');
      });
    });
  });
});

function fib(n) {
  // Do it the ridiculous, but not most ridiculous, way. For better,
  // see http://nayuki.eigenstate.org/page/fast-fibonacci-algorithms
  let a = 0, b = 1;
  for (let i=0; i < n; i++) {
    let c = a + b;
    a = b; b = c;
  }
  return a;
}


function bail(err, connection) {
  console.error(err);
  if (connection) connection.close(() => {
    process.exit(1);
  });
}

