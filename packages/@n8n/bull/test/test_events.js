'use strict';

const utils = require('./utils');
const redis = require('ioredis');
const delay = require('delay');
const Queue = require('../');
const Job = require('../lib/job');
const expect = require('chai').expect;

const _ = require('lodash');

describe('events', () => {
  let queue;

  beforeEach(() => {
    const client = new redis();
    return client.flushdb().then(() => {
      queue = utils.buildQueue('test events', {
        settings: {
          stalledInterval: 100,
          lockDuration: 50
        }
      });
      return queue;
    });
  });

  afterEach(() => {
    return queue.close();
  });

  it('should emit waiting when a job has been added', done => {
    queue.on('waiting', () => {
      done();
    });

    queue.on('registered:waiting', () => {
      queue.add({ foo: 'bar' });
    });
  });

  it('should emit global:waiting when a job has been added', done => {
    queue.on('global:waiting', () => {
      done();
    });

    queue.on('registered:global:waiting', () => {
      queue.add({ foo: 'bar' });
    });
  });

  it('should emit stalled when a job has been stalled', done => {
    queue.on('completed', (/*job*/) => {
      done(new Error('should not have completed'));
    });

    queue.process((/*job*/) => {
      return delay(250);
    });

    queue.add({ foo: 'bar' });

    const queue2 = utils.buildQueue('test events', {
      settings: {
        stalledInterval: 100
      }
    });

    queue2.on('stalled', (/*job*/) => {
      queue2.close().then(done);
    });

    queue.on('active', () => {
      queue2.startMoveUnlockedJobsToWait();
      queue.close(true);
    });
  });

  it('should emit global:stalled when a job has been stalled', done => {
    queue.on('completed', (/*job*/) => {
      done(new Error('should not have completed'));
    });

    queue.process((/*job*/) => {
      return delay(250);
    });

    queue.add({ foo: 'bar' });

    const queue2 = utils.buildQueue('test events', {
      settings: {
        stalledInterval: 100
      }
    });

    queue2.on('global:stalled', (/*job*/) => {
      queue2.close().then(done);
    });

    queue.on('active', () => {
      queue2.startMoveUnlockedJobsToWait();
      queue.close(true);
    });
  });

  it('should emit global:failed when a job has stalled more than allowable times', done => {
    queue.on('completed', (/*job*/) => {
      done(new Error('should not have completed'));
    });

    queue.process((/*job*/) => {
      return delay(250);
    });

    queue.add({ foo: 'bar' });

    const queue2 = utils.buildQueue('test events', {
      settings: {
        stalledInterval: 100,
        maxStalledCount: 0
      }
    });

    queue2.on('global:failed', (jobId, error) => {
      expect(error).equal('job stalled more than maxStalledCount');
      expect(jobId).not.to.be.undefined;
      queue2.close().then(done);
    });

    queue.on('active', () => {
      queue2.startMoveUnlockedJobsToWait();
      queue.close(true);
    });
  });

  it('emits waiting event when a job is added', done => {
    const queue = utils.buildQueue();

    queue.once('waiting', jobId => {
      Job.fromId(queue, jobId).then(job => {
        expect(job.data.foo).to.be.equal('bar');
        queue.close().then(done);
      });
    });
    queue.once('registered:waiting', () => {
      queue.add({ foo: 'bar' });
    });
  });

  it('emits drained and global:drained event when all jobs have been processed', done => {
    const queue = utils.buildQueue('event drained', {
      settings: { drainDelay: 1 }
    });

    queue.process((job, done) => {
      done();
    });

    const drainedCallback = _.after(2, () => {
      queue.getJobCountByTypes('completed').then(completed => {
        expect(completed).to.be.equal(2);
        return queue.close().then(done);
      });
    });

    queue.once('drained', drainedCallback);
    queue.once('global:drained', drainedCallback);

    queue.add({ foo: 'bar' });
    queue.add({ foo: 'baz' });
  });

  it('should emit an event when a new message is added to the queue', done => {
    const client = new redis(6379, '127.0.0.1', {});
    client.select(0);
    const queue = new Queue('test pub sub');
    queue.on('waiting', jobId => {
      expect(parseInt(jobId, 10)).to.be.eql(1);
      client.quit();
      done();
    });
    queue.once('registered:waiting', () => {
      queue.add({ test: 'stuff' });
    });
  });

  it('should emit an event when a new priority message is added to the queue', done => {
    const client = new redis(6379, '127.0.0.1', {});
    client.select(0);
    const queue = new Queue('test pub sub');
    queue.on('waiting', jobId => {
      expect(parseInt(jobId, 10)).to.be.eql(1);
      client.quit();
      done();
    });
    queue.once('registered:waiting', () => {
      queue.add({ test: 'stuff' }, { priority: 1 });
    });
  });

  it('should emit an event when a job becomes active', done => {
    const queue = utils.buildQueue();
    queue.process((job, jobDone) => {
      jobDone();
    });
    queue.add({});
    queue.once('active', () => {
      queue.once('completed', () => {
        queue.close().then(done);
      });
    });
  });

  it('should emit an event if a job fails to extend lock', done => {
    const LOCK_RENEW_TIME = 1;
    queue = utils.buildQueue('queue fails to extend lock', {
      settings: {
        lockRenewTime: LOCK_RENEW_TIME
      }
    });
    queue.once('lock-extension-failed', (lockingFailedJob, error) => {
      expect(lockingFailedJob.data.foo).to.be.equal('lockingFailedJobFoo');
      expect(error.message).to.be.equal('Connection is closed.');
      queue.close().then(done);
    });
    queue.isReady().then(() => {
      queue.process(() => {
        utils.simulateDisconnect(queue);
        return delay(LOCK_RENEW_TIME + 0.25);
      });
      queue.add({ foo: 'lockingFailedJobFoo' });
    });
  });

  it('should listen to global events', done => {
    const queue1 = utils.buildQueue();
    const queue2 = utils.buildQueue();
    queue1.process((job, jobDone) => {
      jobDone();
    });

    let state;
    queue2.on('global:waiting', () => {
      expect(state).to.be.undefined;
      state = 'waiting';
    });
    queue2.once('registered:global:waiting', () => {
      queue2.once('global:active', () => {
        expect(state).to.be.equal('waiting');
        state = 'active';
      });
    });
    queue2.once('registered:global:active', () => {
      queue2.once('global:completed', () => {
        expect(state).to.be.equal('active');
        queue1.close().then(() => {
          queue2.close().then(done);
        });
      });
    });

    queue2.once('registered:global:completed', () => {
      queue1.add({});
    });
  });
});
