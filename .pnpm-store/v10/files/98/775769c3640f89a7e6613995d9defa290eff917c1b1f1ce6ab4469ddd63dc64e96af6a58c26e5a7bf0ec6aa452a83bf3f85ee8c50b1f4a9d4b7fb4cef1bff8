/* eslint-disable no-underscore-dangle */

import { Transform } from 'node:stream';

class JSONParser extends Transform {
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

export default JSONParser;
