'use strict';

const expect = require('chai').expect;
const uuid = require('uuid');
const utils = require('./utils');
const delay = require('delay');

describe('Obliterate', () => {
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

  it('should obliterate an empty queue', async () => {
    await queue.obliterate();

    const client = await queue.client;
    const keys = await client.keys(`bull:${queue.name}*`);

    expect(keys.length).to.be.eql(0);
  });

  it('should obliterate a queue with jobs in different statuses', async () => {
    await queue.add({ foo: 'bar' });
    await queue.add({ foo: 'bar2' });
    await queue.add({ foo: 'bar3' }, { delay: 5000 });
    const job = await queue.add({ qux: 'baz' });

    let first = true;
    queue.process(async () => {
      if (first) {
        first = false;
        throw new Error('failed first');
      }
      return delay(250);
    });

    await job.finished();

    await queue.obliterate();
    const client = await queue.client;
    const keys = await client.keys(`bull:${queue.name}*`);
    expect(keys.length).to.be.eql(0);
  });

  it('should raise exception if queue has active jobs', async () => {
    await queue.add({ foo: 'bar' });
    const job = await queue.add({ qux: 'baz' });

    await queue.add({ foo: 'bar2' });
    await queue.add({ foo: 'bar3' }, { delay: 5000 });

    let first = true;
    queue.process(async () => {
      if (first) {
        first = false;
        throw new Error('failed first');
      }
      return delay(250);
    });

    await job.finished();

    try {
      await queue.obliterate();
    } catch (err) {
      const client = await queue.client;
      const keys = await client.keys(`bull:${queue.name}*`);
      expect(keys.length).to.be.not.eql(0);
      return;
    }

    throw new Error('Should raise an exception if there are active jobs');
  });

  it('should obliterate if queue has active jobs using "force"', async () => {
    await queue.add({ foo: 'bar' });
    const job = await queue.add({ qux: 'baz' });

    await queue.add({ foo: 'bar2' });
    await queue.add({ foo: 'bar3' }, { delay: 5000 });

    let first = true;
    queue.process(async () => {
      if (first) {
        first = false;
        throw new Error('failed first');
      }
      return delay(250);
    });
    await job.finished();

    await queue.obliterate({ force: true });
    const client = await queue.client;
    const keys = await client.keys(`bull:${queue.name}*`);
    expect(keys.length).to.be.eql(0);
  });

  it('should remove repeatable jobs', async () => {
    await queue.add(
      'test',
      { foo: 'bar' },
      {
        repeat: {
          every: 1000
        }
      }
    );

    const repeatableJobs = await queue.getRepeatableJobs();
    expect(repeatableJobs).to.have.length(1);

    await queue.obliterate();
    const client = await queue.client;
    const keys = await client.keys(`bull:${queue.name}:*`);
    expect(keys.length).to.be.eql(0);
  });

  it('should remove job logs', async () => {
    const job = await queue.add({});

    queue.process(job => {
      return job.log('Lorem Ipsum Dolor Sit Amet');
    });

    await job.finished();

    await queue.obliterate({ force: true });

    const { logs } = await queue.getJobLogs(job.id);
    expect(logs).to.have.length(0);
  });

  it('should obliterate a queue with high number of jobs in different statuses', async () => {
    const arr1 = [];
    for (let i = 0; i < 300; i++) {
      arr1.push(queue.add({ foo: `barLoop${i}` }));
    }

    const [lastCompletedJob] = (await Promise.all(arr1)).splice(-1);

    let fail = false;
    queue.process(async () => {
      if (fail) {
        throw new Error('failed job');
      }
    });

    await lastCompletedJob.finished();

    fail = true;

    const arr2 = [];
    for (let i = 0; i < 300; i++) {
      arr2.push(queue.add({ foo: `barLoop${i}` }));
    }

    const [lastFailedJob] = (await Promise.all(arr2)).splice(-1);

    try {
      await lastFailedJob.finished();
      expect(true).to.be.equal(false);
    } catch (err) {
      expect(true).to.be.equal(true);
    }

    const arr3 = [];
    for (let i = 0; i < 1623; i++) {
      arr3.push(queue.add({ foo: `barLoop${i}` }, { delay: 10000 }));
    }
    await Promise.all(arr3);

    await queue.obliterate();
    const client = await queue.client;
    const keys = await client.keys(`bull:${queue.name}*`);
    expect(keys.length).to.be.eql(0);
  }).timeout(20000);
});
