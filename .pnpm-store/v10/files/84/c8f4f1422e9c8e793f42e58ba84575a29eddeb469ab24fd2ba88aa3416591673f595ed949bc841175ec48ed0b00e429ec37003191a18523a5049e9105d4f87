'use strict';

const StreamBase = require('./StreamBase');
const withParser = require('../utils/withParser');

class StreamArray extends StreamBase {
  static make(options) {
    return new StreamArray(options);
  }

  static withParser(options) {
    return withParser(StreamArray.make, options);
  }

  constructor(options) {
    super(options);
    this._level = 1;
    this._counter = 0;
  }

  _wait(chunk, _, callback) {
    // first chunk should open an array
    if (chunk.name !== 'startArray') {
      return callback(new Error('Top-level object should be an array.'));
    }
    this._transform = this._filter;
    return this._transform(chunk, _, callback);
  }

  _push(discard) {
    if (this._assembler.current.length) {
      if (discard) {
        ++this._counter;
        this._assembler.current.pop();
      } else {
        this.push({key: this._counter++, value: this._assembler.current.pop()});
      }
    }
  }
}
StreamArray.streamArray = StreamArray.make;
StreamArray.make.Constructor = StreamArray;

module.exports = StreamArray;
