'use strict';

var _ = require('lodash');
var test = require('tape');
var sum = require('./');

test('creates unique hashes', function (t) {
  var cases = [];

  test_case([0,1,2,3]);
  test_case({0:0,1:1,2:2,3:3});
  test_case({0:0,1:1,2:2,3:3,length:4});
  test_case({url:12});
  test_case({headers:12});
  test_case({headers:122});
  test_case({headers:'122'});
  test_case({headers:{accept:'text/plain'}});
  test_case({payload:[0,1,2,3],headers:[{a:'b'}]});
  test_case({a:function () {}});
  test_case({b:function () {}});
  test_case({b:function (a) {}});
  test_case(function () {});
  test_case(function (a) {});
  test_case(function (b) {});
  test_case(function (a) { return a;});
  test_case(function (a) {return a;});
  test_case('', '\'\'');
  test_case('null', '\'null\'');
  test_case('false', '\'false\'');
  test_case('true', '\'true\'');
  test_case('0', '\'0\'');
  test_case('1', '\'1\'');
  test_case('void 0', '\'void 0\'');
  test_case('undefined', '\'undefined\'');
  test_case(null);
  test_case(false);
  test_case(true);
  test_case(Infinity);
  test_case(-Infinity);
  test_case(NaN);
  test_case(0);
  test_case(1);
  test_case(void 0);
  test_case({});
  test_case({a:{},b:{}});
  test_case({valueOf(){return 1}});
  test_case({valueOf(){return 2}});
  test_case([]);
  test_case(new Date());
  test_case(new Date(2019, 5, 28));
  test_case(new Date(1988, 5, 9));
  test_case(global, 'global');

  const uniqCases = _.uniqBy(cases, 'hash')
  _.uniqBy(cases, 'hash').forEach(function (expected) {
    var matches = _.filter(cases, { hash: expected.hash })
    t.equal(matches.length, 1, expected.hash + ': ' + _.map(matches, 'value').join(' '))
  })

  t.end();

  function test_case(value, name) {
    var hash = sum(value);
    cases.push({ value, hash });
    console.log('%s from:', hash, name || value);
  }
});

test('hashes clash if same properties', function (t) {
  equals(function () {}, function () {});
  equals(function (a) {}, function (a) {});
  equals({a:'1'},{a:'1'});
  equals({a:'1',b:1},{b:1,a:'1'});
  equals({valueOf(){return 1}},{valueOf(){return 1}});
  t.end();

  function equals (a, b) {
    t.equal(sum(a), sum(b));
  }
});
