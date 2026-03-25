'use strict';

const FilterBase = require('./FilterBase');
const withParser = require('../utils/withParser');

class Filter extends FilterBase {
  static make(options) {
    return new Filter(options);
  }

  static withParser(options) {
    return withParser(Filter.make, options);
  }

  constructor(options) {
    super(options);
    this._once = false;
    this._lastStack = [];
  }

  _flush(callback) {
    this._syncStack();
    callback(null);
  }

  _checkChunk(chunk) {
    switch (chunk.name) {
      case 'startObject':
        if (this._filter(this._stack, chunk)) {
          this._syncStack();
          this.push(chunk);
          this._lastStack.push(null);
        }
        break;
      case 'startArray':
        if (this._filter(this._stack, chunk)) {
          this._syncStack();
          this.push(chunk);
          this._lastStack.push(-1);
        }
        break;
      case 'nullValue':
      case 'trueValue':
      case 'falseValue':
      case 'stringValue':
      case 'numberValue':
        if (this._filter(this._stack, chunk)) {
          this._syncStack();
          this.push(chunk);
        }
        break;
      case 'startString':
        if (this._filter(this._stack, chunk)) {
          this._syncStack();
          this.push(chunk);
          this._transform = this._passString;
        } else {
          this._transform = this._skipString;
        }
        break;
      case 'startNumber':
        if (this._filter(this._stack, chunk)) {
          this._syncStack();
          this.push(chunk);
          this._transform = this._passNumber;
        } else {
          this._transform = this._skipNumber;
        }
        break;
    }
    return false;
  }

  _syncStack() {
    const stack = this._stack,
      last = this._lastStack,
      stackLength = stack.length,
      lastLength = last.length;

    // find the common part
    let commonLength = 0;
    for (const n = Math.min(stackLength, lastLength); commonLength < n && stack[commonLength] === last[commonLength]; ++commonLength);

    // close old objects
    for (let i = lastLength - 1; i > commonLength; --i) {
      this.push({name: typeof last[i] == 'number' ? 'endArray' : 'endObject'});
    }
    if (commonLength < lastLength) {
      if (commonLength < stackLength) {
        if (typeof stack[commonLength] == 'string') {
          const key = stack[commonLength];
          if (this._streamKeys) {
            this.push({name: 'startKey'});
            this.push({name: 'stringChunk', value: key});
            this.push({name: 'endKey'});
          }
          this.push({name: 'keyValue', value: key});
        }
        ++commonLength;
      } else {
        this.push({name: typeof last[commonLength] == 'number' ? 'endArray' : 'endObject'});
      }
    }

    // open new objects
    for (let i = commonLength; i < stackLength; ++i) {
      const key = stack[i];
      if (typeof key == 'number') {
        if (key >= 0) {
          this.push({name: 'startArray'});
        }
      } else if (typeof key == 'string') {
        this.push({name: 'startObject'});
        if (this._streamKeys) {
          this.push({name: 'startKey'});
          this.push({name: 'stringChunk', value: key});
          this.push({name: 'endKey'});
        }
        this.push({name: 'keyValue', value: key});
      }
    }

    // update the last stack
    this._lastStack = Array.prototype.concat.call(stack);
  }
}
Filter.filter = Filter.make;
Filter.make.Constructor = Filter;

module.exports = Filter;
