const memoizer = require('./..');
const assert = require('chai').assert;

describe('lru-memoizer (clone)', () => {
  let loadTimes = 0, memoized;

  beforeEach(() => {
    loadTimes = 0;

    memoized = memoizer({
      load: (key, callback) => {
        loadTimes++;
        callback(null, { foo: key, buffer: Buffer.from('1234') });
      },
      hash: (key) => {
        return key;
      },
      clone: true
    });
  });

  it('should return a clone every time with the same cached structure', (done) => {
    memoized('bar', (err, r1) => {

      assert.isNull(err);
      assert.strictEqual(loadTimes, 1);
      assert.equal(r1.foo, 'bar');
      r1.foo = 'bax';

      memoized('bar', (err, r2) => {
        assert.isNull(err);

        assert.strictEqual(loadTimes, 1);
        assert.equal(r2.foo, 'bar');
        assert.notStrictEqual(r1, r2);
        assert.notEqual(r1, r2);

        done();
      });
    });
  });

});

