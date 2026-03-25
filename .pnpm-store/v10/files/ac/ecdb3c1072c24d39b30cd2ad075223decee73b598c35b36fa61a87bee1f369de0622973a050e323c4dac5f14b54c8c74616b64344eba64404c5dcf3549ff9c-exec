#!/usr/bin/env node
// Post a new task to the work queue

const amqp = require('amqplib');

const queue = 'task_queue';
const text = process.argv.slice(2).join(' ') || "Hello World!";

(async () => {
  let connection;
  try {
    connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(text), { persistent: true });
    console.log(" [x] Sent '%s'", text);
    await channel.close();
  }
  catch (err) {
    console.warn(err);
  }
  finally { 
    await connection.close();
  };
})();
