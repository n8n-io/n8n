'use strict';

const Queue = require('../');
const expect = require('chai').expect;
const redis = require('ioredis');
const sinon = require('sinon');
const _ = require('lodash');
const uuid = require('uuid');
const utils = require('./utils');
const delay = require('delay');

describe('Queue', () => {
  const sandbox = sinon.createSandbox();
  let client;

  beforeEach(() => {
    client = new redis();
    return client.flushdb();
  });

  afterEach(() => {
    sandbox.restore();
    return client.quit();
  });

  describe('.close', () => {
    let testQueue;
    beforeEach(() => {
      return utils.newQueue('test').then(queue => {
        testQueue = queue;
      });
    });

    it('should call end on the client', done => {
      testQueue.client.once('end', () => {
        done();
      });
      testQueue.close();
    });

    it('should call end on the event subscriber client', done => {
      testQueue.eclient.once('end', () => {
        done();
      });
      testQueue.close();
    });

    it('should resolve the promise when each client has disconnected', () => {
      function checkStatus(status) {
        return (
          status === 'ready' || status === 'connecting' || status === 'connect'
        );
      }
      expect(testQueue.client.status).to.satisfy(checkStatus);
      expect(testQueue.eclient.status).to.satisfy(checkStatus);

      return testQueue.close().then(() => {
        expect(testQueue.client.status).to.be.eql('end');
        expect(testQueue.eclient.status).to.be.eql('end');
      });
    });

    it('should return a promise', () => {
      const closePromise = testQueue.close().then(() => {
        expect(closePromise.then).to.be.a('function');
      });
      return closePromise;
    });

    it('should close if the job expires after the lockRenewTime', function(done) {
      this.timeout(testQueue.settings.stalledInterval * 2, {
        settings: {
          lockDuration: 15,
          lockRenewTime: 5
        }
      });

      testQueue.process(() => {
        return delay(100);
      });

      testQueue.on('completed', () => {
        testQueue.close().then(done);
      });
      testQueue.add({ foo: 'bar' });
    });

    describe('should be callable from within', () => {
      it('a job handler that takes a callback', function(done) {
        this.timeout(12000); // Close can be a slow operation

        testQueue.process((job, jobDone) => {
          expect(job.data.foo).to.be.eql('bar');
          jobDone();
          testQueue.close().then(done);
        });

        testQueue.add({ foo: 'bar' }).then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        });
      });

      it('a job handler that returns a promise', done => {
        testQueue.process(job => {
          expect(job.data.foo).to.be.eql('bar');
          return Promise.resolve();
        });

        testQueue.on('completed', () => {
          testQueue.close().then(done);
        });

        testQueue.add({ foo: 'bar' }).then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        });
      });
    });
  });

  describe('instantiation', () => {
    it('should create a queue with standard redis opts', () => {
      const queue = new Queue('standard');

      expect(queue.client.options.host).to.be.eql('127.0.0.1');
      expect(queue.eclient.options.host).to.be.eql('127.0.0.1');

      expect(queue.client.options.port).to.be.eql(6379);
      expect(queue.eclient.options.port).to.be.eql(6379);

      expect(queue.client.options.db).to.be.eql(0);
      expect(queue.eclient.options.db).to.be.eql(0);

      return queue.close();
    });

    it('should create a queue with a redis connection string', () => {
      const queue = new Queue('connstring', 'redis://123.4.5.67:1234/2', {
        redis: { connectTimeout: 1000, retryStrategy: () => false }
      });

      expect(queue.client.options.host).to.be.eql('123.4.5.67');
      expect(queue.eclient.options.host).to.be.eql('123.4.5.67');

      expect(queue.client.options.port).to.be.eql(1234);
      expect(queue.eclient.options.port).to.be.eql(1234);

      expect(queue.client.options.db).to.be.eql(2);
      expect(queue.eclient.options.db).to.be.eql(2);

      return queue.close();
    }).timeout(10000);

    it('should create a queue with only a hostname', () => {
      const queue = new Queue('connstring', 'redis://127.2.3.4', {
        redis: { connectTimeout: 1000, retryStrategy: () => false }
      });

      expect(queue.client.options.host).to.be.eql('127.2.3.4');
      expect(queue.eclient.options.host).to.be.eql('127.2.3.4');

      expect(queue.client.options.port).to.be.eql(6379);
      expect(queue.eclient.options.port).to.be.eql(6379);

      expect(queue.client.condition.select).to.be.eql(0);
      expect(queue.eclient.condition.select).to.be.eql(0);

      return queue.close().catch((/*err*/) => {
        // Swallow error.
      });
    });

    it('should create a queue with connection string and password', () => {
      const queue = new Queue('connstring', 'redis://:123@127.2.3.4:6379');

      expect(queue.client.options.host).to.be.eql('127.2.3.4');
      expect(queue.eclient.options.host).to.be.eql('127.2.3.4');

      expect(queue.client.options.port).to.be.eql(6379);
      expect(queue.eclient.options.port).to.be.eql(6379);

      expect(queue.client.condition.select).to.be.eql(0);
      expect(queue.eclient.condition.select).to.be.eql(0);

      expect(queue.client.options.password).to.be.eql('123');
      expect(queue.eclient.options.password).to.be.eql('123');

      queue.close().catch((/*err*/) => {
        // Swallow error.
      });
    });

    it('creates a queue using the supplied redis DB', () => {
      const queue = new Queue('custom', { redis: { DB: 1 } });

      expect(queue.client.options.host).to.be.eql('127.0.0.1');
      expect(queue.eclient.options.host).to.be.eql('127.0.0.1');

      expect(queue.client.options.port).to.be.eql(6379);
      expect(queue.eclient.options.port).to.be.eql(6379);

      expect(queue.client.options.db).to.be.eql(1);
      expect(queue.eclient.options.db).to.be.eql(1);

      return queue.close();
    });

    it('creates a queue using the supplied redis url as opts', () => {
      const queue = new Queue('custom', {
        redis: 'redis://abc:123@127.2.3.4:1234/1'
      });

      expect(queue.client.options.host).to.be.eql('127.2.3.4');
      expect(queue.eclient.options.host).to.be.eql('127.2.3.4');

      expect(queue.client.options.port).to.be.eql(1234);
      expect(queue.eclient.options.port).to.be.eql(1234);

      expect(queue.client.options.db).to.be.eql(1);
      expect(queue.eclient.options.db).to.be.eql(1);

      return queue.close();
    });

    it('creates a queue using the supplied redis host', () => {
      const queue = new Queue('custom', { redis: { host: 'localhost' } });

      expect(queue.client.options.host).to.be.eql('localhost');
      expect(queue.eclient.options.host).to.be.eql('localhost');

      expect(queue.client.options.db).to.be.eql(0);
      expect(queue.eclient.options.db).to.be.eql(0);

      return queue.close();
    });

    it('creates a queue with dots in its name', () => {
      const queue = new Queue('using. dots. in.name.');

      return queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .then(() => {
          queue.process((job, jobDone) => {
            expect(job.data.foo).to.be.equal('bar');
            jobDone();
          });
          return null;
        })
        .then(() => {
          return queue.close();
        });
    });

    it('creates a queue accepting port as a string', () => {
      const queue = new Queue('foobar', '6379', 'localhost');

      return queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .then(() => {
          queue.process((job, jobDone) => {
            expect(job.data.foo).to.be.equal('bar');
            jobDone();
          });
          return null;
        })
        .then(() => {
          return queue.close();
        });
    });

    it('should create a queue with a prefix option', () => {
      const queue = new Queue('q', 'redis://127.0.0.1', { keyPrefix: 'myQ' });

      return queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
          const client = new redis();
          return client.hgetall('myQ:q:' + job.id).then(result => {
            expect(result).to.not.be.null;
            return client.quit();
          });
        })
        .then(() => {
          return queue.close();
        });
    });

    it('should allow reuse redis connections', done => {
      const redisOpts = {
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      };
      const client = new redis(redisOpts);
      const subscriber = new redis(redisOpts);

      const opts = {
        createClient(type, opts) {
          switch (type) {
            case 'client':
              return client;
            case 'subscriber':
              return subscriber;
            case 'bclient':
              return new redis({ ...opts, ...redisOpts });
            default:
              return new redis(opts);
          }
        }
      };
      const queueFoo = new Queue('foobar', opts);
      const queueQux = new Queue('quxbaz', opts);

      expect(queueFoo.client).to.be.equal(client);
      expect(queueFoo.eclient).to.be.equal(subscriber);

      expect(queueQux.client).to.be.equal(client);
      expect(queueQux.eclient).to.be.equal(subscriber);

      queueFoo
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .then(
          queueFoo.bclient.client('GETNAME').then(name => {
            expect(name).to.be.eql(queueFoo.clientName());
          })
        )
        .then(() => {
          return queueQux.add({ qux: 'baz' }).then(job => {
            expect(job.id).to.be.ok;
            expect(job.data.qux).to.be.eql('baz');
            let completed = 0;

            queueFoo.process((job, jobDone) => {
              jobDone();
            });

            queueQux.process((job, jobDone) => {
              jobDone();
            });

            queueFoo.on('completed', () => {
              completed++;
              if (completed == 2) {
                done();
              }
            });

            queueQux.on('completed', () => {
              completed++;
              if (completed == 2) {
                done();
              }
            });
          });
        }, done);
    });

    it('creates a queue with default job options', async () => {
      const defaultJobOptions = { removeOnComplete: true, removeOnFail: false };
      const queue = new Queue('custom', {
        defaultJobOptions
      });

      expect(queue.defaultJobOptions).to.be.eql(defaultJobOptions);

      const job = await queue.add('test', {}, { removeOnFail: true });

      expect(job.opts).have.property('removeOnComplete', true);
      expect(job.opts).have.property('removeOnFail', true);

      await queue.close();
    });

    it('should not change the options object', async () => {
      const originalOptions = { redis: { keyPrefix: 'myQ' } };
      const options = _.cloneDeep(originalOptions);

      let queue = new Queue('q', 'redis://127.0.0.1', options);
      expect(_.isEqual(options, originalOptions)).to.be.true;
      await queue.close();

      queue = new Queue('q', options);
      expect(_.isEqual(options, originalOptions)).to.be.true;
      await queue.close();
    });

    describe('bulk jobs', () => {
      it('should default name of job', () => {
        const queue = new Queue('custom');

        return queue.addBulk([{ name: 'specified' }, {}]).then(jobs => {
          expect(jobs).to.have.length(2);

          expect(jobs[0].name).to.equal('specified');
          expect(jobs[1].name).to.equal('__default__');
        });
      });

      it('should default options from queue', () => {
        const queue = new Queue('custom', {
          defaultJobOptions: {
            removeOnComplete: true
          }
        });

        return queue.addBulk([{}]).then(jobs => {
          expect(jobs[0].opts.removeOnComplete).to.equal(true);
        });
      });
    });
  });

  describe('a worker', () => {
    let queue;

    beforeEach(() => {
      const client = new redis();
      return client
        .flushdb()
        .then(() => {
          return utils.newQueue();
        })
        .then(_queue => {
          queue = _queue;
        });
    });

    afterEach(function() {
      this.timeout(
        queue.settings.stalledInterval * (1 + queue.settings.maxStalledCount)
      );
      return utils.cleanupQueues();
    });

    it('should process a job', done => {
      queue
        .process((job, jobDone) => {
          expect(job.data.foo).to.be.equal('bar');
          jobDone();
          done();
        })
        .catch(done);

      queue.add({ foo: 'bar' }).then(job => {
        expect(job.id).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
      }, done);
    });

    describe('bulk jobs', () => {
      it('should process jobs', done => {
        queue
          .process((job, jobDone) => {
            if (job.data.idx === 0) {
              expect(job.data.foo).to.be.equal('bar');
              jobDone();
            } else {
              expect(job.data.idx).to.be.equal(1);
              expect(job.data.foo).to.be.equal('baz');
              jobDone();
              done();
            }
          })
          .catch(done);

        queue
          .addBulk([
            { data: { idx: 0, foo: 'bar' } },
            { data: { idx: 1, foo: 'baz' } }
          ])
          .then(jobs => {
            expect(jobs).to.have.length(2);

            expect(jobs[0].id).to.be.ok;
            expect(jobs[0].data.foo).to.be.eql('bar');
            expect(jobs[1].id).to.be.ok;
            expect(jobs[1].data.foo).to.be.eql('baz');
          }, done);
      });
    });

    describe('auto job removal', () => {
      async function testRemoveOnFinish(opts, expectedCount, fail) {
        const clock = sinon.useFakeTimers();
        clock.reset();

        queue.process(async job => {
          await job.log('test log');
          if (fail) {
            throw new Error('job failed');
          }
        });

        const datas = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

        const processing = new Promise(resolve => {
          queue.on(fail ? 'failed' : 'completed', async job => {
            clock.tick(1000);

            if (job.data == 14) {
              const counts = await queue.getJobCounts(
                fail ? 'failed' : 'completed'
              );

              if (fail) {
                expect(counts.failed).to.be.equal(expectedCount);
              } else {
                expect(counts.completed).to.be.equal(expectedCount);
              }

              await Promise.all(
                jobIds.map(async (jobId, index) => {
                  const job = await queue.getJob(jobId);
                  const logs = await queue.getJobLogs(jobId);

                  try {
                    if (index >= datas.length - expectedCount) {
                      expect(job).to.not.be.equal(null);
                      expect(logs.logs).to.not.be.empty;
                    } else {
                      expect(job).to.be.equal(null);
                      expect(logs.logs).to.be.empty;
                    }
                  } catch (err) {
                    console.error(err);
                  }
                })
              );

              resolve();
            }
          });
        });

        const jobOpts = {};
        if (fail) {
          jobOpts.removeOnFail = opts;
        } else {
          jobOpts.removeOnComplete = opts;
        }

        const jobIds = (
          await Promise.all(datas.map(async data => queue.add(data, jobOpts)))
        ).map(job => job.id);

        await processing;
        clock.restore();
      }

      it('should remove job after completed if removeOnComplete', done => {
        queue
          .process((job, jobDone) => {
            expect(job.data.foo).to.be.equal('bar');
            jobDone();
          })
          .catch(done);

        queue.add({ foo: 'bar' }, { removeOnComplete: true }).then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        }, done);

        queue.on('completed', job => {
          queue
            .getJob(job.id)
            .then(job => {
              expect(job).to.be.equal(null);
            })
            .then(() => {
              queue.getJobCounts().then(counts => {
                expect(counts.completed).to.be.equal(0);
                done();
              });
            });
        });
      });

      it('should remove a job after completed if the default job options specify removeOnComplete', done => {
        utils
          .newQueue('test-' + uuid.v4(), {
            defaultJobOptions: {
              removeOnComplete: true
            }
          })
          .then(myQueue => {
            myQueue.process(job => {
              expect(job.data.foo).to.be.equal('bar');
            });

            myQueue
              .add({ foo: 'bar' })
              .then(job => {
                expect(job.id).to.be.ok;
                expect(job.data.foo).to.be.eql('bar');
              }, done)
              .catch(done);

            myQueue.on('completed', job => {
              myQueue
                .getJob(job.id)
                .then(job => {
                  expect(job).to.be.equal(null);
                })
                .then(() => {
                  return myQueue.getJobCounts();
                })
                .then(counts => {
                  expect(counts.completed).to.be.equal(0);

                  return utils.cleanupQueues();
                })
                .then(done)
                .catch(done);
            });
            return null;
          })
          .catch(done);
      });

      describe('.retryJobs', () => {
        it('should retry all failed jobs', async () => {
          const jobCount = 8;

          let fail = true;
          queue.process(async () => {
            await delay(10);
            if (fail) {
              throw new Error('failed');
            }
          });

          let order = 0;
          const failing = new Promise(resolve => {
            queue.on('failed', job => {
              expect(order).to.be.eql(job.data.idx);
              if (order === jobCount - 1) {
                resolve();
              }
              order++;
            });
          });

          for (const index of Array.from(Array(jobCount).keys())) {
            await queue.add({ idx: index });
          }

          await failing;

          const failedCount = await queue.getJobCounts('failed');
          expect(failedCount.failed).to.be.equal(jobCount);

          order = 0;
          const completing = new Promise(resolve => {
            queue.on('completed', job => {
              expect(order).to.be.eql(job.data.idx);
              if (order === jobCount - 1) {
                resolve();
              }
              order++;
            });
          });

          fail = false;
          await queue.retryJobs({ count: 2 });

          await completing;

          const CompletedCount = await queue.getJobCounts('completed');
          expect(CompletedCount.completed).to.be.equal(jobCount);
        });

        it('should move to pause all failed jobs if the queue is paused', async () => {
          const jobCount = 8;

          let fail = true;
          queue.process(async () => {
            await delay(10);
            if (fail) {
              throw new Error('failed');
            }
          });

          let order = 0;
          const failing = new Promise(resolve => {
            queue.on('failed', job => {
              expect(order).to.be.eql(job.data.idx);
              if (order === jobCount - 1) {
                resolve();
              }
              order++;
            });
          });

          for (const index of Array.from(Array(jobCount).keys())) {
            await queue.add({ idx: index });
          }

          await failing;

          const failedCount = await queue.getJobCounts('failed');
          expect(failedCount.failed).to.be.equal(jobCount);

          order = 0;
          const completing = new Promise(resolve => {
            queue.on('completed', job => {
              expect(order).to.be.eql(job.data.idx);
              if (order === jobCount - 1) {
                resolve();
              }
              order++;
            });
          });

          fail = false;

          await queue.pause();

          await queue.retryJobs({ count: 2 });

          const pausedJobs = await queue.getJobs(['paused']);
          expect(pausedJobs).to.have.lengthOf(jobCount);

          await queue.resume();

          await completing;

          const CompletedCount = await queue.getJobCounts('completed');
          expect(CompletedCount.completed).to.be.equal(jobCount);
        });
      });

      it('should keep specified number of jobs after completed with removeOnComplete', async () => {
        const keepJobs = 3;
        await testRemoveOnFinish(keepJobs, keepJobs);
      });

      it('should keep of jobs newer than specified after completed with removeOnComplete', async () => {
        const age = 7;
        await testRemoveOnFinish({ age }, age);
      });

      it('should keep of jobs newer than specified and up to a count completed with removeOnComplete', async () => {
        const age = 7;
        const count = 5;
        await testRemoveOnFinish({ age, count }, count);
      });

      it('should keep of jobs newer than specified and up to a count fail with removeOnFail', async () => {
        const age = 7;
        const count = 5;
        await testRemoveOnFinish({ age, count }, count, true);
      });

      /*
      it('should keep specified number of jobs after completed with removeOnComplete', async () => {
        const keepJobs = 3;
        queue.process(async job => {
          await job.log('test log');
        });

        const datas = [0, 1, 2, 3, 4, 5, 6, 7, 8];

        const jobIds = await Promise.all(
          datas.map(
            async data =>
              (await queue.add(data, { removeOnComplete: keepJobs })).id
          )
        );

        return new Promise(resolve => {
          queue.on('completed', async job => {
            if (job.data == 8) {
              const counts = await queue.getJobCounts();
              expect(counts.completed).to.be.equal(keepJobs);

              await Promise.all(
                jobIds.map(async (jobId, index) => {
                  const job = await queue.getJob(jobId);
                  const logs = await queue.getJobLogs(jobId);
                  if (index >= datas.length - keepJobs) {
                    expect(job).to.not.be.equal(null);
                    expect(logs.logs).to.not.be.empty;
                  } else {
                    expect(job).to.be.equal(null);
                    expect(logs.logs).to.be.empty;
                  }
                })
              );
              resolve();
            }
          });
        });
      });
      */

      it('should keep specified number of jobs after completed with global removeOnComplete', async () => {
        const keepJobs = 3;

        const localQueue = await utils.newQueue('test-' + uuid.v4(), {
          defaultJobOptions: {
            removeOnComplete: keepJobs
          }
        });
        localQueue.process(() => {});

        const datas = [0, 1, 2, 3, 4, 5, 6, 7, 8];

        const jobIds = await Promise.all(
          datas.map(async data => (await localQueue.add(data)).id)
        );

        return new Promise((resolve, reject) => {
          localQueue.on('completed', async job => {
            if (job.data == 8) {
              try {
                const counts = await localQueue.getJobCounts();
                expect(counts.completed).to.be.equal(keepJobs);

                await Promise.all(
                  jobIds.map(async (jobId, index) => {
                    const job = await localQueue.getJob(jobId);
                    if (index >= datas.length - keepJobs) {
                      expect(job).to.not.be.equal(null);
                    } else {
                      expect(job).to.be.equal(null);
                    }
                  })
                );
              } catch (err) {
                reject(err);
              }

              resolve();
            }
          });
        });
      });

      it('should remove job after failed if removeOnFail', done => {
        queue.process(job => {
          expect(job.data.foo).to.be.equal('bar');
          throw Error('error');
        });

        queue.add({ foo: 'bar' }, { removeOnFail: true }).then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        }, done);

        queue.on('failed', jobId => {
          queue
            .getJob(jobId)
            .then(job => {
              expect(job).to.be.equal(null);
              return null;
            })
            .then(() => {
              return queue.getJobCounts().then(counts => {
                expect(counts.failed).to.be.equal(0);
                done();
              });
            });
        });
      });

      it('should remove a job after fail if the default job options specify removeOnFail', done => {
        utils
          .newQueue('test-' + uuid.v4(), {
            defaultJobOptions: {
              removeOnFail: true
            }
          })
          .then(myQueue => {
            myQueue.process(job => {
              expect(job.data.foo).to.be.equal('bar');
              throw Error('error');
            });

            myQueue
              .add({ foo: 'bar' })
              .then(job => {
                expect(job.id).to.be.ok;
                expect(job.data.foo).to.be.eql('bar');
              }, done)
              .catch(done);

            myQueue.on('failed', jobId => {
              myQueue
                .getJob(jobId)
                .then(job => {
                  expect(job).to.be.equal(null);
                })
                .then(() => {
                  return myQueue.getJobCounts();
                })
                .then(counts => {
                  expect(counts.completed).to.be.equal(0);

                  return utils.cleanupQueues();
                })
                .then(done)
                .catch(done);
            });
            return null;
          })
          .catch(done);
      });

      it('should keep specified number of jobs after completed with removeOnFail', async () => {
        const keepJobs = 3;
        queue.process(() => {
          throw Error('error');
        });

        const datas = [0, 1, 2, 3, 4, 5, 6, 7, 8];

        const jobIds = await Promise.all(
          datas.map(
            async data => (await queue.add(data, { removeOnFail: keepJobs })).id
          )
        );

        return new Promise(resolve => {
          queue.on('failed', async job => {
            if (job.data == 8) {
              const counts = await queue.getJobCounts();
              expect(counts.failed).to.be.equal(keepJobs);

              await Promise.all(
                jobIds.map(async (jobId, index) => {
                  const job = await queue.getJob(jobId);
                  if (index >= datas.length - keepJobs) {
                    expect(job).to.not.be.equal(null);
                  } else {
                    expect(job).to.be.equal(null);
                  }
                })
              );

              resolve();
            }
          });
        });
      });

      it('should keep specified number of jobs after completed with global removeOnFail', async () => {
        const keepJobs = 3;

        const localQueue = await utils.newQueue('test-' + uuid.v4(), {
          defaultJobOptions: {
            removeOnFail: keepJobs
          }
        });
        localQueue.process(() => {
          throw Error('error');
        });

        const datas = [0, 1, 2, 3, 4, 5, 6, 7, 8];

        const jobIds = await Promise.all(
          datas.map(async data => (await localQueue.add(data)).id)
        );

        return new Promise((resolve, reject) => {
          localQueue.on('failed', async job => {
            if (job.data == 8) {
              try {
                const counts = await localQueue.getJobCounts();
                expect(counts.failed).to.be.equal(keepJobs);

                await Promise.all(
                  jobIds.map(async (jobId, index) => {
                    const job = await localQueue.getJob(jobId);
                    if (index >= datas.length - keepJobs) {
                      expect(job).to.not.be.equal(null);
                    } else {
                      expect(job).to.be.equal(null);
                    }
                  })
                );
              } catch (err) {
                reject(err);
              }

              resolve();
            }
          });
        });
      });
    });

    it('process a lifo queue', function(done) {
      this.timeout(3000);
      let currentValue = 0,
        first = true;
      utils.newQueue('test lifo').then(queue2 => {
        queue2.process((job, jobDone) => {
          // Catching the job before the pause
          expect(job.data.count).to.be.equal(currentValue--);
          jobDone();
          if (first) {
            first = false;
          } else if (currentValue === 0) {
            done();
          }
        });

        queue2.pause().then(() => {
          // Add a series of jobs in a predictable order
          const jobs = [
            { count: ++currentValue },
            { count: ++currentValue },
            { count: ++currentValue },
            { count: ++currentValue }
          ];
          return Promise.all(
            jobs.map(jobData => {
              return queue2.add(jobData, { lifo: true });
            })
          ).then(() => {
            queue2.resume();
          });
        });
      });
    });

    it('should processes jobs by priority', done => {
      const normalPriority = [];
      const mediumPriority = [];
      const highPriority = [];

      // for the current strategy this number should not exceed 8 (2^2*2)
      // this is done to maitain a deterministic output.
      const numJobsPerPriority = 6;

      for (let i = 0; i < numJobsPerPriority; i++) {
        normalPriority.push(queue.add({ p: 2 }, { priority: 2 }));
        mediumPriority.push(queue.add({ p: 3 }, { priority: 3 }));
        highPriority.push(queue.add({ p: 1 }, { priority: 1 }));
      }

      // wait for all jobs to enter the queue and then start processing
      Promise.all(normalPriority, mediumPriority, highPriority).then(() => {
        let currentPriority = 1;
        let counter = 0;
        let total = 0;

        queue.process((job, jobDone) => {
          expect(job.id).to.be.ok;
          expect(job.data.p).to.be.eql(currentPriority);
          jobDone();

          total++;
          if (++counter === numJobsPerPriority) {
            currentPriority++;
            counter = 0;

            if (currentPriority === 4 && total === numJobsPerPriority * 3) {
              done();
            }
          }
        });
      }, done);
    });

    it('process several jobs serially', function(done) {
      this.timeout(12000);
      let counter = 1;
      const maxJobs = 35;

      queue.process((job, jobDone) => {
        expect(job.data.num).to.be.equal(counter);
        expect(job.data.foo).to.be.equal('bar');
        jobDone();
        if (counter === maxJobs) {
          done();
        }
        counter++;
      });

      for (let i = 1; i <= maxJobs; i++) {
        queue.add({ foo: 'bar', num: i });
      }
    });

    describe('when job has been added again', () => {
      it('emits global duplicated event', async () => {
        queue.process(
          async () => {
            await delay(50);
            await queue.add({ foo: 'bar' }, { jobId: 'a1' });
            await delay(50);
          }
        );
  
        await queue.add({ foo: 'bar' }, { jobId: 'a1' });
    
        await new Promise(resolve => {
          queue.once('global:duplicated', (jobId) => {
            expect(jobId).to.be.equal('a1');
            resolve();
          });
        });
      });

      it('emits duplicated event', async () => {
        queue.process(
          async () => {
            await delay(50);
            await queue.add({ foo: 'bar' }, { jobId: 'a1' });
            await delay(50);
          }
        );
  
        await queue.add({ foo: 'bar' }, { jobId: 'a1' });
    
        await new Promise(resolve => {
          queue.once('duplicated', (jobId) => {
            expect(jobId).to.be.equal('a1');
            resolve();
          });
        });
      });
    });

    describe('when job is debounced when added again with same debounce id', () => {
      describe('when ttl is provided', () => {
        it('used a fixed time period and emits debounced event', async () => {
          const job = await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
  
          let debouncedCounter = 0;
          let secondJob = null;
          queue.on('debounced', (jobId) => {
            if (debouncedCounter > 1) {
              expect(jobId).to.be.equal(secondJob.id);
            } else {
              expect(jobId).to.be.equal(job.id);
            }
            debouncedCounter++;
          });
  
          await delay(1000);
          await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await delay(1100);
          secondJob = await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await delay(100);
  
          expect(debouncedCounter).to.be.equal(4);
        });
      });

      describe('when removing debounced job',  () => {
        it('removes debounce key', async ()=> {
          const job = await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );

          let debouncedCounter = 0;
          queue.on('debounced', () => {
            debouncedCounter++;
          });
          await job.remove();

          await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await delay(1000);
          await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await delay(1100);
          const secondJob = await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await secondJob.remove();

          await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1', ttl: 2000 } },
          );
          await delay(100);

          expect(debouncedCounter).to.be.equal(2);
        });
      });

      describe('when ttl is not provided',  ()=> {
        it('waits until job is finished before removing debounce key', async  ()=> {
          queue.process(
            async () => {
              await delay(100);
              await queue.add(
                { foo: 'bar' },
                { debounce: { id: 'a1' } },
              );
              await delay(100);
              await queue.add(
                { foo: 'bar' },
                { debounce: { id: 'a1' } },
              );
              await delay(100);
            }
          );
      
          let debouncedCounter = 0;
  
          const completing = new Promise(resolve => {
            queue.once('completed', ({ id }) => {
              expect(id).to.be.equal('1');
              resolve();
            });
  
            queue.on('debounced', () => {
              debouncedCounter++;
            });
          });
    
          await queue.add({ foo: 'bar' }, { debounce: { id: 'a1' } });
  
          await completing;
  
          const secondJob = await queue.add(
            { foo: 'bar' },
            { debounce: { id: 'a1' } },
          );
  
          const count = await queue.getJobCountByTypes();
  
          expect(count).to.be.eql(2);
  
          expect(debouncedCounter).to.be.equal(2);
          expect(secondJob.id).to.be.equal('4');
        });
      });  
    });

    it('process a job that updates progress', done => {
      queue.process((job, jobDone) => {
        expect(job.data.foo).to.be.equal('bar');
        job.progress(42);
        jobDone();
      });

      queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);

      queue.on('progress', (job, progress) => {
        expect(job).to.be.ok;
        expect(progress).to.be.eql(42);
        done();
      });
    });

    it('process a job that updates progress with an object', done => {
      queue.process((job, jobDone) => {
        expect(job.data.foo).to.be.equal('bar');
        job.progress({ myvalue: 42 });
        jobDone();
      });

      queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);

      queue.on('progress', (job, progress) => {
        expect(job).to.be.ok;
        expect(progress).to.be.eql({ myvalue: 42 });
        done();
      });
    });

    it('process a job that updates progress with an object emits a global event', done => {
      let jobId;
      queue.process((job, jobDone) => {
        expect(job.data.foo).to.be.equal('bar');
        job.progress({ myvalue: 42 });
        jobDone();
      });

      queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
          jobId = job.id;
        })
        .catch(done);

      queue.on('global:progress', (_jobId, progress) => {
        expect(jobId).to.be.eql(_jobId);
        expect(progress).to.be.eql({ myvalue: 42 });
        done();
      });
    });

    it('process a job that returns data in the process handler', done => {
      queue.process((job, jobDone) => {
        expect(job.data.foo).to.be.equal('bar');
        jobDone(null, 37);
      });

      queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);

      queue.on('completed', (job, data) => {
        expect(job).to.be.ok;
        expect(data).to.be.eql(37);
        queue.getJob(job.id).then(job => {
          expect(job.returnvalue).to.be.eql(37);
          done();
        });
      });
    });

    it('process a job that returns a string in the process handler', done => {
      const testString = 'a very dignified string';
      queue.on('completed', (job /*, data*/) => {
        expect(job).to.be.ok;
        expect(job.returnvalue).to.be.equal(testString);
        setTimeout(() => {
          queue
            .getJob(job.id)
            .then(job => {
              expect(job).to.be.ok;
              expect(job.returnvalue).to.be.equal(testString);
              done();
            })
            .catch(done);
        }, 100);
      });

      queue.process((/*job*/) => {
        return Promise.resolve(testString);
      });

      queue.add({ testing: true });
    });

    it('process a job that returns data in the process handler and the returnvalue gets stored in the database', done => {
      queue.process((job, jobDone) => {
        expect(job.data.foo).to.be.equal('bar');
        jobDone(null, 37);
      });

      queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);

      queue.on('completed', (job, data) => {
        expect(job).to.be.ok;
        expect(data).to.be.eql(37);
        queue.getJob(job.id).then(job => {
          expect(job.returnvalue).to.be.eql(37);
          queue.client.hget(queue.toKey(job.id), 'returnvalue').then(retval => {
            expect(JSON.parse(retval)).to.be.eql(37);
            done();
          });
        });
      });
    });

    it('process a job that returns a promise', done => {
      queue.process(job => {
        expect(job.data.foo).to.be.equal('bar');
        return delay(250).then(() => {
          return 'my data';
        });
      });

      queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);

      queue.on('completed', (job, data) => {
        expect(job).to.be.ok;
        expect(data).to.be.eql('my data');
        done();
      });
    });

    it('process a job that returns data in a promise', done => {
      queue.process(job => {
        expect(job.data.foo).to.be.equal('bar');
        return delay(250, { value: 42 });
      });

      queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);

      queue.on('completed', (job, data) => {
        expect(job).to.be.ok;
        expect(data).to.be.eql(42);
        done();
      });
    });

    it('process a synchronous job', done => {
      queue.process(job => {
        expect(job.data.foo).to.be.equal('bar');
      });

      queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);

      queue.on('completed', job => {
        expect(job).to.be.ok;
        done();
      });
    });

    it('process stalled jobs when starting a queue', function(done) {
      this.timeout(6000);
      utils
        .newQueue('test queue stalled', {
          settings: {
            lockDuration: 15,
            lockRenewTime: 5,
            stalledInterval: 100
          }
        })
        .then(queueStalled => {
          const jobs = [
            queueStalled.add({ bar: 'baz' }),
            queueStalled.add({ bar1: 'baz1' }),
            queueStalled.add({ bar2: 'baz2' }),
            queueStalled.add({ bar3: 'baz3' })
          ];
          Promise.all(jobs).then(() => {
            const afterJobsRunning = function() {
              const stalledCallback = sandbox.spy();
              return queueStalled
                .close(true)
                .then(() => {
                  return new Promise((resolve, reject) => {
                    utils
                      .newQueue('test queue stalled', {
                        settings: {
                          stalledInterval: 100
                        }
                      })
                      .then(queue2 => {
                        const doneAfterFour = _.after(4, () => {
                          try {
                            expect(stalledCallback.calledOnce).to.be.eql(true);
                            queue.close().then(resolve);
                          } catch (e) {
                            queue.close().then(() => {
                              reject(e);
                            });
                          }
                        });
                        queue2.on('completed', doneAfterFour);
                        queue2.on('stalled', stalledCallback);

                        queue2.process((job, jobDone2) => {
                          jobDone2();
                        });
                      });
                  });
                })
                .then(done, done);
            };

            const onceRunning = _.once(afterJobsRunning);
            queueStalled.process(() => {
              onceRunning();
              return delay(150);
            });
          });
        });
    });

    it('processes jobs that were added before the queue backend started', () => {
      return utils
        .newQueue('test queue added before', {
          settings: {
            lockRenewTime: 10
          }
        })
        .then(queueStalled => {
          const jobs = [
            queueStalled.add({ bar: 'baz' }),
            queueStalled.add({ bar1: 'baz1' }),
            queueStalled.add({ bar2: 'baz2' }),
            queueStalled.add({ bar3: 'baz3' })
          ];

          return Promise.all(jobs)
            .then(queueStalled.close.bind(queueStalled))
            .then(() => {
              return utils.newQueue('test queue added before').then(queue2 => {
                queue2.process((job, jobDone) => {
                  jobDone();
                });

                return new Promise(resolve => {
                  const resolveAfterAllJobs = _.after(jobs.length, resolve);
                  queue2.on('completed', resolveAfterAllJobs);
                });
              });
            });
        });
    });

    it('process a named job that returns a promise', done => {
      queue.process('myname', job => {
        expect(job.data.foo).to.be.equal('bar');
        return delay(250).then(() => {
          return 'my data';
        });
      });

      queue
        .add('myname', { foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);

      queue.on('completed', (job, data) => {
        expect(job).to.be.ok;
        expect(data).to.be.eql('my data');
        done();
      });
    });

    it('process a two named jobs that returns a promise', done => {
      queue.process('myname', job => {
        expect(job.data.foo).to.be.equal('bar');
        return delay(250).then(() => {
          return 'my data';
        });
      });

      queue.process('myname2', job => {
        expect(job.data.baz).to.be.equal('qux');
        return delay(250).then(() => {
          return 'my data 2';
        });
      });

      queue
        .add('myname', { foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .then(() => {
          return queue.add('myname2', { baz: 'qux' });
        })
        .catch(done);

      let one, two;
      queue.on('completed', (job, data) => {
        expect(job).to.be.ok;
        if (job.data.foo) {
          one = true;
          expect(data).to.be.eql('my data');
        }
        if (job.data.baz) {
          two = true;
          expect(data).to.be.eql('my data 2');
        }
        if (one && two) {
          done();
        }
      });
    });

    it('process all named jobs from one process function', done => {
      queue.process('*', job => {
        expect(job.data).to.be.ok;
        return delay(250).then(() => {
          return 'my data';
        });
      });

      queue.add('job_a', { foo: 'bar' }).then(job => {
        expect(job.id).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
      });

      queue.add('job_b', { baz: 'qux' }).then(job => {
        expect(job.id).to.be.ok;
        expect(job.data.baz).to.be.eql('qux');
      });

      let one, two;
      queue.on('completed', (job, data) => {
        expect(job).to.be.ok;
        if (job.data.foo) {
          one = true;
          expect(data).to.be.eql('my data');
        }
        if (job.data.baz) {
          two = true;
          expect(data).to.be.eql('my data');
        }
        if (one && two) {
          done();
        }
      });
    });

    it('fails job if missing named process', done => {
      queue.process((/*job*/) => {
        done(Error('should not process this job'));
      });

      queue.once('failed', (/*err*/) => {
        done();
      });

      queue.add('myname', { foo: 'bar' }).then(job => {
        expect(job.id).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
      });
    });

    it('should wait for all jobs when closing queue with named processors', async () => {
      let processedA = false;

      const startProcessing = new Promise(resolve => {
        queue.process('jobA', async () => {
          resolve();
          return new Promise(resolve => {
            setTimeout(() => {
              processedA = true;
              resolve();
            }, 500);
          });
        });
      });

      queue.process('jobB', async () => {});

      queue.add('jobA', {});

      await startProcessing;

      expect(processedA).to.be.eq(false);

      await queue.close();

      expect(processedA).to.be.eq(true);
    });

    it('processes several stalled jobs when starting several queues', function(done) {
      this.timeout(50000);

      const NUM_QUEUES = 10;
      const NUM_JOBS_PER_QUEUE = 10;
      const stalledQueues = [];
      const jobs = [];
      const redisOpts = { port: 6379, host: '127.0.0.1' };

      for (let i = 0; i < NUM_QUEUES; i++) {
        const queueStalled2 = new Queue('test queue stalled 2', {
          redis: redisOpts,
          settings: {
            lockDuration: 30,
            lockRenewTime: 10,
            stalledInterval: 100
          }
        });

        for (let j = 0; j < NUM_JOBS_PER_QUEUE; j++) {
          jobs.push(queueStalled2.add({ job: j }));
        }

        stalledQueues.push(queueStalled2);
      }

      const closeStalledQueues = function() {
        return Promise.all(
          stalledQueues.map(queue => {
            return queue.close(true);
          })
        );
      };

      Promise.all(jobs).then(() => {
        let processed = 0;
        const procFn = function() {
          // instead of completing we just close the queue to simulate a crash.
          utils.simulateDisconnect(this);
          processed++;
          if (processed === stalledQueues.length) {
            setTimeout(() => {
              const queue2 = new Queue('test queue stalled 2', {
                redis: redisOpts,
                settings: { stalledInterval: 100 }
              });
              queue2.on('error', err => {
                done(err);
              });
              queue2.process((job2, jobDone) => {
                jobDone();
              });

              let counter = 0;
              queue2.on('completed', () => {
                counter++;
                if (counter === NUM_QUEUES * NUM_JOBS_PER_QUEUE) {
                  queue2.close().then(done);

                  closeStalledQueues().then(() => {
                    // This can take long time since queues are disconnected.
                  });
                }
              });
            }, 100);
          }
        };

        const processes = [];
        stalledQueues.forEach(queue => {
          queue.on('error', (/*err*/) => {
            //
            // Swallow errors produced by the disconnect
            //
          });
          processes.push(queue.process(procFn));
        });
        return Promise.all(processes);
      });
    });

    it('does not process a job that is being processed when a new queue starts', function(done) {
      this.timeout(12000);
      let err = null;
      let anotherQueue;

      queue.on('completed', () => {
        utils.cleanupQueue(anotherQueue).then(done.bind(null, err));
      });

      queue.add({ foo: 'bar' }).then(addedJob => {
        queue
          .process((job, jobDone) => {
            expect(job.data.foo).to.be.equal('bar');

            if (addedJob.id !== job.id) {
              err = new Error(
                'Processed job id does not match that of added job'
              );
            }
            setTimeout(jobDone, 500);
          })
          .catch(done);

        utils.newQueue().then(_anotherQueue => {
          anotherQueue = _anotherQueue;
          setTimeout(() => {
            anotherQueue.process((job, jobDone) => {
              err = new Error(
                'The second queue should not have received a job to process'
              );
              jobDone();
            });
          }, 50);
        });
      });
    });

    it('process stalled jobs without requiring a queue restart', function(done) {
      this.timeout(12000);

      const queue2 = utils.buildQueue('running-stalled-job-' + uuid.v4(), {
        settings: {
          lockRenewTime: 5000,
          lockDuration: 500,
          stalledInterval: 1000
        }
      });

      const collect = _.after(2, () => {
        queue2.close().then(done);
      });

      queue2.on('completed', () => {
        const client = new redis();
        client
          .multi()
          .zrem(queue2.toKey('completed'), 1)
          .lpush(queue2.toKey('active'), 1)
          .exec();
        client.quit();
        collect();
      });

      queue2.process((job, jobDone) => {
        expect(job.data.foo).to.be.equal('bar');
        jobDone();
      });

      queue2
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);
    });

    it('failed stalled jobs that stall more than allowable stalled limit', function(done) {
      const FAILED_MESSAGE = 'job stalled more than allowable limit';
      this.timeout(10000);

      const queue2 = utils.buildQueue('running-stalled-job-' + uuid.v4(), {
        settings: {
          lockRenewTime: 2500,
          lockDuration: 250,
          stalledInterval: 500,
          maxStalledCount: 1
        }
      });

      let processedCount = 0;
      queue2.process(job => {
        processedCount++;
        expect(job.data.foo).to.be.equal('bar');
        return delay(1500);
      });

      queue2.on('completed', () => {
        done(new Error('should not complete'));
      });

      queue2.on('failed', (job, err) => {
        expect(processedCount).to.be.eql(2);
        expect(job.failedReason).to.be.eql(FAILED_MESSAGE);
        expect(err.message).to.be.eql(FAILED_MESSAGE);
        done();
      });

      queue2
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);
    });

    it('removes failed stalled jobs that stall more than allowable stalled limit when removeOnFail is present', function(done) {
      const FAILED_MESSAGE = 'job stalled more than allowable limit';
      this.timeout(10000);

      const queue2 = utils.buildQueue('running-stalled-job-' + uuid.v4(), {
        settings: {
          lockRenewTime: 2500,
          lockDuration: 250,
          stalledInterval: 500,
          maxStalledCount: 1
        }
      });

      let processedCount = 0;
      queue2.process(job => {
        processedCount++;
        expect(job.data.foo).to.be.equal('bar');
        return delay(1500);
      });

      queue2.on('completed', () => {
        done(new Error('should not complete'));
      });

      queue2.on('failed', (job, err) => {
        expect(processedCount).to.be.eql(2);
        expect(job).to.be.null;
        expect(err.message).to.be.eql(FAILED_MESSAGE);
        done();
      });

      queue2
        .add({ foo: 'bar' }, { removeOnFail: true })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .catch(done);
    });

    it('should clear job from stalled set when job completed', done => {
      const queue2 = utils.buildQueue('running-job-' + uuid.v4(), {
        settings: {
          stalledInterval: 10
        }
      });

      queue2.process(job => {
        expect(job.data.foo).to.be.equal('bar');
        return delay(100);
      });

      queue2.add({ foo: 'bar' }).then(
        job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        },
        err => {
          done(err);
        }
      );

      queue2.once('completed', async () => {
        const stalled = await queue2.getStalledCount();
        try {
          expect(stalled).to.be.equal(0);
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('process a job that fails', done => {
      const jobError = new Error('Job Failed');

      queue.process((job, jobDone) => {
        expect(job.data.foo).to.be.equal('bar');
        jobDone(jobError);
      });

      queue.add({ foo: 'bar' }).then(
        job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        },
        err => {
          done(err);
        }
      );

      queue.once('failed', (job, err) => {
        expect(job.id).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
        expect(err).to.be.eql(jobError);
        done();
      });
    });

    it('process a job that throws an exception', done => {
      const jobError = new Error('Job Failed');

      queue.process(job => {
        expect(job.data.foo).to.be.equal('bar');
        throw jobError;
      });

      queue.add({ foo: 'bar' }).then(
        job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        },
        err => {
          done(err);
        }
      );

      queue.once('failed', (job, err) => {
        expect(job).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
        expect(err).to.be.eql(jobError);
        done();
      });
    });

    it('process a job that returns data with a circular dependency', done => {
      queue.on('failed', () => {
        done();
      });
      queue.on('completed', () => {
        done(Error('Should not complete'));
      });
      queue.process(() => {
        const circular = {};
        circular.x = circular;
        return Promise.resolve(circular);
      });

      queue.add({ foo: 'bar' });
    });

    it('process a job that returns a rejected promise', done => {
      const jobError = new Error('Job Failed');

      queue.process(job => {
        expect(job.data.foo).to.be.equal('bar');
        return Promise.reject(jobError);
      });

      queue.add({ foo: 'bar' }).then(
        job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        },
        err => {
          done(err);
        }
      );

      queue.once('failed', (job, err) => {
        expect(job.id).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
        expect(err).to.be.eql(jobError);
        done();
      });
    });

    it('process a job that rejects with a nested error', done => {
      const cause = new Error('cause');
      const jobError = new Error('wrapper');
      jobError.cause = function() {
        return cause;
      };

      queue.process(job => {
        expect(job.data.foo).to.be.equal('bar');
        return Promise.reject(jobError);
      });

      queue.add({ foo: 'bar' }).then(
        job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        },
        err => {
          done(err);
        }
      );

      queue.once('failed', (job, err) => {
        expect(job.id).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
        expect(err).to.be.eql(jobError);
        expect(err.cause()).to.be.eql(cause);
        done();
      });
    });

    // Skipped since the test is unstable and difficult to understand.
    it.skip('does not renew a job lock after the lock has been released [#397]', function() {
      this.timeout(queue.LOCK_RENEW_TIME * 4);

      const processing = queue.process(job => {
        expect(job.data.foo).to.be.equal('bar');
        return Promise.resolve();
      });

      const emit = queue.emit.bind(queue);
      queue.emit = function() {
        const args = arguments;
        return delay(queue.LOCK_RENEW_TIME * 2).then(() => {
          return emit.apply(null, args);
        });
      };

      setTimeout(queue.close.bind(queue), queue.LOCK_RENEW_TIME * 2.5);

      return queue
        .add({ foo: 'bar' })
        .then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
        })
        .then(() => {
          return processing;
        });
    });

    it('retry a job that fails', done => {
      let called = 0;
      let failedOnce = false;
      const notEvenErr = new Error('Not even!');

      const retryQueue = utils.buildQueue('retry-test-queue');

      retryQueue.add({ foo: 'bar' }).then(job => {
        expect(job.id).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
      });

      retryQueue.process((job, jobDone) => {
        called++;
        if (called % 2 !== 0) {
          throw notEvenErr;
        }
        jobDone();
      });

      retryQueue.once('failed', (job, err) => {
        expect(job).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
        expect(err).to.be.eql(notEvenErr);
        failedOnce = true;
        retryQueue.retryJob(job);
      });

      retryQueue.once('completed', () => {
        expect(failedOnce).to.be.eql(true);
        retryQueue.close().then(done);
      });
    });

    it('retry a job that fails on a paused queue moves the job to paused', async () => {
      let called = 0;
      let failedOnce = false;
      const notEvenErr = new Error('Not even!');

      const retryQueue = utils.buildQueue('retry-test-queue');

      const job = await retryQueue.add({ foo: 'bar' });
      expect(job.id).to.be.ok;
      expect(job.data.foo).to.be.eql('bar');

      retryQueue.process((job, jobDone) => {
        called++;
        if (called % 2 !== 0) {
          throw notEvenErr;
        }
        jobDone();
      });

      const failed = new Promise(resolve => {
        retryQueue.once('failed', async (job, err) => {
          expect(job).to.be.ok;
          expect(job.data.foo).to.be.eql('bar');
          expect(err).to.be.eql(notEvenErr);
          failedOnce = true;
          resolve();
        });
      });

      await failed;

      await retryQueue.pause();

      await retryQueue.retryJob(job);

      const pausedJobs = await retryQueue.getJobs(['paused']);
      expect(pausedJobs).to.have.length(1);

      await retryQueue.resume();

      const completed = new Promise(resolve => {
        retryQueue.once('completed', () => {
          expect(failedOnce).to.be.eql(true);
          retryQueue.close().then(resolve);
        });
      });

      await completed;
    });

    it('retry a job that fails using job retry method', done => {
      let called = 0;
      let failedOnce = false;
      const notEvenErr = new Error('Not even!');

      const retryQueue = utils.buildQueue('retry-test-queue');

      retryQueue.add({ foo: 'bar' }).then(job => {
        expect(job.id).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
      });

      retryQueue.process((job, jobDone) => {
        called++;
        if (called % 2 !== 0) {
          throw notEvenErr;
        }
        jobDone();
      });

      retryQueue.once('failed', (job, err) => {
        expect(job).to.be.ok;
        expect(job.data.foo).to.be.eql('bar');
        expect(err).to.be.eql(notEvenErr);
        failedOnce = true;
        job.retry().then(() => {
          expect(job.failedReason).to.be.null;
          expect(job.processedOn).to.be.null;
          expect(job.finishedOn).to.be.null;

          retryQueue.getJob(job.id).then(updatedJob => {
            expect(updatedJob.failedReason).to.be.undefined;
            expect(updatedJob.processedOn).to.be.undefined;
            expect(updatedJob.finishedOn).to.be.undefined;
          });
        });
      });

      retryQueue.once('completed', () => {
        expect(failedOnce).to.be.eql(true);
        retryQueue.close().then(done);
      });
    });
  });

  describe('Delayed jobs', () => {
    let queue;

    beforeEach(() => {
      const client = new redis();
      return client.flushdb();
    });

    it('should process a delayed job only after delayed time', done => {
      const delay = 500;
      queue = new Queue('delayed queue simple');
      const client = new redis(6379, '127.0.0.1', {});
      const timestamp = Date.now();
      let publishHappened = false;
      client.on('ready', () => {
        client.on('message', (channel, message) => {
          expect(parseInt(message, 10)).to.be.a('number');
          publishHappened = true;
        });
        client.subscribe(queue.toKey('delayed'));
      });

      queue.process((job, jobDone) => {
        jobDone();
      });

      queue.on('completed', () => {
        expect(Date.now() > timestamp + delay);
        queue
          .getWaiting()
          .then(jobs => {
            expect(jobs.length).to.be.equal(0);
          })
          .then(() => {
            return queue.getDelayed().then(jobs => {
              expect(jobs.length).to.be.equal(0);
            });
          })
          .then(() => {
            expect(publishHappened).to.be.eql(true);
            queue.close(true).then(done, done);
          });
      });

      queue._initializingProcess.then(() => {
        queue.add({ delayed: 'foobar' }, { delay }).then(job => {
          expect(job.id).to.be.ok;
          expect(job.data.delayed).to.be.eql('foobar');
          expect(job.delay).to.be.eql(delay);
        });
      });
    });

    it('should process delayed jobs in correct order', done => {
      let order = 0;
      queue = new Queue('delayed queue multiple');

      queue.on('failed', (job, err) => {
        err.job = job;
        done(err);
      });

      queue.process((job, jobDone) => {
        order++;
        expect(order).to.be.equal(job.data.order);
        jobDone();
        if (order === 10) {
          queue.close().then(done, done);
        }
      });

      queue.add({ order: 1 }, { delay: 100 });
      queue.add({ order: 6 }, { delay: 600 });
      queue.add({ order: 10 }, { delay: 1000 });
      queue.add({ order: 2 }, { delay: 200 });
      queue.add({ order: 9 }, { delay: 900 });
      queue.add({ order: 5 }, { delay: 500 });
      queue.add({ order: 3 }, { delay: 300 });
      queue.add({ order: 7 }, { delay: 700 });
      queue.add({ order: 4 }, { delay: 400 });
      queue.add({ order: 8 }, { delay: 800 });
    });

    it('should process delayed jobs in correct order even in case of restart', function(done) {
      this.timeout(15000);

      const QUEUE_NAME = 'delayed queue multiple' + uuid.v4();
      let order = 1;

      queue = new Queue(QUEUE_NAME);

      const fn = function(job, jobDone) {
        expect(order).to.be.equal(job.data.order);
        jobDone();

        if (order === 4) {
          queue.close().then(done, done);
        }

        order++;
      };

      Promise.all([
        queue.add({ order: 2 }, { delay: 300 }),
        queue.add({ order: 4 }, { delay: 500 }),
        queue.add({ order: 1 }, { delay: 200 }),
        queue.add({ order: 3 }, { delay: 400 })
      ])
        .then(() => {
          //
          // Start processing so that jobs get into the delay set.
          //
          queue.process(fn);
          return delay(20);
        })
        .then(() => {
          /*
        //We simulate a restart
        console.log('RESTART');
        return queue.close().then(function () {
          console.log('CLOSED');
          return delay(100).then(function () {
            queue = new Queue(QUEUE_NAME);
            queue.process(fn);
          });
        });
        */
        });
    });

    it('should process delayed jobs with exact same timestamps in correct order (FIFO)', done => {
      const QUEUE_NAME = 'delayed queue multiple' + uuid.v4();
      queue = new Queue(QUEUE_NAME);
      let order = 1;

      const fn = function(job, jobDone) {
        expect(order).to.be.equal(job.data.order);
        jobDone();

        if (order === 12) {
          queue.close().then(done, done);
        }

        order++;
      };

      queue.isReady().then(() => {
        const now = Date.now();
        const _promises = [];
        let _i = 1;
        for (_i; _i <= 12; _i++) {
          _promises.push(
            queue.add(
              { order: _i },
              {
                delay: 1000,
                timestamp: now
              }
            )
          );
        }
        Promise.all(_promises).then(() => {
          queue.process(fn);
        });
      });
    });

    it('an unlocked job should not be moved to delayed', done => {
      const queue = new Queue('delayed queue');
      let job;

      queue.process((_job, callback) => {
        // Release the lock to simulate the event loop stalling (so failure to renew the lock).
        job = _job;
        job.releaseLock().then(() => {
          // Once it's failed, it should NOT be moved to delayed since this worker lost the lock.
          callback(new Error('retry this job'));
        });
      });

      queue.on('error', (/*err*/) => {
        job.isDelayed().then(isDelayed => {
          expect(isDelayed).to.be.equal(false);
          queue.close().then(done, done);
        });
      });

      queue.add({ foo: 'bar' }, { backoff: 1000, attempts: 2 });
    });

    it('an unlocked job should not be moved to waiting', done => {
      const queue = new Queue('delayed queue');
      let job;

      queue.process((_job, callback) => {
        job = _job;
        // Release the lock to simulate the event loop stalling (so failure to renew the lock).
        job.releaseLock().then(() => {
          // Once it's failed, it should NOT be moved to waiting since this worker lost the lock.
          callback(new Error('retry this job'));
        });
      });

      queue.on('error', (/*err*/) => {
        job.isWaiting().then(isWaiting => {
          expect(isWaiting).to.be.equal(false);
          queue.close().then(done, done);
        });
      });

      // Note that backoff:0 should immediately retry the job upon failure (ie put it in 'waiting')
      queue.add({ foo: 'bar' }, { backoff: 0, attempts: 2 });
    });
  });

  describe('Concurrency process', () => {
    let queue;

    beforeEach(() => {
      const client = new redis();
      queue = utils.buildQueue();
      return client.flushdb();
    });

    afterEach(function() {
      this.timeout(
        queue.settings.stalledInterval * (1 + queue.settings.maxStalledCount)
      );
      return queue.close();
    });

    it('should run job in sequence if I specify a concurrency of 1', done => {
      let processing = false;

      queue.process(1, (job, jobDone) => {
        expect(processing).to.be.equal(false);
        processing = true;
        delay(50).then(() => {
          processing = false;
          jobDone();
        });
      });

      queue.add({});
      queue.add({});

      queue.on(
        'completed',
        _.after(2, () => done())
      );
    });

    //This job use delay to check that at any time we have 4 process in parallel.
    //Due to time to get new jobs and call process, false negative can appear.
    it('should process job respecting the concurrency set', done => {
      let nbProcessing = 0;
      let pendingMessageToProcess = 8;
      let wait = 100;

      queue
        .process(4, () => {
          nbProcessing++;
          expect(nbProcessing).to.be.lessThan(5);

          wait += 100;

          return delay(wait).then(() => {
            //We should not have 4 more in parallel.
            //At the end, due to empty list, no new job will process, so nbProcessing will decrease.
            expect(nbProcessing).to.be.eql(
              Math.min(pendingMessageToProcess, 4)
            );
            pendingMessageToProcess--;
            nbProcessing--;
          });
        })
        .catch(done);

      queue.add();
      queue.add();
      queue.add();
      queue.add();
      queue.add();
      queue.add();
      queue.add();
      queue.add();

      queue.on('completed', _.after(8, done.bind(null, null)));
      queue.on('failed', done);
    });

    it('should wait for all concurrent processing in case of pause', done => {
      let i = 0;
      let nbJobFinish = 0;

      queue
        .process(3, (job, jobDone) => {
          let error = null;

          if (++i === 4) {
            queue.pause().then(() => {
              delay(500).then(() => {
                // Wait for all the active jobs to finalize.
                expect(nbJobFinish).to.be.above(3);
                queue.resume();
              });
            });
          }

          // We simulate an error of one processing job.
          // They had a bug in pause() with this special case.
          if (i % 3 === 0) {
            error = new Error();
          }

          //100 - i*20 is to force to finish job n°4 before lower job that will wait longer
          delay(100 - i * 10).then(() => {
            nbJobFinish++;
            jobDone(error);
          });
        })
        .catch(done);

      queue.add({});
      queue.add({});
      queue.add({});
      queue.add({});
      queue.add({});
      queue.add({});
      queue.add({});
      queue.add({});

      const cb = _.after(8, done.bind(null, null));
      queue.on('completed', cb);
      queue.on('failed', cb);
      queue.on('error', done);
    });
  });

  describe('Retries and backoffs', () => {
    let queue;

    afterEach(function() {
      this.timeout(
        queue.settings.stalledInterval * (1 + queue.settings.maxStalledCount)
      );
      return queue.close();
    });

    it('should not retry a job if it has been marked as unrecoverable', done => {
      let tries = 0;
      queue = utils.buildQueue('test retries and backoffs');
      queue.isReady().then(() => {
        queue.process((job, jobDone) => {
          tries++;
          expect(tries).to.equal(1);
          job.discard();
          jobDone(new Error('unrecoverable error'));
        });

        queue.add(
          { foo: 'bar' },
          {
            attempts: 5
          }
        );
      });
      queue.on('failed', () => {
        done();
      });
    });

    it('should automatically retry a failed job if attempts is bigger than 1', done => {
      queue = utils.buildQueue('test retries and backoffs');
      queue.isReady().then(() => {
        let tries = 0;
        queue.process((job, jobDone) => {
          expect(job.attemptsMade).to.be.eql(tries);
          tries++;
          if (job.attemptsMade < 2) {
            throw new Error('Not yet!');
          }

          jobDone();
        });

        queue.add(
          { foo: 'bar' },
          {
            attempts: 3
          }
        );
      });
      queue.on('completed', () => {
        done();
      });
    });

    describe('when job has more priority than delayed jobs', () => {
      it('executes retried job first', done => {
        queue = utils.buildQueue('test retries and priority');
        let id = 0;
        queue.isReady().then(() => {
          queue.process(async job => {
            await delay(200);
            if (job.attemptsMade === 0) {
              id++;
              expect(job.id).to.be.eql(`${id}`);
            }
            if (job.id == '1' && job.attemptsMade < 1) {
              throw new Error('Not yet!');
            }
          });

          queue.add(
            { foo: 'bar' },
            {
              attempts: 2,
              priority: 1
            }
          );
          queue.add(
            {},
            {
              delay: 200,
              priority: 2
            }
          );
          queue.add(
            {},
            {
              delay: 200,
              priority: 2
            }
          );
          queue.add(
            {},
            {
              delay: 200,
              priority: 2
            }
          );
        });
        let count = 0;
        queue.on('completed', () => {
          if (count++ === 3) {
            done();
          }
        });
      });
    });

    it('should not retry a failed job more than the number of given attempts times', done => {
      queue = utils.buildQueue('test retries and backoffs');
      let tries = 0;
      queue.isReady().then(() => {
        queue.process((job, jobDone) => {
          tries++;
          if (job.attemptsMade < 3) {
            throw new Error('Not yet!');
          }
          expect(job.attemptsMade).to.be.eql(tries - 1);
          jobDone();
        });

        queue.add(
          { foo: 'bar' },
          {
            attempts: 3
          }
        );
      });
      queue.on('completed', () => {
        done(new Error('Failed job was retried more than it should be!'));
      });
      queue.on('failed', () => {
        if (tries === 3) {
          done();
        }
      });
    });

    it('should retry a job after a delay if a fixed backoff is given', function(done) {
      this.timeout(12000);
      queue = utils.buildQueue('test retries and backoffs');
      let start;
      queue.isReady().then(() => {
        queue.process((job, jobDone) => {
          if (job.attemptsMade < 2) {
            throw new Error('Not yet!');
          }
          jobDone();
        });

        start = Date.now();
        queue.add(
          { foo: 'bar' },
          {
            attempts: 3,
            backoff: 1000
          }
        );
      });
      queue.on('completed', () => {
        const elapse = Date.now() - start;
        expect(elapse).to.be.greaterThan(2000);
        done();
      });
    });

    it('should retry a job after a delay if an exponential backoff is given', function(done) {
      this.timeout(12000);
      queue = utils.buildQueue('test retries and backoffs');
      let start;
      queue.isReady().then(() => {
        queue.process((job, jobDone) => {
          if (job.attemptsMade < 2) {
            throw new Error('Not yet!');
          }
          jobDone();
        });

        start = Date.now();
        queue.add(
          { foo: 'bar' },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000
            }
          }
        );
      });
      queue.on('completed', () => {
        const elapse = Date.now() - start;
        const expected = 1000 * (Math.pow(2, 2) - 1);
        expect(elapse).to.be.greaterThan(expected);
        done();
      });
    });

    it('should retry a job after a delay if a custom backoff is given', function(done) {
      this.timeout(12000);
      queue = utils.buildQueue('test retries and backoffs', {
        settings: {
          backoffStrategies: {
            custom(attemptsMade) {
              return attemptsMade * 1000;
            }
          }
        }
      });
      let start;
      queue.isReady().then(() => {
        queue.process((job, jobDone) => {
          if (job.attemptsMade < 2) {
            throw new Error('Not yet!');
          }
          jobDone();
        });

        start = Date.now();
        queue.add(
          { foo: 'bar' },
          {
            attempts: 3,
            backoff: {
              type: 'custom'
            }
          }
        );
      });
      queue.on('completed', () => {
        const elapse = Date.now() - start;
        expect(elapse).to.be.greaterThan(3000);
        done();
      });
    });

    it('should pass strategy options to custom backoff', function(done) {
      this.timeout(12000);
      queue = utils.buildQueue('test retries and backoffs', {
        settings: {
          backoffStrategies: {
            custom(attemptsMade, err, strategyOptions) {
              expect(strategyOptions.id).to.be.equal('FOO42');
              return attemptsMade * 1000;
            }
          }
        }
      });
      let start;
      queue.isReady().then(() => {
        queue.process((job, jobDone) => {
          if (job.attemptsMade < 2) {
            throw new Error('Not yet!');
          }
          jobDone();
        });

        start = Date.now();
        queue.add(
          { foo: 'bar' },
          {
            attempts: 3,
            backoff: {
              type: 'custom',
              options: {
                id: 'FOO42'
              }
            }
          }
        );
      });
      queue.on('completed', () => {
        const elapse = Date.now() - start;
        expect(elapse).to.be.greaterThan(3000);
        done();
      });
    });

    it('should not retry a job if the custom backoff returns -1', done => {
      queue = utils.buildQueue('test retries and backoffs', {
        settings: {
          backoffStrategies: {
            custom() {
              return -1;
            }
          }
        }
      });
      let tries = 0;
      queue.process((job, jobDone) => {
        tries++;
        if (job.attemptsMade < 3) {
          throw new Error('Not yet!');
        }
        jobDone();
      });

      queue.add(
        { foo: 'bar' },
        {
          attempts: 3,
          backoff: {
            type: 'custom'
          }
        }
      );
      queue.on('completed', () => {
        done(new Error('Failed job was retried more than it should be!'));
      });
      queue.on('failed', () => {
        if (tries === 1) {
          done();
        }
      });
    });

    it('should retry a job after a delay if a custom backoff is given based on the error thrown', function(done) {
      function CustomError() {}

      this.timeout(12000);
      queue = utils.buildQueue('test retries and backoffs', {
        settings: {
          backoffStrategies: {
            custom(attemptsMade, err) {
              if (err instanceof CustomError) {
                return 1500;
              }
              return 500;
            }
          }
        }
      });
      let start;
      queue.isReady().then(() => {
        queue.process((job, jobDone) => {
          if (job.attemptsMade < 2) {
            throw new CustomError('Hey, custom error!');
          }
          jobDone();
        });

        start = Date.now();
        queue.add(
          { foo: 'bar' },
          {
            attempts: 3,
            backoff: {
              type: 'custom'
            }
          }
        );
      });
      queue.on('completed', () => {
        const elapse = Date.now() - start;
        expect(elapse).to.be.greaterThan(3000);
        done();
      });
    });

    it('should be able to handle a custom backoff if it returns a promise', function(done) {
      this.timeout(12000);

      queue = utils.buildQueue('test retries and backoffs', {
        settings: {
          backoffStrategies: {
            async custom() {
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve(500);
                }, 500);
              });
            }
          }
        }
      });
      let start;
      queue.isReady().then(() => {
        queue.process((job, jobDone) => {
          if (job.attemptsMade < 2) {
            throw new Error('some error');
          }
          jobDone();
        });

        start = Date.now();
        queue.add(
          { foo: 'bar' },
          {
            attempts: 3,
            backoff: {
              type: 'custom'
            }
          }
        );
      });
      queue.on('completed', () => {
        const elapse = Date.now() - start;
        expect(elapse).to.be.greaterThan(2000);
        done();
      });
    });

    it('should not retry a job that has been removed', done => {
      queue = utils.buildQueue('retry a removed job');
      let attempts = 0;
      const failedError = new Error('failed');
      queue.process((job, jobDone) => {
        if (attempts === 0) {
          attempts++;
          throw failedError;
        } else {
          jobDone();
        }
      });
      queue.add({ foo: 'bar' });

      const failedHandler = _.once((job, err) => {
        expect(job.data.foo).to.equal('bar');
        expect(err).to.equal(failedError);
        expect(job.failedReason).to.equal(failedError.message);

        try {
          job
            .retry()
            .then(() => {
              return delay(100).then(() => {
                return queue.getCompletedCount().then(count => {
                  return expect(count).to.equal(1);
                });
              });
            })
            .then(() => {
              return queue.clean(0).then(() => {
                return job.retry().catch(err => {
                  expect(err.message).to.equal(
                    Queue.ErrorMessages.RETRY_JOB_NOT_EXIST
                  );
                });
              });
            })
            .then(() => {
              return Promise.all([
                queue.getCompletedCount().then(count => {
                  return expect(count).to.equal(0);
                }),
                queue.getFailedCount().then(count => {
                  return expect(count).to.equal(0);
                })
              ]);
            })
            .then(() => {
              done();
            }, done);
        } catch (err) {
          console.error(err);
        }
      });

      queue.on('failed', failedHandler);
    });

    it('should not retry a job that has been retried already', done => {
      queue = utils.buildQueue('retry already retried job');
      const failedError = new Error('failed');
      queue.isReady().then(() => {
        let attempts = 0;
        queue.process((job, jobDone) => {
          if (attempts === 0) {
            attempts++;
            throw failedError;
          } else {
            jobDone();
          }
        });

        queue.add({ foo: 'bar' });
      });

      const failedHandler = _.once((job, err) => {
        expect(job.data.foo).to.equal('bar');
        expect(err).to.equal(failedError);

        job
          .retry()
          .then(() => {
            return delay(100).then(() => {
              return queue.getCompletedCount().then(count => {
                return expect(count).to.equal(1);
              });
            });
          })
          .then(() => {
            return job.retry().catch(err => {
              expect(err.message).to.equal(
                Queue.ErrorMessages.RETRY_JOB_NOT_FAILED
              );
            });
          })
          .then(() => {
            return Promise.all([
              queue.getCompletedCount().then(count => {
                return expect(count).to.equal(1);
              }),
              queue.getFailedCount().then(count => {
                return expect(count).to.equal(0);
              })
            ]);
          })
          .then(() => {
            done();
          }, done);
      });

      queue.on('failed', failedHandler);
    });

    it('should not retry a job that is locked', done => {
      queue = utils.buildQueue('retry a locked job');
      const addedHandler = _.once(job => {
        expect(job.data.foo).to.equal('bar');

        delay(100).then(() => {
          job
            .retry()
            .catch(err => {
              expect(err.message).to.equal(
                Queue.ErrorMessages.RETRY_JOB_IS_LOCKED
              );
              return null;
            })
            .then(done, done);
        });
      });

      queue.process((/*job*/) => {
        return delay(300);
      });
      queue.add({ foo: 'bar' }).then(addedHandler);
    });

    it('an unlocked job should not be moved to failed', done => {
      queue = utils.buildQueue('test unlocked failed');

      queue.process((job, callback) => {
        // Release the lock to simulate the event loop stalling (so failure to renew the lock).
        job.releaseLock().then(() => {
          // Once it's failed, it should NOT be moved to failed since this worker lost the lock.
          callback(new Error('retry this job'));
        });
      });

      queue.on('failed', job => {
        job.isFailed().then(isFailed => {
          expect(isFailed).to.be.equal(false);
        });
      });

      queue.on('error', (/*err*/) => {
        queue.close().then(done, done);
      });

      // Note that backoff:0 should immediately retry the job upon failure (ie put it in 'waiting')
      queue.add({ foo: 'bar' }, { backoff: 0, attempts: 2 });
    });
  });

  describe('Drain queue', () => {
    it('should count zero after draining the queue', () => {
      const maxJobs = 100;
      const added = [];

      const queue = utils.buildQueue();

      for (let i = 1; i <= maxJobs; i++) {
        added.push(queue.add({ foo: 'bar', num: i }));
      }

      return Promise.all(added)
        .then(queue.count.bind(queue))
        .then(count => {
          expect(count).to.be.eql(maxJobs);
        })
        .then(queue.empty.bind(queue))
        .then(queue.count.bind(queue))
        .then(count => {
          expect(count).to.be.eql(0);
          return queue.close();
        });
    });
  });

  describe('Cleaner', () => {
    let queue;

    beforeEach(() => {
      queue = utils.buildQueue('cleaner' + uuid.v4());
    });

    afterEach(function() {
      this.timeout(
        queue.settings.stalledInterval * (1 + queue.settings.maxStalledCount)
      );
      return queue.close();
    });

    it('should reject the cleaner with no grace', done => {
      queue.clean().then(
        () => {
          done(new Error('Promise should not resolve'));
        },
        err => {
          expect(err).to.be.instanceof(Error);
          done();
        }
      );
    });

    it('should reject the cleaner an unknown type', done => {
      queue.clean(0, 'bad').then(
        () => {
          done(new Error('Promise should not resolve'));
        },
        e => {
          expect(e).to.be.instanceof(Error);
          done();
        }
      );
    });

    it('should clean an empty queue', done => {
      const testQueue = utils.buildQueue('cleaner' + uuid.v4());
      testQueue.isReady().then(() => {
        return testQueue.clean(0);
      });
      testQueue.on('error', err => {
        utils.cleanupQueue(testQueue);
        done(err);
      });
      testQueue.on('cleaned', (jobs, type) => {
        expect(type).to.be.eql('completed');
        expect(jobs.length).to.be.eql(0);
        utils.cleanupQueue(testQueue);
        done();
      });
    });

    it('should clean two jobs from the queue', done => {
      queue.add({ some: 'data' });
      queue.add({ some: 'data' });
      queue.process((job, jobDone) => {
        jobDone();
      });

      queue.on(
        'completed',
        _.after(2, () => {
          delay(200).then(() => {
            queue.clean(0).then(jobs => {
              expect(jobs.length).to.be.eql(2);
              done();
            }, done);
          });
        })
      );
    });

    it('should only remove a job outside of the grace period', done => {
      queue.process((job, jobDone) => {
        jobDone();
      });
      queue.add({ some: 'data' });
      queue.add({ some: 'data' });
      delay(200)
        .then(() => {
          queue.add({ some: 'data' });
          queue.clean(100);
          return null;
        })
        .then(() => {
          return delay(100);
        })
        .then(() => {
          return queue.getCompleted();
        })
        .then(jobs => {
          expect(jobs.length).to.be.eql(1);
          return queue.empty();
        })
        .then(() => {
          done();
        });
    });

    it('should leave a job that was queued before but processed within the grace period', done => {
      queue.process((job, jobDone) => {
        jobDone();
      });
      queue.add({ some: 'data' });
      queue.add({ some: 'data' }, { delay: 100 });
      delay(200)
        .then(() => {
          // At this point both jobs have executed, but the delayed one was only processed about 100 milliseconds ago:
          return queue.clean(150);
        })
        .then(() => {
          return queue.getCompleted();
        })
        .then(jobs => {
          expect(jobs.length).to.be.eql(1);
          return queue.empty();
        })
        .then(() => {
          done();
        });
    });

    it('should clean all failed jobs', done => {
      queue.add({ some: 'data' });
      queue.add({ some: 'data' });
      queue.process((job, jobDone) => {
        jobDone(new Error('It failed'));
      });
      delay(100)
        .then(() => {
          return queue.clean(0, 'failed');
        })
        .then(jobs => {
          expect(jobs.length).to.be.eql(2);
          return queue.count();
        })
        .then(len => {
          expect(len).to.be.eql(0);
          done();
        });
    });

    it('should clean all waiting jobs', done => {
      queue.add({ some: 'data' });
      queue.add({ some: 'data' });
      delay(100)
        .then(() => {
          return queue.clean(0, 'wait');
        })
        .then(jobs => {
          expect(jobs.length).to.be.eql(2);
          return queue.count();
        })
        .then(len => {
          expect(len).to.be.eql(0);
          done();
        });
    });

    it('should clean all delayed jobs', done => {
      queue.add({ some: 'data' }, { delay: 5000 });
      queue.add({ some: 'data' }, { delay: 5000 });
      delay(100)
        .then(() => {
          return queue.clean(0, 'delayed');
        })
        .then(jobs => {
          expect(jobs.length).to.be.eql(2);
          return queue.count();
        })
        .then(len => {
          expect(len).to.be.eql(0);
          done();
        });
    });

    it('should clean the number of jobs requested', done => {
      queue.add({ some: 'data' });
      queue.add({ some: 'data' });
      queue.add({ some: 'data' });
      delay(100)
        .then(() => {
          return queue.clean(0, 'wait', 1);
        })
        .then(jobs => {
          expect(jobs.length).to.be.eql(1);
          return queue.count();
        })
        .then(len => {
          expect(len).to.be.eql(2);
          done();
        });
    });

    it('should succeed when the limit is higher than the actual number of jobs', async () => {
      await queue.add({ some: 'data' });
      await queue.add({ some: 'data' });
      await delay(100);
      const deletedJobs = await queue.clean(0, 'wait', 100);
      expect(deletedJobs).to.have.length(2);
      const remainingJobsCount = await queue.count();
      expect(remainingJobsCount).to.be.eql(0);
    });

    it("should clean the number of jobs requested even if first jobs timestamp doesn't match", async () => {
      // This job shouldn't get deleted due to the 5000 grace
      await queue.add({ some: 'data' });
      // This job should get cleaned since 10000 > 5000 grace
      const jobToClean = await queue.add(
        { some: 'data' },
        { timestamp: Date.now() - 10000 }
      );
      // This job shouldn't get deleted due to the 5000 grace
      await queue.add({ some: 'data' });

      const cleaned = await queue.clean(5000, 'wait', 1);
      expect(cleaned.length).to.be.eql(1);
      expect(cleaned[0]).to.eql(jobToClean.id);

      const len = await queue.count();
      expect(len).to.be.eql(2);
    });

    it("shouldn't clean anything if all jobs are in grace period", async () => {
      await queue.add({ some: 'data' });
      await queue.add({ some: 'data' });

      const cleaned = await queue.clean(5000, 'wait', 1);
      expect(cleaned.length).to.be.eql(0);

      const cleaned2 = await queue.clean(5000, 'wait');
      expect(cleaned2.length).to.be.eql(0);
      expect(await queue.count()).to.be.eql(2);
    });

    it('should properly clean jobs from the priority set', done => {
      const client = new redis(6379, '127.0.0.1', {});
      queue.add({ some: 'data' }, { priority: 5 });
      queue.add({ some: 'data' }, { priority: 5 });
      delay(100)
        .then(() => {
          return queue.clean(0, 'wait', 1);
        })
        .then(() => {
          return new Promise((resolve, reject) => {
            client.zcount(queue.toKey('priority'), '5', '5', (err, res) => {
              if (err) reject(err);
              else resolve(res);
            });
          });
        })
        .then(priority => {
          expect(priority).to.be.eql(1);
          done();
        });
    });

    it('should clean a job without a timestamp', done => {
      const client = new redis(6379, '127.0.0.1', {});

      queue.add({ some: 'data' });
      queue.add({ some: 'data' });
      queue.process((job, jobDone) => {
        jobDone(new Error('It failed'));
      });

      delay(100)
        .then(() => {
          return new Promise(resolve => {
            client.hdel('bull:' + queue.name + ':1', 'timestamp', resolve);
          });
        })
        .then(() => {
          return queue.clean(0, 'failed');
        })
        .then(jobs => {
          expect(jobs.length).to.be.eql(2);
          return queue.getFailed();
        })
        .then(failed => {
          expect(failed.length).to.be.eql(0);
          done();
        });
    });

    it('should clean completed jobs outside grace period', async () => {
      queue.process((job, jobDone) => {
        jobDone();
      });
      const [jobToClean] = await Promise.all([
        queue.add({ some: 'oldJob' }),
        queue.add({ some: 'gracePeriodJob' }, { delay: 50 })
      ]);
      await delay(100);

      const cleaned = await queue.clean(75, 'completed');

      expect(cleaned.length).to.be.eql(1);
      expect(cleaned[0]).to.eql(jobToClean.id);
    });

    it('should clean completed jobs outside grace period with limit', async () => {
      queue.process((job, jobDone) => {
        jobDone();
      });
      const [jobToClean] = await Promise.all([
        queue.add({ some: 'oldJob' }),
        queue.add({ some: 'gracePeriodJob' }, { delay: 50 })
      ]);
      await delay(100);

      const cleaned = await queue.clean(75, 'completed', 10);

      expect(cleaned.length).to.be.eql(1);
      expect(cleaned[0]).to.eql(jobToClean.id);
    });

    it('should clean completed jobs respecting limit', async () => {
      queue.process((job, jobDone) => {
        jobDone();
      });
      const jobsToCleanPromises = [];
      for (let i = 0; i < 3; i++) {
        jobsToCleanPromises.push(queue.add({ some: 'jobToClean' }));
      }

      const [jobsToClean] = await Promise.all([
        Promise.all(jobsToCleanPromises),
        queue.add({ some: 'gracePeriodJob' }, { delay: 50 })
      ]);
      await delay(100);

      const cleaned = await queue.clean(75, 'completed', 1);

      expect(cleaned.length).to.be.eql(1);
      const jobsToCleanIds = jobsToClean.map(job => job.id);
      expect(jobsToCleanIds).to.include(cleaned[0]);
    });

    it('should clean failed jobs without leaving any job keys', async () => {
      const numJobs = 10;
      queue.process((job, jobDone) => {
        jobDone(new Error('It failed'));
      });
      const jobsToCleanPromises = [];
      for (let i = 0; i < numJobs; i++) {
        jobsToCleanPromises.push(queue.add({ some: 'jobToClean' }));
      }

      await Promise.all([
        Promise.all(jobsToCleanPromises),
        queue.add({ some: 'gracePeriodJob' }, { delay: 50 })
      ]);
      await delay(100);

      await queue.clean(0, 'failed');

      const client = new redis();
      const keys = await client.keys(`bull:${queue.name}:*`);
      expect(keys.length).to.be.eql(2);
    });
  });
});
