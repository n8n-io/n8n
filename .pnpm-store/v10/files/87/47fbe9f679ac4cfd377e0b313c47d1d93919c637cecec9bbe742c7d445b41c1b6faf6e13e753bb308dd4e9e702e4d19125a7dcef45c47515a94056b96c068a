'use strict';

const FilterBase = require('./FilterBase');
const withParser = require('../utils/withParser');

class Pick extends FilterBase {
  static make(options) {
    return new Pick(options);
  }

  static withParser(options) {
    return withParser(Pick.make, options);
  }

  _checkChunk(chunk) {
    switch (chunk.name) {
      case 'startObject':
      case 'startArray':
        if (this._filter(this._stack, chunk)) {
          this.push(chunk);
          this._transform = this._passObject;
          this._depth = 1;
          return true;
        }
        break;
      case 'startString':
        if (this._filter(this._stack, chunk)) {
          this.push(chunk);
          this._transform = this._passString;
          return true;
        }
        break;
      case 'startNumber':
        if (this._filter(this._stack, chunk)) {
          this.push(chunk);
          this._transform = this._passNumber;
          return true;
        }
        break;
      case 'nullValue':
      case 'trueValue':
      case 'falseValue':
      case 'stringValue':
      case 'numberValue':
        if (this._filter(this._stack, chunk)) {
          this.push(chunk);
          this._transform = this._once ? this._skip : this._check;
          return true;
        }
        break;
    }
    return false;
  }
}
Pick.pick = Pick.make;
Pick.make.Constructor = Pick;

module.exports = Pick;
