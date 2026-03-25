var memoizer = require('./..');
var assert = require('chai').assert;

describe('lru-memoizer', function () {
  var loadTimes = 0, memoized;

  beforeEach(function () {
    loadTimes = 0;

    memoized = memoizer({
      load: function (a, b, callback) {
        loadTimes++;
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
      max: 10
    });
  });

  it('should cache the result of an async function', function (done) {
    memoized(1,2, function (err, result) {
      assert.isNull(err);
      assert.strictEqual(result, 3);
      assert.strictEqual(loadTimes, 1);
      memoized(1,2, function (err, result) {
        assert.isNull(err);
        assert.strictEqual(result, 3);
        assert.strictEqual(loadTimes, 1);
        done();
      });
    });

  });

  it('should use the hash function for keys', function (done) {
    memoized(1, 2, function () {
      memoized(2,3, function () {
        assert.includeMembers(memoized.keys(), ['1-2', '2-3']);
        done();
      });
    });
  });

  it('should not cache errored funcs', function (done) {
    memoized(0, 2, function (err) {
      assert.isNotNull(err);
      assert.notInclude(memoized.keys(), ['0-2']);
      done();
    });
  });

  it('should expose the hash function', function() {
    assert.equal(memoized.hash(0, 2), '0-2');
  });

  it('should expose the load function', function(done) {
    memoized.load(1, 2, (err, result) => {
      assert.equal(result, 3);
      done();
    });
  });

  it('should expose the max prop', function() {
    assert.equal(memoized.max, 10);
  });

  it('should allow to del a key', function(done) {
    memoized(1,2, () => {
      assert.strictEqual(loadTimes, 1);
      memoized.del(1,2);
      memoized(1,2, (err, result) => {
        assert.isNull(err);
        assert.strictEqual(result, 3);
        assert.strictEqual(loadTimes, 2);
        done();
      });
    });
  });

});

