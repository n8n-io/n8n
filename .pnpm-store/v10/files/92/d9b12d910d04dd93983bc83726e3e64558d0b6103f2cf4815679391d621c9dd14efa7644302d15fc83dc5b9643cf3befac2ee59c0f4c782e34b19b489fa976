'use strict';

const StreamBase = require('./StreamBase');
const withParser = require('../utils/withParser');

class StreamObject extends StreamBase {
  static make(options) {
    return new StreamObject(options);
  }

  static withParser(options) {
    return withParser(StreamObject.make, options);
  }

  constructor(options) {
    super(options);
    this._level = 1;
    this._lastKey = null;
  }

  _wait(chunk, _, callback) {
    // first chunk should open an array
    if (chunk.name !== 'startObject') {
      return callback(new Error('Top-level object should be an object.'));
    }
    this._transform = this._filter;
    return this._transform(chunk, _, callback);
  }

  _push(discard) {
    if (this._lastKey === null) {
      this._lastKey = this._assembler.key;
    } else {
      !discard && this.push({key: this._lastKey, value: this._assembler.current[this._lastKey]});
      this._assembler.current = {};
      this._lastKey = null;
    }
  }
}
StreamObject.streamObject = StreamObject.make;
StreamObject.make.Constructor = StreamObject;

module.exports = StreamObject;
