var vows = require('vows');
var assert = require('assert');
var RateLimiter = require('../lib/rateLimiter');

vows.describe('RateLimiter').addBatch({
  'interval validation': {
    'invalid interval': function() {
      assert.throws(function() { new RateLimiter(1, 'junk'); }, /interval/);
    },
    'valid intervals': function() {
      assert.doesNotThrow(function() { new RateLimiter(1, 'sec'); });
      assert.doesNotThrow(function() { new RateLimiter(1, 'second'); });
      assert.doesNotThrow(function() { new RateLimiter(1, 'min'); });
      assert.doesNotThrow(function() { new RateLimiter(1, 'minute'); });
      assert.doesNotThrow(function() { new RateLimiter(1, 'hr'); });
      assert.doesNotThrow(function() { new RateLimiter(1, 'hour'); });
      assert.doesNotThrow(function() { new RateLimiter(1, 'day'); });
    }
  }
}).export(module);
