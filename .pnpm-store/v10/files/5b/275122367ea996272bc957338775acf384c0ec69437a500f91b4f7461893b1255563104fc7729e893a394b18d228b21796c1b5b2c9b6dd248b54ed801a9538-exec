#!/usr/bin/env node

const amqp = require('amqplib');
const { basename } = require('path');
const { v4: uuid } = require('uuid');

const queue = 'rpc_queue';

const n = parseInt(process.argv[2], 10);
if (isNaN(n)) {
  console.warn('Usage: %s number', basename(process.argv[1]));
  process.exit(1);
}

(async () => {
  let connection;
  try {
    connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    const correlationId = uuid();

    const requestFib = new Promise(async (resolve) => {
      const { queue: replyTo } = await channel.assertQueue('', { exclusive: true });

      await channel.consume(replyTo, (message) => {
        if (!message) console.warn(' [x] Consumer cancelled');
        else if (message.properties.correlationId === correlationId) {
          resolve(message.content.toString());
        }
      }, { noAck: true });

      await channel.assertQueue(queue, { durable: false });
      console.log(' [x] Requesting fib(%d)', n);
      channel.sendToQueue(queue, Buffer.from(n.toString()), { 
        correlationId,
        replyTo,
      });
    });

    const fibN = await requestFib;
    console.log(' [.] Got %d', fibN);
  }
  catch (err) {
    console.warn(err);
  }
  finally {
    if (connection) await connection.close();
  };
})();  
