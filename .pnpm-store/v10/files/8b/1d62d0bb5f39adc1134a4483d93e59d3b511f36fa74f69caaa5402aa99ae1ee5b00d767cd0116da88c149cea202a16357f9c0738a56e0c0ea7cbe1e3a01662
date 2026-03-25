'use strict';

const {Transform} = require('stream');
const Assembler = require('../Assembler');

class Counter {
  constructor(initialDepth) {
    this.depth = initialDepth;
  }
  startObject() {
    ++this.depth;
  }
  endObject() {
    --this.depth;
  }
  startArray() {
    ++this.depth;
  }
  endArray() {
    --this.depth;
  }
}

class StreamBase extends Transform {
  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    if (options) {
      this.objectFilter = options.objectFilter;
      this.includeUndecided = options.includeUndecided;
    }
    if (typeof this.objectFilter != 'function') {
      this._filter = this._transform;
    }
    this._transform = this._wait || this._filter;
    this._assembler = new Assembler(options);
  }

  _transform(chunk, encoding, callback) {
    if (this._assembler[chunk.name]) {
      this._assembler[chunk.name](chunk.value);
      if (this._assembler.depth === this._level) {
        this._push();
      }
    }
    callback(null);
  }

  _filter(chunk, encoding, callback) {
    if (this._assembler[chunk.name]) {
      this._assembler[chunk.name](chunk.value);
      const result = this.objectFilter(this._assembler);
      if (result) {
        if (this._assembler.depth === this._level) {
          this._push();
          this._transform = this._filter;
        }
        this._transform = this._accept;
        return callback(null);
      }
      if (result === false) {
        this._saved_assembler = this._assembler;
        this._assembler = new Counter(this._saved_assembler.depth);
        this._saved_assembler.dropToLevel(this._level);
        if (this._assembler.depth === this._level) {
          this._assembler = this._saved_assembler;
          this._transform = this._filter;
        }
        this._transform = this._reject;
        return callback(null);
      }
      if (this._assembler.depth === this._level) {
        this._push(!this.includeUndecided);
      }
    }
    callback(null);
  }

  _accept(chunk, encoding, callback) {
    if (this._assembler[chunk.name]) {
      this._assembler[chunk.name](chunk.value);
      if (this._assembler.depth === this._level) {
        this._push();
        this._transform = this._filter;
      }
    }
    callback(null);
  }

  _reject(chunk, encoding, callback) {
    if (this._assembler[chunk.name]) {
      this._assembler[chunk.name](chunk.value);
      if (this._assembler.depth === this._level) {
        this._assembler = this._saved_assembler;
        this._transform = this._filter;
      }
    }
    callback(null);
  }
}

module.exports = StreamBase;
