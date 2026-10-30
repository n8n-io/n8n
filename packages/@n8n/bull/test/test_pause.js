'use strict';

const Queue = require('../');

const expect = require('chai').expect;
const redis = require('ioredis');
const utils = require('./utils');
const delay = require('delay');
const sinon = require('sinon');

describe('.pause', () => {
  let client;
  beforeEach(() => {
    client = new redis({
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
    return client.flushdb();
  });

  afterEach(async () => {
    sinon.restore();
    await utils.cleanupQueues();
    await client.flushdb();
    return client.quit();
  });

  describe('globally', () => {
    it('should pause a queue until resumed', () => {
      let ispaused = false,
        counter = 2;

      return utils.newQueue().then(queue => {
        const resultPromise = new Promise(resolve => {
          queue.process((job, jobDone) => {
            expect(ispaused).to.be.eql(false);
            expect(job.data.foo).to.be.equal('paused');
            jobDone();
            counter--;
            if (counter === 0) {
              resolve(queue.close());
            }
          });
        });

        return Promise.all([
          queue
            .pause()
            .then(() => {
              ispaused = true;
              return queue.isPaused().then(paused => {
                expect(paused).to.be.equal(true);
                return queue.add({ foo: 'paused' });
              });
            })
            .then(() => {
              return queue.add({ foo: 'paused' });
            })
            .then(() => {
              ispaused = false;
              return queue.resume().then(() => {
                return queue.isPaused().then(paused => {
                  expect(paused).to.be.equal(false);
                });
              });
            }),
          resultPromise
        ]);
      });
    });

    it('should be able to pause a running queue and emit relevant events', done => {
      let ispaused = false,
        isresumed = true,
        first = true;

      utils.newQueue().then(queue => {
        queue.process(job => {
          expect(ispaused).to.be.eql(false);
          expect(job.data.foo).to.be.equal('paused');

          if (first) {
            first = false;
            ispaused = true;
            return queue.pause();
          } else {
            expect(isresumed).to.be.eql(true);
            queue.close().then(done, done);
          }
        });

        queue.add({ foo: 'paused' });
        queue.add({ foo: 'paused' });

        queue.on('paused', () => {
          ispaused = false;
          queue.resume().catch((/*err*/) => {
            // Swallow error.
          });
        });

        queue.on('resumed', () => {
          isresumed = true;
        });
      });
    });

    it('should not processed delayed jobs', function(done) {
      this.timeout(5000);
      const queue = new Queue('pause-test');

      queue.process(() => {
        done(new Error('should not process delayed jobs in paused queue.'));
      });

      queue.pause().then(() => {
        queue
          .add(
            {},
            {
              delay: 500
            }
          )
          .then(() => {
            return queue.getJobCounts();
          })
          .then(counts => {
            expect(counts).to.have.property('paused', 0);
            expect(counts).to.have.property('waiting', 0);
            expect(counts).to.have.property('delayed', 1);
            return delay(1000);
          })
          .then(() => {
            return queue.getJobCounts();
          })
          .then(counts => {
            expect(counts).to.have.property('paused', 1);
            expect(counts).to.have.property('waiting', 0);
            done();
          });
      });
    });
  });

  describe('locally', () => {
    it('should pause the queue locally', done => {
      let counter = 2;

      const queue = utils.buildQueue();

      queue
        .pause(true /* Local */)
        .then(() => {
          return queue.isPaused(true).then(paused => {
            expect(paused).to.be.equal(true);
          });
        })
        .then(() => {
          // Add the worker after the queue is in paused mode since the normal behavior is to pause
          // it after the current lock expires. This way, we can ensure there isn't a lock already
          // to test that pausing behavior works.
          queue
            .process((job, jobDone) => {
              expect(queue.paused).not.to.be.ok;
              jobDone();
              counter--;
              if (counter === 0) {
                queue.close().then(done);
              }
            })
            .catch(done);
        })
        .then(() => {
          return queue.add({ foo: 'paused' });
        })
        .then(() => {
          return queue.add({ foo: 'paused' });
        })
        .then(() => {
          expect(counter).to.be.eql(2);
          expect(queue.paused).to.be.ok; // Parameter should exist.
          return queue.resume(true /* Local */);
        })
        .then(() => {
          return queue.isPaused(true).then(paused => {
            expect(paused).to.be.equal(false);
          });
        })
        .catch(done);
    });

    it('should wait until active jobs are finished before resolving pause', done => {
      const queue = utils.buildQueue();
      const startProcessing = new Promise(resolve => {
        queue.process((/*job*/) => {
          resolve();
          return delay(200);
        });
      });

      queue.isReady().then(() => {
        const jobs = [];
        for (let i = 0; i < 10; i++) {
          jobs.push(queue.add(i));
        }
        //
        // Add start processing so that we can test that pause waits for this job to be completed.
        //
        jobs.push(startProcessing);
        Promise.all(jobs)
          .then(() => {
            return queue
              .pause(true)
              .then(() => {
                const active = queue
                  .getJobCountByTypes(['active'])
                  .then(count => {
                    expect(count).to.be.eql(0);
                    expect(queue.paused).to.be.ok;
                    return null;
                  });

                // One job from the 10 posted above will be processed, so we expect 9 jobs pending
                const paused = queue
                  .getJobCountByTypes(['delayed', 'wait'])
                  .then(count => {
                    expect(count).to.be.eql(9);
                    return null;
                  });
                return Promise.all([active, paused]);
              })
              .then(() => {
                return queue.add({});
              })
              .then(() => {
                const active = queue
                  .getJobCountByTypes(['active'])
                  .then(count => {
                    expect(count).to.be.eql(0);
                    return null;
                  });

                const paused = queue
                  .getJobCountByTypes(['paused', 'wait', 'delayed'])
                  .then(count => {
                    expect(count).to.be.eql(10);
                    return null;
                  });

                return Promise.all([active, paused]);
              })
              .then(() => {
                return queue.close().then(done, done);
              });
          })
          .catch(done);
      });
    });

    it('should pause the queue locally when more than one worker is active', () => {
      const queue1 = utils.buildQueue('pause-queue');
      const queue1IsProcessing = new Promise(resolve => {
        queue1.process((job, jobDone) => {
          resolve();
          setTimeout(jobDone, 200);
        });
      });

      const queue2 = utils.buildQueue('pause-queue');
      const queue2IsProcessing = new Promise(resolve => {
        queue2.process((job, jobDone) => {
          resolve();
          setTimeout(jobDone, 200);
        });
      });

      queue1.add(1);
      queue1.add(2);
      queue1.add(3);
      queue1.add(4);

      return Promise.all([queue1IsProcessing, queue2IsProcessing]).then(() => {
        return Promise.all([
          queue1.pause(true /* local */),
          queue2.pause(true /* local */)
        ]).then(() => {
          const active = queue1.getJobCountByTypes(['active']).then(count => {
            expect(count).to.be.eql(0);
          });

          const pending = queue1.getJobCountByTypes(['wait']).then(count => {
            expect(count).to.be.eql(2);
          });

          const completed = queue1
            .getJobCountByTypes(['completed'])
            .then(count => {
              expect(count).to.be.eql(2);
            });

          return Promise.all([active, pending, completed]).then(() => {
            return Promise.all([queue1.close(), queue2.close()]);
          });
        });
      });
    });

    it('should wait for blocking job retrieval to complete before pausing', () => {
      const queue = utils.buildQueue();

      const startsProcessing = new Promise(resolve => {
        queue.process((/*job*/) => {
          resolve();
          return delay(200);
        });
      });

      return queue
        .add(1)
        .then(() => {
          return startsProcessing;
        })
        .then(() => {
          return queue.pause(true);
        })
        .then(() => {
          return queue.add(2);
        })
        .then(() => {
          const active = queue.getJobCountByTypes(['active']).then(count => {
            expect(count).to.be.eql(0);
          });

          const pending = queue.getJobCountByTypes(['wait']).then(count => {
            expect(count).to.be.eql(1);
          });

          const completed = queue
            .getJobCountByTypes(['completed'])
            .then(count => {
              expect(count).to.be.eql(1);
            });

          return Promise.all([active, pending, completed]).then(() => {
            return queue.close();
          });
        });
    });

    it('should not initialize blocking client if not already initialized', async () => {
      const createClient = sinon.spy(() => client);
      const queue = utils.buildQueue('pause-queue', { createClient });

      await queue.pause(true);
      const bClientCalls = createClient
        .getCalls()
        .filter(c => c.args[0] === 'bclient');
      expect(bClientCalls).to.have.lengthOf(0);
    });

    it('pauses fast when queue is drained', function(done) {
      this.timeout(10000);
      const queue = new Queue('test');

      queue.process((/*job*/) => {
        Promise.resolve();
      });

      queue.add({});

      queue.on('drained', () => {
        delay(500).then(() => {
          const start = new Date().getTime();
          return queue.pause(true).finally(() => {
            const finish = new Date().getTime();
            expect(finish - start).to.be.lt(1000);
            queue.close().then(done, done);
          });
        });
      });
    });

    describe('with doNotWaitActive=true', () => {
      it('should not wait for active jobs to finish', async () => {
        const queue = utils.buildQueue();
        await queue.add({});

        let finishJob;

        // wait for us to start processing job
        await new Promise(resolve => {
          queue.process(() => {
            // resolve promise, but continue processing job forever
            resolve();

            return new Promise(resolve => {
              finishJob = resolve;
            });
          });
        });

        return queue.pause(true, true).then(() => finishJob());
      });

      it('should not process new jobs', async () => {
        const queue = utils.buildQueue();

        // block on brpoplpush
        const nextJobPromise = queue.getNextJob();

        await queue.pause(true, true);

        // Add job. This should not be processed
        await queue.add({});

        const nextJob = await nextJobPromise;
        expect(nextJob).to.equal(
          undefined,
          'getNextJob should return without getting job'
        );
      });

      it('should not initialize blocking client if not already initialized', async () => {
        const createClient = sinon.spy(() => client);
        const queue = utils.buildQueue('pause-queue', { createClient });

        await queue.pause(true, true);
        const bClientCalls = createClient
          .getCalls()
          .filter(c => c.args[0] === 'bclient');
        expect(bClientCalls).to.have.lengthOf(0);
      });
    });
  });
});
