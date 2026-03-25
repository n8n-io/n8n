#!/usr/bin/env node

'use strict';

// NB this requires the module 'co':
//    npm install co
const co = require('co');
const amqp = require('amqplib');

co(function* () {
  // connection errors are handled in the co .catch handler
  const conn = yield amqp.connect('amqp://localhost');

  // try catch will throw any errors from the yielding the following promises to the co .catch handler
  try {
    const q = 'hello';
    const msg = 'Hello World!';

    // use a confirm channel so we can check the message is sent OK.
    const channel = yield conn.createConfirmChannel();

    yield channel.assertQueue(q);

    channel.sendToQueue(q, Buffer.from(msg));

    // if message has been nacked, this will result in an error (rejected promise);
    yield channel.waitForConfirms();

    console.log(" [x] Sent '%s'", msg);

    channel.close();
  }
  catch (e) {
    throw e;
  }
  finally {
    conn.close();
  }

}).catch(err => {
  console.warn('Error:', err);
});
