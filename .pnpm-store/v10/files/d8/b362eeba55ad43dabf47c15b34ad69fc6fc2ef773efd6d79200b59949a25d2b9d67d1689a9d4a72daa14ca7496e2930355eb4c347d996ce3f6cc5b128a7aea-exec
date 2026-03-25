#!/usr/bin/env node

const amqp = require('amqplib');

const exchange = 'logs';

(async () => {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    process.once('SIGINT', async () => { 
      await channel.close();
      await connection.close();
    });

    await channel.assertExchange(exchange, 'fanout', { durable: false });
    const { queue } = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(queue, exchange, '')

    await channel.consume(queue, (message) => {
      if (message) console.log(" [x] '%s'", message.content.toString());
      else console.warn(' [x] Consumer cancelled');
    }, { noAck: true });

    console.log(' [*] Waiting for logs. To exit press CTRL+C');
  } catch (err) {
    console.warn(err);
  }
})();
