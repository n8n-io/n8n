/* eslint-disable no-underscore-dangle */

import { Transform } from 'node:stream';

// This is a buffering parser, have a look at StreamingQuerystring.js for a streaming parser
class QuerystringParser extends Transform {
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

export default QuerystringParser;
