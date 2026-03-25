'use strict';

const {Transform} = require('stream');

const defaultInitial = 0;
const defaultReducer = (acc, value) => value;

class Fold extends Transform {
  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._accumulator = defaultInitial;
    this._reducer = defaultReducer;
    if (options) {
      'initial' in options && (this._accumulator = options.initial);
      'reducer' in options && (this._reducer = options.reducer);
    }
  }
  _transform(chunk, encoding, callback) {
    const result = this._reducer.call(this, this._accumulator, chunk);
    if (result && typeof result.then == 'function') {
      result.then(
        value => {
          this._accumulator = value;
          callback(null);
        },
        error => callback(error)
      );
    } else {
      this._accumulator = result;
      callback(null);
    }
  }
  _final(callback) {
    this.push(this._accumulator);
    callback(null);
  }
  static make(reducer, initial) {
    return new Fold(typeof reducer == 'object' ? reducer : {reducer, initial});
  }
}
Fold.make.Constructor = Fold;

module.exports = Fold.make;
