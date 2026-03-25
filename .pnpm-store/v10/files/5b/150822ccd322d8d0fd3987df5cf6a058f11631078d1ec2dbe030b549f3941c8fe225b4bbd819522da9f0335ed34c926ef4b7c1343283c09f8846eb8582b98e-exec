#!/usr/bin/env node
// Process tasks from the work queue

const amqp = require('amqplib');

const queue = 'task_queue';

(async () => {
  try {
    const connection = await amqp.connect('amqp://localhost');
    process.once('SIGINT', async () => { 
      await connection.close();
    });

    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: true });

    channel.prefetch(1);
    await channel.consume(queue, (message) => {
      const text = message.content.toString();
      console.log(" [x] Received '%s'", text);
      const seconds = text.split('.').length - 1;
      setTimeout(() => {
        console.log(" [x] Done");
        channel.ack(message);
      }, seconds * 1000);      
    }, { noAck: false });
      
    console.log(" [*] Waiting for messages. To exit press CTRL+C");
  }
  catch (err) {
    console.warn(err);
  }
})();
