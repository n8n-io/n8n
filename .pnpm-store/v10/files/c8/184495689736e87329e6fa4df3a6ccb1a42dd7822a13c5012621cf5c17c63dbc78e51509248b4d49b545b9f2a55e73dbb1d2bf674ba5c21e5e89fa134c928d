function JwksError(message) {
  Error.call(this, message);
  Error.captureStackTrace(this, this.constructor);
  this.name = 'JwksError';
  this.message = message;
}

JwksError.prototype = Object.create(Error.prototype);
JwksError.prototype.constructor = JwksError;
module.exports = JwksError;
