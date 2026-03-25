'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var node_stream = require('node:stream');

/* eslint-disable no-underscore-dangle */


class JSONParser extends node_stream.Transform {
  constructor(options = {}) {
    super({ readableObjectMode: true });
    this.chunks = [];
    this.globalOptions = { ...options };
  }

  _transform(chunk, encoding, callback) {
    this.chunks.push(String(chunk)); // todo consider using a string decoder
    callback();
  }

  _flush(callback) {
    try {
      const fields = JSON.parse(this.chunks.join(''));
      this.push(fields);
    } catch (e) {
      callback(e);
      return;
    }
    this.chunks = null;
    callback();
  }
}

exports.default = JSONParser;
