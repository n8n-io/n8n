'use strict';

const Job = require('../lib/job');
const Queue = require('../lib/queue');
const expect = require('expect.js');
const redis = require('ioredis');
const uuid = require('uuid');
const delay = require('delay');

describe('Job', () => {
  let queue;
  let client;

  beforeEach(() => {
    client = new redis();
    return client.flushdb();
  });

  beforeEach(() => {
    queue = new Queue('test-' + uuid.v4(), {
      redis: { port: 6379, host: '127.0.0.1' }
    });
  });

  afterEach(function() {
    this.timeout(
      queue.settings.stalledInterval * (1 + queue.settings.maxStalledCount)
    );
    return queue.close().then(() => {
      return client.quit();
    });
  });

  describe('.create', () => {
    let job;
    let data;
    let opts;

    beforeEach(() => {
      data = { foo: 'bar' };
      opts = { testOpt: 'enabled' };

      return Job.create(queue, data, opts).then(createdJob => {
        job = createdJob;
      });
    });

    it('returns a promise for the job', () => {
      expect(job).to.have.property('id');
      expect(job).to.have.property('data');
    });

    it('should not modify input options', () => {
      expect(opts).not.to.have.property('jobId');
    });

    it('saves the job in redis', () => {
      return Job.fromId(queue, job.id).then(storedJob => {
        expect(storedJob).to.have.property('id');
        expect(storedJob).to.have.property('data');

        expect(storedJob.data.foo).to.be.equal('bar');
        expect(storedJob.opts).to.be.a(Object);
        expect(storedJob.opts.testOpt).to.be('enabled');
      });
    });

    it('should use the custom jobId if one is provided', () => {
      const customJobId = 'customjob';
      return Job.create(queue, data, { jobId: customJobId }).then(
        createdJob => {
          expect(createdJob.id).to.be.equal(customJobId);
        }
      );
    });

    it('should process jobs with custom jobIds', done => {
      const customJobId = 'customjob';
      queue.process(() => {
        return Promise.resolve();
      });

      queue.add({ foo: 'bar' }, { jobId: customJobId });

      queue.on('completed', job => {
        if (job.id == customJobId) {
          done();
        }
      });
    });
  });

  describe('.createBulk', () => {
    let jobs;
    let inputJobs;

    beforeEach(() => {
      inputJobs = [
        {
          name: 'jobA',
          data: {
            foo: 'bar'
          },
          opts: {
            testOpt: 'enabled'
          }
        },
        {
          name: 'jobB',
          data: {
            foo: 'baz'
          },
          opts: {
            testOpt: 'disabled'
          }
        }
      ];

      return Job.createBulk(queue, inputJobs).then(createdJobs => {
        jobs = createdJobs;
      });
    });

    it('returns a promise for the jobs', () => {
      expect(jobs).to.have.length(2);

      expect(jobs[0]).to.have.property('id');
      expect(jobs[0]).to.have.property('data');
    });

    it('should not modify input options', () => {
      expect(inputJobs[0].opts).not.to.have.property('jobId');
    });

    it('saves the first job in redis', () => {
      return Job.fromId(queue, jobs[0].id).then(storedJob => {
        expect(storedJob).to.have.property('id');
        expect(storedJob).to.have.property('data');

        expect(storedJob.data.foo).to.be.equal('bar');
        expect(storedJob.opts).to.be.a(Object);
        expect(storedJob.opts.testOpt).to.be('enabled');
      });
    });

    it('saves the second job in redis', () => {
      return Job.fromId(queue, jobs[1].id).then(storedJob => {
        expect(storedJob).to.have.property('id');
        expect(storedJob).to.have.property('data');

        expect(storedJob.data.foo).to.be.equal('baz');
        expect(storedJob.opts).to.be.a(Object);
        expect(storedJob.opts.testOpt).to.be('disabled');
      });
    });
  });

  describe('.add jobs on priority queues', () => {
    it('add 4 jobs with different priorities', () => {
      return queue
        .add({ foo: 'bar' }, { jobId: '1', priority: 3 })
        .then(() => {
          return queue.add({ foo: 'bar' }, { jobId: '2', priority: 3 });
        })
        .then(() => {
          return queue.add({ foo: 'bar' }, { jobId: '3', priority: 2 });
        })
        .then(() => {
          return queue.add({ foo: 'bar' }, { jobId: '4', priority: 1 });
        })
        .then(() => {
          return queue
            .getWaiting()
            .then(result => {
              const waitingIDs = [];
              result.forEach(element => {
                waitingIDs.push(element.id);
              });
              return waitingIDs;
            })
            .then(waitingIDs => {
              expect(waitingIDs.length).to.be.equal(4);
              expect(waitingIDs).to.be.eql(['4', '3', '1', '2']);
            });
        });
    });
  });

  describe('.update', () => {
    it('should allow updating job data', () => {
      return Job.create(queue, { foo: 'bar' })
        .then(job => {
          return job.update({ baz: 'qux' }).then(() => {
            expect(job.data).to.be.eql({ baz: 'qux' });
            return job;
          });
        })
        .then(job => {
          return Job.fromId(queue, job.id).then(job => {
            expect(job.data).to.be.eql({ baz: 'qux' });
          });
        });
    });

    describe('when job was removed', () => {
      it('throws an error', async () => {
        const job = await Job.create(queue, { foo: 'bar' });
        await job.remove();
        await job.update({ baz: 'qux' }).catch(err => {
          expect(err.message).to.be.equal('Missing key for job 1 updateData');
        });
      });
    });
  });

  describe('.remove', () => {
    it('removes the job from redis', () => {
      return Job.create(queue, { foo: 'bar' })
        .then(job => {
          return job.remove().then(() => {
            return job;
          });
        })
        .then(job => {
          return Job.fromId(queue, job.id);
        })
        .then(storedJob => {
          expect(storedJob).to.be(null);
        });
    });

    it('fails to remove a locked job', () => {
      return Job.create(queue, 1, { foo: 'bar' }).then(job => {
        return job
          .takeLock()
          .then(lock => {
            expect(lock).to.be.truthy;
          })
          .then(() => {
            return Job.fromId(queue, job.id).then(job => {
              return job.remove();
            });
          })
          .then(() => {
            throw new Error('Should not be able to remove a locked job');
          })
          .catch((/*err*/) => {
            // Good!
          });
      });
    });

    it('removes any job from active set', () => {
      return queue.add({ foo: 'bar' }).then(job => {
        // Simulate a job in active state but not locked
        return queue
          .getNextJob()
          .then(() => {
            return job
              .isActive()
              .then(isActive => {
                expect(isActive).to.be(true);
                return job.releaseLock();
              })
              .then(() => {
                return job.remove();
              });
          })
          .then(() => {
            return Job.fromId(queue, job.id);
          })
          .then(stored => {
            expect(stored).to.be(null);
            return job.getState();
          })
          .then(state => {
            // This check is a bit of a hack. A job that is not found in any list will return the state
            // stuck.
            expect(state).to.equal('stuck');
          });
      });
    });

    it('emits removed event', cb => {
      queue.once('removed', job => {
        expect(job.data.foo).to.be.equal('bar');
        cb();
      });
      Job.create(queue, { foo: 'bar' }).then(job => {
        job.remove();
      });
    });

    it('a succesful job should be removable', done => {
      queue.process(() => {
        return Promise.resolve();
      });

      queue.add({ foo: 'bar' });

      queue.on('completed', job => {
        job
          .remove()
          .then(done)
          .catch(done);
      });
    });

    it('a failed job should be removable', done => {
      queue.process(() => {
        throw new Error();
      });

      queue.add({ foo: 'bar' });

      queue.on('failed', job => {
        job
          .remove()
          .then(done)
          .catch(done);
      });
    });
  });

  describe('.removeFromPattern', () => {
    it('remove jobs matching pattern', async () => {
      const jobIds = ['foo', 'foo1', 'foo2', 'foo3', 'foo4', 'bar', 'baz'];
      await Promise.all(
        jobIds.map(jobId => Job.create(queue, { foo: 'bar' }, { jobId }))
      );

      await queue.removeJobs('foo*');

      for (let i = 0; i < jobIds.length; i++) {
        const storedJob = await Job.fromId(queue, jobIds[i]);
        if (jobIds[i].startsWith('foo')) {
          expect(storedJob).to.be(null);
        } else {
          expect(storedJob).to.not.be(null);
        }
      }
    });
  });

  describe('.remove on priority queues', () => {
    it('remove a job with jobID 1 and priority 3 and check the new order in the queue', () => {
      return queue
        .add({ foo: 'bar' }, { jobId: '1', priority: 3 })
        .then(() => {
          return queue.add({ foo: 'bar' }, { jobId: '2', priority: 3 });
        })
        .then(() => {
          return queue.add({ foo: 'bar' }, { jobId: '3', priority: 2 });
        })
        .then(() => {
          return queue.add({ foo: 'bar' }, { jobId: '4', priority: 1 });
        })
        .then(() => {
          return queue.getJob('1').then(job => {
            return job.remove().then(() => {
              return queue
                .getWaiting()
                .then(result => {
                  const waitingIDs = [];
                  result.forEach(element => {
                    waitingIDs.push(element.id);
                  });
                  return waitingIDs;
                })
                .then(waitingIDs => {
                  expect(waitingIDs.length).to.be.equal(3);
                  expect(waitingIDs).to.be.eql(['4', '3', '2']);
                });
            });
          });
        });
    });

    it('add a new job with priority 10 and ID 5 and check the new order (along with the previous 4 jobs)', () => {
      return queue
        .add({ foo: 'bar' }, { jobId: '1', priority: 3 })
        .then(() => {
          return queue.add({ foo: 'bar' }, { jobId: '2', priority: 3 });
        })
        .then(() => {
          return queue.add({ foo: 'bar' }, { jobId: '3', priority: 2 });
        })
        .then(() => {
          return queue.add({ foo: 'bar' }, { jobId: '4', priority: 1 });
        })
        .then(() => {
          return queue.getJob('1').then(job => {
            return job.remove().then(() => {
              return queue
                .getWaiting()
                .then(result => {
                  const waitingIDs = [];
                  result.forEach(element => {
                    waitingIDs.push(element.id);
                  });
                  return waitingIDs;
                })
                .then(waitingIDs => {
                  expect(waitingIDs.length).to.be.equal(3);
                  expect(waitingIDs).to.be.eql(['4', '3', '2']);
                  return true;
                })
                .then(() => {
                  return queue
                    .add({ foo: 'bar' }, { jobId: '5', priority: 10 })
                    .then(() => {
                      return queue
                        .getWaiting()
                        .then(result => {
                          const waitingIDs = [];
                          result.forEach(element => {
                            waitingIDs.push(element.id);
                          });
                          return waitingIDs;
                        })
                        .then(waitingIDs => {
                          expect(waitingIDs.length).to.be.equal(4);
                          expect(waitingIDs).to.be.eql(['4', '3', '2', '5']);
                        });
                    });
                });
            });
          });
        });
    });
  });

  describe('.retry', () => {
    it('emits waiting event', cb => {
      queue.add({ foo: 'bar' });
      queue.process((job, done) => {
        done(new Error('the job failed'));
      });

      queue.once('failed', job => {
        queue.once('global:waiting', jobId2 => {
          Job.fromId(queue, jobId2).then(job2 => {
            expect(job2.data.foo).to.be.equal('bar');
            cb();
          });
        });
        queue.once('registered:global:waiting', () => {
          job.retry();
        });
      });
    });

    it('sets retriedOn to a timestamp', cb => {
      queue.add({ foo: 'bar' });
      queue.process((job, done) => {
        done(new Error('the job failed'));
      });

      queue.once('failed', job => {
        queue.once('global:waiting', jobId2 => {
          const now = Date.now();
          expect(job.retriedOn)
            .to.be.a('number')
            .and.to.be.within(now - 1000, now);

          Job.fromId(queue, jobId2).then(job2 => {
            expect(job2.retriedOn)
              .to.be.a('number')
              .and.to.be.within(now - 1000, now);
            cb();
          });
        });
        queue.once('registered:global:waiting', () => {
          job.retry();
        });
      });
    });
  });

  describe('Locking', () => {
    let job;

    beforeEach(() => {
      return Job.create(queue, { foo: 'bar' }).then(createdJob => {
        job = createdJob;
      });
    });

    it('can take a lock', () => {
      return job
        .takeLock()
        .then(lockTaken => {
          expect(lockTaken).to.be.truthy;
        })
        .then(() => {
          return job.releaseLock().then(lockReleased => {
            expect(lockReleased).to.not.exist;
          });
        });
    });

    it('take an already taken lock', () => {
      return job
        .takeLock()
        .then(lockTaken => {
          expect(lockTaken).to.be.truthy;
        })
        .then(() => {
          return job.takeLock().then(lockTaken => {
            expect(lockTaken).to.be.truthy;
          });
        });
    });

    it('can release a lock', () => {
      return job
        .takeLock()
        .then(lockTaken => {
          expect(lockTaken).to.be.truthy;
        })
        .then(() => {
          return job.releaseLock().then(lockReleased => {
            expect(lockReleased).to.not.exist;
          });
        });
    });
  });

  describe('.progress', () => {
    it('can set and get progress as number', () => {
      return Job.create(queue, { foo: 'bar' }).then(job => {
        return job.progress(42).then(() => {
          return Job.fromId(queue, job.id).then(async storedJob => {
            expect(storedJob.progress()).to.be(42);
          });
        });
      });
    });
    it('can set and get progress as object', async () => {
      const job = await Job.create(queue, { foo: 'bar' });
      await job.progress({ total: 120, completed: 40 });
      const storedJob = await Job.fromId(queue, job.id);
      expect(storedJob.progress()).to.eql({ total: 120, completed: 40 });
    });

    describe('when job was removed', () => {
      it('throws an error', async () => {
        const job = await Job.create(queue, { foo: 'bar' });
        await job.remove();
        await job.progress({ total: 120, completed: 40 }).catch(err => {
          expect(err.message).to.be.equal(
            'Missing key for job 1 updateProgress'
          );
        });
      });
    });
  });

  describe('.log', () => {
    it('can log two rows with text', () => {
      const firstLog = 'some log text 1';
      const secondLog = 'some log text 2';
      return Job.create(queue, { foo: 'bar' }).then(job =>
        job
          .log(firstLog)
          .then(() => job.log(secondLog))
          .then(() => queue.getJobLogs(job.id))
          .then(logs =>
            expect(logs).to.be.eql({ logs: [firstLog, secondLog], count: 2 })
          )
          .then(() => queue.getJobLogs(job.id, 0, 1))
          .then(logs =>
            expect(logs).to.be.eql({ logs: [firstLog, secondLog], count: 2 })
          )
          .then(() => queue.getJobLogs(job.id, 0, 4000))
          .then(logs =>
            expect(logs).to.be.eql({ logs: [firstLog, secondLog], count: 2 })
          )
          .then(() => queue.getJobLogs(job.id, 1, 1))
          .then(logs => expect(logs).to.be.eql({ logs: [secondLog], count: 2 }))
          .then(() => queue.getJobLogs(job.id, 0, 1, false))
          .then(logs =>
            expect(logs).to.be.eql({ logs: [secondLog, firstLog], count: 2 })
          )
          .then(() => queue.getJobLogs(job.id, 0, 4000, false))
          .then(logs =>
            expect(logs).to.be.eql({ logs: [secondLog, firstLog], count: 2 })
          )
          .then(() => queue.getJobLogs(job.id, 1, 1, false))
          .then(logs => expect(logs).to.be.eql({ logs: [firstLog], count: 2 }))
          .then(() => job.remove())
          .then(() => queue.getJobLogs(job.id))
          .then(logs => expect(logs).to.be.eql({ logs: [], count: 0 }))
      );
    });

    describe('when job was removed', () => {
      it('throws an error', async () => {
        const job = await Job.create(queue, { foo: 'bar' });
        await job.remove();
        await job.log('some log text 1').catch(err => {
          expect(err.message).to.be.equal('Missing key for job 1 addLog');
        });
      });
    });
  });

  describe('.moveToCompleted', () => {
    it('marks the job as completed and returns new job', () => {
      return Job.create(queue, { foo: 'bar' }).then(job1 => {
        return Job.create(queue, { foo: 'bar' }, { lifo: true }).then(job2 => {
          return job2
            .isCompleted()
            .then(isCompleted => {
              expect(isCompleted).to.be(false);
            })
            .then(() => {
              return scripts.moveToActive(queue);
            })
            .then(() => {
              return job2.moveToCompleted('succeeded', true);
            })
            .then(job1Id => {
              return job2.isCompleted().then(isCompleted => {
                expect(isCompleted).to.be(true);
                expect(job2.returnvalue).to.be('succeeded');
                expect(job1Id[1]).to.be(job1.id);
              });
            });
        });
      });
    });
  });

  describe('.moveToFailed', () => {
    it('marks the job as failed', () => {
      return Job.create(queue, { foo: 'bar' }).then(job => {
        return job
          .isFailed()
          .then(isFailed => {
            expect(isFailed).to.be(false);
          })
          .then(() => {
            return scripts.moveToActive(queue);
          })
          .then(() => {
            return job.moveToFailed(new Error('test error'), true);
          })
          .then(() => {
            return job.isFailed().then(isFailed => {
              expect(isFailed).to.be(true);
              expect(job.stacktrace).not.be(null);
              expect(job.stacktrace.length).to.be(1);
            });
          });
      });
    });

    it('moves the job to wait for retry if attempts are given', () => {
      return Job.create(queue, { foo: 'bar' }, { attempts: 3 }).then(job => {
        return job
          .isFailed()
          .then(isFailed => {
            expect(isFailed).to.be(false);
          })
          .then(() => {
            return scripts.moveToActive(queue);
          })
          .then(() => {
            return job.moveToFailed(new Error('test error'), true);
          })
          .then(() => {
            return job.isFailed().then(isFailed => {
              expect(isFailed).to.be(false);
              expect(job.stacktrace).not.be(null);
              expect(job.stacktrace.length).to.be(1);
              return job.isWaiting().then(isWaiting => {
                expect(isWaiting).to.be(true);
              });
            });
          });
      });
    });

    it('unlocks the job when moving it to delayed', () => {
      queue.process(() => {
        throw new Error('Oh dear');
      });
      return Job.create(
        queue,
        { foo: 'bar' },
        { attempts: 3, backoff: 100 }
      ).then(job => {
        return new Promise(resolve => {
          queue.once('failed', resolve);
        })
          .then(() => {
            const client = new redis();
            return client.get(job.lockKey());
          })
          .then(lockValue => {
            expect(lockValue).to.be(null);
          });
      });
    });

    it('marks the job as failed when attempts made equal to attempts given', () => {
      return Job.create(queue, { foo: 'bar' }, { attempts: 1 }).then(job => {
        return job
          .isFailed()
          .then(isFailed => {
            expect(isFailed).to.be(false);
          })
          .then(() => {
            return scripts.moveToActive(queue);
          })
          .then(() => {
            return job.moveToFailed(new Error('test error'), true);
          })
          .then(() => {
            return job.isFailed().then(isFailed => {
              expect(isFailed).to.be(true);
              expect(job.stacktrace).not.be(null);
              expect(job.stacktrace.length).to.be(1);
            });
          });
      });
    });

    it('moves the job to delayed for retry if attempts are given and backoff is non zero', () => {
      return Job.create(
        queue,
        { foo: 'bar' },
        { attempts: 3, backoff: 300 }
      ).then(job => {
        return job
          .isFailed()
          .then(isFailed => {
            expect(isFailed).to.be(false);
          })
          .then(() => {
            return scripts.moveToActive(queue);
          })
          .then(() => {
            return job.moveToFailed(new Error('test error'), true);
          })
          .then(() => {
            return job.isFailed().then(isFailed => {
              expect(isFailed).to.be(false);
              expect(job.stacktrace).not.be(null);
              expect(job.stacktrace.length).to.be(1);
              return job.isDelayed().then(isDelayed => {
                expect(isDelayed).to.be(true);
              });
            });
          });
      });
    });

    it('applies stacktrace limit on failure', () => {
      const stackTraceLimit = 1;
      return Job.create(
        queue,
        { foo: 'bar' },
        { stackTraceLimit, attempts: 2 }
      ).then(job => {
        return job
          .isFailed()
          .then(isFailed => {
            expect(isFailed).to.be(false);
          })
          .then(() => {
            return scripts.moveToActive(queue);
          })
          .then(() => {
            return job.moveToFailed(new Error('test error'), true);
          })
          .then(() => {
            return scripts.moveToActive(queue);
          })
          .then(() => {
            return job.moveToFailed(new Error('test error'), true).then(() => {
              return job.isFailed().then(isFailed => {
                expect(isFailed).to.be(true);
                expect(job.stacktrace).not.be(null);
                expect(job.stacktrace.length).to.be(stackTraceLimit);
              });
            });
          });
      });
    });
  });

  describe('.promote', () => {
    it('can promote a delayed job to be executed immediately', () => {
      return Job.create(queue, { foo: 'bar' }, { delay: 1500 }).then(job => {
        return job
          .isDelayed()
          .then(isDelayed => {
            expect(isDelayed).to.be(true);
          })
          .then(() => {
            return job.promote();
          })
          .then(() => {
            return job.isDelayed().then(isDelayed => {
              expect(isDelayed).to.be(false);
              return job.isWaiting().then(isWaiting => {
                expect(isWaiting).to.be(true);
                return;
              });
            });
          });
      });
    });

    it('should process a promoted job according to its priority', done => {
      queue.process(() => {
        return delay(100);
      });

      const completed = [];

      queue.on('completed', job => {
        completed.push(job.id);
        if (completed.length > 3) {
          expect(completed).to.be.eql(['1', '2', '3', '4']);
          done();
        }
      });
      const processStarted = new Promise(resolve =>
        queue.once('active', resolve)
      );

      const add = (id, ms) =>
        queue.add({}, { jobId: id, delay: ms, priority: 1 });

      add('1')
        .then(() => add('2', 1))
        .then(() => processStarted)
        .then(() => add('3', 5000))
        .then(job => {
          job.promote();
        })
        .then(() => add('4', 1));
    });

    it('should not promote a job that is not delayed', () => {
      return Job.create(queue, { foo: 'bar' }).then(job => {
        return job
          .isDelayed()
          .then(isDelayed => {
            expect(isDelayed).to.be(false);
          })
          .then(() => {
            return job.promote();
          })
          .then(() => {
            throw new Error('Job should not be promoted!');
          })
          .catch(err => {
            expect(err).to.be.ok();
          });
      });
    });

    it('should promote delayed job to the right queue if queue is paused', async () => {
      await queue.add('normal', { foo: 'bar' });
      const delayedJob = await queue.add(
        'delayed',
        { foo: 'bar' },
        { delay: 1 }
      );

      await queue.pause();
      await delayedJob.promote();
      await queue.resume();

      const waitingJobsCount = await queue.getWaitingCount();
      expect(waitingJobsCount).to.be.equal(2);
      const delayedJobsNewState = await delayedJob.getState();
      expect(delayedJobsNewState).to.be.equal('waiting');
    });
  });

  // TODO:
  // Divide into several tests
  //
  const scripts = require('../lib/scripts');
  it('get job status', function() {
    this.timeout(12000);

    const client = new redis();
    return Job.create(queue, { foo: 'baz' })
      .then(job => {
        return job
          .isStuck()
          .then(isStuck => {
            expect(isStuck).to.be(false);
            return job.getState();
          })
          .then(state => {
            expect(state).to.be('waiting');
            return scripts.moveToActive(queue).then(() => {
              return job.moveToCompleted();
            });
          })
          .then(() => {
            return job.isCompleted();
          })
          .then(isCompleted => {
            expect(isCompleted).to.be(true);
            return job.getState();
          })
          .then(state => {
            expect(state).to.be('completed');
            return client.zrem(queue.toKey('completed'), job.id).then(() => {
              return client.lpush(queue.toKey('active'), job.id);
            });
          })
          .then(() => {
            return job.moveToDelayed(Date.now() + 10000, true);
          })
          .then(() => {
            return job.isDelayed();
          })
          .then(yes => {
            expect(yes).to.be(true);
            return job.getState();
          })
          .then(state => {
            expect(state).to.be('delayed');
            return client.zrem(queue.toKey('delayed'), job.id).then(() => {
              return client.lpush(queue.toKey('active'), job.id);
            });
          })
          .then(() => {
            return job.moveToFailed(new Error('test'), true);
          })
          .then(() => {
            return job.isFailed();
          })
          .then(isFailed => {
            expect(isFailed).to.be(true);
            return job.getState();
          })
          .then(state => {
            expect(state).to.be('failed');
            return client.zrem(queue.toKey('failed'), job.id);
          })
          .then(res => {
            expect(res).to.be(1);
            return job.getState();
          })
          .then(state => {
            expect(state).to.be('stuck');
            return client.rpop(queue.toKey('wait'));
          })
          .then(() => {
            return client.lpush(queue.toKey('paused'), job.id);
          })
          .then(() => {
            return job.isPaused();
          })
          .then(isPaused => {
            expect(isPaused).to.be(true);
            return job.getState();
          })
          .then(state => {
            expect(state).to.be('paused');
            return client.rpop(queue.toKey('paused'));
          })
          .then(() => {
            return client.lpush(queue.toKey('wait'), job.id);
          })
          .then(() => {
            return job.isWaiting();
          })
          .then(isWaiting => {
            expect(isWaiting).to.be(true);
            return job.getState();
          })
          .then(state => {
            expect(state).to.be('waiting');
          });
      })
      .then(() => {
        return client.quit();
      });
  });

  describe('.finished', () => {
    it('should resolve when the job has been completed', done => {
      queue.process(() => {
        return delay(500);
      });
      queue
        .add({ foo: 'bar' })
        .then(job => {
          return job.finished();
        })
        .then(done, done);
    });

    it('should resolve when the job has been completed and return object', done => {
      queue.process((/*job*/) => {
        return delay(500).then(() => {
          return { resultFoo: 'bar' };
        });
      });
      queue
        .add({ foo: 'bar' })
        .then(job => {
          return job.finished();
        })
        .then(jobResult => {
          expect(jobResult).to.be.an('object');
          expect(jobResult.resultFoo).equal('bar');
          done();
        });
    });

    it('should resolve when the job has been delayed and completed and return object', done => {
      queue.process((/*job*/) => {
        return delay(300).then(() => {
          return { resultFoo: 'bar' };
        });
      });
      queue
        .add({ foo: 'bar' })
        .then(job => {
          return delay(600).then(() => {
            return job.finished();
          });
        })
        .then(jobResult => {
          expect(jobResult).to.be.an('object');
          expect(jobResult.resultFoo).equal('bar');
          done();
        });
    });

    it('should resolve when the job has been completed and return string', done => {
      queue.process((/*job*/) => {
        return delay(500).then(() => {
          return 'a string';
        });
      });
      queue
        .add({ foo: 'bar' })
        .then(job => {
          return delay(600).then(() => {
            return job.finished();
          });
        })
        .then(jobResult => {
          expect(jobResult).to.be.an('string');
          expect(jobResult).equal('a string');
          done();
        });
    });

    it('should resolve when the job has been delayed and completed and return string', done => {
      queue.process((/*job*/) => {
        return delay(300).then(() => {
          return 'a string';
        });
      });
      queue
        .add({ foo: 'bar' })
        .then(job => {
          return job.finished();
        })
        .then(jobResult => {
          expect(jobResult).to.be.an('string');
          expect(jobResult).equal('a string');
          done();
        });
    });

    it('should reject when the job has been failed', done => {
      queue.process(() => {
        return delay(500).then(() => {
          return Promise.reject(new Error('test error'));
        });
      });

      queue
        .add({ foo: 'bar' })
        .then(job => {
          return job.finished();
        })
        .then(
          () => {
            done(Error('should have been rejected'));
          },
          err => {
            expect(err.message).equal('test error');
            done();
          }
        );
    });

    it('should resolve directly if already processed', done => {
      queue.process(() => {
        return Promise.resolve();
      });
      queue
        .add({ foo: 'bar' })
        .then(job => {
          return delay(500).then(() => {
            return job.finished();
          });
        })
        .then(() => {
          done();
        }, done);
    });

    it('should reject directly if already processed', done => {
      queue.process(() => {
        return Promise.reject(Error('test error'));
      });
      queue
        .add({ foo: 'bar' })
        .then(job => {
          return delay(500).then(() => {
            return job.finished();
          });
        })
        .then(
          () => {
            done(Error('should have been rejected'));
          },
          err => {
            expect(err.message).equal('test error');
            done();
          }
        );
    });
  });

  describe('.fromJSON', () => {
    let data;

    beforeEach(() => {
      data = { foo: 'bar' };
    });

    it('should parse JSON data by default', async () => {
      const job = await Job.create(queue, data, {});
      const jobParsed = Job.fromJSON(queue, job.toData());

      expect(jobParsed.data).to.eql(data);
    });

    it('should not parse JSON data if "preventParsingData" option is specified', async () => {
      const job = await Job.create(queue, data, { preventParsingData: true });
      const jobParsed = Job.fromJSON(queue, job.toData());
      const expectedData = JSON.stringify(data);

      expect(jobParsed.data).to.be(expectedData);
    });
  });
});
