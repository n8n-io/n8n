var memoizer = require('./..');
var assert = require('chai').assert;

describe('lru-memoizer (no key)', function () {
  var loadTimes = 0, memoized;

  beforeEach(function () {
    loadTimes = 0;

    memoized = memoizer({
      load: function (callback) {
        loadTimes++;
        return setTimeout(function () {
          callback(null, loadTimes);
        }, 10);
      }
    });
  });

  it('should cache the result of an async function', function (done) {
    memoized(function (err, result) {
      assert.isNull(err);
      assert.equal(result, 1);
      assert.equal(loadTimes, 1);
      memoized(function (err, result) {
        assert.isNull(err);
        assert.equal(result, 1);
        assert.equal(loadTimes, 1);
        done();
      });
    });

  });

  it('should use the hash function for keys', function (done) {
    memoized(function () {
      memoized(function () {
        assert.includeMembers(memoized.keys(), ['_']);
        done();
      });
    });
  });
});
