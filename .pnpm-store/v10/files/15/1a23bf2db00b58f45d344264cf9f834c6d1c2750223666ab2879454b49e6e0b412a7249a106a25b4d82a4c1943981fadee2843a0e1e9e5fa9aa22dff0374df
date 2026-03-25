function SigningKeyNotFoundError(message) {
  Error.call(this, message);
  Error.captureStackTrace(this, this.constructor);
  this.name = 'SigningKeyNotFoundError';
  this.message = message;
}

SigningKeyNotFoundError.prototype = Object.create(Error.prototype);
SigningKeyNotFoundError.prototype.constructor = SigningKeyNotFoundError;
module.exports = SigningKeyNotFoundError;
