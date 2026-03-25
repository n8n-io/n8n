'use strict';

const {Transform} = require('stream');

class Skip extends Transform {
  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._n = 0;
    if (options) {
      'n' in options && (this._n = options.n);
    }
    if (this._n <= 0) {
      this._transform = this._passThrough;
    }
  }
  _transform(chunk, encoding, callback) {
    if (--this._n <= 0) {
      this._transform = this._passThrough;
    }
    callback(null);
  }
  _passThrough(chunk, encoding, callback) {
    this.push(chunk);
    callback(null);
  }
  static make(n) {
    return new Skip(typeof n == 'object' ? n : {n});
  }
}
Skip.make.Constructor = Skip;

module.exports = Skip.make;
