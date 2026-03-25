function ArgumentError(message) {
  Error.call(this, message);
  Error.captureStackTrace(this, this.constructor);
  this.name = 'ArgumentError';
  this.message = message;
}

ArgumentError.prototype = Object.create(Error.prototype);
ArgumentError.prototype.constructor = ArgumentError;
module.exports = ArgumentError;
