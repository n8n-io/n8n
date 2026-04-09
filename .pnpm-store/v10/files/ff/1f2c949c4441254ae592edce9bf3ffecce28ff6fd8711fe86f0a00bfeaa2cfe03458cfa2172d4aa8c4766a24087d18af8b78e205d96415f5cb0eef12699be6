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
var Int64 = require('node-int64');
var Thrift = require('./thrift');
var Type = Thrift.Type;

module.exports = TCompactProtocol;

var POW_8 = Math.pow(2, 8);
var POW_24 = Math.pow(2, 24);
var POW_32 = Math.pow(2, 32);
var POW_40 = Math.pow(2, 40);
var POW_48 = Math.pow(2, 48);
var POW_52 = Math.pow(2, 52);
var POW_1022 = Math.pow(2, 1022);

/**
 * Constructor Function for the Compact Protocol.
 * @constructor
 * @param {object} [trans] - The underlying transport to read/write.
 * @classdesc The Apache Thrift Protocol layer performs serialization
 *     of base types, the compact protocol serializes data in binary
 *     form with minimal space used for scalar values.
 */
function TCompactProtocol(trans) {
  this.trans = trans;
  this.lastField_ = [];
  this.lastFieldId_ = 0;
  this.string_limit_ = 0;
  this.string_buf_ = null;
  this.string_buf_size_ = 0;
  this.container_limit_ = 0;
  this.booleanField_ = {
    name: null,
    hasBoolValue: false
  };
  this.boolValue_ = {
    hasBoolValue: false,
    boolValue: false
  };
};


//
// Compact Protocol Constants
//

/**
  * Compact Protocol ID number.
  * @readonly
  * @const {number} PROTOCOL_ID
  */
TCompactProtocol.PROTOCOL_ID = -126;  //1000 0010

/**
  * Compact Protocol version number.
  * @readonly
  * @const {number} VERSION_N
  */
TCompactProtocol.VERSION_N = 1;

/**
  * Compact Protocol version mask for combining protocol version and message type in one byte.
  * @readonly
  * @const {number} VERSION_MASK
  */
TCompactProtocol.VERSION_MASK = 0x1f; //0001 1111

/**
  * Compact Protocol message type mask for combining protocol version and message type in one byte.
  * @readonly
  * @const {number} TYPE_MASK
  */
TCompactProtocol.TYPE_MASK = -32;     //1110 0000

/**
  * Compact Protocol message type bits for ensuring message type bit size.
  * @readonly
  * @const {number} TYPE_BITS
  */
TCompactProtocol.TYPE_BITS = 7; //0000 0111

/**
  * Compact Protocol message type shift amount for combining protocol version and message type in one byte.
  * @readonly
  * @const {number} TYPE_SHIFT_AMOUNT
  */
TCompactProtocol.TYPE_SHIFT_AMOUNT = 5;

/**
 * Compact Protocol type IDs used to keep type data within one nibble.
 * @readonly
 * @property {number}  CT_STOP          - End of a set of fields.
 * @property {number}  CT_BOOLEAN_TRUE  - Flag for Boolean field with true value (packed field and value).
 * @property {number}  CT_BOOLEAN_FALSE - Flag for Boolean field with false value (packed field and value).
 * @property {number}  CT_BYTE          - Signed 8 bit integer.
 * @property {number}  CT_I16           - Signed 16 bit integer.
 * @property {number}  CT_I32           - Signed 32 bit integer.
 * @property {number}  CT_I64           - Signed 64 bit integer (2^53 max in JavaScript).
 * @property {number}  CT_DOUBLE        - 64 bit IEEE 854 floating point.
 * @property {number}  CT_BINARY        - Array of bytes (used for strings also).
 * @property {number}  CT_LIST          - A collection type (unordered).
 * @property {number}  CT_SET           - A collection type (unordered and without repeated values).
 * @property {number}  CT_MAP           - A collection type (map/associative-array/dictionary).
 * @property {number}  CT_STRUCT        - A multifield type.
 */
TCompactProtocol.Types = {
  CT_STOP:           0x00,
  CT_BOOLEAN_TRUE:   0x01,
  CT_BOOLEAN_FALSE:  0x02,
  CT_BYTE:           0x03,
  CT_I16:            0x04,
  CT_I32:            0x05,
  CT_I64:            0x06,
  CT_DOUBLE:         0x07,
  CT_BINARY:         0x08,
  CT_LIST:           0x09,
  CT_SET:            0x0A,
  CT_MAP:            0x0B,
  CT_STRUCT:         0x0C
};

/**
 * Array mapping Compact type IDs to standard Thrift type IDs.
 * @readonly
 */
TCompactProtocol.TTypeToCType = [
  TCompactProtocol.Types.CT_STOP,         // T_STOP
  0,                                      // unused
  TCompactProtocol.Types.CT_BOOLEAN_TRUE, // T_BOOL
  TCompactProtocol.Types.CT_BYTE,         // T_BYTE
  TCompactProtocol.Types.CT_DOUBLE,       // T_DOUBLE
  0,                                      // unused
  TCompactProtocol.Types.CT_I16,          // T_I16
  0,                                      // unused
  TCompactProtocol.Types.CT_I32,          // T_I32
  0,                                      // unused
  TCompactProtocol.Types.CT_I64,          // T_I64
  TCompactProtocol.Types.CT_BINARY,       // T_STRING
  TCompactProtocol.Types.CT_STRUCT,       // T_STRUCT
  TCompactProtocol.Types.CT_MAP,          // T_MAP
  TCompactProtocol.Types.CT_SET,          // T_SET
  TCompactProtocol.Types.CT_LIST,         // T_LIST
];


//
// Compact Protocol Utilities
//

/**
 * Returns the underlying transport layer.
 * @return {object} The underlying transport layer.
 */TCompactProtocol.prototype.getTransport = function() {
  return this.trans;
};

/**
 * Lookup a Compact Protocol Type value for a given Thrift Type value.
 * N.B. Used only internally.
 * @param {number} ttype - Thrift type value
 * @returns {number} Compact protocol type value
 */
TCompactProtocol.prototype.getCompactType = function(ttype) {
  return TCompactProtocol.TTypeToCType[ttype];
};

/**
 * Lookup a Thrift Type value for a given Compact Protocol Type value.
 * N.B. Used only internally.
 * @param {number} type - Compact Protocol type value
 * @returns {number} Thrift Type value
 */
TCompactProtocol.prototype.getTType = function(type) {
  switch (type) {
    case Type.STOP:
      return Type.STOP;
    case TCompactProtocol.Types.CT_BOOLEAN_FALSE:
    case TCompactProtocol.Types.CT_BOOLEAN_TRUE:
      return Type.BOOL;
    case TCompactProtocol.Types.CT_BYTE:
      return Type.BYTE;
    case TCompactProtocol.Types.CT_I16:
      return Type.I16;
    case TCompactProtocol.Types.CT_I32:
      return Type.I32;
    case TCompactProtocol.Types.CT_I64:
      return Type.I64;
    case TCompactProtocol.Types.CT_DOUBLE:
      return Type.DOUBLE;
    case TCompactProtocol.Types.CT_BINARY:
      return Type.STRING;
    case TCompactProtocol.Types.CT_LIST:
      return Type.LIST;
    case TCompactProtocol.Types.CT_SET:
      return Type.SET;
    case TCompactProtocol.Types.CT_MAP:
      return Type.MAP;
    case TCompactProtocol.Types.CT_STRUCT:
      return Type.STRUCT;
    default:
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.INVALID_DATA, "Unknown type: " + type);
  }
  return Type.STOP;
};


//
// Compact Protocol write operations
//

/**
 * Send any buffered bytes to the end point.
 */
TCompactProtocol.prototype.flush = function() {
  return this.trans.flush();
};

/**
 * Writes an RPC message header
 * @param {string} name - The method name for the message.
 * @param {number} type - The type of message (CALL, REPLY, EXCEPTION, ONEWAY).
 * @param {number} seqid - The call sequence number (if any).
 */
TCompactProtocol.prototype.writeMessageBegin = function(name, type, seqid) {
  this.writeByte(TCompactProtocol.PROTOCOL_ID);
  this.writeByte((TCompactProtocol.VERSION_N & TCompactProtocol.VERSION_MASK) |
                     ((type << TCompactProtocol.TYPE_SHIFT_AMOUNT) & TCompactProtocol.TYPE_MASK));
  this.writeVarint32(seqid);
  this.writeString(name);

  // Record client seqid to find callback again
  if (this._seqid) {
    log.warning('SeqId already set', { 'name': name });
  } else {
    this._seqid = seqid;
    this.trans.setCurrSeqId(seqid);
  }
};

TCompactProtocol.prototype.writeMessageEnd = function() {
};

TCompactProtocol.prototype.writeStructBegin = function(name) {
  this.lastField_.push(this.lastFieldId_);
  this.lastFieldId_ = 0;
};

TCompactProtocol.prototype.writeStructEnd = function() {
  this.lastFieldId_ = this.lastField_.pop();
};

/**
 * Writes a struct field header
 * @param {string} name - The field name (not written with the compact protocol).
 * @param {number} type - The field data type (a normal Thrift field Type).
 * @param {number} id - The IDL field Id.
 */
TCompactProtocol.prototype.writeFieldBegin = function(name, type, id) {
  if (type != Type.BOOL) {
    return this.writeFieldBeginInternal(name, type, id, -1);
  }

  this.booleanField_.name = name;
  this.booleanField_.fieldType = type;
  this.booleanField_.fieldId = id;
};

TCompactProtocol.prototype.writeFieldEnd = function() {
};

TCompactProtocol.prototype.writeFieldStop = function() {
  this.writeByte(TCompactProtocol.Types.CT_STOP);
};

/**
 * Writes a map collection header
 * @param {number} keyType - The Thrift type of the map keys.
 * @param {number} valType - The Thrift type of the map values.
 * @param {number} size - The number of k/v pairs in the map.
 */
TCompactProtocol.prototype.writeMapBegin = function(keyType, valType, size) {
  if (size === 0) {
    this.writeByte(0);
  } else {
    this.writeVarint32(size);
    this.writeByte(this.getCompactType(keyType) << 4 | this.getCompactType(valType));
  }
};

TCompactProtocol.prototype.writeMapEnd = function() {
};

/**
 * Writes a list collection header
 * @param {number} elemType - The Thrift type of the list elements.
 * @param {number} size - The number of elements in the list.
 */
TCompactProtocol.prototype.writeListBegin = function(elemType, size) {
  this.writeCollectionBegin(elemType, size);
};

TCompactProtocol.prototype.writeListEnd = function() {
};

/**
 * Writes a set collection header
 * @param {number} elemType - The Thrift type of the set elements.
 * @param {number} size - The number of elements in the set.
 */
TCompactProtocol.prototype.writeSetBegin = function(elemType, size) {
  this.writeCollectionBegin(elemType, size);
};

TCompactProtocol.prototype.writeSetEnd = function() {
};

TCompactProtocol.prototype.writeBool = function(value) {
  if (this.booleanField_.name !== null) {
    // we haven't written the field header yet
    this.writeFieldBeginInternal(this.booleanField_.name,
                                 this.booleanField_.fieldType,
                                 this.booleanField_.fieldId,
                                 (value ? TCompactProtocol.Types.CT_BOOLEAN_TRUE
                                          : TCompactProtocol.Types.CT_BOOLEAN_FALSE));
    this.booleanField_.name = null;
  } else {
    // we're not part of a field, so just write the value
    this.writeByte((value ? TCompactProtocol.Types.CT_BOOLEAN_TRUE
                            : TCompactProtocol.Types.CT_BOOLEAN_FALSE));
  }
};

TCompactProtocol.prototype.writeByte = function(b) {
  this.trans.write(new Buffer([b]));
};

TCompactProtocol.prototype.writeI16 = function(i16) {
  this.writeVarint32(this.i32ToZigzag(i16));
};

TCompactProtocol.prototype.writeI32 = function(i32) {
  this.writeVarint32(this.i32ToZigzag(i32));
};

TCompactProtocol.prototype.writeI64 = function(i64) {
  this.writeVarint64(this.i64ToZigzag(i64));
};

// Little-endian, unlike TBinaryProtocol
TCompactProtocol.prototype.writeDouble = function(v) {
  var buff = new Buffer(8);
  var m, e, c;

  buff[7] = (v < 0 ? 0x80 : 0x00);

  v = Math.abs(v);
  if (v !== v) {
    // NaN, use QNaN IEEE format
    m = 2251799813685248;
    e = 2047;
  } else if (v === Infinity) {
    m = 0;
    e = 2047;
  } else {
    e = Math.floor(Math.log(v) / Math.LN2);
    c = Math.pow(2, -e);
    if (v * c < 1) {
      e--;
      c *= 2;
    }

    if (e + 1023 >= 2047)
    {
      // Overflow
      m = 0;
      e = 2047;
    }
    else if (e + 1023 >= 1)
    {
      // Normalized - term order matters, as Math.pow(2, 52-e) and v*Math.pow(2, 52) can overflow
      m = (v*c-1) * POW_52;
      e += 1023;
    }
    else
    {
      // Denormalized - also catches the '0' case, somewhat by chance
      m = (v * POW_1022) * POW_52;
      e = 0;
    }
  }

  buff[6] = (e << 4) & 0xf0;
  buff[7] |= (e >> 4) & 0x7f;

  buff[0] = m & 0xff;
  m = Math.floor(m / POW_8);
  buff[1] = m & 0xff;
  m = Math.floor(m / POW_8);
  buff[2] = m & 0xff;
  m = Math.floor(m / POW_8);
  buff[3] = m & 0xff;
  m >>= 8;
  buff[4] = m & 0xff;
  m >>= 8;
  buff[5] = m & 0xff;
  m >>= 8;
  buff[6] |= m & 0x0f;

  this.trans.write(buff);
};

TCompactProtocol.prototype.writeStringOrBinary = function(name, encoding, arg) {
  if (typeof arg === 'string') {
    this.writeVarint32(Buffer.byteLength(arg, encoding)) ;
    this.trans.write(new Buffer(arg, encoding));
  } else if (arg instanceof Buffer ||
             Object.prototype.toString.call(arg) == '[object Uint8Array]') {
    // Buffers in Node.js under Browserify may extend UInt8Array instead of
    // defining a new object. We detect them here so we can write them
    // correctly
    this.writeVarint32(arg.length);
    this.trans.write(arg);
  } else {
    throw new Error(name + ' called without a string/Buffer argument: ' + arg);
  }
};

TCompactProtocol.prototype.writeString = function(arg) {
  this.writeStringOrBinary('writeString', 'utf8', arg);
};

TCompactProtocol.prototype.writeBinary = function(arg) {
  this.writeStringOrBinary('writeBinary', 'binary', arg);
};


//
// Compact Protocol internal write methods
//

TCompactProtocol.prototype.writeFieldBeginInternal = function(name,
                                                              fieldType,
                                                              fieldId,
                                                              typeOverride) {
  //If there's a type override, use that.
  var typeToWrite = (typeOverride == -1 ? this.getCompactType(fieldType) : typeOverride);
  //Check if we can delta encode the field id
  if (fieldId > this.lastFieldId_ && fieldId - this.lastFieldId_ <= 15) {
    //Include the type delta with the field ID
    this.writeByte((fieldId - this.lastFieldId_) << 4 | typeToWrite);
  } else {
    //Write separate type and ID values
    this.writeByte(typeToWrite);
    this.writeI16(fieldId);
  }
  this.lastFieldId_ = fieldId;
};

TCompactProtocol.prototype.writeCollectionBegin = function(elemType, size) {
  if (size <= 14) {
    //Combine size and type in one byte if possible
    this.writeByte(size << 4 | this.getCompactType(elemType));
  } else {
    this.writeByte(0xf0 | this.getCompactType(elemType));
    this.writeVarint32(size);
  }
};

/**
 * Write an i32 as a varint. Results in 1-5 bytes on the wire.
 */
TCompactProtocol.prototype.writeVarint32 = function(n) {
  var buf = new Buffer(5);
  var wsize = 0;
  while (true) {
    if ((n & ~0x7F) === 0) {
      buf[wsize++] = n;
      break;
    } else {
      buf[wsize++] = ((n & 0x7F) | 0x80);
      n = n >>> 7;
    }
  }
  var wbuf = new Buffer(wsize);
  buf.copy(wbuf,0,0,wsize);
  this.trans.write(wbuf);
};

/**
 * Write an i64 as a varint. Results in 1-10 bytes on the wire.
 * N.B. node-int64 is always big endian
 */
TCompactProtocol.prototype.writeVarint64 = function(n) {
  if (typeof n === "number"){
    n = new Int64(n);
  }
  if (! (n instanceof Int64)) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.INVALID_DATA, "Expected Int64 or Number, found: " + n);
  }

  var buf = new Buffer(10);
  var wsize = 0;
  var hi = n.buffer.readUInt32BE(0, true);
  var lo = n.buffer.readUInt32BE(4, true);
  var mask = 0;
  while (true) {
    if (((lo & ~0x7F) === 0) && (hi === 0)) {
      buf[wsize++] = lo;
      break;
    } else {
      buf[wsize++] = ((lo & 0x7F) | 0x80);
      mask = hi << 25;
      lo = lo >>> 7;
      hi = hi >>> 7;
      lo = lo | mask;
    }
  }
  var wbuf = new Buffer(wsize);
  buf.copy(wbuf,0,0,wsize);
  this.trans.write(wbuf);
};

/**
 * Convert l into a zigzag long. This allows negative numbers to be
 * represented compactly as a varint.
 */
TCompactProtocol.prototype.i64ToZigzag = function(l) {
  if (typeof l === 'string') {
    l = new Int64(parseInt(l, 10));
  } else if (typeof l === 'number') {
    l = new Int64(l);
  }
  if (! (l instanceof Int64)) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.INVALID_DATA, "Expected Int64 or Number, found: " + l);
  }
  var hi = l.buffer.readUInt32BE(0, true);
  var lo = l.buffer.readUInt32BE(4, true);
  var sign = hi >>> 31;
  hi = ((hi << 1) | (lo >>> 31)) ^ ((!!sign) ? 0xFFFFFFFF : 0);
  lo = (lo << 1) ^ ((!!sign) ? 0xFFFFFFFF : 0);
  return new Int64(hi, lo);
};

/**
 * Convert n into a zigzag int. This allows negative numbers to be
 * represented compactly as a varint.
 */
TCompactProtocol.prototype.i32ToZigzag = function(n) {
  return (n << 1) ^ ((n & 0x80000000) ? 0xFFFFFFFF : 0);
};


//
// Compact Protocol read operations
//

TCompactProtocol.prototype.readMessageBegin = function() {
  //Read protocol ID
  var protocolId = this.trans.readByte();
  if (protocolId != TCompactProtocol.PROTOCOL_ID) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.BAD_VERSION, "Bad protocol identifier " + protocolId);
  }

  //Read Version and Type
  var versionAndType = this.trans.readByte();
  var version = (versionAndType & TCompactProtocol.VERSION_MASK);
  if (version != TCompactProtocol.VERSION_N) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.BAD_VERSION, "Bad protocol version " + version);
  }
  var type = ((versionAndType >> TCompactProtocol.TYPE_SHIFT_AMOUNT) & TCompactProtocol.TYPE_BITS);

  //Read SeqId
  var seqid = this.readVarint32();

  //Read name
  var name = this.readString();

  return {fname: name, mtype: type, rseqid: seqid};
};

TCompactProtocol.prototype.readMessageEnd = function() {
};

TCompactProtocol.prototype.readStructBegin = function() {
  this.lastField_.push(this.lastFieldId_);
  this.lastFieldId_ = 0;
  return {fname: ''};
};

TCompactProtocol.prototype.readStructEnd = function() {
  this.lastFieldId_ = this.lastField_.pop();
};

TCompactProtocol.prototype.readFieldBegin = function() {
  var fieldId = 0;
  var b = this.trans.readByte(b);
  var type = (b & 0x0f);

  if (type == TCompactProtocol.Types.CT_STOP) {
    return {fname: null, ftype: Thrift.Type.STOP, fid: 0};
  }

  //Mask off the 4 MSB of the type header to check for field id delta.
  var modifier = ((b & 0x000000f0) >>> 4);
  if (modifier === 0) {
    //If not a delta read the field id.
    fieldId = this.readI16();
  } else {
    //Recover the field id from the delta
    fieldId = (this.lastFieldId_ + modifier);
  }
  var fieldType = this.getTType(type);

  //Boolean are encoded with the type
  if (type == TCompactProtocol.Types.CT_BOOLEAN_TRUE ||
      type == TCompactProtocol.Types.CT_BOOLEAN_FALSE) {
    this.boolValue_.hasBoolValue = true;
    this.boolValue_.boolValue =
      (type == TCompactProtocol.Types.CT_BOOLEAN_TRUE ? true : false);
  }

  //Save the new field for the next delta computation.
  this.lastFieldId_ = fieldId;
  return {fname: null, ftype: fieldType, fid: fieldId};
};

TCompactProtocol.prototype.readFieldEnd = function() {
};

TCompactProtocol.prototype.readMapBegin = function() {
  var msize = this.readVarint32();
  if (msize < 0) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.NEGATIVE_SIZE, "Negative map size");
  }

  var kvType = 0;
  if (msize !== 0) {
    kvType = this.trans.readByte();
  }

  var keyType = this.getTType((kvType & 0xf0) >>> 4);
  var valType = this.getTType(kvType & 0xf);
  return {ktype: keyType, vtype: valType, size: msize};
};

TCompactProtocol.prototype.readMapEnd = function() {
};

TCompactProtocol.prototype.readListBegin = function() {
  var size_and_type = this.trans.readByte();

  var lsize = (size_and_type >>> 4) & 0x0000000f;
  if (lsize == 15) {
    lsize = this.readVarint32();
  }

  if (lsize < 0) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.NEGATIVE_SIZE, "Negative list size");
  }

  var elemType = this.getTType(size_and_type & 0x0000000f);

  return {etype: elemType, size: lsize};
};

TCompactProtocol.prototype.readListEnd = function() {
};

TCompactProtocol.prototype.readSetBegin = function() {
  return this.readListBegin();
};

TCompactProtocol.prototype.readSetEnd = function() {
};

TCompactProtocol.prototype.readBool = function() {
  var value = false;
  var rsize = 0;
  if (this.boolValue_.hasBoolValue === true) {
    value = this.boolValue_.boolValue;
    this.boolValue_.hasBoolValue = false;
  } else {
    var res = this.trans.readByte();
    rsize = res.rsize;
    value = (res.value == TCompactProtocol.Types.CT_BOOLEAN_TRUE);
  }
  return value;
};

TCompactProtocol.prototype.readByte = function() {
  return this.trans.readByte();
};

TCompactProtocol.prototype.readI16 = function() {
  return this.readI32();
};

TCompactProtocol.prototype.readI32 = function() {
  return this.zigzagToI32(this.readVarint32());
};

TCompactProtocol.prototype.readI64 = function() {
  return this.zigzagToI64(this.readVarint64());
};

// Little-endian, unlike TBinaryProtocol
TCompactProtocol.prototype.readDouble = function() {
  var buff = this.trans.read(8);
  var off = 0;

  var signed = buff[off + 7] & 0x80;
  var e = (buff[off+6] & 0xF0) >> 4;
  e += (buff[off+7] & 0x7F) << 4;

  var m = buff[off];
  m += buff[off+1] << 8;
  m += buff[off+2] << 16;
  m += buff[off+3] * POW_24;
  m += buff[off+4] * POW_32;
  m += buff[off+5] * POW_40;
  m += (buff[off+6] & 0x0F) * POW_48;

  switch (e) {
    case 0:
      e = -1022;
      break;
    case 2047:
      return m ? NaN : (signed ? -Infinity : Infinity);
    default:
      m += POW_52;
      e -= 1023;
  }

  if (signed) {
    m *= -1;
  }

  return m * Math.pow(2, e - 52);
};

TCompactProtocol.prototype.readBinary = function() {
  var size = this.readVarint32();
  if (size === 0) {
    return new Buffer(0);
  }

  if (size < 0) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.NEGATIVE_SIZE, "Negative binary size");
  }
  return this.trans.read(size);
};

TCompactProtocol.prototype.readString = function() {
  var size = this.readVarint32();
  // Catch empty string case
  if (size === 0) {
    return "";
  }

  // Catch error cases
  if (size < 0) {
    throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.NEGATIVE_SIZE, "Negative string size");
  }
  return this.trans.readString(size);
};


//
// Compact Protocol internal read operations
//

/**
 * Read an i32 from the wire as a varint. The MSB of each byte is set
 * if there is another byte to follow. This can read up to 5 bytes.
 */
TCompactProtocol.prototype.readVarint32 = function() {
  return this.readVarint64().toNumber();
};

/**
 * Read an i64 from the wire as a proper varint. The MSB of each byte is set
 * if there is another byte to follow. This can read up to 10 bytes.
 */
TCompactProtocol.prototype.readVarint64 = function() {
  var rsize = 0;
  var lo = 0;
  var hi = 0;
  var shift = 0;
  while (true) {
    var b = this.trans.readByte();
    rsize ++;
    if (shift <= 25) {
      lo = lo | ((b & 0x7f) << shift);
    } else if (25 < shift && shift < 32) {
      lo = lo | ((b & 0x7f) << shift);
      hi = hi | ((b & 0x7f) >>> (32-shift));
    } else {
      hi = hi | ((b & 0x7f) << (shift-32));
    }
    shift += 7;
    if (!(b & 0x80)) {
      break;
    }
    if (rsize >= 10) {
      throw new Thrift.TProtocolException(Thrift.TProtocolExceptionType.INVALID_DATA, "Variable-length int over 10 bytes.");
    }
  }
  return new Int64(hi, lo);
};

/**
 * Convert from zigzag int to int.
 */
TCompactProtocol.prototype.zigzagToI32 = function(n) {
  return (n >>> 1) ^ (-1 * (n & 1));
};

/**
 * Convert from zigzag long to long.
 */
TCompactProtocol.prototype.zigzagToI64 = function(n) {
  var hi = n.buffer.readUInt32BE(0, true);
  var lo = n.buffer.readUInt32BE(4, true);

  var neg = new Int64(hi & 0, lo & 1);
  neg._2scomp();
  var hi_neg = neg.buffer.readUInt32BE(0, true);
  var lo_neg = neg.buffer.readUInt32BE(4, true);

  var hi_lo = (hi << 31);
  hi = (hi >>> 1) ^ (hi_neg);
  lo = ((lo >>> 1) | hi_lo) ^ (lo_neg);
  return new Int64(hi, lo);
};

TCompactProtocol.prototype.skip = function(type) {
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
