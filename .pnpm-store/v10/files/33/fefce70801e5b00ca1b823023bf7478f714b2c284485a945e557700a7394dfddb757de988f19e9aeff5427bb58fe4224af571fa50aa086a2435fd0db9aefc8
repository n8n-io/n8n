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

var util = require('util');
var TCompactProtocol = require('./compact_protocol');
var TBinaryProtocol = require('./binary_protocol');
var InputBufferUnderrunError = require('./input_buffer_underrun_error');

function THeaderTransportError(message) {
  Error.call(this);
  if (Error.captureStackTrace !== undefined) {
    Error.captureStackTrace(this, this.constructor);
  }
  this.name = this.constructor.name;
  this.message = message;
}

util.inherits(THeaderTransportError, Error);

module.exports = THeaderTransport;

// from HeaderFormat.md
var COMPACT_PROTOCOL_OFFSET = 0;
var COMPACT_PROTOCOL_VERSION_OFFSET = 1;
var FRAME_SIZE_OFFSET = 0;
var HEADER_MAGIC_OFFSET = 32 / 8;
var FLAGS_OFFSET = 48 / 8;
var SEQID_OFFSET = 64 / 8;
var HEADER_SIZE_OFFSET = 96 / 8;
var HEADER_START_OFFSET = 112 / 8;

var HEADER_MAGIC = 0x0FFF;

var TINFO_HEADER_KEY_VALUE_TYPE = 0x01;
var MAX_FRAME_SIZE = 0x3FFFFFFF;

 // A helper class for reading/writing varints. Uses
 // TCompactProtocol under the hood
function VarintHelper(readBuffer) {
  var TBufferedTransport = require('./buffered_transport');
  this.outputBuffer = null;
  var _this = this;
  this.transport = new TBufferedTransport(null, function(output) {
    _this.outputBuffer = output;
  });

  this.transport.inBuf = readBuffer || Buffer.alloc(0);
  this.transport.writeCursor = this.transport.inBuf.length;
  this.protocol = new TCompactProtocol(this.transport);
};

VarintHelper.prototype.readVarint32 = function() {
  return this.protocol.readVarint32();
};

VarintHelper.prototype.writeVarint32 = function(i) {
  this.protocol.writeVarint32(i);
};

VarintHelper.prototype.readString = function() {
  return this.protocol.readString();
};

VarintHelper.prototype.writeString = function(str) {
  this.protocol.writeString(str);
}

VarintHelper.prototype.getOutCount = function() {
  return this.transport.outCount;
};

VarintHelper.prototype.write = function(str) {
  this.transport.write(str);
};

VarintHelper.prototype.toBuffer = function() {
  this.transport.flush();
  return this.outputBuffer;
};

// from lib/cpp/src/thrift/protocol/TProtocolTypes.h
THeaderTransport.SubprotocolId = {
  BINARY: 0,
  JSON: 1,
  COMPACT: 2,
};

/**
  An abstract transport used as a prototype for other transports
  to enable reading/writing theaders. This should NOT be used as a standalone transport
  The methods in this transport are called by THeaderProtocol, which will call readHeaders/writeHeaders
  in the read/writeMessageBegin methods and parse/write headers to/from a request
  prior to reading/writing.

  The reason this is not a standalone transport type is because different transport types
  have their own individual static receiver methods that are called prior to instantiation.
  There doesn't seem to be a way for THeaderTransport to know which receiver method to use
  without reworking the server API.

  For reading headers from a request, the parsed headers can be retrieved via
  getReadHeader. Similarly, you can set headers to be written on the client via
  setWriteHeader.
 */
function THeaderTransport() {
  this.maxFrameSize = MAX_FRAME_SIZE;
  this.protocolId = THeaderTransport.SubprotocolId.BINARY;
  this.rheaders = {};
  this.wheaders = {};
  this.inBuf = Buffer.alloc(0);
  this.outCount = 0;
  this.flags = null;
  this.seqid = 0;
  this.shouldWriteHeaders = true;
};

var validateHeaders = function(key, value) {
  if (typeof key !== 'string' || typeof value !== 'string') {
    throw new THeaderTransportError('Header key and values must be strings');
  }
};

var validateProtocolId = function(protocolId) {
  var protocols = Object.keys(THeaderTransport.SubprotocolId);
  for (var i = 0; i < protocols.length; i++) {
    if (protocolId === THeaderTransport.SubprotocolId[protocols[i]]) return true;
  }

  throw new Error(protocolId + ' is not a valid protocol id');
};

THeaderTransport.prototype.setSeqId = function(seqid) {
  this.seqid = seqid;
};

THeaderTransport.prototype.getSeqId = function(seqid) {
  return this.seqid;
};

THeaderTransport.prototype.setFlags = function(flags) {
  this.flags = flags;
};

THeaderTransport.prototype.getReadHeaders = function() {
  return this.rheaders;
};

THeaderTransport.prototype.setReadHeader = function(key, value) {
  validateHeaders(key, value);
  this.rheaders[key] = value;
};

THeaderTransport.prototype.clearReadHeaders = function() {
  this.rheaders = {};
};

THeaderTransport.prototype.getWriteHeaders = function() {
  return this.wheaders;
};

THeaderTransport.prototype.setWriteHeader = function(key, value) {
  validateHeaders(key, value);
  this.wheaders[key] = value;
};

THeaderTransport.prototype.clearWriteHeaders = function() {
  this.wheaders = {};
};

THeaderTransport.prototype.setMaxFrameSize = function(frameSize) {
  this.maxFrameSize = frameSize;
};

THeaderTransport.prototype.setProtocolId = function(protocolId) {
  validateProtocolId(protocolId);
  this.protocolId = protocolId;
};

THeaderTransport.prototype.getProtocolId = function() {
  return this.protocolId;
};

var isUnframedBinary = function(readBuffer) {
  var version = readBuffer.readInt32BE();
  return (version & TBinaryProtocol.VERSION_MASK) === TBinaryProtocol.VERSION_1;
}

var isUnframedCompact = function(readBuffer) {
  var protocolId = readBuffer.readInt8(COMPACT_PROTOCOL_OFFSET);
  var version = readBuffer.readInt8(COMPACT_PROTOCOL_VERSION_OFFSET);
  return protocolId === TCompactProtocol.PROTOCOL_ID &&
    (version & TCompactProtocol.VERSION_MASK) === TCompactProtocol.VERSION_N;
}

THeaderTransport.prototype.readHeaders = function() {
  var readBuffer = this.inBuf;

  var isUnframed = false;
  if (isUnframedBinary(readBuffer)) {
    this.setProtocolId(THeaderTransport.SubprotocolId.BINARY);
    isUnframed = true;
  }

  if (isUnframedCompact(readBuffer)) {
    this.setProtocolId(THeaderTransport.SubprotocolId.COMPACT);
    isUnframed = true;
  }

  if (isUnframed) {
    this.shouldWriteHeaders = false;
    return;
  }

  var frameSize = readBuffer.readInt32BE(FRAME_SIZE_OFFSET);
  if (frameSize > this.maxFrameSize) {
    throw new THeaderTransportError('Frame exceeds maximum frame size');
  }

  var headerMagic = readBuffer.readInt16BE(HEADER_MAGIC_OFFSET);
  this.shouldWriteHeaders = headerMagic === HEADER_MAGIC;
  if (!this.shouldWriteHeaders) {
    return;
  }

  this.setFlags(readBuffer.readInt16BE(FLAGS_OFFSET));
  this.setSeqId(readBuffer.readInt32BE(SEQID_OFFSET));
  var headerSize = readBuffer.readInt16BE(HEADER_SIZE_OFFSET) * 4;
  var endOfHeaders = HEADER_START_OFFSET + headerSize;
  if (endOfHeaders > readBuffer.length) {
    throw new THeaderTransportError('Header size is greater than frame size');
  }

  var headerBuffer = Buffer.alloc(headerSize);
  readBuffer.copy(headerBuffer, 0, HEADER_START_OFFSET, endOfHeaders);

  var varintHelper = new VarintHelper(headerBuffer);
  this.setProtocolId(varintHelper.readVarint32());
  var transformCount = varintHelper.readVarint32();
  if (transformCount > 0) {
    throw new THeaderTransportError('Transforms are not yet supported');
  }

  while (true) {
    try {
      var headerType = varintHelper.readVarint32();
      if (headerType !== TINFO_HEADER_KEY_VALUE_TYPE) {
        break;
      }

      var numberOfHeaders = varintHelper.readVarint32();
      for (var i = 0; i < numberOfHeaders; i++) {
        var key = varintHelper.readString();
        var value = varintHelper.readString();
        this.setReadHeader(key, value);
      }
    } catch (e) {
      if (e instanceof InputBufferUnderrunError) {
        break;
      }
      throw e;
    }
  }

  // moves the read cursor past the headers
  this.read(endOfHeaders);
  return this.getReadHeaders();
};

THeaderTransport.prototype.writeHeaders = function() {
  // only write headers on the server if the client contained headers
  if (!this.shouldWriteHeaders) {
    return;
  }
  var headers = this.getWriteHeaders();

  var varintWriter = new VarintHelper();
  varintWriter.writeVarint32(this.protocolId);
  varintWriter.writeVarint32(0); // transforms not supported

  // writing info header key values
  var headerKeys = Object.keys(headers);
  if (headerKeys.length > 0) {
    varintWriter.writeVarint32(TINFO_HEADER_KEY_VALUE_TYPE);
    varintWriter.writeVarint32(headerKeys.length);
    for (var i = 0; i < headerKeys.length; i++) {
      var key = headerKeys[i];
      var value = headers[key];

      varintWriter.writeString(key);
      varintWriter.writeString(value);
    }
  }
 var headerSizeWithoutPadding = varintWriter.getOutCount();
  var paddingNeeded = (4 - (headerSizeWithoutPadding % 4)) % 4;

  var headerSize = Buffer.alloc(2);
  headerSize.writeInt16BE(Math.floor((headerSizeWithoutPadding + paddingNeeded) / 4));

  var paddingBuffer = Buffer.alloc(paddingNeeded);
  paddingBuffer.fill(0x00);
  varintWriter.write(paddingBuffer);
  var headerContentBuffer = varintWriter.toBuffer();
  var frameSize = Buffer.alloc(4);
  frameSize.writeInt32BE(10 + this.outCount + headerContentBuffer.length);
  var headerMagic = Buffer.alloc(2);
  headerMagic.writeInt16BE(HEADER_MAGIC);

  // flags are not yet supported, so write a zero
  var flags = Buffer.alloc(2);
  flags.writeInt16BE(0);

  var seqid = Buffer.alloc(4);
  seqid.writeInt32BE(this.getSeqId());

  var headerBuffer = Buffer.concat([
    frameSize,
    headerMagic,
    flags,
    seqid,
    headerSize,
    headerContentBuffer,
  ]);

  this.outBuffers.unshift(headerBuffer);
  this.outCount += headerBuffer.length;
};
