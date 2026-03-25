var memoizer = require('./..');
var assert = require('chai').assert;

describe('lru-memoizer (itemMaxAge)', function () {
  var loadTimes = 0, memoized;

  beforeEach(function () {
    loadTimes = 0;
  });

  it('should use default behavior if not configured', function (done) {
    memoized = memoizer({
      load: function (a, b, callback) {
        loadTimes++;
        setTimeout(function () {
          callback(null, a + b);
        }, 100);
      },
      hash: function (a, b) {
        return a + '-' + b;
      },
      max: 10,
      maxAge: 500
    });

    memoized(1,2, function (err, result) {
      assert.isNull(err);
      assert.strictEqual(result, 3);
      assert.strictEqual(loadTimes, 1);

      // Not expired yet.
      setTimeout(function() {
        memoized(1,2, function (err, result) {
          assert.isNull(err);
          assert.strictEqual(result, 3);
          assert.strictEqual(loadTimes, 1);

          // Expired, load times will increase.
          setTimeout(function() {
            memoized(1,2, function (err, result) {
              assert.isNull(err);
              assert.strictEqual(result, 3);
              assert.strictEqual(loadTimes, 2);
              done();
            });
          }, 200);
        });
      }, 400);
    });
  });

  it('should return all args and the result in the itemMaxAge function', function (done) {
    var args;
    memoized = memoizer({
      load: function (a, b, callback) {
        loadTimes++;
        setTimeout(function () {
          callback(null, a + b);
        }, 100);
      },
      itemMaxAge: function (a, b, result) {
        args = arguments;
        return 1000;
      },
      hash: function (a, b) {
        return a + '-' + b;
      },
      max: 10,
      maxAge: 600
    });

    memoized(1,2, function (err, result) {
      assert.isNull(err);
      assert.strictEqual(args[0], 1);
      assert.strictEqual(args[1], 2);
      assert.strictEqual(args[2], 3);
      done();
    });
  });

  it('should overwrite the default behavior if configured', function (done) {
    var maxAge = 0;
    var lastKey = null;
    memoized = memoizer({
      load: function (a, b, callback) {
        loadTimes++;
        setTimeout(function () {
          callback(null, a + b);
        }, 100);
      },
      itemMaxAge: function (a, b, result) {
        lastKey = a + '-' + b;
        // In this test, we set the maxAge of the current item to (result*100).
        // If the result is 3, the max age of this item will be 300.
        maxAge = result * 100;
        return maxAge;
      },
      hash: function (a, b) {
        return a + '-' + b;
      },
      max: 10,
      maxAge: 600
    });

    memoized(1,2, function (err, result) {
      assert.isNull(err);
      assert.strictEqual(maxAge, 300);
      assert.strictEqual(lastKey, '1-2');
      assert.strictEqual(result, 3);
      assert.strictEqual(loadTimes, 1);

      // Not expired yet after 200 ms, because the expiration is 300
      setTimeout(function() {
        memoized(1,2, function (err, result) {
          assert.isNull(err);
          assert.strictEqual(maxAge, 300);
          assert.strictEqual(lastKey, '1-2');
          assert.strictEqual(result, 3);
          assert.strictEqual(loadTimes, 1);

          // Expired because now we are at 350 ms (even though gloabl expiration has been set to 600)
          setTimeout(function() {
            memoized(1,2, function (err, result) {
              assert.isNull(err);
              assert.strictEqual(maxAge, 300);
              assert.strictEqual(lastKey, '1-2');
              assert.strictEqual(result, 3);
              assert.strictEqual(loadTimes, 2);

              // Expired again, because 350ms have passed again.
              setTimeout(function() {
                memoized(1,2, function (err, result) {
                  assert.isNull(err);
                  assert.strictEqual(maxAge, 300);
                  assert.strictEqual(lastKey, '1-2');
                  assert.strictEqual(result, 3);
                  assert.strictEqual(loadTimes, 3);
                  done();
                });
              }, 350);
            });
          }, 150);
        });
      }, 200);
    });
  });

  it('should overwrite the default behavior if configured (sync)', function (done) {
    var maxAge = 0;
    var lastKey = null;
    memoized = memoizer.sync({
      load: function (a, b) {
        loadTimes++;
        return a + b;
      },
      itemMaxAge: function (a, b, result) {
        lastKey = a + '-' + b;
        // In this test, we set the maxAge of the current item to (result*100).
        // If the result is 3, the max age of this item will be 300.
        maxAge = result * 100;
        return maxAge;
      },
      hash: function (a, b) {
        return a + '-' + b;
      },
      max: 10,
      maxAge: 600
    });

    var result = memoized(1, 2);
    assert.strictEqual(maxAge, 300);
    assert.strictEqual(lastKey, '1-2');
    assert.strictEqual(result, 3);
    assert.strictEqual(loadTimes, 1);

    // Not expired yet after 200 ms, because the expiration is 300
    setTimeout(function() {
      result = memoized(1, 2);
      assert.strictEqual(maxAge, 300);
      assert.strictEqual(lastKey, '1-2');
      assert.strictEqual(result, 3);
      assert.strictEqual(loadTimes, 1);

      // Expired because now we are at 350 ms (even though gloabl expiration has been set to 600)
      setTimeout(function() {
        result = memoized(1,2);
        assert.strictEqual(maxAge, 300);
        assert.strictEqual(lastKey, '1-2');
        assert.strictEqual(result, 3);
        assert.strictEqual(loadTimes, 2);

          // Expired again, because 350ms have passed again.
          setTimeout(function() {
            result = memoized(1,2);
            assert.strictEqual(maxAge, 300);
            assert.strictEqual(lastKey, '1-2');
            assert.strictEqual(result, 3);
            assert.strictEqual(loadTimes, 3);
            done();
          }, 350);
      }, 150);
    }, 200);
  });
});
