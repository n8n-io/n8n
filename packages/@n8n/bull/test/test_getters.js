'use strict';

const redis = require('ioredis');

const utils = require('./utils');
const expect = require('chai').expect;

const _ = require('lodash');

describe('Jobs getters', function() {
  this.timeout(12000);
  let queue;
  let client;

  beforeEach(() => {
    client = new redis();
    return client.flushdb();
  });

  beforeEach(() => {
    queue = utils.buildQueue();
  });

  afterEach(function() {
    this.timeout(
      queue.settings.stalledInterval * (1 + queue.settings.maxStalledCount)
    );
    return queue
      .clean(1000)
      .then(() => {
        return queue.close();
      })
      .then(() => {
        return client.quit();
      });
  });

  it('should get waiting jobs', () => {
    return Promise.all([
      queue.add({ foo: 'bar' }),
      queue.add({ baz: 'qux' })
    ]).then(() => {
      return queue.getWaiting().then(jobs => {
        expect(jobs).to.be.a('array');
        expect(jobs.length).to.be.equal(2);
        expect(jobs[0].data.foo).to.be.equal('bar');
        expect(jobs[1].data.baz).to.be.equal('qux');
      });
    });
  });

  it('should get paused jobs', () => {
    return queue.pause().then(() => {
      return Promise.all([
        queue.add({ foo: 'bar' }),
        queue.add({ baz: 'qux' })
      ]).then(() => {
        return queue.getWaiting().then(jobs => {
          expect(jobs).to.be.a('array');
          expect(jobs.length).to.be.equal(2);
          expect(jobs[0].data.foo).to.be.equal('bar');
          expect(jobs[1].data.baz).to.be.equal('qux');
        });
      });
    });
  });

  it('should get active jobs', done => {
    queue.process((job, jobDone) => {
      queue.getActive().then(jobs => {
        expect(jobs).to.be.a('array');
        expect(jobs.length).to.be.equal(1);
        expect(jobs[0].data.foo).to.be.equal('bar');
        done();
      });
      jobDone();
    });

    queue.add({ foo: 'bar' });
  });

  it('should get a specific job', done => {
    const data = { foo: 'sup!' };
    queue.add(data).then(job => {
      queue.getJob(job.id).then(returnedJob => {
        expect(returnedJob.data).to.eql(data);
        expect(returnedJob.id).to.be.eql(job.id);
        done();
      });
    });
  });

  it('should get completed jobs', done => {
    let counter = 2;

    queue.process((job, jobDone) => {
      jobDone();
    });

    queue.on('completed', () => {
      counter--;

      if (counter === 0) {
        queue.getCompleted().then(jobs => {
          expect(jobs).to.be.a('array');
          // We need a "empty completed" kind of function.
          //expect(jobs.length).to.be.equal(2);
          done();
        });
      }
    });

    queue.add({ foo: 'bar' });
    queue.add({ baz: 'qux' });
  });

  it('should get completed jobs excluding their data', done => {
    let counter = 2;
    const timestamp = Date.now();

    queue.process((job, jobDone) => {
      jobDone();
    });

    queue.on('completed', () => {
      counter--;

      if (counter === 0) {
        queue.getCompleted(0, -1, { excludeData: true }).then(jobs => {
          expect(jobs).to.be.a('array');
          expect(jobs).to.have.length(2);

          for (let i = 0; i < jobs.length; i++) {
            expect(jobs[i]).to.have.property('data');
            expect(jobs[i].data).to.be.empty;

            expect(jobs[i]).to.have.property('timestamp');
            expect(jobs[i].timestamp).to.be.gte(timestamp);
            expect(jobs[i]).to.have.property('processedOn');
            expect(jobs[i].processedOn).to.be.gte(timestamp);
          }

          done();
        });
      }
    });

    queue.add({ foo: 'bar' });
    queue.add({ baz: 'qux' });
  });

  it('should get failed jobs', done => {
    let counter = 2;

    queue.process((job, jobDone) => {
      jobDone(new Error('Forced error'));
    });

    queue.on('failed', () => {
      counter--;

      if (counter === 0) {
        queue.getFailed().then(jobs => {
          expect(jobs).to.be.a('array');
          done();
        });
      }
    });

    queue.add({ foo: 'bar' });
    queue.add({ baz: 'qux' });
  });

  describe('.getCountsPerPriority', () => {
    it('returns job counts per priority', done => {
      const jobsArray = Array.from(Array(42).keys()).map(index => ({
        name: 'test',
        data: {},
        opts: {
          priority: index % 4
        }
      }));
      queue.addBulk(jobsArray).then(() => {
        queue.getCountsPerPriority([0, 1, 2, 3]).then(counts => {
          expect(counts).to.be.eql({
            '0': 11,
            '1': 11,
            '2': 10,
            '3': 10
          });
          done();
        });
      });
    });

    describe('when queue is paused', () => {
      it('returns job counts per priority', async () => {
        await queue.pause();
        const jobsArray = Array.from(Array(42).keys()).map(index => ({
          name: 'test',
          data: {},
          opts: {
            priority: index % 4
          }
        }));
        await queue.addBulk(jobsArray);
        const counts = await queue.getCountsPerPriority([0, 1, 2, 3]);
        
        expect(counts).to.be.eql({
          '0': 11,
          '1': 11,
          '2': 10,
          '3': 10
        });
      });
    });  
  });

  it('fails jobs that exceed their specified timeout', done => {
    queue.process((job, jobDone) => {
      setTimeout(jobDone, 200);
    });

    queue.on('failed', (job, error) => {
      expect(error.message).to.contain('timed out');
      done();
    });

    queue.on('completed', () => {
      const error = new Error('The job should have timed out');
      done(error);
    });

    queue.add(
      { some: 'data' },
      {
        timeout: 100
      }
    );
  });

  it('should return all completed jobs when not setting start/end', done => {
    queue.process((job, completed) => {
      completed();
    });

    queue.on(
      'completed',
      _.after(3, () => {
        queue
          .getJobs('completed')
          .then(jobs => {
            expect(jobs)
              .to.be.an('array')
              .that.have.length(3);
            expect(jobs[0]).to.have.property('finishedOn');
            expect(jobs[1]).to.have.property('finishedOn');
            expect(jobs[2]).to.have.property('finishedOn');

            expect(jobs[0]).to.have.property('processedOn');
            expect(jobs[1]).to.have.property('processedOn');
            expect(jobs[2]).to.have.property('processedOn');
            done();
          })
          .catch(done);
      })
    );

    queue.add({ foo: 1 });
    queue.add({ foo: 2 });
    queue.add({ foo: 3 });
  });

  it('should return all failed jobs when not setting start/end', done => {
    queue.process((job, completed) => {
      completed(new Error('error'));
    });

    queue.on(
      'failed',
      _.after(3, () => {
        queue
          .getJobs('failed')
          .then(jobs => {
            expect(jobs)
              .to.be.an('array')
              .that.has.length(3);
            expect(jobs[0]).to.have.property('finishedOn');
            expect(jobs[1]).to.have.property('finishedOn');
            expect(jobs[2]).to.have.property('finishedOn');

            expect(jobs[0]).to.have.property('processedOn');
            expect(jobs[1]).to.have.property('processedOn');
            expect(jobs[2]).to.have.property('processedOn');
            done();
          })
          .catch(done);
      })
    );

    queue.add({ foo: 1 });
    queue.add({ foo: 2 });
    queue.add({ foo: 3 });
  });

  it('should return subset of jobs when setting positive range', done => {
    queue.process((job, completed) => {
      completed();
    });

    queue.on(
      'completed',
      _.after(3, () => {
        queue
          .getJobs('completed', 1, 2, true)
          .then(jobs => {
            expect(jobs)
              .to.be.an('array')
              .that.has.length(2);
            expect(jobs[0].data.foo).to.be.eql(2);
            expect(jobs[1].data.foo).to.be.eql(3);
            expect(jobs[0]).to.have.property('finishedOn');
            expect(jobs[1]).to.have.property('finishedOn');
            expect(jobs[0]).to.have.property('processedOn');
            expect(jobs[1]).to.have.property('processedOn');
            done();
          })
          .catch(done);
      })
    );

    queue
      .add({ foo: 1 })
      .then(() => {
        return queue.add({ foo: 2 });
      })
      .then(() => {
        return queue.add({ foo: 3 });
      });
  });

  it('should return subset of jobs when setting a negative range', done => {
    queue.process((job, completed) => {
      completed();
    });

    queue.on(
      'completed',
      _.after(3, () => {
        queue
          .getJobs('completed', -3, -1, true)
          .then(jobs => {
            expect(jobs)
              .to.be.an('array')
              .that.has.length(3);
            expect(jobs[0].data.foo).to.be.equal(1);
            expect(jobs[1].data.foo).to.be.eql(2);
            expect(jobs[2].data.foo).to.be.eql(3);
            done();
          })
          .catch(done);
      })
    );

    queue.add({ foo: 1 });
    queue.add({ foo: 2 });
    queue.add({ foo: 3 });
  });

  it('should return subset of jobs when range overflows', done => {
    queue.process((job, completed) => {
      completed();
    });

    queue.on(
      'completed',
      _.after(3, () => {
        queue
          .getJobs('completed', -300, 99999, true)
          .then(jobs => {
            expect(jobs)
              .to.be.an('array')
              .that.has.length(3);
            expect(jobs[0].data.foo).to.be.equal(1);
            expect(jobs[1].data.foo).to.be.eql(2);
            expect(jobs[2].data.foo).to.be.eql(3);
            done();
          })
          .catch(done);
      })
    );

    queue.add({ foo: 1 });
    queue.add({ foo: 2 });
    queue.add({ foo: 3 });
  });

  it('should return jobs for multiple types', done => {
    let counter = 0;
    queue.process((/*job*/) => {
      counter++;
      if (counter == 2) {
        return queue.pause();
      }
    });

    queue.on(
      'completed',
      _.after(2, () => {
        queue
          .getJobs(['completed', 'paused'])
          .then(jobs => {
            expect(jobs).to.be.an('array');
            expect(jobs).to.have.length(3);
            done();
          })
          .catch(done);
      })
    );

    queue.add({ foo: 1 });
    queue.add({ foo: 2 });
    queue.add({ foo: 3 });
  });
});
