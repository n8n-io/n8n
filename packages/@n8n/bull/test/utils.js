'use strict';

const Queue = require('../');
const STD_QUEUE_NAME = 'test queue';
const _ = require('lodash');

let queues = [];

const originalSetTimeout = setTimeout;

function simulateDisconnect(queue) {
  queue.client.disconnect();
  queue.eclient.disconnect();
}

function buildQueue(name, options) {
  options = _.extend({ redis: { port: 6379, host: '127.0.0.1' } }, options);
  const queue = new Queue(name || STD_QUEUE_NAME, options);
  queues.push(queue);
  return queue;
}

function newQueue(name, opts) {
  const queue = buildQueue(name, opts);
  return queue.isReady();
}

function cleanupQueue(queue) {
  return queue.empty().then(queue.close.bind(queue));
}

function cleanupQueues() {
  return Promise.all(
    queues.map(queue => {
      const errHandler = function() {};
      queue.on('error', errHandler);
      return queue.close().catch(errHandler);
    })
  ).then(() => {
    queues = [];
  });
}

function sleep(ms) {
  return new Promise(resolve => {
    originalSetTimeout(() => {
      resolve();
    }, ms);
  });
}

module.exports = {
  simulateDisconnect,
  buildQueue,
  cleanupQueue,
  newQueue,
  cleanupQueues,
  sleep
};
