#!/usr/bin/env node

const amqp = require('../..');
const { basename } = require('path');

const exchange = 'direct_logs';
const bindingKeys = process.argv.slice(2);
if (bindingKeys.length < 1) {
  console.warn('Usage: %s [info] [warning] [error]', basename(process.argv[1]));
  process.exit(1);
}

(async () => {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    process.once('SIGINT', async () => { 
      await channel.close();
      await connection.close();
    });

    await channel.assertExchange(exchange, 'direct', { durable: false });
    const { queue } = await channel.assertQueue('', { exclusive: true });
    await Promise.all(bindingKeys.map(async (bindingKey) => {
      await channel.bindQueue(queue, exchange, bindingKey);
    }));

    await channel.consume(queue, (message) => {
      if (message) console.log(" [x] %s:'%s'", message.fields.routingKey, message.content.toString());
      else console.warn(' [x] Consumer cancelled');
    }, { noAck: true });

    console.log(' [*] Waiting for logs. To exit press CTRL+C.');
  } catch(err) {
    console.warn(err);
  }
})();
