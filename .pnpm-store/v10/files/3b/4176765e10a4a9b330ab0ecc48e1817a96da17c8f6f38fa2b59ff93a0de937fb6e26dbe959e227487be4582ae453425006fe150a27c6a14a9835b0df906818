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

var log = require('./log');
var binary = require('./binary');
var Int64 = require('node-int64');
var Thrift = require('./thrift');
var Type = Thrift.Type;

module.exports = TBinaryProtocol;

// JavaScript supports only numeric doubles, therefore even hex values are always signed.
// The largest integer value which can be represented in JavaScript is +/-2^53.
// Bitwise operations convert numbers to 32 bit integers but perform sign extension
// upon assigning values back to variables.
var VERSION_MASK = -65536,   // 0xffff0000
    VERSION_1 = -2147418112, // 0x80010000
    TYPE_MASK = 0x000000ff;

TBinaryProtocol.VERSION_MASK = VERSION_MASK;
TBinaryProtocol.VERSION_1 = VERSION_1;
TBinaryProtocol.TYPE_MASK = TYPE_MASK

function TBinaryProtocol(trans, strictRead, strictWrite) {
  this.trans = trans;
  this.strictRead = (strictRead !== undefined ? strictRead : false);
  this.strictWrite = (strictWrite !== undefined ? strictWrite : true);
  this._seqid = null;
};

TBinaryProtocol.prototype.flush = function() {
  return this.trans.flush();
};

TBinaryProtocol.prototype.writeMessageBegin = function(name, type, seqid) {
    if (this.strictWrite) {
      this.writeI32(VERSION_1 | type);
      this.writeString(name);
      this.writeI32(seqid);
    } else {
      this.writeString(name);
      this.writeByte(type);
      this.writeI32(seqid);
    }
    // Record client seqid to find callback again
    if (this._seqid !== null) {
      log.warning('SeqId already set', { 'name': name });
    } else {
      this._seqid = seqid;
      this.trans.setCurrSeqId(seqid);
    }
};

TBinaryProtocol.prototype.writeMessageEnd = function() {
    if (this._seqid !== null) {
        this._seqid = null;
    } else {
        log.warning('No seqid to unset');
    }
};

TBinaryProtocol.prototype.writeStructBegin = function(name) {
};

TBinaryProtocol.prototype.writeStructEnd = function() {
};

TBinaryProtocol.prototype.writeFieldBegin = function(name, type, id) {
  this.writeByte(type);
  this.writeI16(id);
};

TBinaryProtocol.prototype.writeFieldEnd = function() {
};

TBinaryProtocol.prototype.writeFieldStop = function() {
  this.writeByte(Type.STOP);
};

TBinaryProtocol.prototype.writeMapBegin = function(ktype, vtype, size) {
  this.writeByte(ktype);
  this.writeByte(vtype);
  this.writeI32(size);
};

TBinaryProtocol.prototype.writeMapEnd = function() {
};

TBinaryProtocol.prototype.writeListBegin = function(etype, size) {
  this.writeByte(etype);
  this.writeI32(size);
};

TBinaryProtocol.prototype.writeListEnd = function() {
};

TBinaryProtocol.prototype.writeSetBegin = function(etype, size) {
  this.writeByte(etype);
  this.writeI32(size);
};

TBinaryProtocol.prototype.writeSetEnd = function() {
};

TBinaryProtocol.prototype.writeBool = function(bool) {
  if (bool) {
    this.writeByte(1);
  } else {
    this.writeByte(0);
  }
};

TBinaryProtocol.prototype.writeByte = function(b) {
  this.trans.write(new Buffer([b]));
};

TBinaryProtocol.prototype.writeI16 = function(i16) {
  this.trans.write(binary.writeI16(new Buffer(2), i16));
};

TBinaryProtocol.prototype.writeI32 = function(i32) {
  this.trans.write(binary.writeI32(new Buffer(4), i32));
};

TBinaryProtocol.prototype.writeI64 = function(i64) {
  if (i64.buffer) {
    this.trans.write(i64.buffer);
  } else {
    this.trans.write(new Int64(i64).buffer);
  }
};

TBinaryProtocol.prototype.writeDouble = function(dub) {
  this.trans.write(binary.writeDouble(new Buffer(8), dub));
};

TBinaryProtocol.prototype.writeStringOrBinary = function(name, encoding, arg) {
  if (typeof(arg) === 'string') {
    this.writeI32(Buffer.byteLength(arg, encoding));
    this.trans.write(new Buffer(arg, encoding));
  } else if ((arg instanceof Buffer) ||
             (Object.prototype.toString.call(arg) == '[object Uint8Array]')) {
    // Buffers in Node.js under Browserify may extend UInt8Array instead of
    // defining a new object. We detect them here so we can write them
    // correctly
    this.writeI32(arg.length);
    this.trans.write(arg);
  } else {
    throw new Error(name + ' called without a string/Buffer argument: ' + arg);
  }
};

TBinaryProtocol.prototype.writeString = function(arg) {
  this.writeStringOrBinary('writeString', 'utf8', arg);
};

TBinaryProtocol.prototype.writeBinary = function(arg) {
  this.writeStringOrBinary('writeBinary', 'binary', arg);
};

TBinaryProtocol.prototype.readMessageBegin = function() {
  var sz = this.readI32();
  var type, name, seqid;

  if (sz < 0) {
    var version = sz & VERSION_MASK;
    if (version != VERSION_1) {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.BAD_VERSION, "Bad version in readMessageBegin: " + sz);
    }
    type = sz & TYPE_MASK;
    name = this.readString();
    seqid = this.readI32();
  } else {
    if (this.strictRead) {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.BAD_VERSION, "No protocol version header");
    }
    name = this.trans.read(sz);
    type = this.readByte();
    seqid = this.readI32();
  }
  return {fname: name, mtype: type, rseqid: seqid};
};

TBinaryProtocol.prototype.readMessageEnd = function() {
};

TBinaryProtocol.prototype.readStructBegin = function() {
  return {fname: ''};
};

TBinaryProtocol.prototype.readStructEnd = function() {
};

TBinaryProtocol.prototype.readFieldBegin = function() {
  var type = this.readByte();
  if (type == Type.STOP) {
    return {fname: null, ftype: type, fid: 0};
  }
  var id = this.readI16();
  return {fname: null, ftype: type, fid: id};
};

TBinaryProtocol.prototype.readFieldEnd = function() {
};

TBinaryProtocol.prototype.readMapBegin = function() {
  var ktype = this.readByte();
  var vtype = this.readByte();
  var size = this.readI32();
  return {ktype: ktype, vtype: vtype, size: size};
};

TBinaryProtocol.prototype.readMapEnd = function() {
};

TBinaryProtocol.prototype.readListBegin = function() {
  var etype = this.readByte();
  var size = this.readI32();
  return {etype: etype, size: size};
};

TBinaryProtocol.prototype.readListEnd = function() {
};

TBinaryProtocol.prototype.readSetBegin = function() {
  var etype = this.readByte();
  var size = this.readI32();
  return {etype: etype, size: size};
};

TBinaryProtocol.prototype.readSetEnd = function() {
};

TBinaryProtocol.prototype.readBool = function() {
  var b = this.readByte();
  if (b === 0) {
    return false;
  }
  return true;
};

TBinaryProtocol.prototype.readByte = function() {
  return this.trans.readByte();
};

TBinaryProtocol.prototype.readI16 = function() {
  return this.trans.readI16();
};

TBinaryProtocol.prototype.readI32 = function() {
  return this.trans.readI32();
};

TBinaryProtocol.prototype.readI64 = function() {
  var buff = this.trans.read(8);
  return new Int64(buff);
};

TBinaryProtocol.prototype.readDouble = function() {
  return this.trans.readDouble();
};

TBinaryProtocol.prototype.readBinary = function() {
  var len = this.readI32();
  if (len === 0) {
    return new Buffer(0);
  }

  if (len < 0) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.NEGATIVE_SIZE, "Negative binary size");
  }
  return this.trans.read(len);
};

TBinaryProtocol.prototype.readString = function() {
  var len = this.readI32();
  if (len === 0) {
    return "";
  }

  if (len < 0) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.NEGATIVE_SIZE, "Negative string size");
  }
  return this.trans.readString(len);
};

TBinaryProtocol.prototype.getTransport = function() {
  return this.trans;
};

TBinaryProtocol.prototype.skip = function(type) {
  switch (type) {
    case Type.BOOL:
      this.readBool();
      break;
    case Type.BYTE:
      this.readByte();
      break;
    case Type.I16:
      this.readI16();
      break;
    case Type.I32:
      this.readI32();
      break;
    case Type.I64:
      this.readI64();
      break;
    case Type.DOUBLE:
      this.readDouble();
      break;
    case Type.STRING:
      this.readString();
      break;
    case Type.STRUCT:
      this.readStructBegin();
      while (true) {
        var r = this.readFieldBegin();
        if (r.ftype === Type.STOP) {
          break;
        }
        this.skip(r.ftype);
        this.readFieldEnd();
      }
      this.readStructEnd();
      break;
    case Type.MAP:
      var mapBegin = this.readMapBegin();
      for (var i = 0; i < mapBegin.size; ++i) {
        this.skip(mapBegin.ktype);
        this.skip(mapBegin.vtype);
      }
      this.readMapEnd();
      break;
    case Type.SET:
      var setBegin = this.readSetBegin();
      for (var i2 = 0; i2 < setBegin.size; ++i2) {
        this.skip(setBegin.etype);
      }
      this.readSetEnd();
      break;
    case Type.LIST:
      var listBegin = this.readListBegin();
      for (var i3 = 0; i3 < listBegin.size; ++i3) {
        this.skip(listBegin.etype);
      }
      this.readListEnd();
      break;
    default:
      throw new  Error("Invalid type: " + type);
  }
};
