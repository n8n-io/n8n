'use strict';

var codec = require('../lib/codec');
var defs = require('../lib/defs');
var assert = require('assert');
var ints = require('buffer-more-ints');
var C = require('claire');
var forAll = C.forAll;

// These just test known encodings; to generate the answers I used
// RabbitMQ's binary generator module.

var testCases = [
    // integers
    ['byte', {byte: 112}, [4,98,121,116,101,98,112]],
    ['byte max value', {byte: 127}, [4,98,121,116,101,98,127]],
    ['byte min value', {byte: -128}, [4,98,121,116,101,98,128]],
    ['< -128 promoted to signed short', {short: -129}, [5,115,104,111,114,116,115,255,127]],
    ['> 127 promoted to short', {short: 128}, [5,115,104,111,114,116,115,0,128]],
    ['< 2^15 still a short', {short: 0x7fff}, [5,115,104,111,114,116,115,127,255]],
    ['-2^15 still a short', {short: -0x8000}, [5,115,104,111,114,116,115,128,0]],
    ['>= 2^15 promoted to int', {int: 0x8000}, [3,105,110,116,73,0,0,128,0]],
    ['< -2^15 promoted to int', {int: -0x8001}, [3,105,110,116,73,255,255,127,255]],
    ['< 2^31 still an int', {int: 0x7fffffff}, [3,105,110,116,73,127,255,255,255]],
    ['>= -2^31 still an int', {int: -0x80000000}, [3,105,110,116,73,128,0,0,0]],
    ['>= 2^31 promoted to long', {long: 0x80000000}, [4,108,111,110,103,108,0,0,0,0,128,0,0,0]],
    ['< -2^31 promoted to long', {long: -0x80000001}, [4,108,111,110,103,108,255,255,255,255,127,255,255,255]],

    // floating point
    ['float value', {double: 0.5}, [6,100,111,117,98,108,101,100,63,224,0,0,0,0,0,0]],
    ['negative float value', {double: -0.5}, [6,100,111,117,98,108,101,100,191,224,0,0,0,0,0,0]],
    // %% test some boundaries of precision?

    // string
    ['string', {string: "boop"}, [6,115,116,114,105,110,103,83,0,0,0,4,98,111,111,112]],

    // buffer -> byte array
    ['byte array from buffer', {bytes: Buffer.from([1,2,3,4])},
     [5,98,121,116,101,115,120,0,0,0,4,1,2,3,4]],

    // boolean, void
    ['true', {bool: true}, [4,98,111,111,108,116,1]],
    ['false', {bool: false}, [4,98,111,111,108,116,0]],
    ['null', {'void': null}, [4,118,111,105,100,86]],

    // array, object
    ['array', {array: [6, true, "foo"]},[5,97,114,114,97,121,65,0,0,0,12,98,6,116,1,83,0,0,0,3,102,111,111]],
    ['object', {object: {foo: "bar", baz: 12}},[6,111,98,106,101,99,116,70,0,0,0,18,3,102,111,111,83,0,0,0,3,98,97,114,3,98,97,122,98,12]],

    // exotic types
    ['timestamp', {timestamp: {'!': 'timestamp', value: 1357212277527}},[9,116,105,109,101,115,116,97,109,112,84,0,0,1,60,0,39,219,23]],
    ['decimal', {decimal: {'!': 'decimal', value: {digits: 2345, places: 2}}},[7,100,101,99,105,109,97,108,68,2,0,0,9,41]],
    ['float', {float: {'!': 'float', value: 0.1}},[5,102,108,111,97,116,102,61,204,204,205]],
    ['unsignedbyte', {unsignedbyte:{'!': 'unsignedbyte', value: 255}}, [12,117,110,115,105,103,110,101,100,98,121,116,101,66,255]],
    ['unsignedshort', {unsignedshort:{'!': 'unsignedshort', value: 65535}}, [13,117,110,115,105,103,110,101,100,115,104,111,114,116,117,255,255]],
    ['unsignedint', {unsignedint:{'!': 'unsignedint', value: 4294967295}}, [11,117,110,115,105,103,110,101,100,105,110,116,105,255,255,255,255]],
];

function bufferToArray(b) {
    return Array.prototype.slice.call(b);
}

suite("Implicit encodings", function() {

  testCases.forEach(function(tc) {
    var name = tc[0], val = tc[1], expect = tc[2];
    test(name, function() {
      var buffer = Buffer.alloc(1000);
      var size = codec.encodeTable(buffer, val, 0);
      var result = buffer.subarray(4, size);
      assert.deepEqual(expect, bufferToArray(result));
    });
  });
});

// Whole frames

var amqp = require('./data');

function roundtrip_table(t) {
  var buf = Buffer.alloc(4096);
  var size = codec.encodeTable(buf, t, 0);
  var decoded = codec.decodeFields(buf.subarray(4, size)); // ignore the length-prefix
  try {
    assert.deepEqual(removeExplicitTypes(t), decoded);
  }
  catch (e) { return false; }
  return true;
}

function roundtrips(T) {
  return forAll(T).satisfy(function(v) { return roundtrip_table({value: v}); });
}

suite("Roundtrip values", function() {
  [
    amqp.Octet,
    amqp.ShortStr,
    amqp.LongStr,
    amqp.UShort,
    amqp.ULong,
    amqp.ULongLong,
    amqp.UShort,
    amqp.Short,
    amqp.Long,
    amqp.Bit,
    amqp.Decimal,
    amqp.Timestamp,
    amqp.UnsignedByte,
    amqp.UnsignedShort,
    amqp.UnsignedInt,
    amqp.Double,
    amqp.Float,
    amqp.FieldArray,
    amqp.FieldTable
  ].forEach(function(T) {
    test(T.toString() + ' roundtrip', roundtrips(T).asTest());
  });
});

// When encoding, you can supply explicitly-typed fields like `{'!':
// int32, 50}`. Most of these do not appear in the decoded values, so
// to compare like-to-like we have to remove them from the input.
function removeExplicitTypes(input) {
    switch (typeof input) {
    case 'object':
        if (input == null) {
            return null;
        }
        if (Array.isArray(input)) {
            var newArr = [];
            for (var i = 0; i < input.length; i++) {
                newArr[i] = removeExplicitTypes(input[i]);
            }
            return newArr;
        }
        if (Buffer.isBuffer(input)) {
            return input;
        }
        switch (input['!']) {
        case 'timestamp':
        case 'decimal':
        case 'float':
            return input;
        case undefined:
            var newObj = {}
            for (var k in input) {
                newObj[k] = removeExplicitTypes(input[k]);
            }
            return newObj;
        default:
            return input.value;
        }

    default:
        return input;
    }
}

// Asserts that the decoded fields are equal to the original fields,
// or equal to a default where absent in the original. The defaults
// depend on the type of method or properties.
//
// This works slightly different for methods and properties: for
// methods, each field must have a value, so the default is
// substituted for undefined values when encoding; for properties,
// fields may be absent in the encoded value, so a default is
// substituted for missing fields when decoding. The effect is the
// same so far as these tests are concerned.
function assertEqualModuloDefaults(original, decodedFields) {
  var args = defs.info(original.id).args;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    var originalValue = original.fields[arg.name];
    var decodedValue = decodedFields[arg.name];
    try {
      if (originalValue === undefined) {
        // longstr gets special treatment here, since the defaults are
        // given as strings rather than buffers, but the decoded values
        // will be buffers.
        assert.deepEqual((arg.type === 'longstr') ?
                         Buffer.from(arg.default) : arg.default,
                         decodedValue);
      }
      else {
        assert.deepEqual(removeExplicitTypes(originalValue), decodedValue);
      }
    }
    catch (assertionErr) {
      var methodOrProps = defs.info(original.id).name;
      assertionErr.message += ' (frame ' + methodOrProps +
        ' field ' + arg.name + ')';
      throw assertionErr;
    }
  }
  // %%% TODO make sure there's no surplus fields
  return true;
}

// This is handy for elsewhere
module.exports.assertEqualModuloDefaults = assertEqualModuloDefaults;

function roundtripMethod(Method) {
  return forAll(Method).satisfy(function(method) {
    var buf = defs.encodeMethod(method.id, 0, method.fields);
    // FIXME depends on framing, ugh
    var fs1 = defs.decode(method.id, buf.subarray(11, buf.length));
    assertEqualModuloDefaults(method, fs1);
    return true;
  });
}

function roundtripProperties(Properties) {
  return forAll(Properties).satisfy(function(properties) {
    var buf = defs.encodeProperties(properties.id, 0, properties.size,
                                    properties.fields);
    // FIXME depends on framing, ugh
    var fs1 = defs.decode(properties.id, buf.subarray(19, buf.length));
    assert.equal(properties.size, ints.readUInt64BE(buf, 11));
    assertEqualModuloDefaults(properties, fs1);
    return true;
  });
}

suite("Roundtrip methods", function() {
  amqp.methods.forEach(function(Method) {
    test(Method.toString() + ' roundtrip',
         roundtripMethod(Method).asTest());
  });
});

suite("Roundtrip properties", function() {
  amqp.properties.forEach(function(Properties) {
    test(Properties.toString() + ' roundtrip',
         roundtripProperties(Properties).asTest());
  });
});
