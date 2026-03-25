const memoizer = require('./..');
const sinon = require('sinon');

describe('lru-memoizer sync (events)', function () {
  let memoized;
  let onMiss, onHit, onQueue;

  beforeEach(function () {
    loadTimes = 0;
    onMiss = sinon.stub();
    onHit = sinon.stub();
    onQueue = sinon.stub();
    memoized = memoizer.sync({
      load: function (a, b, bypass) {
        return a + b;
      },
      hash: function (a, b, bypass) {
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
    beforeEach(() => {
      memoized(1, 2, false);
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
    beforeEach(() => {
      memoized(1,2, false);
      onHit.reset();
      onMiss.reset();
      onQueue.reset();
      memoized(1, 2, false);
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
    beforeEach(() => {
      memoized(1,2, false);
      onHit.reset();
      onMiss.reset();
      onQueue.reset();
      memoized(1, 2, true);
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
});

