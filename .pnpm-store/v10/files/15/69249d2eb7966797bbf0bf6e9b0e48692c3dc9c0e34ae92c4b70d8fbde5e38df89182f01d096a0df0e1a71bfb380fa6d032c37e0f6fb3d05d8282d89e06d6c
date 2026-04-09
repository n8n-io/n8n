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
var TBinaryProtocol = require('./binary_protocol');
var TCompactProtocol = require('./compact_protocol');
var THeaderTransport = require('./header_transport');

var ProtocolMap = {};
ProtocolMap[THeaderTransport.SubprotocolId.BINARY] = TBinaryProtocol;
ProtocolMap[THeaderTransport.SubprotocolId.COMPACT] = TCompactProtocol;

module.exports = THeaderProtocol;

function THeaderProtocolError(message) {
  Error.call(this);
  if (Error.captureStackTrace !== undefined) {
    Error.captureStackTrace(this, this.constructor);
  }
  this.name = this.constructor.name;
  this.message = message;
}

util.inherits(THeaderProtocolError, Error);

/**
 * A framed protocol with headers.
 *
 * THeaderProtocol frames other Thrift protocols and adds support for
 * optional out-of-band headers. The currently supported subprotocols are
 * TBinaryProtocol and TCompactProtocol. It can currently only be used with
 * transports that inherit THeaderTransport.
 *
 * THeaderProtocol does not currently support THTTPServer, TNonblockingServer,
 * or TProcessPoolServer.
 *
 * See doc/specs/HeaderFormat.md for details of the wire format.
 */
function THeaderProtocol(trans) {
  if (!(trans instanceof THeaderTransport)) {
    throw new THeaderProtocolError(
      'Only transports that inherit THeaderTransport can be' +
      ' used with THeaderProtocol'
    );
  }
  this.trans = trans;
  this.setProtocol();
};

THeaderProtocol.prototype.flush = function() {
   // Headers must be written prior to flushing because because
   // you need to calculate the length of the payload for the length
   // field of the header
  this.trans.writeHeaders();
  return this.trans.flush();
};

THeaderProtocol.prototype.writeMessageBegin = function(name, type, seqid) {
  return this.protocol.writeMessageBegin(name, type, seqid);
};

THeaderProtocol.prototype.writeMessageEnd = function() {
  return this.protocol.writeMessageEnd();
};

THeaderProtocol.prototype.writeStructBegin = function(name) {
  return this.protocol.writeStructBegin(name);
};

THeaderProtocol.prototype.writeStructEnd = function() {
  return this.protocol.writeStructEnd();
};

THeaderProtocol.prototype.writeFieldBegin = function(name, type, id) {
  return this.protocol.writeFieldBegin(name, type, id);
}

THeaderProtocol.prototype.writeFieldEnd = function() {
  return this.protocol.writeFieldEnd();
};

THeaderProtocol.prototype.writeFieldStop = function() {
  return this.protocol.writeFieldStop();
};

THeaderProtocol.prototype.writeMapBegin = function(ktype, vtype, size) {
  return this.protocol.writeMapBegin(ktype, vtype, size);
};

THeaderProtocol.prototype.writeMapEnd = function() {
  return this.protocol.writeMapEnd();
};

THeaderProtocol.prototype.writeListBegin = function(etype, size) {
  return this.protocol.writeListBegin(etype, size);
};

THeaderProtocol.prototype.writeListEnd = function() {
  return this.protocol.writeListEnd();
};

THeaderProtocol.prototype.writeSetBegin = function(etype, size) {
  return this.protocol.writeSetBegin(etype, size);
};

THeaderProtocol.prototype.writeSetEnd = function() {
  return this.protocol.writeSetEnd();
};

THeaderProtocol.prototype.writeBool = function(b) {
  return this.protocol.writeBool(b);
};

THeaderProtocol.prototype.writeByte = function(b) {
  return this.protocol.writeByte(b);
};

THeaderProtocol.prototype.writeI16 = function(i16) {
  return this.protocol.writeI16(i16);
};

THeaderProtocol.prototype.writeI32 = function(i32) {
  return this.protocol.writeI32(i32);
};

THeaderProtocol.prototype.writeI64 = function(i64) {
  return this.protocol.writeI64(i64);
};

THeaderProtocol.prototype.writeDouble = function(dub) {
  return this.protocol.writeDouble(dub);
};

THeaderProtocol.prototype.writeStringOrBinary = function(name, encoding, arg) {
  return this.protocol.writeStringOrBinary(name, encoding, arg);
};

THeaderProtocol.prototype.writeString = function(arg) {
  return this.protocol.writeString(arg);
};

THeaderProtocol.prototype.writeBinary = function(arg) {
  return this.protocol.writeBinary(arg);
};

THeaderProtocol.prototype.readMessageBegin = function() {
  this.trans.readHeaders();
  this.setProtocol();
  return this.protocol.readMessageBegin();
};

THeaderProtocol.prototype.readMessageEnd = function() {
  return this.protocol.readMessageEnd();
};

THeaderProtocol.prototype.readStructBegin = function() {
  return this.protocol.readStructBegin();
};

THeaderProtocol.prototype.readStructEnd = function() {
  return this.protocol.readStructEnd();
};

THeaderProtocol.prototype.readFieldBegin = function() {
  return this.protocol.readFieldBegin();
};

THeaderProtocol.prototype.readFieldEnd = function() {
  return this.protocol.readFieldEnd();
};

THeaderProtocol.prototype.readMapBegin = function() {
  return this.protocol.readMapBegin();
};

THeaderProtocol.prototype.readMapEnd = function() {
  return this.protocol.readMapEnd();
};

THeaderProtocol.prototype.readListBegin = function() {
  return this.protocol.readListBegin();
};

THeaderProtocol.prototype.readListEnd = function() {
  return this.protocol.readListEnd();
};

THeaderProtocol.prototype.readSetBegin = function() {
  return this.protocol.readSetBegin();
};

THeaderProtocol.prototype.readSetEnd = function() {
  return this.protocol.readSetEnd();
};

THeaderProtocol.prototype.readBool = function() {
  return this.protocol.readBool();
};

THeaderProtocol.prototype.readByte = function() {
  return this.protocol.readByte();
};

THeaderProtocol.prototype.readI16 = function() {
  return this.protocol.readI16();
};

THeaderProtocol.prototype.readI32 = function() {
  return this.protocol.readI32();
};

THeaderProtocol.prototype.readI64 = function() {
  return this.protocol.readI64();
};

THeaderProtocol.prototype.readDouble = function() {
  return this.protocol.readDouble();
};

THeaderProtocol.prototype.readBinary = function() {
  return this.protocol.readBinary();
};

THeaderProtocol.prototype.readString = function() {
  return this.protocol.readString();
};

THeaderProtocol.prototype.getTransport = function() {
  return this.trans;
};

THeaderProtocol.prototype.skip = function(type) {
  return this.protocol.skip(type);
};

THeaderProtocol.prototype.setProtocol = function(subProtocolId) {
  var subProtocolId = this.trans.getProtocolId();
  if (!ProtocolMap[subProtocolId]) {
    throw new THeaderProtocolError('Headers not supported for protocol ' + subProtocolId);
  }

  this.protocol = new ProtocolMap[subProtocolId](this.trans);
};
