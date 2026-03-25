const memoizer = require('./..');
const assert = require('chai').assert;

describe('lru-memoizer sync (clone)', () => {

  describe('call', () => {
    let loadTimes = 0, memoized;

    beforeEach(() => {
      loadTimes = 0;

      memoized = memoizer.sync({
        load: (key) => {
          loadTimes++;
          return { foo: key , buffer: Buffer.from('1234') };
        },
        hash: (key) => {
          return key;
        },
        clone: true
      });
    });

    it('should return a clone every time with the same cached structure', () => {
      const r1 = memoized('bar');
      assert.strictEqual(loadTimes, 1);
      assert.equal(r1.foo, 'bar');
      r1.foo = 'bax';

      const r2 = memoized('bar');
      assert.strictEqual(loadTimes, 1);
      assert.equal(r2.foo, 'bar');
      assert.notStrictEqual(r1, r2);
      assert.notEqual(r1, r2);
    });
  });

  describe('Promise', () => {
    let loadTimes = 0, memoized;

    beforeEach(() => {
      loadTimes = 0;

      memoized = memoizer.sync({
        load: (key) => {
          loadTimes++;
          return Promise.resolve({ foo: key, buffer: Buffer.from('1234') });
        },
        hash: (key) => {
          return key;
        },
        clone: true
      });
    });

    it('should return a clone every time with the same cached structure', (done) => {
      memoized('bar').then(r1 => {
        assert.strictEqual(loadTimes, 1);
        assert.equal(r1.foo, 'bar');
        r1.foo = 'bax';

        memoized('bar').then(r2 => {
          assert.strictEqual(loadTimes, 1);
          assert.equal(r2.foo, 'bar');
          assert.notStrictEqual(r1, r2);
          assert.notEqual(r1, r2);

          done();
        });
      })
      .catch(done);
    });
  });

});

