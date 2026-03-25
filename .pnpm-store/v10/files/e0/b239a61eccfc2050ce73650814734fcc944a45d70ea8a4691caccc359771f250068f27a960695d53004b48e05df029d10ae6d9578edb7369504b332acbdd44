var syntax = require('zunit').syntax;
var match = require('..').match;
var parse = require('..').parse;
var compile = require('..').matcher;
var assert = require('assert');

var Buffer = require('safe-buffer').Buffer;
var suite = syntax.describe;
var test = syntax.it;

Object.prototype.AMQPLIB_ISSUE_453 = 123123123

var INT_TESTS = [
    ['n:8',
     [[[255], 255]]],
    ['n:8/signed',
     [[[255], -1]]],
    ['n:1/unit:8',
     [[[129], 129]]],
    ['n:1/unit:8-signed',
     [[[129], -127]]],

    ['n:16',
     [[[1, 255], 511]]],
    ['n:16/signed',
     [[[255, 65], -191]]],
    ['n:16/little',
     [[[255, 1], 511]]],
    ['n:16/signed-little',
     [[[65, 255], -191]]],

    ['n:32',
     [[[45, 23, 97, 102], 756506982]]],
    ['n:32/signed',
     [[[245, 23, 97, 102], -183017114]]],
    ['n:32/little',
     [[[245, 23, 97, 102], 1717639157]]],
    ['n:32/signed-little',
     [[[245, 23, 97, 129], -2124343307]]],

    ['n:4/signed-little-unit:8',
     [[[245, 23, 97, 129], -2124343307]]],

    ['n:64',
     [[[1,2,3,4,5,6,7,8], 72623859790382856]]],
    ['n:64/signed',
     [[[255,2,3,4,5,6,7,8], -71491328285473016]]],
    ['n:64/little',
     [[[1,2,3,4,5,6,7,8], 578437695752307201]]],
    ['n:64/little-signed',
     [[[1,2,3,4,5,6,7,255], -70080650589044223]]],
    ['n:8/signed-unit:8-little',
     [[[1,2,3,4,5,6,7,255], -70080650589044223]]],
];

suite("Integer",
      function() {

        INT_TESTS.forEach(function(p) {
          var pattern = parse(p[0]);
          var cpattern = compile(p[0]);
          p[1].forEach(function(tc) {
            test(p[0], function() {
              assert.deepEqual({n: tc[1]}, match(pattern, Buffer.from(tc[0])));
            });
            test(p[0], function() {
              assert.deepEqual({n: tc[1]}, cpattern(Buffer.from(tc[0])));
            });
          });
        });
      });


// test cases largely constructed in Erlang using e.g.,
// Pi = math:pi(), <<Pi:32/float>>.
FLOAT_TESTS = [
  ['n:32/float',
   [[[64,73,15,219], Math.PI],
    [[0, 0, 0, 0], 0.0 ]]],

  ['n:64/float',
   [[[64,9,33,251,84,68,45,24], Math.PI],
    [[0, 0, 0, 0, 0, 0, 0, 0], 0.0]]],

  ['n:32/float-little',
   [[[219, 15, 73, 64], Math.PI],
    [[0, 0, 0, 0], 0.0]]],

  ['n:64/float-little',
   [[[24, 45, 68, 84, 251, 33, 9, 64], Math.PI],
    [[0, 0, 0, 0, 0, 0, 0, 0], 0.0]]],

  ['n:4/float-unit:8',
   [[[64,73,15,219], Math.PI],
    [[0, 0, 0, 0], 0.0]]]
];

suite("Float",
      function() {
        var precision = 0.00001;
        FLOAT_TESTS.forEach(function(p) {
          var pattern = parse(p[0]);
          var cpattern = compile(p[0]);
          p[1].forEach(function(tc) {
            test(p[0], function() {
              var m = match(pattern, Buffer.from(tc[0]));
              assert.ok(m.n !== undefined);
              assert.ok(Math.abs(tc[1] - m.n) < precision);
            });
            test(p[0], function() {
              var m = cpattern(Buffer.from(tc[0]));
              assert.ok(m.n !== undefined);
              assert.ok(Math.abs(tc[1] - m.n) < precision);
            });
          });
        });
      });

BINARY_TESTS = [
  ['n:0/unit:8-binary', []],
  ['n:1/unit:8-binary', [93]],
  ['n:5/unit:8-binary', [1, 2, 3, 4, 5]],
  ['n:32/unit:1-binary', [255, 254, 253, 252]]
];

suite("Binary",
      function() {
        BINARY_TESTS.forEach(function(p) {
          var pattern = parse(p[0]);
          var cpattern = compile(p[0]);
          var prest = p[0] + ', _/binary';
          var patternrest = parse(prest);
          var cpatternrest = compile(prest);
          test(p[0], function() {
            assert.deepEqual({n: Buffer.from(p[1])},
                             match(pattern, Buffer.from(p[1])));
            assert.deepEqual({n: Buffer.from(p[1])},
                             cpattern(Buffer.from(p[1])));
          });
          test(prest, function() {
            var plusgarbage = p[1].concat([5, 98, 23, 244]);
            assert.deepEqual({n: Buffer.from(p[1])},
                             match(patternrest, Buffer.from(plusgarbage)));
            assert.deepEqual({n: Buffer.from(p[1])},
                             cpatternrest(Buffer.from(plusgarbage)));
          });
        });
      });

var VAR_TESTS = [
  ['size, n:size',
   [[[8, 5], 5],
    [[32, 0, 0, 0, 167], 167]]],

  ['size, n:size/binary',
   [[[2, 5, 6], Buffer.from([5, 6])]]],

  ['a, b:a, n:b',
   [[[8, 32, 0, 0, 2, 100], 612]]]
];

suite("Environment",
      function() {
        VAR_TESTS.forEach(function(p) {
          var pattern = parse(p[0]);
          var cpattern = compile(p[0]);
          p[1].forEach(function(tc) {
            test(p[0], function() {
              assert.deepEqual(tc[1], match(pattern, Buffer.from(tc[0])).n);
            });
            test(p[0], function() {
              assert.deepEqual(tc[1], cpattern(Buffer.from(tc[0])).n);
            });
          });
        });
      });

STRING_TESTS = [
  ['"foobar", n:8', "foobarA", 'A'.charCodeAt(0)],
  ['n:8, "foobar", _/binary', "CfoobarGARBAGE", 'C'.charCodeAt(0)],
  ['"foo, :-bar\\"", n:8, "another"', 'foo, :-bar"Zanother', 'Z'.charCodeAt(0)]
];

suite("String",
      function() {
        STRING_TESTS.forEach(function(p) {
          var pattern = parse(p[0]);
          test(p[0], function() {
            var res = match(pattern, Buffer.from(p[1]));
            assert.equal(res.n, p[2]);
          });
        });
      });
