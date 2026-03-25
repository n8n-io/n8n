const memoizer = require('./..');
const assert = require('chai').assert;

describe('lru-memoizer (disabled)', function () {
  var loadTimes = 0, memoized;

  beforeEach(function () {
    loadTimes = 0;

    memoized = memoizer({
      disable: true,
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

  it('should call the load function every time', function (done) {
    memoized(1,2, function (err, result) {
      assert.isNull(err);
      assert.strictEqual(result, 3);
      assert.strictEqual(loadTimes, 1);
      memoized(1,2, function (err, result) {
        assert.isNull(err);
        assert.strictEqual(result, 3);
        assert.strictEqual(loadTimes, 2);
        done();
      });
    });

  });


  it('should expose hash function', function() {
    assert.equal(memoized.hash(1, 2), '1-2');
  });

});

