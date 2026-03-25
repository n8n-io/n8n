// -*- js-indent-level: 2 -*-

// Constructors given patterns

'use strict';

var ints = require('buffer-more-ints');
var Buffer = require('safe-buffer').Buffer;

// Interpret the pattern, writing values into a buffer
function write(buf, offset, pattern, bindings) {
  for (var i=0, len = pattern.length; i < len; i++) {
    var segment = pattern[i];
    switch (segment.type) {
    case 'string':
      offset += buf.write(segment.value, offset, 'utf8');
      break;
    case 'binary':
      offset += writeBinary(segment, buf, offset, bindings);
      break;
    case 'integer':
      offset += writeInteger(segment, buf, offset, bindings);
      break;
    case 'float':
      offset += writeFloat(segment, buf, offset, bindings);
      break;
    }
  }
  return offset;
}

function build(pattern, bindings) {
  var bufsize = size_of(pattern, bindings);
  var buf = Buffer.alloc(bufsize);
  write(buf, 0, pattern, bindings);
  return buf;
}

// In bytes
function size_of_segment(segment, bindings) {
  // size refers to a variable
  if (typeof segment.size === 'string') {
    return (bindings[segment.size] * segment.unit) / 8;
  }
  if (segment.type === 'string') {
    return Buffer.byteLength(segment.value, 'utf8');
  }
  if (segment.type === 'binary' && segment.size === true) {
    var val = bindings[segment.name];
    return val.length;
  }
  return (segment.size * segment.unit) / 8;
}

// size of the to-be-constructed binary, in bytes
function size_of(segments, bindings) {
  var size = 0;
  for (var i=0, len = segments.length; i < len; i++) {
    size += size_of_segment(segments[i], bindings);
  }
  return size;
}

function writeBinary(segment, buf, offset, bindings) {
  var bin = bindings[segment.name];
  var size = size_of_segment(segment, bindings);
  bin.copy(buf, offset, 0, size);
  return size;
}

// TODO in ff might use the noAssert argument to Buffer.write*() but
// need to check that it does the right thing wrt little-endian

function writeInteger(segment, buf, offset, bindings) {
  var value = (segment.name) ? bindings[segment.name] : segment.value;
  var size = size_of_segment(segment, bindings);
  return write_int(buf, value, offset, size, segment.bigendian);
}

function write_int(buf, value, offset, size, bigendian) {
  switch (size) {
  case 1:
    buf.writeUInt8(value, offset);
    break;
  case 2:
    (bigendian) ?
      buf.writeUInt16BE(value, offset) :
      buf.writeUInt16LE(value, offset);
    break;
  case 4:
    (bigendian) ?
      buf.writeUInt32BE(value, offset) :
      buf.writeUInt32LE(value, offset);
    break;
  case 8:
    (bigendian) ?
      ints.writeUInt64BE(buf, value, offset) :
      ints.writeUInt64LE(buf, value, offset);
    break;
  default:
    throw new Error("integer size * unit must be 8, 16, 32 or 64");
  }
  return size;
}

function writeFloat(segment, buf, offset, bindings) {
  var value = (segment.name) ? bindings[segment.name] : segment.value;
  var size = size_of_segment(segment, bindings);
  return write_float(buf, value, offset, size, segment.bigendian);
}

function write_float(buf, value, offset, size, bigendian) {
  if (size === 4) {
    (bigendian) ?
      buf.writeFloatBE(value, offset) :
      buf.writeFloatLE(value, offset);
  }
  else if (size === 8) {
    (bigendian) ?
      buf.writeDoubleBE(value, offset) :
      buf.writeDoubleLE(value, offset);
  }
  else {
    throw new Error("float size * unit must be 32 or 64");
  }
  return size;
}

var parse = require('./parse').parse;

module.exports.write = write;
module.exports.build = build;
module.exports.write_int = write_int;
module.exports.write_float = write_float;

module.exports.builder = function(pstr) {
  pstr = (arguments.length > 1) ? [].join.call(arguments, ',') : pstr;
  var pattern = parse(pstr);
  return function(vars) {
    return build(pattern, vars);
  };
};
