const memoizer = require('./..');
const sinon = require('sinon');

describe('lru-memoizer (events)', function () {
  let memoized;
  let onMiss, onHit, onQueue;

  beforeEach(function () {
    loadTimes = 0;
    onMiss = sinon.stub();
    onHit = sinon.stub();
    onQueue = sinon.stub();
    memoized = memoizer({
      load: function (a, b, bypass, callback) {
        return setTimeout(function () {
          if (a === 0) {
            return callback(new Error('a cant be 0'));
          }
          callback(null, a+b);
        }, 10);
      },
      hash: function (a, b) {
        return a + '-' + b;
      },
      bypass: function(a, b, bypass) {
        return bypass;
      },
      max: 10
    });
    memoized.on('hit', onHit);
    memoized.on('miss', onMiss);
    memoized.on('queue', onQueue);
  });

  describe('when the result is not in the cache', () => {
    beforeEach((done) => {
      memoized(1, 2, false, done);
    });

    it('should not call onHit', () => {
      sinon.assert.notCalled(onHit);
    });

    it('should not call onQueue', () => {
      sinon.assert.notCalled(onQueue);
    });

    it('should call onMiss with the load arguments', () => {
      sinon.assert.calledOnce(onMiss);
      sinon.assert.calledWith(onMiss, 1, 2, false);
    });
  });

  describe('when the result is in the cache', () => {
    beforeEach((done) => {
      memoized(1,2, false, () => {
        onHit.reset();
        onMiss.reset();
        onQueue.reset();
        memoized(1, 2, false, done);
      });
    });

    it('should call onHit with the load arguments', () => {
      sinon.assert.calledOnce(onHit);
      sinon.assert.calledWith(onHit, 1, 2, false);
    });

    it('should not call onQueue', () => {
      sinon.assert.notCalled(onQueue);
    });

    it('should not call onMiss', () => {
      sinon.assert.notCalled(onQueue);
    });
  });

  describe('when the cache is by passed', () => {
    beforeEach((done) => {
      memoized(1,2, false, () => {
        onHit.reset();
        onMiss.reset();
        onQueue.reset();
        memoized(1, 2, true, done);
      });
    });

    it('should not call onHit', () => {
      sinon.assert.notCalled(onHit);
    });

    it('should not call onQueue', () => {
      sinon.assert.notCalled(onQueue);
    });

    it('should call onMiss with the load arguments', () => {
      sinon.assert.calledOnce(onMiss);
      sinon.assert.calledWith(onMiss, 1, 2, true);
    });
  });

  describe('when the result is pending', () => {
    beforeEach((done) => {
      let pending = 2;
      function onDone() {
        pending -= 1;
        if (pending === 0) {
          done();
        }
      }
      memoized(1, 2, false, onDone);
      onHit.reset();
      onMiss.reset();
      onQueue.reset();
      memoized(1, 2, false, onDone);
    });

    it('should not call onHit', () => {
      sinon.assert.notCalled(onHit);
    });

    it('should call onQueue with the load arguments', () => {
      sinon.assert.calledOnce(onQueue);
      sinon.assert.calledWith(onQueue, 1, 2, false);
    });

    it('should not call onMiss', () => {
      sinon.assert.notCalled(onMiss);
    });
  });
});

