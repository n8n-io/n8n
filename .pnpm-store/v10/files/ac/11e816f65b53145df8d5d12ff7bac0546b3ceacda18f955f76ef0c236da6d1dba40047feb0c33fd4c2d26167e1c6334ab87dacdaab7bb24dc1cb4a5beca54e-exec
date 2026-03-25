#!/usr/bin/env node

const amqp = require('../');

(async () => {

  const connection = await amqp.connect();
  const channel = await connection.createChannel();

  process.once('SIGINT', async () => {
    await channel.close();
    await connection.close();
  });

  const { exchange } = await channel.assertExchange('matching exchange', 'headers');
  const { queue } = await channel.assertQueue();

  // When using a headers exchange, the headers to be matched go in
  // the binding arguments. The routing key is ignore, so best left
  // empty.

  // 'x-match' is 'all' or 'any', meaning "all fields must match" or
  // "at least one field must match", respectively. The values to be
  // matched go in subsequent fields.
  await channel.bindQueue(queue, exchange, '', {
    'x-match': 'any',
    'foo': 'bar',
    'baz': 'boo'
  });

  await channel.consume(queue, (message) => {
    console.log(message.content.toString());
  }, { noAck: true });

  channel.publish(exchange, '', Buffer.from('hello'), { headers: { baz: 'boo' }});
  channel.publish(exchange, '', Buffer.from('hello'), { headers: { foo: 'bar' }});
  channel.publish(exchange, '', Buffer.from('lost'), { headers: { meh: 'nah' }});

  console.log(' [x] To exit press CTRL+C.');
})();
