'use strict';

const expect = require('expect.js');
const utils = require('./utils');
const { isRedisReady } = require('../lib/utils');
const Redis = require('ioredis');
const Queue = require('../lib/queue');

describe('connection', () => {
  let client;

  beforeEach(() => {
    client = new Redis();
    return client.flushdb();
  });

  afterEach(() => {
    return client.quit();
  });

  it('should fail if reusing connections with invalid options', () => {
    const errMsg = Queue.ErrorMessages.MISSING_REDIS_OPTS;

    const client = new Redis();

    const opts = {
      createClient(type) {
        switch (type) {
          case 'client':
            return client;
          default:
            return new Redis();
        }
      }
    };
    const queue = utils.buildQueue('external connections', opts);
    expect(queue).to.be.ok();

    try {
      // eslint-disable-next-line no-unused-vars
      const _ = queue.bclient;
      throw new Error('should fail with invalid redis options');
    } catch (err) {
      expect(err.message).to.be.equal(errMsg);
    }

    try {
      // eslint-disable-next-line no-unused-vars
      const _ = queue.eclient;
      throw new Error('should fail with invalid redis options');
    } catch (err) {
      expect(err.message).to.be.equal(errMsg);
    }
  });

  it('should recover from a connection loss', async () => {
    const queue = utils.buildQueue();
    queue.on('error', () => {
      // error event has to be observed or the exception will bubble up
    });

    const done = new Promise((resolve, reject) => {
      queue
        .process((job, jobDone) => {
          expect(job.data.foo).to.be.equal('bar');
          jobDone();
          queue.close();
        })
        .then(() => {
          resolve();
        })
        .catch(reject);
    });

    // Simulate disconnect
    await queue.isReady();
    await isRedisReady(queue.client);
    queue.client.stream.end();
    queue.client.emit('error', new Error('ECONNRESET'));

    // add something to the queue
    await queue.add({ foo: 'bar' });

    await done;
  });

  it('should handle jobs added before and after a redis disconnect', done => {
    let count = 0;
    const queue = utils.buildQueue();

    queue
      .process((job, jobDone) => {
        if (count == 0) {
          expect(job.data.foo).to.be.equal('bar');
          jobDone();
        } else {
          jobDone();
          queue.close().then(done, done);
        }
        count++;
      })
      .catch(done);

    queue.on('completed', () => {
      if (count === 1) {
        queue.client.stream.end();
        queue.client.emit('error', new Error('ECONNRESET'));
      }
    });

    queue.isReady().then(() => {
      queue.add({ foo: 'bar' });
    });

    queue.on('error', (/*err*/) => {
      if (count === 1) {
        queue.add({ foo: 'bar' });
      }
    });
  });

  it('should not close external connections', () => {
    const redisOpts = {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    };

    const client = new Redis(redisOpts);
    const subscriber = new Redis(redisOpts);

    const opts = {
      createClient(type) {
        switch (type) {
          case 'client':
            return client;
          case 'subscriber':
            return subscriber;
          default:
            return new Redis();
        }
      }
    };

    const testQueue = utils.buildQueue('external connections', opts);

    return new Promise(resolve => {
      if (subscriber.status === 'ready') {
        return resolve();
      }
      subscriber.once('ready', resolve);
    })
      .then(() => {
        return testQueue.isReady();
      })
      .then(() => {
        return testQueue.add({ foo: 'bar' });
      })
      .then(() => {
        expect(testQueue.client).to.be.eql(client);
        expect(testQueue.eclient).to.be.eql(subscriber);

        return testQueue.close();
      })
      .then(() => {
        expect(client.status).to.be.eql('ready');
        expect(subscriber.status).to.be.eql('ready');
        return Promise.all([client.quit(), subscriber.quit()]);
      });
  });

  it('should fail if redis connection fails and does not reconnect', async () => {
    const queue = utils.buildQueue('connection fail 123', {
      redis: {
        host: 'localhost',
        port: 1234,
        retryStrategy: () => false
      }
    });
    try {
      await isRedisReady(queue.client);
      new Error('Did not fail connecting to invalid redis instance');
    } catch (err) {
      expect(err.code).to.be.eql('ECONNREFUSED');
      await queue.close();
    }
  });

  it('should close cleanly if redis connection fails', async () => {
    const queue = new Queue('connection fail', {
      redis: {
        host: 'localhost',
        port: 1235,
        retryStrategy: () => false
      }
    });

    await queue.close();
  });

  it('should accept ioredis options on the query string', async () => {
    const queue = new Queue(
      'connection query string',
      'redis://localhost?tls=RedisCloudFixed'
    );

    expect(queue.clients[0].options).to.have.property('tls');
    expect(queue.clients[0].options.tls).to.have.property('ca');

    await queue.close();
  });
});
