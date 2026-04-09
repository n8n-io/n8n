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

var Int64 = require('node-int64');
var Thrift = require('./thrift');
var Type = Thrift.Type;
var util = require("util");

var Int64Util = require('./int64_util');
var json_parse = require('./json_parse');

var InputBufferUnderrunError = require('./input_buffer_underrun_error');

module.exports = TJSONProtocol;

/**
 * Initializes a Thrift JSON protocol instance.
 * @constructor
 * @param {Thrift.Transport} trans - The transport to serialize to/from.
 * @classdesc Apache Thrift Protocols perform serialization which enables cross
 * language RPC. The Protocol type is the JavaScript browser implementation
 * of the Apache Thrift TJSONProtocol.
 * @example
 *     var protocol  = new Thrift.Protocol(transport);
 */
function TJSONProtocol(trans) {
  this.tstack = [];
  this.tpos = [];
  this.trans = trans;
};

/**
 * Thrift IDL type Id to string mapping.
 * @readonly
 * @see {@link Thrift.Type}
 */
TJSONProtocol.Type = {};
TJSONProtocol.Type[Type.BOOL] = '"tf"';
TJSONProtocol.Type[Type.BYTE] = '"i8"';
TJSONProtocol.Type[Type.I16] = '"i16"';
TJSONProtocol.Type[Type.I32] = '"i32"';
TJSONProtocol.Type[Type.I64] = '"i64"';
TJSONProtocol.Type[Type.DOUBLE] = '"dbl"';
TJSONProtocol.Type[Type.STRUCT] = '"rec"';
TJSONProtocol.Type[Type.STRING] = '"str"';
TJSONProtocol.Type[Type.MAP] = '"map"';
TJSONProtocol.Type[Type.LIST] = '"lst"';
TJSONProtocol.Type[Type.SET] = '"set"';

/**
 * Thrift IDL type string to Id mapping.
 * @readonly
 * @see {@link Thrift.Type}
 */
TJSONProtocol.RType = {};
TJSONProtocol.RType.tf = Type.BOOL;
TJSONProtocol.RType.i8 = Type.BYTE;
TJSONProtocol.RType.i16 = Type.I16;
TJSONProtocol.RType.i32 = Type.I32;
TJSONProtocol.RType.i64 = Type.I64;
TJSONProtocol.RType.dbl = Type.DOUBLE;
TJSONProtocol.RType.rec = Type.STRUCT;
TJSONProtocol.RType.str = Type.STRING;
TJSONProtocol.RType.map = Type.MAP;
TJSONProtocol.RType.lst = Type.LIST;
TJSONProtocol.RType.set = Type.SET;

/**
 * The TJSONProtocol version number.
 * @readonly
 * @const {number} Version
 * @memberof Thrift.Protocol
 */
TJSONProtocol.Version = 1;

TJSONProtocol.prototype.flush = function() {
  this.writeToTransportIfStackIsFlushable();
  return this.trans.flush();
};

TJSONProtocol.prototype.writeToTransportIfStackIsFlushable = function() {
  if (this.tstack.length === 1) {
    this.trans.write(this.tstack.pop());
  }
};

/**
 * Serializes the beginning of a Thrift RPC message.
 * @param {string} name - The service method to call.
 * @param {Thrift.MessageType} messageType - The type of method call.
 * @param {number} seqid - The sequence number of this call (always 0 in Apache Thrift).
 */
TJSONProtocol.prototype.writeMessageBegin = function(name, messageType, seqid) {
  this.tstack.push([TJSONProtocol.Version, '"' + name + '"', messageType, seqid]);
};

/**
 * Serializes the end of a Thrift RPC message.
 */
TJSONProtocol.prototype.writeMessageEnd = function() {
  var obj = this.tstack.pop();

  this.wobj = this.tstack.pop();
  this.wobj.push(obj);

  this.wbuf = '[' + this.wobj.join(',') + ']';

  // we assume there is nothing more to come so we write
  this.trans.write(this.wbuf);
};

/**
 * Serializes the beginning of a struct.
 * @param {string} name - The name of the struct.
 */
TJSONProtocol.prototype.writeStructBegin = function(name) {
  this.tpos.push(this.tstack.length);
  this.tstack.push({});
};

/**
 * Serializes the end of a struct.
 */
TJSONProtocol.prototype.writeStructEnd = function() {
  var p = this.tpos.pop();
  var struct = this.tstack[p];
  var str = '{';
  var first = true;
  for (var key in struct) {
    if (first) {
      first = false;
    } else {
      str += ',';
    }

    str += key + ':' + struct[key];
  }

  str += '}';
  this.tstack[p] = str;

  this.writeToTransportIfStackIsFlushable();
};

/**
 * Serializes the beginning of a struct field.
 * @param {string} name - The name of the field.
 * @param {Thrift.Protocol.Type} fieldType - The data type of the field.
 * @param {number} fieldId - The field's unique identifier.
 */
TJSONProtocol.prototype.writeFieldBegin = function(name, fieldType, fieldId) {
  this.tpos.push(this.tstack.length);
  this.tstack.push({ 'fieldId': '"' +
    fieldId + '"', 'fieldType': TJSONProtocol.Type[fieldType]
  });
};

/**
 * Serializes the end of a field.
 */
TJSONProtocol.prototype.writeFieldEnd = function() {
  var value = this.tstack.pop();
  var fieldInfo = this.tstack.pop();

  if (':' + value === ":[object Object]") {
    this.tstack[this.tstack.length - 1][fieldInfo.fieldId] = '{' +
      fieldInfo.fieldType + ':' + JSON.stringify(value) + '}';
  } else {
    this.tstack[this.tstack.length - 1][fieldInfo.fieldId] = '{' +
      fieldInfo.fieldType + ':' + value + '}';
  }
  this.tpos.pop();

  this.writeToTransportIfStackIsFlushable();
};

/**
 * Serializes the end of the set of fields for a struct.
 */
TJSONProtocol.prototype.writeFieldStop = function() {
};

/**
 * Serializes the beginning of a map collection.
 * @param {Thrift.Type} keyType - The data type of the key.
 * @param {Thrift.Type} valType - The data type of the value.
 * @param {number} [size] - The number of elements in the map (ignored).
 */
TJSONProtocol.prototype.writeMapBegin = function(keyType, valType, size) {
  //size is invalid, we'll set it on end.
  this.tpos.push(this.tstack.length);
  this.tstack.push([TJSONProtocol.Type[keyType], TJSONProtocol.Type[valType], 0]);
};

/**
 * Serializes the end of a map.
 */
TJSONProtocol.prototype.writeMapEnd = function() {
  var p = this.tpos.pop();

  if (p == this.tstack.length) {
    return;
  }

  if ((this.tstack.length - p - 1) % 2 !== 0) {
    this.tstack.push('');
  }

  var size = (this.tstack.length - p - 1) / 2;

  this.tstack[p][this.tstack[p].length - 1] = size;

  var map = '}';
  var first = true;
  while (this.tstack.length > p + 1) {
    var v = this.tstack.pop();
    var k = this.tstack.pop();
    if (first) {
      first = false;
    } else {
      map = ',' + map;
    }

    if (! isNaN(k)) { k = '"' + k + '"'; } //json "keys" need to be strings
    map = k + ':' + v + map;
  }
  map = '{' + map;

  this.tstack[p].push(map);
  this.tstack[p] = '[' + this.tstack[p].join(',') + ']';

  this.writeToTransportIfStackIsFlushable();
};

/**
 * Serializes the beginning of a list collection.
 * @param {Thrift.Type} elemType - The data type of the elements.
 * @param {number} size - The number of elements in the list.
 */
TJSONProtocol.prototype.writeListBegin = function(elemType, size) {
  this.tpos.push(this.tstack.length);
  this.tstack.push([TJSONProtocol.Type[elemType], size]);
};

/**
 * Serializes the end of a list.
 */
TJSONProtocol.prototype.writeListEnd = function() {
  var p = this.tpos.pop();

  while (this.tstack.length > p + 1) {
    var tmpVal = this.tstack[p + 1];
    this.tstack.splice(p + 1, 1);
    this.tstack[p].push(tmpVal);
  }

  this.tstack[p] = '[' + this.tstack[p].join(',') + ']';

  this.writeToTransportIfStackIsFlushable();
};

/**
 * Serializes the beginning of a set collection.
 * @param {Thrift.Type} elemType - The data type of the elements.
 * @param {number} size - The number of elements in the list.
 */
TJSONProtocol.prototype.writeSetBegin = function(elemType, size) {
    this.tpos.push(this.tstack.length);
    this.tstack.push([TJSONProtocol.Type[elemType], size]);
};

/**
 * Serializes the end of a set.
 */
TJSONProtocol.prototype.writeSetEnd = function() {
  var p = this.tpos.pop();

  while (this.tstack.length > p + 1) {
    var tmpVal = this.tstack[p + 1];
    this.tstack.splice(p + 1, 1);
    this.tstack[p].push(tmpVal);
  }

  this.tstack[p] = '[' + this.tstack[p].join(',') + ']';

  this.writeToTransportIfStackIsFlushable();
};

/** Serializes a boolean */
TJSONProtocol.prototype.writeBool = function(bool) {
  this.tstack.push(bool ? 1 : 0);
};

/** Serializes a number */
TJSONProtocol.prototype.writeByte = function(byte) {
  this.tstack.push(byte);
};

/** Serializes a number */
TJSONProtocol.prototype.writeI16 = function(i16) {
  this.tstack.push(i16);
};

/** Serializes a number */
TJSONProtocol.prototype.writeI32 = function(i32) {
  this.tstack.push(i32);
};

/** Serializes a number */
TJSONProtocol.prototype.writeI64 = function(i64) {
  if (i64 instanceof Int64) {
    this.tstack.push(Int64Util.toDecimalString(i64));
  } else {
    this.tstack.push(i64);
  }
};

/** Serializes a number */
TJSONProtocol.prototype.writeDouble = function(dub) {
  this.tstack.push(dub);
};

/** Serializes a string */
TJSONProtocol.prototype.writeString = function(arg) {
  // We do not encode uri components for wire transfer:
  if (arg === null) {
      this.tstack.push(null);
  } else {
      if (typeof arg === 'string') {
        var str = arg;
      } else if (arg instanceof Buffer) {
        var str = arg.toString('utf8');
      } else {
        throw new Error('writeString called without a string/Buffer argument: ' + arg);
      }

      // concat may be slower than building a byte buffer
      var escapedString = '';
      for (var i = 0; i < str.length; i++) {
          var ch = str.charAt(i);      // a single double quote: "
          if (ch === '\"') {
              escapedString += '\\\"'; // write out as: \"
          } else if (ch === '\\') {    // a single backslash: \
              escapedString += '\\\\'; // write out as: \\
          /* Currently escaped forward slashes break TJSONProtocol.
           * As it stands, we can simply pass forward slashes into
           * our strings across the wire without being escaped.
           * I think this is the protocol's bug, not thrift.js
           * } else if(ch === '/') {   // a single forward slash: /
           *  escapedString += '\\/';  // write out as \/
           * }
           */
          } else if (ch === '\b') {    // a single backspace: invisible
              escapedString += '\\b';  // write out as: \b"
          } else if (ch === '\f') {    // a single formfeed: invisible
              escapedString += '\\f';  // write out as: \f"
          } else if (ch === '\n') {    // a single newline: invisible
              escapedString += '\\n';  // write out as: \n"
          } else if (ch === '\r') {    // a single return: invisible
              escapedString += '\\r';  // write out as: \r"
          } else if (ch === '\t') {    // a single tab: invisible
              escapedString += '\\t';  // write out as: \t"
          } else {
              escapedString += ch;     // Else it need not be escaped
          }
      }
      this.tstack.push('"' + escapedString + '"');
  }
};

/** Serializes a string */
TJSONProtocol.prototype.writeBinary = function(arg) {
  if (typeof arg === 'string') {
    var buf = new Buffer(arg, 'binary');
  } else if (arg instanceof Buffer ||
             Object.prototype.toString.call(arg) == '[object Uint8Array]')  {
    var buf = arg;
  } else {
    throw new Error('writeBinary called without a string/Buffer argument: ' + arg);
  }
  this.tstack.push('"' + buf.toString('base64') + '"');
};

/**
 * @class
 * @name AnonReadMessageBeginReturn
 * @property {string} fname - The name of the service method.
 * @property {Thrift.MessageType} mtype - The type of message call.
 * @property {number} rseqid - The sequence number of the message (0 in Thrift RPC).
 */
/**
 * Deserializes the beginning of a message.
 * @returns {AnonReadMessageBeginReturn}
 */
TJSONProtocol.prototype.readMessageBegin = function() {
  this.rstack = [];
  this.rpos = [];

  //Borrow the inbound transport buffer and ensure data is present/consistent
  var transBuf = this.trans.borrow();
  if (transBuf.readIndex >= transBuf.writeIndex) {
    throw new InputBufferUnderrunError();
  }
  var cursor = transBuf.readIndex;

  if (transBuf.buf[cursor] !== 0x5B) { //[
    throw new Error("Malformed JSON input, no opening bracket");
  }

  //Parse a single message (there may be several in the buffer)
  //  TODO: Handle characters using multiple code units
  cursor++;
  var openBracketCount = 1;
  var inString = false;
  for (; cursor < transBuf.writeIndex; cursor++) {
    var chr = transBuf.buf[cursor];
    //we use hexa charcode here because data[i] returns an int and not a char
    if (inString) {
      if (chr === 0x22) { //"
        inString = false;
      } else if (chr === 0x5C) { //\
        //escaped character, skip
        cursor += 1;
      }
    } else {
      if (chr === 0x5B) { //[
        openBracketCount += 1;
      } else if (chr === 0x5D) { //]
        openBracketCount -= 1;
        if (openBracketCount === 0) {
          //end of json message detected
          break;
        }
      } else if (chr === 0x22) { //"
        inString = true;
      }
    }
  }

  if (openBracketCount !== 0) {
    // Missing closing bracket. Can be buffer underrun.
    throw new InputBufferUnderrunError();
  }

  //Reconstitute the JSON object and conume the necessary bytes
  this.robj = json_parse(transBuf.buf.slice(transBuf.readIndex, cursor+1).toString());
  this.trans.consume(cursor + 1 - transBuf.readIndex);

  //Verify the protocol version
  var version = this.robj.shift();
  if (version != TJSONProtocol.Version) {
    throw new Error('Wrong thrift protocol version: ' + version);
  }

  //Objectify the thrift message {name/type/sequence-number} for return
  // and then save the JSON object in rstack
  var r = {};
  r.fname = this.robj.shift();
  r.mtype = this.robj.shift();
  r.rseqid = this.robj.shift();
  this.rstack.push(this.robj.shift());
  return r;
};

/** Deserializes the end of a message. */
TJSONProtocol.prototype.readMessageEnd = function() {
};

/**
 * Deserializes the beginning of a struct.
 * @param {string} [name] - The name of the struct (ignored)
 * @returns {object} - An object with an empty string fname property
 */
TJSONProtocol.prototype.readStructBegin = function() {
  var r = {};
  r.fname = '';

  //incase this is an array of structs
  if (this.rstack[this.rstack.length - 1] instanceof Array) {
    this.rstack.push(this.rstack[this.rstack.length - 1].shift());
  }

  return r;
};

/** Deserializes the end of a struct. */
TJSONProtocol.prototype.readStructEnd = function() {
  this.rstack.pop();
};

/**
 * @class
 * @name AnonReadFieldBeginReturn
 * @property {string} fname - The name of the field (always '').
 * @property {Thrift.Type} ftype - The data type of the field.
 * @property {number} fid - The unique identifier of the field.
 */
/**
 * Deserializes the beginning of a field.
 * @returns {AnonReadFieldBeginReturn}
 */
TJSONProtocol.prototype.readFieldBegin = function() {
  var r = {};

  var fid = -1;
  var ftype = Type.STOP;

  //get a fieldId
  for (var f in (this.rstack[this.rstack.length - 1])) {
    if (f === null) {
      continue;
    }

    fid = parseInt(f, 10);
    this.rpos.push(this.rstack.length);

    var field = this.rstack[this.rstack.length - 1][fid];

    //remove so we don't see it again
    delete this.rstack[this.rstack.length - 1][fid];

    this.rstack.push(field);

    break;
  }

  if (fid != -1) {
    //should only be 1 of these but this is the only
    //way to match a key
    for (var i in (this.rstack[this.rstack.length - 1])) {
      if (TJSONProtocol.RType[i] === null) {
        continue;
      }

      ftype = TJSONProtocol.RType[i];
      this.rstack[this.rstack.length - 1] = this.rstack[this.rstack.length - 1][i];
    }
  }

  r.fname = '';
  r.ftype = ftype;
  r.fid = fid;

  return r;
};

/** Deserializes the end of a field. */
TJSONProtocol.prototype.readFieldEnd = function() {
  var pos = this.rpos.pop();

  //get back to the right place in the stack
  while (this.rstack.length > pos) {
    this.rstack.pop();
  }
};

/**
 * @class
 * @name AnonReadMapBeginReturn
 * @property {Thrift.Type} ktype - The data type of the key.
 * @property {Thrift.Type} vtype - The data type of the value.
 * @property {number} size - The number of elements in the map.
 */
/**
 * Deserializes the beginning of a map.
 * @returns {AnonReadMapBeginReturn}
 */
TJSONProtocol.prototype.readMapBegin = function() {
  var map = this.rstack.pop();
  var first = map.shift();
  if (first instanceof Array) {
    this.rstack.push(map);
    map = first;
    first = map.shift();
  }

  var r = {};
  r.ktype = TJSONProtocol.RType[first];
  r.vtype = TJSONProtocol.RType[map.shift()];
  r.size = map.shift();


  this.rpos.push(this.rstack.length);
  this.rstack.push(map.shift());

  return r;
};

/** Deserializes the end of a map. */
TJSONProtocol.prototype.readMapEnd = function() {
  this.readFieldEnd();
};

/**
 * @class
 * @name AnonReadColBeginReturn
 * @property {Thrift.Type} etype - The data type of the element.
 * @property {number} size - The number of elements in the collection.
 */
/**
 * Deserializes the beginning of a list.
 * @returns {AnonReadColBeginReturn}
 */
TJSONProtocol.prototype.readListBegin = function() {
  var list = this.rstack[this.rstack.length - 1];

  var r = {};
  r.etype = TJSONProtocol.RType[list.shift()];
  r.size = list.shift();

  this.rpos.push(this.rstack.length);
  this.rstack.push(list.shift());

  return r;
};

/** Deserializes the end of a list. */
TJSONProtocol.prototype.readListEnd = function() {
  var pos = this.rpos.pop() - 2;
  var st = this.rstack;
  st.pop();
  if (st instanceof Array && st.length > pos && st[pos].length > 0) {
    st.push(st[pos].shift());
  }
};

/**
 * Deserializes the beginning of a set.
 * @returns {AnonReadColBeginReturn}
 */
TJSONProtocol.prototype.readSetBegin = function() {
  return this.readListBegin();
};

/** Deserializes the end of a set. */
TJSONProtocol.prototype.readSetEnd = function() {
  return this.readListEnd();
};

TJSONProtocol.prototype.readBool = function() {
  return this.readValue() == '1';
};

TJSONProtocol.prototype.readByte = function() {
  return this.readI32();
};

TJSONProtocol.prototype.readI16 = function() {
  return this.readI32();
};

TJSONProtocol.prototype.readI32 = function(f) {
  return +this.readValue();
}

/** Returns the next value found in the protocol buffer */
TJSONProtocol.prototype.readValue = function(f) {
  if (f === undefined) {
    f = this.rstack[this.rstack.length - 1];
  }

  var r = {};

  if (f instanceof Array) {
    if (f.length === 0) {
      r.value = undefined;
    } else {
      r.value = f.shift();
    }
  } else if (!(f instanceof Int64) && f instanceof Object) {
    for (var i in f) {
      if (i === null) {
        continue;
      }
      this.rstack.push(f[i]);
      delete f[i];

      r.value = i;
      break;
    }
  } else {
    r.value = f;
    this.rstack.pop();
  }

  return r.value;
};

TJSONProtocol.prototype.readI64 = function() {
  var n = this.readValue()
  if (typeof n === 'string') {
    // Assuming no one is sending in 1.11111e+33 format
    return Int64Util.fromDecimalString(n);
  } else {
    return new Int64(n);
  }
};

TJSONProtocol.prototype.readDouble = function() {
  return this.readI32();
};

TJSONProtocol.prototype.readBinary = function() {
  return new Buffer(this.readValue(), 'base64');
};

TJSONProtocol.prototype.readString = function() {
  return this.readValue();
};

/**
 * Returns the underlying transport.
 * @readonly
 * @returns {Thrift.Transport} The underlying transport.
 */
TJSONProtocol.prototype.getTransport = function() {
  return this.trans;
};

/**
 * Method to arbitrarily skip over data
 */
TJSONProtocol.prototype.skip = function(type) {
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
