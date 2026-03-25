'use strict';

const {Writable} = require('stream');

class Emitter extends Writable {
  static make(options) {
    return new Emitter(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {objectMode: true}));
  }

  _write(chunk, encoding, callback) {
    this.emit(chunk.name, chunk.value);
    callback(null);
  }
}
Emitter.emitter = Emitter.make;
Emitter.make.Constructor = Emitter;

module.exports = Emitter;
