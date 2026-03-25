#!/usr/bin/env node

const amqp = require('amqplib');

const queue = 'hello';
const text = 'Hello World!';

(async () => {
  let connection;
  try {
    connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: false });

    // NB: `sentToQueue` and `publish` both return a boolean
    // indicating whether it's OK to send again straight away, or
    // (when `false`) that you should wait for the event `'drain'`
    // to fire before writing again. We're just doing the one write,
    // so we'll ignore it.
    channel.sendToQueue(queue, Buffer.from(text));
    console.log(" [x] Sent '%s'", text);
    await channel.close();
  }
  catch (err) {
    console.warn(err);
  }
  finally {
    if (connection) await connection.close();
  };
})();  
