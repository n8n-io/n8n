'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var node_stream = require('node:stream');

/* eslint-disable no-underscore-dangle */


// This is a buffering parser, have a look at StreamingQuerystring.js for a streaming parser
class QuerystringParser extends node_stream.Transform {
  constructor(options = {}) {
    super({ readableObjectMode: true });
    this.globalOptions = { ...options };
    this.buffer = '';
    this.bufferLength = 0;
  }

  _transform(buffer, encoding, callback) {
    this.buffer += buffer.toString('ascii');
    this.bufferLength = this.buffer.length;
    callback();
  }

  _flush(callback) {
    const fields = new URLSearchParams(this.buffer);
    for (const [key, value] of fields) {
      this.push({
        key,
        value,
      });
    }
    this.buffer = '';
    callback();
  }
}

exports.default = QuerystringParser;
