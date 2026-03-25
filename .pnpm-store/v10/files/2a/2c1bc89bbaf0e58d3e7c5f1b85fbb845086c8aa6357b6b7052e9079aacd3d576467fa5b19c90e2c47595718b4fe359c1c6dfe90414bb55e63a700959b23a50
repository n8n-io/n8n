'use strict';

var assert = require('assert');
var stringify = require('../');

assert(stringify('foo') === '"foo"');
assert(stringify('foo\u2028bar\u2029baz') === '"foo\\u2028bar\\u2029baz"');
assert(stringify(new Date('2014-12-19T03:42:00.000Z')) === 'new Date("2014-12-19T03:42:00.000Z")');
assert(stringify({foo: 'bar'}) === '{"foo":"bar"}');
assert(stringify(undefined) === 'undefined');
assert(stringify(null) === 'null');
assert(
  stringify({val: "</script><script>alert('bad actor')</script>"}) ===
  '{"val":"\\u003C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'bad actor\')\\u003C\\u002Fscript\\u003E"}'
);

console.log('tests passed');
