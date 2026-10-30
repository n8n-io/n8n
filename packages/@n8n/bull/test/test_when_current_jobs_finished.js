'use strict';

const expect = require('chai').expect;
const redis = require('ioredis');
const utils = require('./utils');
const delay = require('delay');
const sinon = require('sinon');

describe('.whenCurrentJobsFinished', () => {
  let client;
  beforeEach(() => {
    client = new redis();
    return client.flushdb();
  });

  afterEach(async () => {
    sinon.restore();
    await utils.cleanupQueues();
    await client.flushdb();
    return client.quit();
  });

  it('should handle queue with no processor', async () => {
    const queue = await utils.newQueue();
    expect(await queue.whenCurrentJobsFinished()).to.equal(undefined);
  });

  it('should handle queue with no jobs', async () => {
    const queue = await utils.newQueue();
    queue.process(() => Promise.resolve());
    expect(await queue.whenCurrentJobsFinished()).to.equal(undefined);
  });

  it('should wait for job to complete', async () => {
    const queue = await utils.newQueue();
    await queue.add({});

    let finishJob;

    // wait for job to be active
    await new Promise(resolve => {
      queue.process(() => {
        resolve();

        return new Promise(resolve => {
          finishJob = resolve;
        });
      });
    });

    let isFulfilled = false;
    const finished = queue.whenCurrentJobsFinished().then(() => {
      isFulfilled = true;
    });

    await delay(100);
    expect(isFulfilled).to.equal(false);

    finishJob();
    expect(await finished).to.equal(
      undefined,
      'whenCurrentJobsFinished should resolve once jobs are finished'
    );
  });

  it('should wait for all jobs to complete', async () => {
    const queue = await utils.newQueue();

    // add multiple jobs to queue
    await queue.add({});
    await queue.add({});

    let finishJob1;
    let finishJob2;

    // wait for all jobs to be active
    await new Promise(resolve => {
      let callCount = 0;
      queue.process(2, () => {
        callCount++;
        if (callCount === 1) {
          return new Promise(resolve => {
            finishJob1 = resolve;
          });
        }

        resolve();
        return new Promise(resolve => {
          finishJob2 = resolve;
        });
      });
    });

    let isFulfilled = false;
    const finished = queue.whenCurrentJobsFinished().then(() => {
      isFulfilled = true;
    });

    finishJob2();
    await delay(100);

    expect(isFulfilled).to.equal(
      false,
      'should not fulfill until all jobs are finished'
    );

    finishJob1();
    await delay(100);
    expect(await finished).to.equal(
      undefined,
      'whenCurrentJobsFinished should resolve once all jobs are finished'
    );
  });

  it('should wait for job to fail', async () => {
    const queue = await utils.newQueue();
    await queue.add({});

    let rejectJob;

    // wait for job to be active
    await new Promise(resolve => {
      queue.process(() => {
        resolve();

        return new Promise((resolve, reject) => {
          rejectJob = reject;
        });
      });
    });

    let isFulfilled = false;
    const finished = queue.whenCurrentJobsFinished().then(() => {
      isFulfilled = true;
    });

    await delay(100);
    expect(isFulfilled).to.equal(false);

    rejectJob();
    expect(await finished).to.equal(
      undefined,
      'whenCurrentJobsFinished should resolve once jobs are finished'
    );
  });
});
