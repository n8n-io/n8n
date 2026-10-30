'use strict';

const expect = require('chai').expect;
const utils = require('./utils');
const redis = require('ioredis');
const _ = require('lodash');
const delay = require('delay');
const pReflect = require('p-reflect');

describe('sandboxed process', () => {
  let queue;
  let client;

  beforeEach(() => {
    client = new redis();
    return client.flushdb().then(() => {
      queue = utils.buildQueue('test process', {
        settings: {
          guardInterval: 300000,
          stalledInterval: 300000
        }
      });
      return queue;
    });
  });

  afterEach(() => {
    return queue
      .close()
      .then(() => {
        return client.flushall();
      })
      .then(() => {
        return client.quit();
      });
  });

  it('should process and complete', done => {
    const processFile = __dirname + '/fixtures/fixture_processor.js';
    queue.process(processFile);

    queue.on('completed', (job, value) => {
      try {
        expect(job.data).to.be.eql({ foo: 'bar' });
        expect(value).to.be.eql(42);
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
        expect(queue.childPool.free[processFile]).to.have.lengthOf(1);
        done();
      } catch (err) {
        done(err);
      }
    });

    queue.add({ foo: 'bar' });
  });

  it('should process with named processor', done => {
    const processFile = __dirname + '/fixtures/fixture_processor.js';
    queue.process('foobar', processFile);

    queue.on('completed', (job, value) => {
      try {
        expect(job.data).to.be.eql({ foo: 'bar' });
        expect(value).to.be.eql(42);
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
        expect(queue.childPool.free[processFile]).to.have.lengthOf(1);
        done();
      } catch (err) {
        done(err);
      }
    });

    queue.add('foobar', { foo: 'bar' });
  });

  it('should process with several named processors', done => {
    const processFileFoo = __dirname + '/fixtures/fixture_processor_foo.js';
    const processFileBar = __dirname + '/fixtures/fixture_processor_bar.js';

    queue.process('foo', processFileFoo);
    queue.process('bar', processFileBar);

    let count = 0;
    queue.on('completed', (job, value) => {
      let data, result, processFile, retainedLength;
      count++;
      if (count == 1) {
        data = { foo: 'bar' };
        result = 'foo';
        processFile = processFileFoo;
        retainedLength = 1;
      } else {
        data = { bar: 'qux' };
        result = 'bar';
        processFile = processFileBar;
        retainedLength = 0;
      }

      try {
        expect(job.data).to.be.eql(data);
        expect(value).to.be.eql(result);
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(
          retainedLength
        );
        expect(queue.childPool.free[processFile]).to.have.lengthOf(1);
        if (count === 2) {
          done();
        }
      } catch (err) {
        console.error(err);
        done(err);
      }
    });

    queue.add('foo', { foo: 'bar' }).then(() => {
      delay(500).then(() => {
        queue.add('bar', { bar: 'qux' });
      });
    });

    queue.on('error', err => {
      console.error(err);
    });
  });

  it('should process with concurrent processors', done => {
    const after = _.after(4, () => {
      expect(queue.childPool.getAllFree().length).to.eql(4);
      done();
    });
    queue.on('completed', (job, value) => {
      try {
        expect(value).to.be.eql(42);
        expect(
          Object.keys(queue.childPool.retained).length +
            queue.childPool.getAllFree().length
        ).to.eql(4);
        after();
      } catch (err) {
        done(err);
      }
    });

    Promise.all([
      queue.add({ foo: 'bar1' }),
      queue.add({ foo: 'bar2' }),
      queue.add({ foo: 'bar3' }),
      queue.add({ foo: 'bar4' })
    ]).then(() => {
      queue.process(4, __dirname + '/fixtures/fixture_processor_slow.js');
    });
  });

  it('should reuse process with single processors', done => {
    const after = _.after(4, () => {
      expect(queue.childPool.getAllFree().length).to.eql(1);
      done();
    });
    queue.on('completed', (job, value) => {
      try {
        expect(value).to.be.eql(42);
        expect(
          Object.keys(queue.childPool.retained).length +
            queue.childPool.getAllFree().length
        ).to.eql(1);
        after();
      } catch (err) {
        done(err);
      }
    });

    Promise.all([
      queue.add({ foo: 'bar1' }),
      queue.add({ foo: 'bar2' }),
      queue.add({ foo: 'bar3' }),
      queue.add({ foo: 'bar4' })
    ]).then(() => {
      queue.process(__dirname + '/fixtures/fixture_processor_slow.js');
    });
  }).timeout(5000);

  it('should process and complete using done', done => {
    queue.process(__dirname + '/fixtures/fixture_processor_callback.js');

    queue.on('completed', (job, value) => {
      try {
        expect(job.data).to.be.eql({ foo: 'bar' });
        expect(value).to.be.eql(42);
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
        expect(queue.childPool.getAllFree()).to.have.lengthOf(1);
        done();
      } catch (err) {
        done(err);
      }
    });

    queue.add({ foo: 'bar' });
  });

  it('should process and update progress', done => {
    queue.process(__dirname + '/fixtures/fixture_processor_progress.js');

    queue.on('completed', async (job, value) => {
      try {
        expect(job.data).to.be.eql({ foo: 'bar' });
        expect(value).to.be.eql(37);
        expect(job.progress()).to.be.eql(100);
        expect(progresses).to.be.eql([10, 27, 78, 100]);
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
        expect(queue.childPool.getAllFree()).to.have.lengthOf(1);
        await queue.getJobLogs(job.id).then(logs =>
          expect(logs).to.be.eql({
            logs: ['10', '27', '78', '100'],
            count: 4
          })
        );
        await queue.getJobLogs(job.id, 2, 2).then(logs =>
          expect(logs).to.be.eql({
            logs: ['78'],
            count: 4
          })
        );
        await queue.getJobLogs(job.id, 0, 1).then(logs =>
          expect(logs).to.be.eql({
            logs: ['10', '27'],
            count: 4
          })
        );
        await queue.getJobLogs(job.id, 1, 2).then(logs =>
          expect(logs).to.be.eql({
            logs: ['27', '78'],
            count: 4
          })
        );
        await queue.getJobLogs(job.id, 2, 2, false).then(logs =>
          expect(logs).to.be.eql({
            logs: ['27'],
            count: 4
          })
        );
        await queue.getJobLogs(job.id, 0, 1, false).then(logs =>
          expect(logs).to.be.eql({
            logs: ['100', '78'],
            count: 4
          })
        );
        await queue.getJobLogs(job.id, 1, 2, false).then(logs =>
          expect(logs).to.be.eql({
            logs: ['78', '27'],
            count: 4
          })
        );
        done();
      } catch (err) {
        done(err);
      }
    });

    const progresses = [];
    queue.on('progress', (job, progress) => {
      progresses.push(progress);
    });

    queue.add({ foo: 'bar' });
  });

  it('should process and update data', done => {
    queue.process(__dirname + '/fixtures/fixture_processor_data.js');

    queue.on('completed', (job, value) => {
      try {
        expect(job.data).to.be.eql({ baz: 'qux' });
        expect(value).to.be.eql({ baz: 'qux' });
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
        expect(queue.childPool.getAllFree()).to.have.lengthOf(1);
        done();
      } catch (err) {
        done(err);
      }
    });

    queue.add({ foo: 'bar' });
  });

  it('should process, discard and fail without retry', done => {
    queue.process(__dirname + '/fixtures/fixture_processor_discard.js');

    queue.on('failed', (job, err) => {
      try {
        expect(job.data).eql({ foo: 'bar' });
        expect(job.isDiscarded()).to.be.true;
        expect(job.failedReason).eql('Manually discarded processor');
        expect(err.message).eql('Manually discarded processor');
        expect(err.stack).include('fixture_processor_discard.js');
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
        expect(queue.childPool.getAllFree()).to.have.lengthOf(1);
        done();
      } catch (err) {
        done(err);
      }
    });

    queue.add({ foo: 'bar' });
  });

  it('should process and fail', done => {
    queue.process(__dirname + '/fixtures/fixture_processor_fail.js');

    queue.on('failed', (job, err) => {
      try {
        expect(job.data).eql({ foo: 'bar' });
        expect(job.failedReason).eql('Manually failed processor');
        expect(err.message).eql('Manually failed processor');
        expect(err.stack).include('fixture_processor_fail.js');
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
        expect(queue.childPool.getAllFree()).to.have.lengthOf(1);
        done();
      } catch (err) {
        done(err);
      }
    });

    queue.add({ foo: 'bar' });
  });

  it('should error if processor file is missing', done => {
    try {
      queue.process(__dirname + '/fixtures/missing_processor.js');
      done(new Error('did not throw error'));
    } catch (err) {
      done();
    }
  });

  it('should process and fail using callback', done => {
    queue.process(__dirname + '/fixtures/fixture_processor_callback_fail.js');

    queue.on('failed', (job, err) => {
      try {
        expect(job.data).eql({ foo: 'bar' });
        expect(job.failedReason).eql('Manually failed processor');
        expect(err.message).eql('Manually failed processor');
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
        expect(queue.childPool.getAllFree()).to.have.lengthOf(1);
        done();
      } catch (err) {
        done(err);
      }
    });

    queue.add({ foo: 'bar' });
  });

  it('should fail if the process crashes', () => {
    queue.process(__dirname + '/fixtures/fixture_processor_crash.js');

    return queue
      .add({})
      .then(job => {
        return pReflect(Promise.resolve(job.finished()));
      })
      .then(inspection => {
        expect(inspection.isRejected).to.be.eql(true);
        expect(inspection.reason.message).to.be.eql('boom!');
      });
  });

  it('should fail if the process exits 0', () => {
    queue.process(__dirname + '/fixtures/fixture_processor_crash.js');

    return queue
      .add({ exitCode: 0 })
      .then(job => {
        return pReflect(Promise.resolve(job.finished()));
      })
      .then(inspection => {
        expect(inspection.isRejected).to.be.eql(true);
        expect(inspection.reason.message).to.be.eql(
          'Unexpected exit code: 0 signal: null'
        );
      });
  });

  it('should fail if the process exits non-0', () => {
    queue.process(__dirname + '/fixtures/fixture_processor_crash.js');

    return queue
      .add({ exitCode: 1 })
      .then(job => {
        return pReflect(Promise.resolve(job.finished()));
      })
      .then(inspection => {
        expect(inspection.isRejected).to.be.eql(true);
        expect(inspection.reason.message).to.be.eql(
          'Unexpected exit code: 1 signal: null'
        );
      });
  });

  it('should remove exited process', done => {
    queue.process(__dirname + '/fixtures/fixture_processor_exit.js');

    queue.on('completed', () => {
      try {
        expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
        expect(queue.childPool.getAllFree()).to.have.lengthOf(1);
        delay(500)
          .then(() => {
            expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
            expect(queue.childPool.getAllFree()).to.have.lengthOf(0);
          })
          .then(() => {
            done();
          }, done);
      } catch (err) {
        done(err);
      }
    });

    queue.add({ foo: 'bar' });
  });

  it('should allow the job to complete and then exit on clean', async function() {
    this.timeout(1500);
    const processFile = __dirname + '/fixtures/fixture_processor_slow.js';
    queue.process(processFile);

    // aquire and release a child here so we know it has it's full termination handler setup
    const expectedChild = await queue.childPool.retain(processFile);
    queue.childPool.release(expectedChild);
    const onActive = new Promise(resolve => queue.once('active', resolve));
    const jobAddPromise = queue.add({ foo: 'bar' });

    await onActive;

    // at this point the job should be active and running on the child
    expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(1);
    expect(queue.childPool.getAllFree()).to.have.lengthOf(0);
    const child = Object.values(queue.childPool.retained)[0];
    expect(child).to.equal(expectedChild);
    expect(child.exitCode).to.equal(null);
    expect(child.finished).to.equal(undefined);

    // trigger a clean while we know it's doing work
    await queue.childPool.clean();

    // ensure the child did get cleaned up
    expect(expectedChild.killed).to.eql(true);
    expect(Object.keys(queue.childPool.retained)).to.have.lengthOf(0);
    expect(queue.childPool.getAllFree()).to.have.lengthOf(0);

    // make sure the job completed successfully
    const job = await jobAddPromise;
    const jobResult = await job.finished();
    expect(jobResult).to.equal(42);
  });

  it('should share child pool across all different queues created', async () => {
    const [queueA, queueB] = await Promise.all([
      utils.newQueue('queueA', { settings: { isSharedChildPool: true } }),
      utils.newQueue('queueB', { settings: { isSharedChildPool: true } })
    ]);

    const processFile = __dirname + '/fixtures/fixture_processor.js';
    queueA.process(processFile);
    queueB.process(processFile);

    await Promise.all([queueA.add(), queueB.add()]);

    expect(queueA.childPool).to.be.eql(queueB.childPool);
  });

  it("should not share childPool across different queues if isSharedChildPool isn't specified", async () => {
    const [queueA, queueB] = await Promise.all([
      utils.newQueue('queueA', { settings: { isSharedChildPool: false } }),
      utils.newQueue('queueB')
    ]);

    const processFile = __dirname + '/fixtures/fixture_processor.js';
    queueA.process(processFile);
    queueB.process(processFile);

    await Promise.all([queueA.add(), queueB.add()]);

    expect(queueA.childPool).to.not.be.equal(queueB.childPool);
  });

  it('should fail if the process file is broken', async () => {
    const processFile = __dirname + '/fixtures/fixture_processor_broken.js';
    queue.process(processFile);
    await queue.add('test', {});

    return new Promise(resolve => {
      queue.on('failed', () => {
        resolve();
      });
    });
  });
});
