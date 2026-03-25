// Property-based testing representations of various things in AMQP

'use strict';

var C = require('claire');
var forAll = C.forAll;
var arb = C.data;
var transform = C.transform;
var repeat = C.repeat;
var label = C.label;
var sequence = C.sequence;
var asGenerator = C.asGenerator;
var sized = C.sized;
var recursive = C.recursive;
var choice = C.choice;
var Undefined = C.Undefined;

// Stub these out so we can use outside tests
// if (!suite) var suite = function() {}
// if (!test) var test = function() {}

// These aren't exported in claire/index. so I could have to reproduce
// them I guess.
function choose(a, b) {
  return Math.random() * (b - a) + a;
}

function chooseInt(a, b) {
  return Math.floor(choose(a, b));
}

function rangeInt(name, a, b) {
  return label(name,
               asGenerator(function(_) { return chooseInt(a, b); }));
}

function toFloat32(i) {
  var b = Buffer.alloc(4);
  b.writeFloatBE(i, 0);
  return b.readFloatBE(0);
}

function floatChooser(maxExp) {
  return function() {
    var n = Number.NaN;
    while (isNaN(n)) {
      var mantissa = Math.random() * 2 - 1;
      var exponent = chooseInt(0, maxExp);
      n = Math.pow(mantissa, exponent);
  }
    return n;
  }
}

function explicitType(t, underlying) {
    return label(t, transform(function(n) {
        return {'!': t, value: n};
    }, underlying));
}

// FIXME null, byte array, others?

var Octet = rangeInt('octet', 0, 255);
var ShortStr = label('shortstr',
                     transform(function(s) {
                       return s.substr(0, 255);
                     }, arb.Str));

var LongStr = label('longstr',
                    transform(
                      function(bytes) { return Buffer.from(bytes); },
                      repeat(Octet)));

var UShort = rangeInt('short-uint', 0, 0xffff);
var ULong = rangeInt('long-uint', 0, 0xffffffff);
var ULongLong = rangeInt('longlong-uint', 0, 0xffffffffffffffff);
var Short = rangeInt('short-int', -0x8000, 0x7fff);
var Long = rangeInt('long-int', -0x80000000, 0x7fffffff);
var LongLong = rangeInt('longlong-int', -0x8000000000000000,
                        0x7fffffffffffffff);
var Bit = label('bit', arb.Bool);
var Double = label('double', asGenerator(floatChooser(308)));
var Float = label('float', transform(toFloat32, floatChooser(38)));
var Timestamp = label('timestamp', transform(
  function(n) {
    return {'!': 'timestamp', value: n};
  }, ULongLong));
var Decimal = label('decimal', transform(
  function(args) {
    return {'!': 'decimal', value: {places: args[1], digits: args[0]}};
  }, sequence(arb.UInt, Octet)));
var UnsignedByte = label('unsignedbyte', transform(
  function(n) {
    return {'!': 'unsignedbyte', value: n};
  }, Octet));
var UnsignedShort = label('unsignedshort', transform(
  function(n) {
    return {'!': 'unsignedshort', value: n};
  }, UShort));
var UnsignedInt = label('unsignedint', transform(
  function(n) {
    return {'!': 'unsignedint', value: n};
  }, ULong));

// Signed 8 bit int
var Byte = rangeInt('byte', -128, 127);

// Explicitly typed values
var ExByte = explicitType('byte', Byte);
var ExInt8 = explicitType('int8', Byte);
var ExShort = explicitType('short', Short);
var ExInt16 = explicitType('int16', Short);
var ExInt = explicitType('int', Long);
var ExInt32 = explicitType('int32', Long);
var ExLong = explicitType('long', LongLong);
var ExInt64 = explicitType('int64', LongLong);

var FieldArray = label('field-array', recursive(function() {
  return arb.Array(
    arb.Null,
    LongStr, ShortStr,
    Octet, UShort, ULong, ULongLong,
    Byte, Short, Long, LongLong,
    ExByte, ExInt8, ExShort, ExInt16,
    ExInt, ExInt32, ExLong, ExInt64,
    Bit, Float, Double, FieldTable, FieldArray)
}));

var FieldTable = label('table', recursive(function() {
  return sized(function() { return 5; },
               arb.Object(
                 arb.Null,
                 LongStr, ShortStr, Octet,
                 UShort, ULong, ULongLong,
                 Byte, Short, Long, LongLong,
                 ExByte, ExInt8, ExShort, ExInt16,
                 ExInt, ExInt32, ExLong, ExInt64,
                 Bit, Float, Double, FieldArray, FieldTable))
}));

// Internal tests of our properties
var domainProps = [
  [Octet, function(n) { return n >= 0 && n < 256; }],
  [ShortStr, function(s) { return typeof s === 'string' && s.length < 256; }],
  [LongStr, function(s) { return Buffer.isBuffer(s); }],
  [UShort, function(n) { return n >= 0 && n <= 0xffff; }],
  [ULong, function(n) { return n >= 0 && n <= 0xffffffff; }],
  [ULongLong, function(n) {
    return n >= 0 && n <= 0xffffffffffffffff; }],
  [Short, function(n) { return n >= -0x8000 && n <= 0x8000; }],
  [Long, function(n) { return n >= -0x80000000 && n < 0x80000000; }],
  [LongLong, function(n) { return n >= -0x8000000000000000 && n < 0x8000000000000000; }],
  [Bit, function(b) { return typeof b === 'boolean'; }],
  [Double, function(f) { return !isNaN(f) && isFinite(f); }],
  [Float, function(f) { return !isNaN(f) && isFinite(f) && (Math.log(Math.abs(f)) * Math.LOG10E) < 309; }],
  [Decimal, function(d) {
    return d['!'] === 'decimal' &&
      d.value['places'] <= 255 &&
      d.value['digits'] <= 0xffffffff;
  }],
  [Timestamp, function(t) { return t['!'] === 'timestamp'; }],
  [FieldTable, function(t) { return typeof t === 'object'; }],
  [FieldArray, function(a) { return Array.isArray(a); }]
];

suite("Domains", function() {
  domainProps.forEach(function(p) {
    test(p[0] + ' domain',
         forAll(p[0]).satisfy(p[1]).asTest({times: 500}));
  });
});

// For methods and properties (as opposed to field table values) it's
// easier just to accept and produce numbers for timestamps.
var ArgTimestamp = label('timestamp', ULongLong);

// These are the domains used in method arguments
var ARG_TYPES = {
  'octet': Octet,
  'shortstr': ShortStr,
  'longstr': LongStr,
  'short': UShort,
  'long': ULong,
  'longlong': ULongLong,
  'bit': Bit,
  'table': FieldTable,
  'timestamp': ArgTimestamp
};

function argtype(thing) {
  if (thing.default === undefined) {
    return ARG_TYPES[thing.type];
  }
  else {
    return choice(ARG_TYPES[thing.type], Undefined);
  }
}

function zipObject(vals, names) {
  var obj = {};
  vals.forEach(function(v, i) { obj[names[i]] = v; });
  return obj;
}

function name(arg) { return arg.name; }

var defs = require('../lib/defs');

function method(info) {
  var domain = sequence.apply(null, info.args.map(argtype));
  var names = info.args.map(name);
  return label(info.name, transform(function(fieldVals) {
    return {id: info.id,
            fields: zipObject(fieldVals, names)};
  }, domain));
}

function properties(info) {
  var types = info.args.map(argtype);
  types.unshift(ULongLong); // size
  var domain = sequence.apply(null, types);
  var names = info.args.map(name);
  return label(info.name, transform(function(fieldVals) {
    return {id: info.id,
            size: fieldVals[0],
            fields: zipObject(fieldVals.slice(1), names)};
  }, domain));
}

var methods = [];
var propertieses = [];

for (var k in defs) {
  if (k.substr(0, 10) === 'methodInfo') {
    methods.push(method(defs[k]));
    methods[defs[k].name] = method(defs[k]);
  }
  else if (k.substr(0, 14) === 'propertiesInfo') {
    propertieses.push(properties(defs[k]));
    propertieses[defs[k].name] = properties(defs[k]);
  }
};

module.exports = {
  Octet: Octet,
  ShortStr: ShortStr,
  LongStr: LongStr,
  UShort: UShort,
  ULong: ULong,
  ULongLong: ULongLong,
  Short: Short,
  Long: Long,
  LongLong: LongLong,
  Bit: Bit,
  Double: Double,
  Float: Float,
  Timestamp: Timestamp,
  Decimal: Decimal,
  UnsignedByte: UnsignedByte,
  UnsignedShort: UnsignedShort,
  UnsignedInt: UnsignedInt,
  FieldArray: FieldArray,
  FieldTable: FieldTable,

  methods: methods,
  properties: propertieses
};

module.exports.rangeInt = rangeInt;
