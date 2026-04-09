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

module.exports = TFramedTransport;

function TFramedTransport(buffer, callback) {
  THeaderTransport.call(this);
  this.inBuf = buffer || new Buffer(0);
  this.outBuffers = [];
  this.outCount = 0;
  this.readPos = 0;
  this.onFlush = callback;
};

Object.setPrototypeOf(TFramedTransport.prototype, THeaderTransport.prototype);

TFramedTransport.receiver = function(callback, seqid) {
  var residual = new Buffer(0);

  return function(data) {
    residual = Buffer.concat([residual, Buffer.from(data)]);

    while (residual.length > 0) {
      if (residual.length < 4) {
        // Not enough bytes to continue, save and resume on next packet
        return;
      }
      // Get single package size
      var frameSize = binary.readI32(residual, 0);
      // Not enough bytes to continue, save and resume on next packet
      if (residual.length < 4 + frameSize) {
        return;
      }

      // Get package data
      var frame = residual.subarray(4, 4 + frameSize);
      // Remove processed data from residual
      residual = residual.subarray(4 + frameSize);
      callback(new TFramedTransport(frame), seqid);
    }
  };
};

TFramedTransport.prototype.commitPosition = function(){},
TFramedTransport.prototype.rollbackPosition = function(){},

  // TODO: Implement open/close support
TFramedTransport.prototype.isOpen = function() {
  return true;
};
TFramedTransport.prototype.open = function() {};
TFramedTransport.prototype.close =  function() {};

  // Set the seqid of the message in the client
  // So that callbacks can be found
TFramedTransport.prototype.setCurrSeqId = function(seqid) {
  this._seqid = seqid;
};

TFramedTransport.prototype.ensureAvailable = function(len) {
  if (this.readPos + len > this.inBuf.length) {
    throw new InputBufferUnderrunError();
  }
};

TFramedTransport.prototype.read = function(len) { // this function will be used for each frames.
  this.ensureAvailable(len);
  var end = this.readPos + len;

  if (this.inBuf.length < end) {
    throw new Error('read(' + len + ') failed - not enough data');
  }

  var buf = this.inBuf.slice(this.readPos, end);
  this.readPos = end;
  return buf;
};

TFramedTransport.prototype.readByte = function() {
  this.ensureAvailable(1);
  return binary.readByte(this.inBuf[this.readPos++]);
};

TFramedTransport.prototype.readI16 = function() {
  this.ensureAvailable(2);
  var i16 = binary.readI16(this.inBuf, this.readPos);
  this.readPos += 2;
  return i16;
};

TFramedTransport.prototype.readI32 = function() {
  this.ensureAvailable(4);
  var i32 = binary.readI32(this.inBuf, this.readPos);
  this.readPos += 4;
  return i32;
};

TFramedTransport.prototype.readDouble = function() {
  this.ensureAvailable(8);
  var d = binary.readDouble(this.inBuf, this.readPos);
  this.readPos += 8;
  return d;
};

TFramedTransport.prototype.readString = function(len) {
  this.ensureAvailable(len);
  var str = this.inBuf.toString('utf8', this.readPos, this.readPos + len);
  this.readPos += len;
  return str;
};

TFramedTransport.prototype.borrow = function() {
  return {
    buf: this.inBuf,
    readIndex: this.readPos,
    writeIndex: this.inBuf.length
  };
};

TFramedTransport.prototype.consume = function(bytesConsumed) {
  this.readPos += bytesConsumed;
};

TFramedTransport.prototype.write = function(buf, encoding) {
  if (typeof(buf) === "string") {
    buf = new Buffer(buf, encoding || 'utf8');
  }
  this.outBuffers.push(buf);
  this.outCount += buf.length;
};

TFramedTransport.prototype.flush = function() {
  // If the seqid of the callback is available pass it to the onFlush
  // Then remove the current seqid
  var seqid = this._seqid;
  this._seqid = null;

  var out = new Buffer(this.outCount),
      pos = 0;
  this.outBuffers.forEach(function(buf) {
    buf.copy(out, pos, 0);
    pos += buf.length;
  });

  if (this.onFlush) {
    // TODO: optimize this better, allocate one buffer instead of both:
    var msg = new Buffer(out.length + 4);
    binary.writeI32(msg, out.length);
    out.copy(msg, 4, 0, out.length);
    if (this.onFlush) {
      // Passing seqid through this call to get it to the connection
      this.onFlush(msg, seqid);
    }
  }

  this.outBuffers = [];
  this.outCount = 0;
};
