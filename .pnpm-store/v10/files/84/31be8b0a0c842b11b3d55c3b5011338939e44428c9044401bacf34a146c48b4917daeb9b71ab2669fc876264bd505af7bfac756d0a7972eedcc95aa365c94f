const memoizer = require('./..');
const assert   = require('chai').assert;
const _        = require('lodash');

describe('lru-simultaneos calls', function () {
  var loadTimes = 0, memoized;

  beforeEach(function () {
    loadTimes = 0;

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
      max: 10
    });
  });

  it('should call once', function (done) {
    memoized(1, 2, _.noop);
    memoized(1, 2, _.noop);
    memoized(1, 2, function (err, result) {
      if (err) { return done(err); }
      assert.strictEqual(loadTimes, 1);
      assert.strictEqual(result, 3);
      done();
    });
  });

});
