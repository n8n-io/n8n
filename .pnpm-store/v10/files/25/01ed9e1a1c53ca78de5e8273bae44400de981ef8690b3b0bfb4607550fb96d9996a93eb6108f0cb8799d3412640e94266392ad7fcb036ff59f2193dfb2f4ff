'use strict';

const StreamBase = require('./StreamBase');
const withParser = require('../utils/withParser');

class StreamValues extends StreamBase {
  static make(options) {
    return new StreamValues(options);
  }

  static withParser(options) {
    return withParser(StreamValues.make, Object.assign({}, options, {jsonStreaming: true}));
  }

  constructor(options) {
    super(options);
    this._counter = 0;
    this._level = 0;
  }

  _push(discard) {
    if (discard) {
      ++this._counter;
    } else {
      this.push({key: this._counter++, value: this._assembler.current});
    }
    this._assembler.current = this._assembler.key = null;
  }
}
StreamValues.streamValues = StreamValues.make;
StreamValues.make.Constructor = StreamValues;

module.exports = StreamValues;
