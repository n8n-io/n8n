'use strict';

const {Transform} = require('stream');
const {StringDecoder} = require('string_decoder');

class Utf8Stream extends Transform {
  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: false}));
    this._buffer = '';
  }

  _transform(chunk, encoding, callback) {
    if (typeof chunk == 'string') {
      this._transform = this._transformString;
    } else {
      this._stringDecoder = new StringDecoder();
      this._transform = this._transformBuffer;
    }
    this._transform(chunk, encoding, callback);
  }

  _transformBuffer(chunk, _, callback) {
    this._buffer += this._stringDecoder.write(chunk);
    this._processBuffer(callback);
  }

  _transformString(chunk, _, callback) {
    this._buffer += chunk.toString();
    this._processBuffer(callback);
  }

  _processBuffer(callback) {
    if (this._buffer) {
      this.push(this._buffer, 'utf8');
      this._buffer = '';
    }
    callback(null);
  }

  _flushInput() {
    // meant to be called from _flush()
    if (this._stringDecoder) {
      this._buffer += this._stringDecoder.end();
    }
  }

  _flush(callback) {
    this._flushInput();
    this._processBuffer(callback);
  }
}

module.exports = Utf8Stream;
