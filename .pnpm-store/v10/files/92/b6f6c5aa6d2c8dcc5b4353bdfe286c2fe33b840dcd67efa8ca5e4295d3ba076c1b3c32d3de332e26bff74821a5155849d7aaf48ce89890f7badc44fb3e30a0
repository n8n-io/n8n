"use strict";

class ExtendableError extends Error {
  constructor(message) {
    super(message);
    // @ts-ignore
    this.name = this.constructor.name;
    this.message = message;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

/* eslint-disable no-useless-constructor */
class TimeoutError extends ExtendableError {
  constructor(m) {
    super(m);
  }
}
/* eslint-enable no-useless-constructor */

module.exports = {
  TimeoutError: TimeoutError
};
