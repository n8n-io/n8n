#!/usr/bin/env node

const amqp = require('../');
const { v4: uuid } = require('uuid');

const queue = 'rpc_queue';

(async () => {
  const connection = await amqp.connect();
  const channel = await connection.createChannel();

  process.once('SIGINT', async () => {
    await channel.close();
    await connection.close();
  });

  await channel.assertQueue(queue, { durable: false });
  await channel.consume(queue, (message) => {
  	console.log(message.content.toString());
    channel.sendToQueue(message.properties.replyTo, Buffer.from(' [.] pong'));
	}, { noAck: true });

  console.log(' [x] To exit press CTRL+C.');

})();
