'use strict';

const expect = require('chai').expect;
const utils = require('./utils');
const redis = require('ioredis');
const _ = require('lodash');
const assert = require('assert');

describe('Rate limiter', () => {
  let queue;
  let client;

  beforeEach(() => {
    client = new redis();
    return client.flushdb().then(() => {
      queue = utils.buildQueue('test rate limiter', {
        limiter: {
          max: 1,
          duration: 1000
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

  it('should throw exception if missing duration option', done => {
    try {
      utils.buildQueue('rate limiter fail', {
        limiter: {
          max: 5
        }
      });
      expect.fail('Should not allow missing `duration` option');
    } catch (err) {
      done();
    }
  });

  it('should throw exception if missing max option', done => {
    try {
      utils.buildQueue('rate limiter fail', {
        limiter: {
          duration: 5000
        }
      });
      expect.fail('Should not allow missing `max`option');
    } catch (err) {
      done();
    }
  });

  it('should obey the rate limit', done => {
    const startTime = new Date().getTime();
    const numJobs = 4;

    queue.process(() => {
      return Promise.resolve();
    });

    for (let i = 0; i < numJobs; i++) {
      queue.add({});
    }

    queue.on(
      'completed',
      // after every job has been completed
      _.after(numJobs, () => {
        try {
          const timeDiff = new Date().getTime() - startTime;
          expect(timeDiff).to.be.above((numJobs - 1) * 1000);
          done();
        } catch (err) {
          done(err);
        }
      })
    );

    queue.on('failed', err => {
      done(err);
    });
  }).timeout(5000);

  // Skip because currently job priority is maintained in a best effort way, but cannot
  // be guaranteed for rate limited jobs.
  it.skip('should obey job priority', async () => {
    const newQueue = utils.buildQueue('test rate limiter', {
      limiter: {
        max: 1,
        duration: 150
      }
    });
    const numJobs = 20;
    const priorityBuckets = {
      1: 0,
      2: 0,
      3: 0,
      4: 0
    };

    const numPriorities = Object.keys(priorityBuckets).length;

    newQueue.process(job => {
      const priority = job.opts.priority;

      priorityBuckets[priority] = priorityBuckets[priority] - 1;

      for (let p = 1; p < priority; p++) {
        if (priorityBuckets[p] > 0) {
          const before = JSON.stringify(priorityBucketsBefore);
          const after = JSON.stringify(priorityBuckets);
          throw new Error(
            `Priority was not enforced, job with priority ${priority} was processed before all jobs with priority ${p} were processed. Bucket counts before: ${before} / after: ${after}`
          );
        }
      }
    });

    const result = new Promise((resolve, reject) => {
      newQueue.on('failed', (job, err) => {
        reject(err);
      });

      const afterNumJobs = _.after(numJobs, () => {
        try {
          expect(_.every(priorityBuckets, value => value === 0)).to.eq(true);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      newQueue.on('completed', () => {
        afterNumJobs();
      });
    });

    await newQueue.pause();
    const promises = [];

    for (let i = 0; i < numJobs; i++) {
      const opts = { priority: (i % numPriorities) + 1 };
      priorityBuckets[opts.priority] = priorityBuckets[opts.priority] + 1;
      promises.push(newQueue.add({ id: i }, opts));
    }

    const priorityBucketsBefore = _.reduce(
      priorityBuckets,
      (acc, value, key) => {
        acc[key] = value;
        return acc;
      },
      {}
    );

    await Promise.all(promises);

    await newQueue.resume();

    return result;
  }).timeout(60000);

  it('should put a job into the delayed queue when limit is hit', () => {
    const newQueue = utils.buildQueue('test rate limiter', {
      limiter: {
        max: 1,
        duration: 1000
      }
    });

    queue.on('failed', e => {
      assert.fail(e);
    });

    return Promise.all([
      newQueue.add({}),
      newQueue.add({}),
      newQueue.add({}),
      newQueue.add({})
    ]).then(() => {
      Promise.all([
        newQueue.getNextJob({}),
        newQueue.getNextJob({}),
        newQueue.getNextJob({}),
        newQueue.getNextJob({})
      ]).then(() => {
        return queue.getDelayedCount().then(
          delayedCount => {
            expect(delayedCount).to.eq(3);
          },
          () => {
            /*ignore error*/
          }
        );
      });
    });
  });

  it('should not put a job into the delayed queue when discard is true', () => {
    const newQueue = utils.buildQueue('test rate limiter', {
      limiter: {
        max: 1,
        duration: 1000,
        bounceBack: true
      }
    });

    newQueue.on('failed', e => {
      assert.fail(e);
    });
    return Promise.all([
      newQueue.add({}),
      newQueue.add({}),
      newQueue.add({}),
      newQueue.add({})
    ]).then(() => {
      Promise.all([
        newQueue.getNextJob({}),
        newQueue.getNextJob({}),
        newQueue.getNextJob({}),
        newQueue.getNextJob({})
      ]).then(() => {
        return newQueue.getDelayedCount().then(delayedCount => {
          expect(delayedCount).to.eq(0);
          return newQueue.getActiveCount().then(waitingCount => {
            expect(waitingCount).to.eq(1);
          });
        });
      });
    });
  });

  it('should rate limit by grouping', async function() {
    this.timeout(20000);
    const numGroups = 4;
    const numJobs = 20;
    const startTime = Date.now();

    const rateLimitedQueue = utils.buildQueue('test rate limiter with group', {
      limiter: {
        max: 1,
        duration: 1000,
        groupKey: 'accountId'
      }
    });

    rateLimitedQueue.process(() => {
      return Promise.resolve();
    });

    const completed = {};

    const running = new Promise((resolve, reject) => {
      const afterJobs = _.after(numJobs, () => {
        try {
          const timeDiff = Date.now() - startTime;
          expect(timeDiff).to.be.gte(numGroups * 1000);
          expect(timeDiff).to.be.below((numGroups + 1) * 1500);

          for (const group in completed) {
            let prevTime = completed[group][0];
            for (let i = 1; i < completed[group].length; i++) {
              const diff = completed[group][i] - prevTime;
              expect(diff).to.be.below(2100);
              expect(diff).to.be.gte(900);
              prevTime = completed[group][i];
            }
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      rateLimitedQueue.on('completed', ({ id }) => {
        const group = _.last(id.split(':'));
        completed[group] = completed[group] || [];
        completed[group].push(Date.now());

        afterJobs();
      });

      rateLimitedQueue.on('failed', async err => {
        await queue.close();
        reject(err);
      });
    });

    for (let i = 0; i < numJobs; i++) {
      rateLimitedQueue.add({ accountId: i % numGroups });
    }

    await running;
    await rateLimitedQueue.close();
  });
});
