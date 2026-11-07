'use strict';

const expect = require('chai').expect;
const utils = require('./utils');
const sinon = require('sinon');
const redis = require('ioredis');

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;

const { MetricsTime } = require('../lib/utils');

describe('metrics', () => {
  beforeEach(async function() {
    this.clock = sinon.useFakeTimers();
    const client = new redis();
    await client.flushdb();
    return client.quit();
  });

  it('should gather metrics for completed jobs', async function() {
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);
    this.clock.tick(0);

    const timmings = [
      0,
      0, // For the fixtures to work we need to use 0 as first timing
      ONE_MINUTE / 2,
      ONE_MINUTE / 2,
      0,
      0,
      ONE_MINUTE,
      ONE_MINUTE,
      ONE_MINUTE * 3,
      ONE_SECOND * 70,
      ONE_SECOND * 50,
      ONE_HOUR,
      ONE_MINUTE
    ];

    const fixture = [
      '1',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '1',
      '1',
      '1',
      '0',
      '0',
      '1',
      '1',
      '3',
      '3'
    ];

    const numJobs = timmings.length;

    const queue = utils.buildQueue('metrics', {
      metrics: {
        maxDataPoints: MetricsTime.ONE_HOUR * 2
      }
    });

    queue.process(job => {
      this.clock.tick(timmings[job.data.index]);
    });

    let processed = 0;
    const completing = new Promise(resolve => {
      queue.on('completed', async () => {
        processed++;
        if (processed === numJobs) {
          resolve();
        }
      });
    });

    for (let i = 0; i < numJobs; i++) {
      await queue.add({ index: i });
    }

    await completing;

    const metrics = await queue.getMetrics('completed');

    const numPoints = Math.floor(
      timmings.reduce((sum, timing) => sum + timing, 0) / ONE_MINUTE
    );

    expect(metrics.meta.count).to.be.equal(numJobs);
    expect(metrics.data.length).to.be.equal(numPoints);
    expect(metrics.count).to.be.equal(metrics.data.length);
    expect(processed).to.be.equal(numJobs);
    expect(metrics.data).to.be.deep.equal(fixture);

    this.clock.restore();
    await queue.close();
  });

  it('should only keep metrics for "maxDataPoints"', async function() {
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);
    this.clock.tick(0);

    const timmings = [
      0, // For the fixtures to work we need to use 0 as first timing
      0,
      ONE_MINUTE / 2,
      ONE_MINUTE / 2,
      0,
      0,
      ONE_MINUTE,
      ONE_MINUTE,
      ONE_MINUTE * 3,
      ONE_HOUR,
      0,
      0,
      ONE_MINUTE,
      ONE_MINUTE
    ];

    const fixture = [
      '1',
      '3',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0'
    ];

    const numJobs = timmings.length;

    const queue = utils.buildQueue('metrics', {
      metrics: {
        maxDataPoints: MetricsTime.FIFTEEN_MINUTES
      }
    });

    queue.process(job => {
      this.clock.tick(timmings[job.data.index]);
    });

    let processed = 0;
    const completing = new Promise(resolve => {
      queue.on('completed', async () => {
        processed++;
        if (processed === numJobs) {
          resolve();
        }
      });
    });

    for (let i = 0; i < numJobs; i++) {
      await queue.add({ index: i });
    }

    await completing;

    const metrics = await queue.getMetrics('completed');

    expect(metrics.meta.count).to.be.equal(numJobs);
    expect(metrics.data.length).to.be.equal(MetricsTime.FIFTEEN_MINUTES);
    expect(metrics.count).to.be.equal(metrics.data.length);
    expect(processed).to.be.equal(numJobs);
    expect(metrics.data).to.be.deep.equal(fixture);

    this.clock.restore();
    await queue.close();
  });

  it('should gather metrics for failed jobs', async function() {
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);
    this.clock.tick(0);

    const timmings = [
      0, // For the fixtures to work we need to use 0 as first timing
      ONE_MINUTE,
      ONE_MINUTE / 5,
      ONE_MINUTE / 2,
      0,
      ONE_MINUTE,
      ONE_MINUTE * 3,
      0
    ];

    const fixture = ['0', '0', '1', '4', '1'];

    const numJobs = timmings.length;

    const queue = utils.buildQueue('metrics', {
      metrics: {
        maxDataPoints: MetricsTime.ONE_HOUR * 2
      }
    });

    queue.process(async job => {
      this.clock.tick(timmings[job.data.index]);
      throw new Error('test');
    });

    let processed = 0;
    const completing = new Promise(resolve => {
      queue.on('failed', async () => {
        processed++;
        if (processed === numJobs) {
          resolve();
        }
      });
    });

    for (let i = 0; i < numJobs; i++) {
      await queue.add({ index: i });
    }

    await completing;

    const metrics = await queue.getMetrics('failed');

    const numPoints = Math.floor(
      timmings.reduce((sum, timing) => sum + timing, 0) / ONE_MINUTE
    );

    expect(metrics.meta.count).to.be.equal(numJobs);
    expect(metrics.data.length).to.be.equal(numPoints);
    expect(metrics.count).to.be.equal(metrics.data.length);
    expect(processed).to.be.equal(numJobs);
    expect(metrics.data).to.be.deep.equal(fixture);

    this.clock.restore();
    await queue.close();
  });

  it('should get metrics with pagination', async function() {
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);
    this.clock.tick(0);

    const timmings = [
      0,
      0, // For the fixtures to work we need to use 0 as first timing
      ONE_MINUTE / 2,
      ONE_MINUTE / 2,
      0,
      0,
      ONE_MINUTE,
      ONE_MINUTE,
      ONE_MINUTE * 3,
      ONE_HOUR,
      ONE_MINUTE
    ];

    const numJobs = timmings.length;

    const queue = utils.buildQueue('metrics', {
      metrics: {
        maxDataPoints: MetricsTime.ONE_HOUR * 2
      }
    });

    queue.process(async job => {
      this.clock.tick(timmings[job.data.index]);
    });

    let processed = 0;
    const completing = new Promise(resolve => {
      queue.on('completed', async () => {
        processed++;
        if (processed === numJobs) {
          resolve();
        }
      });
    });

    for (let i = 0; i < numJobs; i++) {
      await queue.add({ index: i });
    }

    await completing;

    expect(processed).to.be.equal(numJobs);

    const numPoints = Math.floor(
      timmings.reduce((sum, timing) => sum + timing, 0) / ONE_MINUTE
    );

    const pageSize = 10;
    const data = [];
    let skip = 0;

    while (skip < numPoints) {
      const metrics = await queue.getMetrics(
        'completed',
        skip,
        skip + pageSize - 1
      );
      expect(metrics.meta.count).to.be.equal(numJobs);
      expect(metrics.data.length).to.be.equal(
        Math.min(numPoints - skip, pageSize)
      );

      data.push(...metrics.data);
      skip += pageSize;
    }

    const metrics = await queue.getMetrics('completed');
    expect(data).to.be.deep.equal(metrics.data);

    this.clock.restore();
    await queue.close();
  });
});
