"use strict";

/**
 * This is apparently a bit like a Jquery deferred, hence the name
 */

class Deferred {
  constructor(Promise) {
    this._state = Deferred.PENDING;
    this._resolve = undefined;
    this._reject = undefined;

    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  get state() {
    return this._state;
  }

  get promise() {
    return this._promise;
  }

  reject(reason) {
    if (this._state !== Deferred.PENDING) {
      return;
    }
    this._state = Deferred.REJECTED;
    this._reject(reason);
  }

  resolve(value) {
    if (this._state !== Deferred.PENDING) {
      return;
    }
    this._state = Deferred.FULFILLED;
    this._resolve(value);
  }
}

// TODO: should these really live here? or be a seperate 'state' enum
Deferred.PENDING = "PENDING";
Deferred.FULFILLED = "FULFILLED";
Deferred.REJECTED = "REJECTED";

module.exports = Deferred;
