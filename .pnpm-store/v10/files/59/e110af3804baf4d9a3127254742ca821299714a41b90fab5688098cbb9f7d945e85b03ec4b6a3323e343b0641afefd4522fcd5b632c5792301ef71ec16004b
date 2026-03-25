const memoizer = require('../lib/index.js');
const assert = require('chai').assert;

describe('lru-memoizer (bypass)', function () {
  var loadTimes = 0, memoized;

  beforeEach(function () {
    loadTimes = 0;

    memoized = memoizer({
      load: function (a, b, callback) {
        loadTimes++;
        callback(null, a + b);
      },
      hash: function (a, b) {
        return a + '-' + b;
      },
      bypass: function (a, b) {
        return a < b;
      },
      max: 10
    });


  });

  it('should call the load function every time', function (done) {
    memoized(1, 2, function (err) {
      assert.isNull(err);
      assert.strictEqual(loadTimes, 1);
      memoized(1, 2, function (err) {
        assert.isNull(err);
        assert.strictEqual(loadTimes, 2);
        done();
      });
    });
  });
});

