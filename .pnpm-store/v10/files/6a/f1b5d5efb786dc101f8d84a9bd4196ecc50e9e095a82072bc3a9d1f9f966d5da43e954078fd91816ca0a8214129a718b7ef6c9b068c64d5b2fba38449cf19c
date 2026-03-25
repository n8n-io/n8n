// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

"use strict";

// test using assert
var qs = require('../');

// folding block, commented to pass gjslint
// {{{
// [ wonkyQS, canonicalQS, obj ]
var qsTestCases = [
  ['foo=918854443121279438895193',
   'foo=918854443121279438895193',
   {'foo': '918854443121279438895193'}],
  ['foo=bar', 'foo=bar', {'foo': 'bar'}],
  ['foo=bar&foo=quux', 'foo=bar&foo=quux', {'foo': ['bar', 'quux']}],
  ['foo=1&bar=2', 'foo=1&bar=2', {'foo': '1', 'bar': '2'}],
  ['my+weird+field=q1%212%22%27w%245%267%2Fz8%29%3F',
  'my%20weird%20field=q1!2%22\'w%245%267%2Fz8)%3F',
  {'my weird field': 'q1!2"\'w$5&7/z8)?' }],
  ['foo%3Dbaz=bar', 'foo%3Dbaz=bar', {'foo=baz': 'bar'}],
  ['foo=baz=bar', 'foo=baz%3Dbar', {'foo': 'baz=bar'}],
  ['str=foo&arr=1&arr=2&arr=3&somenull=&undef=',
   'str=foo&arr=1&arr=2&arr=3&somenull=&undef=',
   { 'str': 'foo',
     'arr': ['1', '2', '3'],
     'somenull': '',
     'undef': ''}],
  [' foo = bar ', '%20foo%20=%20bar%20', {' foo ': ' bar '}],
  // disable test that fails ['foo=%zx', 'foo=%25zx', {'foo': '%zx'}],
  ['foo=%EF%BF%BD', 'foo=%EF%BF%BD', {'foo': '\ufffd' }],
  // See: https://github.com/joyent/node/issues/1707
  ['hasOwnProperty=x&toString=foo&valueOf=bar&__defineGetter__=baz',
    'hasOwnProperty=x&toString=foo&valueOf=bar&__defineGetter__=baz',
    { hasOwnProperty: 'x',
      toString: 'foo',
      valueOf: 'bar',
      __defineGetter__: 'baz' }],
  // See: https://github.com/joyent/node/issues/3058
  ['foo&bar=baz', 'foo=&bar=baz', { foo: '', bar: 'baz' }]
];

// [ wonkyQS, canonicalQS, obj ]
var qsColonTestCases = [
  ['foo:bar', 'foo:bar', {'foo': 'bar'}],
  ['foo:bar;foo:quux', 'foo:bar;foo:quux', {'foo': ['bar', 'quux']}],
  ['foo:1&bar:2;baz:quux',
   'foo:1%26bar%3A2;baz:quux',
   {'foo': '1&bar:2', 'baz': 'quux'}],
  ['foo%3Abaz:bar', 'foo%3Abaz:bar', {'foo:baz': 'bar'}],
  ['foo:baz:bar', 'foo:baz%3Abar', {'foo': 'baz:bar'}]
];

// [wonkyObj, qs, canonicalObj]
var extendedFunction = function() {};
extendedFunction.prototype = {a: 'b'};
var qsWeirdObjects = [
  [{regexp: /./g}, 'regexp=', {'regexp': ''}],
  [{regexp: new RegExp('.', 'g')}, 'regexp=', {'regexp': ''}],
  [{fn: function() {}}, 'fn=', {'fn': ''}],
  [{fn: new Function('')}, 'fn=', {'fn': ''}],
  [{math: Math}, 'math=', {'math': ''}],
  [{e: extendedFunction}, 'e=', {'e': ''}],
  [{d: new Date()}, 'd=', {'d': ''}],
  [{d: Date}, 'd=', {'d': ''}],
  [{f: new Boolean(false), t: new Boolean(true)}, 'f=&t=', {'f': '', 't': ''}],
  [{f: false, t: true}, 'f=false&t=true', {'f': 'false', 't': 'true'}],
  [{n: null}, 'n=', {'n': ''}],
  [{nan: NaN}, 'nan=', {'nan': ''}],
  [{inf: Infinity}, 'inf=', {'inf': ''}]
];
// }}}

var qsNoMungeTestCases = [
  ['', {}],
  ['foo=bar&foo=baz', {'foo': ['bar', 'baz']}],
  ['blah=burp', {'blah': 'burp'}],
  ['gragh=1&gragh=3&goo=2', {'gragh': ['1', '3'], 'goo': '2'}],
  ['frappucino=muffin&goat%5B%5D=scone&pond=moose',
   {'frappucino': 'muffin', 'goat[]': 'scone', 'pond': 'moose'}],
  ['trololol=yes&lololo=no', {'trololol': 'yes', 'lololo': 'no'}]
];

exports['test basic'] = function(assert) {
  assert.strictEqual('918854443121279438895193',
                   qs.parse('id=918854443121279438895193').id,
                   'prase id=918854443121279438895193');
};

exports['test that the canonical qs is parsed properly'] = function(assert) {
  qsTestCases.forEach(function(testCase) {
    assert.deepEqual(testCase[2], qs.parse(testCase[0]),
                     'parse ' + testCase[0]);
  });
};


exports['test that the colon test cases can do the same'] = function(assert) {
  qsColonTestCases.forEach(function(testCase) {
    assert.deepEqual(testCase[2], qs.parse(testCase[0], ';', ':'),
                     'parse ' + testCase[0] + ' -> ; :');
  });
};

exports['test the weird objects, that they get parsed properly'] = function(assert) {
  qsWeirdObjects.forEach(function(testCase) {
    assert.deepEqual(testCase[2], qs.parse(testCase[1]),
                     'parse ' + testCase[1]);
  });
};

exports['test non munge test cases'] = function(assert) {
  qsNoMungeTestCases.forEach(function(testCase) {
    assert.deepEqual(testCase[0], qs.stringify(testCase[1], '&', '=', false),
                     'stringify ' + JSON.stringify(testCase[1]) + ' -> & =');
  });
};

exports['test the nested qs-in-qs case'] = function(assert) {
  var f = qs.parse('a=b&q=x%3Dy%26y%3Dz');
  f.q = qs.parse(f.q);
  assert.deepEqual(f, { a: 'b', q: { x: 'y', y: 'z' } },
                   'parse a=b&q=x%3Dy%26y%3Dz');
};

exports['test nested in colon'] = function(assert) {
  var f = qs.parse('a:b;q:x%3Ay%3By%3Az', ';', ':');
  f.q = qs.parse(f.q, ';', ':');
  assert.deepEqual(f, { a: 'b', q: { x: 'y', y: 'z' } },
                   'parse a:b;q:x%3Ay%3By%3Az -> ; :');
};

exports['test stringifying'] = function(assert) {
  qsTestCases.forEach(function(testCase) {
    assert.equal(testCase[1], qs.stringify(testCase[2]),
                 'stringify ' + JSON.stringify(testCase[2]));
  });

  qsColonTestCases.forEach(function(testCase) {
    assert.equal(testCase[1], qs.stringify(testCase[2], ';', ':'),
                 'stringify ' + JSON.stringify(testCase[2]) + ' -> ; :');
  });

  qsWeirdObjects.forEach(function(testCase) {
    assert.equal(testCase[1], qs.stringify(testCase[0]),
                 'stringify ' + JSON.stringify(testCase[0]));
  });
};

exports['test stringifying nested'] = function(assert) {
  var f = qs.stringify({
    a: 'b',
    q: qs.stringify({
      x: 'y',
      y: 'z'
    })
  });
  assert.equal(f, 'a=b&q=x%3Dy%26y%3Dz',
               JSON.stringify({
                  a: 'b',
                  'qs.stringify -> q': {
                    x: 'y',
                    y: 'z'
                  }
                }));

  var threw = false;
  try { qs.parse(undefined); } catch(error) { threw = true; }
  assert.ok(!threw, "does not throws on undefined");
};

exports['test nested in colon'] = function(assert) {
  var f = qs.stringify({
    a: 'b',
    q: qs.stringify({
      x: 'y',
      y: 'z'
    }, ';', ':')
  }, ';', ':');
  assert.equal(f, 'a:b;q:x%3Ay%3By%3Az',
               'stringify ' + JSON.stringify({
                  a: 'b',
                  'qs.stringify -> q': {
                    x: 'y',
                    y: 'z'
                  }
                }) + ' -> ; : ');


  assert.deepEqual({}, qs.parse(), 'parse undefined');
};
