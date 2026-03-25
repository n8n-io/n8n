
var _Readable = require('readable-stream/readable');
var _Writable = require('readable-stream/writable');
var util = require('util');

module.exports = {
  DummyReadable: DummyReadable,
  DummyWritable: DummyWritable
};

function DummyReadable(strings) {
  _Readable.call(this);
  this.strings = strings;
  this.emit('readable');
}

util.inherits(DummyReadable, _Readable);

DummyReadable.prototype._read = function _read(n) {
  if (this.strings.length) {
    this.push(new Buffer(this.strings.shift()));
  } else {
    this.push(null);
  }
};

function DummyWritable(strings) {
  _Writable.call(this);
  this.strings = strings;
  this.emit('writable');
}

util.inherits(DummyWritable, _Writable);

DummyWritable.prototype._write = function _write(chunk, encoding, callback) {
  this.strings.push(chunk.toString());
  if (callback) callback();
};

