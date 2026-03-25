'use strict';

import { Transform } from 'stream';

export default class ReadToEnd extends Transform {
  constructor(options = {}) {
    super(options);
    this._encoding = options.encoding || 'utf8';
    this._buffer = '';
  }

  _transform(chunk, encoding, done) {
    this._buffer += chunk.toString(this._encoding);
    this.push(chunk);
    done();
  }

  _flush(done) {
    this.emit('complete', null, this._buffer);
    done();
  }

  static readToEnd(stream, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    const dest = new ReadToEnd(options);

    stream.pipe(dest);

    stream.on('error', (err) => {
      stream.unpipe(dest);
      callback(err);
    });

    dest.on('complete', callback);
    dest.resume();

    return dest;
  }
}