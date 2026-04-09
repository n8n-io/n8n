/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var binary = require('./binary');
var InputBufferUnderrunError = require('./input_buffer_underrun_error');
var THeaderTransport = require('./header_transport');

module.exports = TBufferedTransport;

function TBufferedTransport(buffer, callback) {
  THeaderTransport.call(this);
  this.defaultReadBufferSize = 1024;
  this.writeBufferSize = 512; // Soft Limit
  this.inBuf = new Buffer(this.defaultReadBufferSize);
  this.readCursor = 0;
  this.writeCursor = 0; // for input buffer
  this.outBuffers = [];
  this.outCount = 0;
  this.onFlush = callback;
};

Object.setPrototypeOf(TBufferedTransport.prototype, THeaderTransport.prototype);

TBufferedTransport.prototype.reset = function() {
  this.inBuf = new Buffer(this.defaultReadBufferSize);
  this.readCursor = 0;
  this.writeCursor = 0;
  this.outBuffers = [];
  this.outCount = 0;
}

TBufferedTransport.receiver = function(callback, seqid) {
  var reader = new TBufferedTransport();

  return function(data) {
    if (reader.writeCursor + data.length > reader.inBuf.length) {
      var buf = new Buffer(reader.writeCursor + data.length);
      reader.inBuf.copy(buf, 0, 0, reader.writeCursor);
      reader.inBuf = buf;
    }
    data.copy(reader.inBuf, reader.writeCursor, 0);
    reader.writeCursor += data.length;

    callback(reader, seqid);
  };
};


TBufferedTransport.prototype.commitPosition = function(){
  var unreadSize = this.writeCursor - this.readCursor;
  var bufSize = (unreadSize * 2 > this.defaultReadBufferSize) ?
    unreadSize * 2 : this.defaultReadBufferSize;
  var buf = new Buffer(bufSize);
  if (unreadSize > 0) {
    this.inBuf.copy(buf, 0, this.readCursor, this.writeCursor);
  }
  this.readCursor = 0;
  this.writeCursor = unreadSize;
  this.inBuf = buf;
};

TBufferedTransport.prototype.rollbackPosition = function(){
  this.readCursor = 0;
}

  // TODO: Implement open/close support
TBufferedTransport.prototype.isOpen = function() {
  return true;
};

TBufferedTransport.prototype.open = function() {
};

TBufferedTransport.prototype.close = function() {
};

  // Set the seqid of the message in the client
  // So that callbacks can be found
TBufferedTransport.prototype.setCurrSeqId = function(seqid) {
  this._seqid = seqid;
};

TBufferedTransport.prototype.ensureAvailable = function(len) {
  if (this.readCursor + len > this.writeCursor) {
    throw new InputBufferUnderrunError();
  }
};

TBufferedTransport.prototype.read = function(len) {
  this.ensureAvailable(len);
  var buf = new Buffer(len);
  this.inBuf.copy(buf, 0, this.readCursor, this.readCursor + len);
  this.readCursor += len;
  return buf;
};

TBufferedTransport.prototype.readByte = function() {
  this.ensureAvailable(1);
  return binary.readByte(this.inBuf[this.readCursor++]);
};

TBufferedTransport.prototype.readI16 = function() {
  this.ensureAvailable(2);
  var i16 = binary.readI16(this.inBuf, this.readCursor);
  this.readCursor += 2;
  return i16;
};

TBufferedTransport.prototype.readI32 = function() {
  this.ensureAvailable(4);
  var i32 = binary.readI32(this.inBuf, this.readCursor);
  this.readCursor += 4;
  return i32;
};

TBufferedTransport.prototype.readDouble = function() {
  this.ensureAvailable(8);
  var d = binary.readDouble(this.inBuf, this.readCursor);
  this.readCursor += 8;
  return d;
};

TBufferedTransport.prototype.readString = function(len) {
  this.ensureAvailable(len);
  var str = this.inBuf.toString('utf8', this.readCursor, this.readCursor + len);
  this.readCursor += len;
  return str;
};

TBufferedTransport.prototype.borrow = function() {
  var obj = {buf: this.inBuf, readIndex: this.readCursor, writeIndex: this.writeCursor};
  return obj;
};

TBufferedTransport.prototype.consume = function(bytesConsumed) {
  this.readCursor += bytesConsumed;
};

TBufferedTransport.prototype.write = function(buf) {
  if (typeof(buf) === "string") {
    buf = new Buffer(buf, 'utf8');
  }
  this.outBuffers.push(buf);
  this.outCount += buf.length;
};

TBufferedTransport.prototype.flush = function() {
  // If the seqid of the callback is available pass it to the onFlush
  // Then remove the current seqid
  var seqid = this._seqid;
  this._seqid = null;

  if (this.outCount < 1) {
    return;
  }

  var msg = new Buffer(this.outCount),
      pos = 0;
  this.outBuffers.forEach(function(buf) {
    buf.copy(msg, pos, 0);
    pos += buf.length;
  });

  if (this.onFlush) {
    // Passing seqid through this call to get it to the connection
    this.onFlush(msg, seqid);
  }

  this.outBuffers = [];
  this.outCount = 0;
}
