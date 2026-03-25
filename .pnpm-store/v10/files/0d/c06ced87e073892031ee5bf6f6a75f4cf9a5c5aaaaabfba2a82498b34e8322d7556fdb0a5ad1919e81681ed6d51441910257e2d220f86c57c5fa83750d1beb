var vows = require('vows');
var assert = require('assert');

var TIMING_EPSILON = 10;

var TokenBucket = require('../lib/tokenBucket');

vows.describe('TokenBucket').addBatch({
  'capacity 10, 1 per 100ms': {
    topic: new TokenBucket(10, 1, 100),

    'is initialized empty': function(bucket) {
      assert.equal(bucket.bucketSize, 10);
      assert.equal(bucket.tokensPerInterval, 1);
      assert.equal(bucket.content, 0);
    },
    'removing 10 tokens': {
      topic: function(bucket) {
        this.gStart = +new Date();
        bucket.removeTokens(10, this.callback);
      },
      'takes 1 second': function(remainingTokens) {
        var duration = +new Date() - this.gStart;
        var diff = Math.abs(1000 - duration);
        assert.ok(diff < TIMING_EPSILON, diff+'');
        assert.equal(remainingTokens, 0);
      },
      'and removing another 10 tokens': {
        topic: function(_, bucket) {
          this.gStart = +new Date();
          assert.equal(bucket.content, 0);
          bucket.removeTokens(10, this.callback);
        },
        'takes 1 second': function() {
          var duration = +new Date() - this.gStart;
          var diff = Math.abs(1000 - duration);
          assert.ok(diff < TIMING_EPSILON, diff+'');
        }
      },
      'and waiting 2 seconds': {
        topic: function(_, bucket) {
          var self = this;
          setTimeout(function() {
            self.gStart = +new Date();
            bucket.removeTokens(10, self.callback);
          }, 2000);
        },
        'gives us only 10 tokens': function(remainingTokens) {
          var duration = +new Date() - this.gStart;
          assert.ok(duration < TIMING_EPSILON, duration+'');
          assert.equal(remainingTokens, 0);
        },
        'and removing 1 token': {
          topic: function(_, _, bucket) {
            this.gStart = +new Date();
            bucket.removeTokens(1, this.callback);
          },
          'takes 100ms': function() {
            var duration = +new Date() - this.gStart;
            var diff = Math.abs(100 - duration);
            assert.ok(diff < TIMING_EPSILON, diff+'');
          }
        }
      }
    }
  },
}).export(module);
