'use strict';

const DuplexPair = require('../');
const assert = require('assert');

describe('DuplexPair', function() {
  it('passed data through', function() {
    const pair = new DuplexPair({ encoding: 'utf8' });
    pair.socket1.write('Hello');
    assert.strictEqual(pair.socket1.read(), null);
    assert.strictEqual(pair.socket2.read(), 'Hello');
    pair.socket2.write('world');
    assert.strictEqual(pair.socket1.read(), 'world');
    assert.strictEqual(pair.socket2.read(), null);
    pair.socket1.end();
    assert.strictEqual(pair.socket1.read(), null);
    assert.strictEqual(pair.socket2.read(), null);
    pair.socket2.end();
    assert.strictEqual(pair.socket1.read(), null);
  });
});
