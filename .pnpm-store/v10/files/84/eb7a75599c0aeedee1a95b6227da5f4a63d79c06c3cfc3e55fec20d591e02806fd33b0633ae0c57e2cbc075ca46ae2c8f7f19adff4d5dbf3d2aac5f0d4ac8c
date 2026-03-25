var syntax = require('zunit').syntax;
var assert = require('assert');
var parse = require('..').parse;
var build = require('..').build;
var builder = require('..').builder;
var write = require('..').write;

var Buffer = require('safe-buffer').Buffer;
var suite = syntax.describe;
var test = syntax.it;

TEST_CASES = [
  ['n:8', {n:255}, [255]],
  ['n:16', {n: 0xf0f0}, [240, 240]],
  ['n:32', {n: 0x12345678}, [18,52,86,120]],
  ['n:64', {n: 0xffffffffffffffff}, [255,255,255,255,255,255,255,255]],

  ['n:8, s/binary', {n: 255, s: Buffer.from("foobar")}, [255, 0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]],
  ['n:8, "foobar", m:8', {n: 255, m:0}, [255, 0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72, 0]],
  ['n:8, s:n/binary', {n:6, s: Buffer.from('foobar')}, [6, 0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]],
  ['n:8, s:n/binary', {n:4, s: Buffer.from('foobar')}, [4, 0x66, 0x6f, 0x6f, 0x62]],
  ['n:size', {n:4, size:8}, [4]],
  ['206:n/unit:8', {n:1}, [206]]
];

function bufferToArray(buf) {
  return Array.prototype.slice.call(buf);
}

suite("Construction", function() {
  TEST_CASES.forEach(function(c) {
    var p = parse(c[0]);
    test(c[0], function() {
      assert.deepEqual(c[2], bufferToArray(build(p, c[1])));
    });
    test(c[0], function() {
      var buf = Buffer.alloc(1024);
      var end = write(buf, 7, p, c[1]);
      buf = buf.slice(7, end);
      assert.deepEqual(c[2], bufferToArray(buf));
    });
    test(c[0], function() {
      var cons = builder(c[0]);
      var buf = cons(c[1]);
      assert.deepEqual(c[2], bufferToArray(buf));
    });

  });

});
