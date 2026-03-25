var memoizer = require('./..');
var assert = require('chai').assert;

describe('lru-memoizer sync', function () {
  var loadTimes = 0, memoized;

  beforeEach(function () {
    loadTimes = 0;

    memoized = memoizer.sync({
      load: function (a, b) {
        loadTimes++;
        if (a === 0) {
          throw new Error('a cant be 0');
        }
        return a + b;
      },
      hash: function (a, b) {
        return a + '-' + b;
      },
      max: 10
    });
  });

  it('should cache the result of an async function', function () {
    var result = memoized(1, 2);
    assert.equal(result, 3);
    assert.equal(loadTimes, 1);

    var result2 = memoized(1,2);
    assert.equal(result2, 3);
    assert.equal(loadTimes, 1);
  });

  it('shuld use the hash function for keys', function () {
    memoized(1, 2);
    memoized(2, 3);
    assert.includeMembers(memoized.keys(), ['1-2', '2-3']);
  });

  it('should not cache errored funcs', function () {
    try {
      memoized(0, 2);
    } catch(err) {}
    assert.notInclude(memoized.keys(), ['0-2']);
  });
});