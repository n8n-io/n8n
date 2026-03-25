var memoizer = require('./..');
var assert = require('chai').assert;

describe('lru-memoizer (queueMaxAge)', function () {
  var loadTimes = 0, memoized;

  beforeEach(function () {
    loadTimes = 0;
  });

  function observer() {
    const listeners = [];
    return {
      listen(listener) {
        listeners.push(listener);
      },
      trigger() {
        listeners.forEach(listener => listener());
      }
    }
  }

  it('should create a new queue once expired', function (done) {
    memoized = memoizer({
      load: function (a, b, onResolve, callback) {
        loadTimes++;
        onResolve(() => callback(null, a + b));
      },
      queueMaxAge: 10,
      hash: function (a, b) {
        return a + '-' + b;
      }
    });

    const observer1 = observer();
    const observer2 = observer();
    const observer3 = observer();
    const resolved = [];

    memoized(1, 2, observer1.listen, function (err, result) {
      assert.isNull(err);
      assert.strictEqual(result, 3);
      resolved.push('A');
    });

    assert.strictEqual(loadTimes, 1);

    memoized(1, 2, assert.fail, function (err, result) {
      assert.isNull(err);
      assert.strictEqual(result, 3);
      resolved.push('B');
    });

    assert.strictEqual(loadTimes, 1);

    setTimeout(() => {
      // previous queue expired, this calls will be added to a new queue.
      memoized(1, 2, observer2.listen, function (err, result) {
        assert.isNull(err);
        assert.strictEqual(result, 3);
        resolved.push('C');
      });

      memoized(1, 2, assert.fail, function (err, result) {
        assert.isNull(err);
        assert.strictEqual(result, 3);
        resolved.push('D');
      });

      // only one new invocation to load
      assert.strictEqual(loadTimes, 2);

      setTimeout(() => {
        // second queue expired, this calls will be added to a third queue.
        memoized(1, 2, observer3.listen, function (err, result) {
          assert.isNull(err);
          assert.strictEqual(result, 3);
          resolved.push('E');
        });

        memoized(1, 2, assert.fail.listen, function (err, result) {
          assert.isNull(err);
          assert.strictEqual(result, 3);
          resolved.push('F');
        });

        assert.strictEqual(loadTimes, 3);

        observer1.trigger();
        setImmediate(() => {
          // first queue was resolved
          assert.deepEqual(['A', 'B'], resolved);

          observer3.trigger();
          setImmediate(() => {
            // third queue was resolved
            assert.deepEqual(['A', 'B', 'E', 'F'], resolved);

            observer2.trigger();
            setImmediate(() => {
              // second queue was resolved
              assert.deepEqual(['A', 'B', 'E', 'F', 'C', 'D'], resolved);
              done();
            });
          });
        });
      }, 100);
    }, 100);
  });
});
