
/**
 * A hierarchical token bucket for rate limiting. See
 * http://en.wikipedia.org/wiki/Token_bucket for more information.
 * @author John Hurliman <jhurliman@cull.tv>
 *
 * @param {Number} bucketSize Maximum number of tokens to hold in the bucket.
 *  Also known as the burst rate.
 * @param {Number} tokensPerInterval Number of tokens to drip into the bucket
 *  over the course of one interval.
 * @param {String|Number} interval The interval length in milliseconds, or as
 *  one of the following strings: 'second', 'minute', 'hour', day'.
 * @param {TokenBucket} parentBucket Optional. A token bucket that will act as
 *  the parent of this bucket.
 */
var TokenBucket = function(bucketSize, tokensPerInterval, interval, parentBucket) {
  this.bucketSize = bucketSize;
  this.tokensPerInterval = tokensPerInterval;

  if (typeof interval === 'string') {
    switch (interval) {
      case 'sec': case 'second':
        this.interval = 1000; break;
      case 'min': case 'minute':
        this.interval = 1000 * 60; break;
      case 'hr': case 'hour':
        this.interval = 1000 * 60 * 60; break;
      case 'day':
        this.interval = 1000 * 60 * 60 * 24; break;
      default:
        throw new Error('Invaid interval ' + interval);
    }
  } else {
    this.interval = interval;
  }

  this.parentBucket = parentBucket;
  this.content = 0;
  this.lastDrip = +new Date();
};

TokenBucket.prototype = {
  bucketSize: 1,
  tokensPerInterval: 1,
  interval: 1000,
  parentBucket: null,
  content: 0,
  lastDrip: 0,

  /**
   * Remove the requested number of tokens and fire the given callback. If the
   * bucket (and any parent buckets) contains enough tokens this will happen
   * immediately. Otherwise, the removal and callback will happen when enough
   * tokens become available.
   * @param {Number} count The number of tokens to remove.
   * @param {Function} callback(err, remainingTokens)
   * @returns {Boolean} True if the callback was fired immediately, otherwise
   *  false.
   */
  removeTokens: function(count, callback) {
    var self = this;

    // Is this an infinite size bucket?
    if (!this.bucketSize) {
      process.nextTick(callback.bind(null, null, count, Number.POSITIVE_INFINITY));
      return true;
    }

    // Make sure the bucket can hold the requested number of tokens
    if (count > this.bucketSize) {
      process.nextTick(callback.bind(null, 'Requested tokens ' + count + ' exceeds bucket size ' +
        this.bucketSize, null));
      return false;
    }

    // Drip new tokens into this bucket
    this.drip();

    // If we don't have enough tokens in this bucket, come back later
    if (count > this.content)
      return comeBackLater();

    if (this.parentBucket) {
      // Remove the requested from the parent bucket first
      return this.parentBucket.removeTokens(count, function(err, remainingTokens) {
        if (err) return callback(err, null);

        // Check that we still have enough tokens in this bucket
        if (count > self.content)
          return comeBackLater();

        // Tokens were removed from the parent bucket, now remove them from
        // this bucket and fire the callback. Note that we look at the current
        // bucket and parent bucket's remaining tokens and return the smaller
        // of the two values
        self.content -= count;
        callback(null, Math.min(remainingTokens, self.content));
      });
    } else {
      // Remove the requested tokens from this bucket and fire the callback
      this.content -= count;
      process.nextTick(callback.bind(null, null, this.content));
      return true;
    }

    function comeBackLater() {
      // How long do we need to wait to make up the difference in tokens?
      var waitInterval = Math.ceil(
        (count - self.content) * (self.interval / self.tokensPerInterval));
      setTimeout(function() { self.removeTokens(count, callback); }, waitInterval);
      return false;
    }
  },

  /**
   * Attempt to remove the requested number of tokens and return immediately.
   * If the bucket (and any parent buckets) contains enough tokens this will
   * return true, otherwise false is returned.
   * @param {Number} count The number of tokens to remove.
   * @param {Boolean} True if the tokens were successfully removed, otherwise
   *  false.
   */
  tryRemoveTokens: function(count) {
    // Is this an infinite size bucket?
    if (!this.bucketSize)
      return true;

    // Make sure the bucket can hold the requested number of tokens
    if (count > this.bucketSize)
      return false;

    // Drip new tokens into this bucket
    this.drip();

    // If we don't have enough tokens in this bucket, return false
    if (count > this.content)
      return false;

    // Try to remove the requested tokens from the parent bucket
    if (this.parentBucket && !this.parentBucket.tryRemoveTokens(count))
      return false;

    // Remove the requested tokens from this bucket and return
    this.content -= count;
    return true;
  },

  /**
   * Add any new tokens to the bucket since the last drip.
   * @returns {Boolean} True if new tokens were added, otherwise false.
   */
  drip: function() {
    if (!this.tokensPerInterval) {
      this.content = this.bucketSize;
      return;
    }

    var now = +new Date();
    var deltaMS = Math.max(now - this.lastDrip, 0);
    this.lastDrip = now;

    var dripAmount = deltaMS * (this.tokensPerInterval / this.interval);
    this.content = Math.min(this.content + dripAmount, this.bucketSize);
  }
};

module.exports = TokenBucket;
