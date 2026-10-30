'use strict';

const expect = require('chai').expect;
const utils = require('./utils');
const redis = require('ioredis');

describe('workers', () => {
  let queue;
  let client;

  beforeEach(() => {
    client = new redis();
    return client.flushdb().then(() => {
      queue = utils.buildQueue('test workers', {
        settings: {
          guardInterval: 300000,
          stalledInterval: 300000
        }
      });
      return queue;
    });
  });

  afterEach(() => {
    return queue.close().then(() => {
      return client.quit();
    });
  });

  it('should get all workers for this queue', async () => {
    queue.process(() => {});

    await queue.bclient.ping();

    const workers = await queue.getWorkers();
    expect(workers).to.have.length(1);
  });
});
