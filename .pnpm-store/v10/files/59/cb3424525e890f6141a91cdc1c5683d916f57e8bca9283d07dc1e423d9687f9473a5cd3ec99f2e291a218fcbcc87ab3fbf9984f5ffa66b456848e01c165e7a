'use strict';

const FilterBase = require('./FilterBase');
const withParser = require('../utils/withParser');

class Replace extends FilterBase {
  static make(options) {
    return new Replace(options);
  }

  static withParser(options) {
    return withParser(Replace.make, options);
  }

  _checkChunk(chunk) {
    switch (chunk.name) {
      case 'startKey':
        if (this._allowEmptyReplacement) {
          this._transform = this._skipKeyChunks;
          return true;
        }
        break;
      case 'keyValue':
        if (this._allowEmptyReplacement) return true;
        break;
      case 'startObject':
      case 'startArray':
      case 'startString':
      case 'startNumber':
      case 'nullValue':
      case 'trueValue':
      case 'falseValue':
      case 'stringValue':
      case 'numberValue':
        if (this._filter(this._stack, chunk)) {
          let replacement = this._replacement(this._stack, chunk);
          if (this._allowEmptyReplacement) {
            if (replacement.length) {
              const key = this._stack[this._stack.length - 1];
              if (typeof key == 'string') {
                if (this._streamKeys) {
                  this.push({name: 'startKey'});
                  this.push({name: 'stringChunk', value: key});
                  this.push({name: 'endKey'});
                }
                this.push({name: 'keyValue', value: key});
              }
            }
          } else {
            if (!replacement.length) replacement = FilterBase.defaultReplacement;
          }
          replacement.forEach(value => this.push(value));
          switch (chunk.name) {
            case 'startObject':
            case 'startArray':
              this._transform = this._skipObject;
              this._depth = 1;
              break;
            case 'startString':
              this._transform = this._skipString;
              break;
            case 'startNumber':
              this._transform = this._skipNumber;
              break;
            case 'nullValue':
            case 'trueValue':
            case 'falseValue':
            case 'stringValue':
            case 'numberValue':
              this._transform = this._once ? this._pass : this._check;
              break;
          }
          return true;
        }
        break;
    }
    // issue a key, if needed
    if (this._allowEmptyReplacement) {
      const key = this._stack[this._stack.length - 1];
      if (typeof key == 'string') {
        switch (chunk.name) {
          case 'startObject':
          case 'startArray':
          case 'startString':
          case 'startNumber':
          case 'nullValue':
          case 'trueValue':
          case 'falseValue':
          case 'stringValue':
          case 'numberValue':
            if (this._streamKeys) {
              this.push({name: 'startKey'});
              this.push({name: 'stringChunk', value: key});
              this.push({name: 'endKey'});
            }
            this.push({name: 'keyValue', value: key});
            break;
        }
      }
    }
    this.push(chunk);
    return false;
  }

  _skipKeyChunks(chunk, _, callback) {
    if (chunk.name === 'endKey') {
      this._transform = this._check;
    }
    callback(null);
  }
}
Replace.replace = Replace.make;
Replace.make.Constructor = Replace;

module.exports = Replace;
