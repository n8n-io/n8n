'use strict';

const {Transform} = require('stream');

class Take extends Transform {
  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._n = this._skip = 0;
    if (options) {
      'n' in options && (this._n = options.n);
      'skip' in options && (this._skip = options.skip);
    }
    if (this._skip <= 0) {
      this._transform = this._n > 0 ? this._countValues : this._doNothing;
    }
  }
  _transform(chunk, encoding, callback) {
    if (--this._skip <= 0) {
      this._transform = this._n > 0 ? this._countValues : this._doNothing;
    }
    callback(null);
  }
  _countValues(chunk, encoding, callback) {
    if (--this._n <= 0) {
      this._transform = this._doNothing;
    }
    this.push(chunk);
    callback(null);
  }
  _doNothing(chunk, encoding, callback) {
    callback(null);
  }
  static make(n) {
    return new Take(typeof n == 'object' ? n : {n});
  }
}
Take.make.Constructor = Take;

module.exports = Take.make;
