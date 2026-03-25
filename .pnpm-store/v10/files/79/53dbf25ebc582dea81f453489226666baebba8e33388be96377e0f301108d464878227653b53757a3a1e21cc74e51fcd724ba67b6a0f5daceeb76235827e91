'use strict';

const {Transform} = require('stream');

const alwaysTrue = () => true;

class TakeWhile extends Transform {
  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._condition = alwaysTrue;
    if (options) {
      'condition' in options && (this._condition = options.condition);
    }
  }
  _transform(chunk, encoding, callback) {
    const result = this._condition.call(this, chunk);
    if (result && typeof result.then == 'function') {
      result.then(
        flag => {
          if (flag) {
            this.push(chunk);
          } else {
            this._transform = this._doNothing;
          }
          callback(null);
        },
        error => callback(error)
      );
    } else {
      if (result) {
        this.push(chunk);
      } else {
        this._transform = this._doNothing;
      }
      callback(null);
    }
  }
  _doNothing(chunk, encoding, callback) {
    callback(null);
  }
  static make(condition) {
    return new TakeWhile(typeof condition == 'object' ? condition : {condition});
  }
}
TakeWhile.make.Constructor = TakeWhile;

module.exports = TakeWhile.make;
