'use strict';

const {Readable} = require('stream');

class FromIterable extends Readable {
  constructor(options) {
    super(Object.assign({}, options, {objectMode: true}));
    this._iterable = null;
    this._next = null;
    if (options) {
      'iterable' in options && (this._iterable = options.iterable);
    }
    !this._iterable && (this._read = this._readStop);
  }

  _read() {
    if (Symbol.asyncIterator && typeof this._iterable[Symbol.asyncIterator] == 'function') {
      this._next = this._iterable[Symbol.asyncIterator]();
      this._iterable = null;
      this._read = this._readNext;
      this._readNext();
      return;
    }
    if (Symbol.iterator && typeof this._iterable[Symbol.iterator] == 'function') {
      this._next = this._iterable[Symbol.iterator]();
      this._iterable = null;
      this._read = this._readNext;
      this._readNext();
      return;
    }
    if (typeof this._iterable.next == 'function') {
      this._next = this._iterable;
      this._iterable = null;
      this._read = this._readNext;
      this._readNext();
      return;
    }
    const result = this._iterable();
    this._iterable = null;
    if (result && typeof result.then == 'function') {
      result.then(value => this.push(value), error => this.emit('error', error));
      this._read = this._readStop;
      return;
    }
    if (result && typeof result.next == 'function') {
      this._next = result;
      this._read = this._readNext;
      this._readNext();
      return;
    }
    this.push(result);
    this._read = this._readStop;
  }

  _readNext() {
    for (;;) {
      const result = this._next.next();
      if (result && typeof result.then == 'function') {
        result.then(
          value => {
            if (value.done || value.value === null) {
              this.push(null);
              this._next = null;
              this._read = this._readStop;
            } else {
              this.push(value.value);
            }
          },
          error => this.emit('error', error)
        );
        break;
      }
      if (result.done || result.value === null) {
        this.push(null);
        this._next = null;
        this._read = this._readStop;
        break;
      }
      if (!this.push(result.value)) break;
    }
  }

  _readStop() {
    this.push(null);
  }

  static make(iterable) {
    return new FromIterable(typeof iterable == 'object' && iterable.iterable ? iterable : {iterable});
  }
}
FromIterable.fromIterable = FromIterable.make;
FromIterable.make.Constructor = FromIterable;

module.exports = FromIterable;
