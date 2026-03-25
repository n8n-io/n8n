#!/usr/bin/env node

const amqp = require('../');

const queue = 'rpc_queue';

(async () => {
  const connection = await amqp.connect();
  const channel = await connection.createChannel();

  await channel.consume('amq.rabbitmq.reply-to', async (message) => {
    console.log(message.content.toString());
    await channel.close();
    await connection.close();
	}, { noAck: true });

  await channel.assertQueue(queue, { durable: false });

  channel.sendToQueue(queue, Buffer.from(' [X] ping'), {
    replyTo: 'amq.rabbitmq.reply-to',
  });
})();
