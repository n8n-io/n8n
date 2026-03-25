function JwksRateLimitError(message) {
  Error.call(this, message);
  Error.captureStackTrace(this, this.constructor);
  this.name = 'JwksRateLimitError';
  this.message = message;
}

JwksRateLimitError.prototype = Object.create(Error.prototype);
JwksRateLimitError.prototype.constructor = JwksRateLimitError;
module.exports = JwksRateLimitError;
