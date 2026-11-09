'use strict';

const expect = require('chai').expect;
const utils = require('./utils');
const sinon = require('sinon');
const redis = require('ioredis');
const moment = require('moment');
const _ = require('lodash');

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const MAX_INT = 2147483647;

describe('repeat', () => {
  let queue;
  let client;

  beforeEach(function() {
    this.clock = sinon.useFakeTimers();
    client = new redis();
    return client.flushdb().then(() => {
      queue = utils.buildQueue('repeat', {
        settings: {
          guardInterval: MAX_INT,
          stalledInterval: MAX_INT,
          drainDelay: 1 // Small delay so that .close is faster.
        }
      });
      return queue;
    });
  });

  afterEach(function() {
    this.clock.restore();
    return queue.close().then(() => {
      return client.quit();
    });
  });

  it('should create multiple jobs if they have the same cron pattern', done => {
    const cron = '*/10 * * * * *';
    const customJobIds = ['customjobone', 'customjobtwo'];

    Promise.all([
      queue.add({}, { jobId: customJobIds[0], repeat: { cron } }),
      queue.add({}, { jobId: customJobIds[1], repeat: { cron } })
    ])
      .then(() => {
        return queue.count();
      })
      .then(count => {
        expect(count).to.be.eql(2);
        done();
      })
      .catch(done);
  });

  it('should add a repetable job when using stardDate and endDate', async () => {
    const job1 = await queue.add(
      {
        name: 'job1'
      },
      {
        repeat: {
          cron: '0 * * * * *',
          startDate: '2020-09-02T22:29:00Z'
        }
      }
    );

    expect(job1).to.exist;
    expect(job1.opts).to.have.property('repeat');
    expect(job1.opts.repeat).to.be.deep.equal({
      count: 1,
      cron: '0 * * * * *',
      startDate: '2020-09-02T22:29:00Z',
      key: '__default__::::0 * * * * *'
    });

    const job2 = await queue.add(
      {
        name: 'job2'
      },
      {
        repeat: {
          cron: '0 * * * * *',
          startDate: '2020-09-02T22:29:00Z',
          endDate: '2020-09-05T01:44:37Z'
        }
      }
    );
    expect(job2).to.exist;
    expect(job2.opts).to.have.property('repeat');
    expect(job2.opts.repeat).to.be.deep.equal({
      count: 1,
      cron: '0 * * * * *',
      startDate: '2020-09-02T22:29:00Z',
      endDate: '2020-09-05T01:44:37Z',
      key: '__default__::1599270277000::0 * * * * *'
    });
  });

  it('should get repeatable jobs with different cron pattern', done => {
    const crons = [
      '10 * * * * *',
      '2 10 * * * *',
      '1 * * 5 * *',
      '2 * * 4 * *'
    ];

    Promise.all([
      queue.add('first', {}, { repeat: { cron: crons[0], endDate: 12345 } }),
      queue.add('second', {}, { repeat: { cron: crons[1], endDate: 610000 } }),
      queue.add(
        'third',
        {},
        { repeat: { cron: crons[2], tz: 'Africa/Abidjan' } }
      ),
      queue.add(
        'fourth',
        {},
        { repeat: { cron: crons[3], tz: 'Africa/Accra' } }
      ),
      queue.add('fifth', {}, { repeat: { every: 7563 } })
    ])
      .then(() => {
        return queue.getRepeatableCount();
      })
      .then(count => {
        expect(count).to.be.eql(5);
        return queue.getRepeatableJobs(0, -1, true);
      })
      .then(jobs => {
        return jobs.sort((a, b) => {
          return crons.indexOf(a.cron) > crons.indexOf(b.cron);
        });
      })
      .then(jobs => {
        expect(jobs)
          .to.be.and.an('array')
          .and.have.length(5)
          .and.to.deep.include({
            key: 'first::12345::10 * * * * *',
            name: 'first',
            id: null,
            endDate: 12345,
            tz: null,
            cron: '10 * * * * *',
            every: null,
            next: 10000
          })
          .and.to.deep.include({
            key: 'second::610000::2 10 * * * *',
            name: 'second',
            id: null,
            endDate: 610000,
            tz: null,
            cron: '2 10 * * * *',
            every: null,
            next: 602000
          })
          .and.to.deep.include({
            key: 'fourth:::Africa/Accra:2 * * 4 * *',
            name: 'fourth',
            id: null,
            endDate: null,
            tz: 'Africa/Accra',
            cron: '2 * * 4 * *',
            every: null,
            next: 259202000
          })
          .and.to.deep.include({
            key: 'third:::Africa/Abidjan:1 * * 5 * *',
            name: 'third',
            id: null,
            endDate: null,
            tz: 'Africa/Abidjan',
            cron: '1 * * 5 * *',
            every: null,
            next: 345601000
          })
          .and.to.deep.include({
            key: 'fifth:::7563',
            name: 'fifth',
            id: null,
            tz: null,
            endDate: null,
            cron: null,
            every: 7563,
            next: 7563
          });
        done();
      })
      .catch(done);
  });

  it('should repeat every 2 seconds', function(done) {
    this.timeout(20000);
    const _this = this;
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);
    const nextTick = 2 * ONE_SECOND + 500;

    queue
      .add('repeat', { foo: 'bar' }, { repeat: { cron: '*/2 * * * * *' } })
      .then(() => {
        _this.clock.tick(nextTick);
      });

    queue.process('repeat', () => {
      // dummy
    });

    let prev;
    let counter = 0;
    queue.on('completed', job => {
      _this.clock.tick(nextTick);
      if (prev) {
        expect(prev.timestamp).to.be.lt(job.timestamp);
        expect(job.timestamp - prev.timestamp).to.be.gte(2000);
      }
      prev = job;
      counter++;
      if (counter == 20) {
        done();
      }
    });
  });

  it('should repeat every 2 seconds with startDate in future', function(done) {
    const _this = this;
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);
    const nextTick = 2 * ONE_SECOND + 500;
    const delay = 5 * ONE_SECOND + 500;

    queue
      .add(
        'repeat',
        { foo: 'bar' },
        {
          repeat: {
            cron: '*/2 * * * * *',
            startDate: new Date('2017-02-07 9:24:05')
          }
        }
      )
      .then(() => {
        _this.clock.tick(nextTick + delay);
      });

    queue.process('repeat', () => {
      // dummy
    });

    let prev;
    let counter = 0;
    queue.on('completed', job => {
      _this.clock.tick(nextTick);
      if (prev) {
        expect(prev.timestamp).to.be.lt(job.timestamp);
        expect(job.timestamp - prev.timestamp).to.be.gte(2000);
      }
      prev = job;
      counter++;
      if (counter == 20) {
        done();
      }
    });
  });

  it('should repeat every 2 seconds with startDate in past', function(done) {
    const _this = this;
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);
    const nextTick = 2 * ONE_SECOND + 500;

    queue
      .add(
        'repeat',
        { foo: 'bar' },
        {
          repeat: {
            cron: '*/2 * * * * *',
            startDate: new Date('2017-02-07 9:22:00')
          }
        }
      )
      .then(() => {
        _this.clock.tick(nextTick);
      });

    queue.process('repeat', () => {
      // dummy
    });

    let prev;
    let counter = 0;
    queue.on('completed', job => {
      _this.clock.tick(nextTick);
      if (prev) {
        expect(prev.timestamp).to.be.lt(job.timestamp);
        expect(job.timestamp - prev.timestamp).to.be.gte(2000);
      }
      prev = job;
      counter++;
      if (counter == 20) {
        done();
      }
    });
  });

  it('should repeat once a day for 5 days', function(done) {
    const _this = this;
    const date = new Date('2017-05-05 13:12:00');
    this.clock.setSystemTime(date);
    const nextTick = ONE_DAY;

    queue
      .add(
        'repeat',
        { foo: 'bar' },
        {
          repeat: {
            cron: '0 1 * * *',
            endDate: new Date('2017-05-10 13:12:00')
          }
        }
      )
      .then(() => {
        _this.clock.tick(nextTick);
      });

    queue.process('repeat', () => {
      // Dummy
    });

    let prev;
    let counter = 0;
    queue.on('completed', job => {
      _this.clock.tick(nextTick);
      if (prev) {
        expect(prev.timestamp).to.be.lt(job.timestamp);
        expect(job.timestamp - prev.timestamp).to.be.gte(ONE_DAY);
      }
      prev = job;

      counter++;
      if (counter == 5) {
        queue.getWaiting().then(jobs => {
          expect(jobs.length).to.be.eql(0);
          queue.getDelayed().then(jobs => {
            expect(jobs.length).to.be.eql(0);
            done();
          });
        });
      }
    });
  });

  it('should repeat 7:th day every month at 9:25', function(done) {
    this.timeout(20000);
    const _this = this;
    const date = new Date('2017-02-02 7:21:42');
    this.clock.setSystemTime(date);

    function nextTick() {
      const now = moment();
      const nextMonth = moment().add(1, 'months');
      _this.clock.tick(nextMonth - now);
    }

    queue
      .add('repeat', { foo: 'bar' }, { repeat: { cron: '* 25 9 7 * *' } })
      .then(() => {
        nextTick();
      });

    queue.process('repeat', (/*job*/) => {
      // Dummy
    });

    let counter = 20;
    let prev;
    queue.on('completed', job => {
      if (prev) {
        expect(prev.timestamp).to.be.lt(job.timestamp);
        const diff = moment(job.timestamp).diff(
          moment(prev.timestamp),
          'months',
          true
        );
        expect(diff).to.be.gte(1);
      }
      prev = job;

      counter--;
      if (counter == 0) {
        done();
      }
      nextTick();
    });
  });

  it('should create two jobs with the same ids', () => {
    const options = {
      repeat: {
        cron: '0 1 * * *'
      }
    };

    const p1 = queue.add({ foo: 'bar' }, options);
    const p2 = queue.add({ foo: 'bar' }, options);

    return Promise.all([p1, p2]).then(jobs => {
      expect(jobs.length).to.be.eql(2);
      expect(jobs[0].id).to.be.eql(jobs[1].id);
    });
  });

  it('should allow removing a named repeatable job', function(done) {
    const _this = this;
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);

    const nextTick = 2 * ONE_SECOND + 250;
    const repeat = { cron: '*/2 * * * * *' };

    queue.add('remove', { foo: 'bar' }, { repeat }).then(() => {
      _this.clock.tick(nextTick);
    });

    queue.process('remove', () => {
      counter++;
      if (counter == 20) {
        return queue.removeRepeatable('remove', repeat).then(() => {
          _this.clock.tick(nextTick);
          return queue.getDelayed().then(delayed => {
            expect(delayed).to.be.empty;
            done();
            return null;
          });
        });
      } else if (counter > 20) {
        done(Error('should not repeat more than 20 times'));
      }
    });

    let prev;
    let counter = 0;
    queue.on('completed', job => {
      _this.clock.tick(nextTick);
      if (prev) {
        expect(prev.timestamp).to.be.lt(job.timestamp);
        expect(job.timestamp - prev.timestamp).to.be.gte(2000);
      }
      prev = job;
    });
  });

  it('should be able to remove repeatable jobs by key', async () => {
    const repeat = { cron: '*/2 * * * * *' };

    await queue.add('remove', { foo: 'bar' }, { repeat });

    const repeatableJobs = await queue.getRepeatableJobs();
    expect(repeatableJobs).to.have.length(1);
    await queue.removeRepeatableByKey(repeatableJobs[0].key);

    const repeatableJobs2 = await queue.getRepeatableJobs();
    expect(repeatableJobs2).to.have.length(0);

    const delayedJobs = await queue.getDelayed();
    expect(delayedJobs).to.have.length(0);
  });

  it('should return repeatable job key', async () => {
    const repeat = { cron: '*/2 * * * * *' };

    const job = await queue.add('remove', { foo: 'bar' }, { repeat });

    expect(job.opts.repeat.key).to.be.equal('remove::::*/2 * * * * *');
  });

  it('should be able to remove repeatable jobs by key that has a jobId', async () => {
    const repeat = { cron: '*/2 * * * * *' };

    await queue.add('remove', { foo: 'bar' }, { jobId: 'qux', repeat });

    const repeatableJobs = await queue.getRepeatableJobs();
    expect(repeatableJobs).to.have.length(1);
    await queue.removeRepeatableByKey(repeatableJobs[0].key);

    const repeatableJobs2 = await queue.getRepeatableJobs();
    expect(repeatableJobs2).to.have.length(0);

    const delayedJobs = await queue.getDelayed();
    expect(delayedJobs).to.have.length(0);
  });

  it('should allow removing a customId repeatable job', function(done) {
    const _this = this;
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);

    const nextTick = 2 * ONE_SECOND + 250;
    const repeat = { cron: '*/2 * * * * *' };

    queue.add({ foo: 'bar' }, { repeat: repeat, jobId: 'xxxx' }).then(() => {
      _this.clock.tick(nextTick);
    });

    queue.process(() => {
      counter++;
      if (counter == 20) {
        return queue
          .removeRepeatable(_.defaults({ jobId: 'xxxx' }, repeat))
          .then(() => {
            _this.clock.tick(nextTick);
            return queue.getDelayed().then(delayed => {
              expect(delayed).to.be.empty;
              done();
              return null;
            });
          });
      } else if (counter > 20) {
        done(Error('should not repeat more than 20 times'));
      }
    });

    let prev;
    let counter = 0;
    queue.on('completed', job => {
      _this.clock.tick(nextTick);
      if (prev) {
        expect(prev.timestamp).to.be.lt(job.timestamp);
        expect(job.timestamp - prev.timestamp).to.be.gte(2000);
      }
      prev = job;
    });
  });

  it('should not re-add a repeatable job after it has been removed', function() {
    const _this = this;
    const date = new Date('2017-02-07 9:24:00');
    const nextTick = 2 * ONE_SECOND + 250;
    const repeat = { cron: '*/2 * * * * *' };
    const nextRepeatableJob = queue.nextRepeatableJob;
    this.clock.setSystemTime(date);

    const afterRemoved = new Promise(resolve => {
      queue.process(() => {
        queue.nextRepeatableJob = function() {
          const args = arguments;
          // In order to simulate race condition
          // Make removeRepeatables happen any time after a moveToX is called
          return queue
            .removeRepeatable(_.defaults({ jobId: 'xxxx' }, repeat))
            .then(() => {
              // nextRepeatableJob will now re-add the removed repeatable
              return nextRepeatableJob.apply(queue, args);
            })
            .then(result => {
              resolve();
              return result;
            });
        };
      });

      queue.add({ foo: 'bar' }, { repeat: repeat, jobId: 'xxxx' }).then(() => {
        _this.clock.tick(nextTick);
      });

      queue.on('completed', () => {
        _this.clock.tick(nextTick);
      });
    });

    return afterRemoved.then(() => {
      return queue.getRepeatableJobs().then(jobs => {
        // Repeatable job was recreated
        expect(jobs.length).to.eql(0);
      });
    });
  });

  it('should allow adding a repeatable job after removing it', () => {
    queue.process((/*job*/) => {
      // dummy
    });

    const repeat = {
      cron: '*/5 * * * *'
    };

    return queue
      .add(
        'myTestJob',
        {
          data: '2'
        },
        {
          repeat
        }
      )
      .then(() => {
        return queue.getDelayed();
      })
      .then(delayed => {
        expect(delayed.length).to.be.eql(1);
      })
      .then(() => {
        return queue.removeRepeatable('myTestJob', repeat);
      })
      .then(() => {
        return queue.getDelayed();
      })
      .then(delayed => {
        expect(delayed.length).to.be.eql(0);
      })
      .then(() => {
        return queue.add(
          'myTestJob',
          {
            data: '2'
          },
          {
            repeat
          }
        );
      })
      .then(() => {
        return queue.getDelayed();
      })
      .then(delayed => {
        expect(delayed.length).to.be.eql(1);
      });
  });

  it('should not repeat more than 5 times', function(done) {
    const _this = this;
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);
    const nextTick = ONE_SECOND + 500;

    queue
      .add(
        'repeat',
        { foo: 'bar' },
        { repeat: { limit: 5, cron: '*/1 * * * * *' } }
      )
      .then(() => {
        _this.clock.tick(nextTick);
      });

    queue.process('repeat', () => {
      // dummy
    });

    let counter = 0;
    queue.on('completed', () => {
      _this.clock.tick(nextTick);
      counter++;
      if (counter == 5) {
        utils.sleep(nextTick * 2).then(() => {
          done();
        }, nextTick * 2);
      } else if (counter > 5) {
        done(Error('should not repeat more than 5 times'));
      }
    });
  }).timeout(5000);

  it('should processes delayed jobs by priority', function(done) {
    const _this = this;
    const jobAdds = [];
    let currentPriority = 1;
    const nextTick = 1000;

    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);

    jobAdds.push(queue.add({ p: 1 }, { priority: 1, delay: nextTick * 2 }));
    jobAdds.push(queue.add({ p: 3 }, { priority: 3, delay: nextTick * 2 }));
    jobAdds.push(queue.add({ p: 2 }, { priority: 2, delay: nextTick * 2 }));

    Promise.all(jobAdds).then(() => {
      _this.clock.tick(nextTick * 3);

      queue.process((job, jobDone) => {
        try {
          expect(job.id).to.be.ok;
          expect(job.data.p).to.be.eql(currentPriority++);
        } catch (err) {
          done(err);
        }
        jobDone();

        if (currentPriority > 3) {
          done();
        }
      });
    }, done);
  });

  it('should use ".every" as a valid interval', function(done) {
    const _this = this;
    const interval = ONE_SECOND * 2;
    const date = new Date('2017-02-07 9:24:00');

    // Quantize time
    const time = Math.floor(date.getTime() / interval) * interval;
    this.clock.setSystemTime(time);

    const nextTick = ONE_SECOND * 2 + 500;

    queue
      .add('repeat m', { type: 'm' }, { repeat: { every: interval } })
      .then(() => {
        return queue.add(
          'repeat s',
          { type: 's' },
          { repeat: { every: interval } }
        );
      })
      .then(() => {
        _this.clock.tick(nextTick);
      });

    queue.process('repeat m', () => {
      // dummy
    });

    queue.process('repeat s', () => {
      // dummy
    });

    let prevType;
    let counter = 0;
    queue.on('completed', job => {
      _this.clock.tick(nextTick);
      if (prevType) {
        expect(prevType).to.not.be.eql(job.data.type);
      }
      prevType = job.data.type;
      counter++;
      if (counter == 20) {
        done();
      }
    });
  });

  it('should throw an error when using .cron and .every simutaneously', done => {
    queue
      .add(
        'repeat',
        { type: 'm' },
        { repeat: { every: 5000, cron: '*/1 * * * * *' } }
      )
      .then(
        () => {
          throw new Error('The error was not thrown');
        },
        err => {
          expect(err.message).to.be.eql(
            'Both .cron and .every options are defined for this repeatable job'
          );
          done();
        }
      );
  });

  // This tests works well locally but fails in travis for some unknown reason.
  it('should emit a waiting event when adding a repeatable job to the waiting list', function(done) {
    const _this = this;
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);
    const nextTick = 2 * ONE_SECOND + 500;

    queue.on('waiting', jobId => {
      expect(jobId).to.be.equal(
        'repeat:93168b0ea97b55fb5a8325e8c66e4300:' +
          (date.getTime() + 2 * ONE_SECOND)
      );
      done();
    });

    queue
      .add('repeat', { foo: 'bar' }, { repeat: { cron: '*/2 * * * * *' } })
      .then(() => {
        _this.clock.tick(nextTick);
      });

    queue.process('repeat', () => {});
  });

  it('should have the right count value', function(done) {
    const _this = this;

    queue.add({ foo: 'bar' }, { repeat: { every: 1000 } }).then(() => {
      _this.clock.tick(ONE_SECOND + 10);
    });

    queue.process(job => {
      if (job.opts.repeat.count === 1) {
        done();
      } else {
        done(Error('repeatable job got the wrong repeat count'));
      }
    });
  });

  it('it should stop repeating after endDate', async function() {
    const every = 100;
    const date = new Date('2017-02-07 9:24:00');
    this.clock.setSystemTime(date);

    await queue.add(
      { id: 'my id' },
      {
        repeat: {
          endDate: Date.now() + 1000,
          every: 100
        }
      }
    );

    this.clock.tick(every + 1);

    let processed = 0;
    queue.process(async () => {
      this.clock.tick(every);
      processed++;
    });

    await utils.sleep(1100);

    const delayed = await queue.getDelayed();

    expect(delayed).to.have.length(0);
    expect(processed).to.be.equal(10);
  });
});
