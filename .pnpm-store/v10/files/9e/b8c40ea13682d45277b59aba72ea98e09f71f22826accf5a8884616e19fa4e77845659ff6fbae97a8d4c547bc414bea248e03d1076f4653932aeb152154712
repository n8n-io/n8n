'use strict';

var assert = require('assert');
var constaninople = require('../');

describe('isConstant(src)', function() {
  it('handles "[5 + 3 + 10]"', function() {
    assert(constaninople.isConstant('[5 + 3 + 10]') === true);
  });
  it('handles "/[a-z]/i.test(\'a\')"', function() {
    assert(constaninople.isConstant("/[a-z]/i.test('a')") === true);
  });
  it("handles \"{'class': [('data')]}\"", function() {
    assert(constaninople.isConstant("{'class': [('data')]}") === true);
  });
  it('handles "Math.random()"', function() {
    assert(constaninople.isConstant('Math.random()') === false);
  });
  it('handles "Math.random("', function() {
    assert(constaninople.isConstant('Math.random(') === false);
  });
  it('handles "Math.floor(10.5)" with {Math: Math} as constants', function() {
    assert(constaninople.isConstant('Math.floor(10.5)', {Math: Math}) === true);
  });
  it('handles "this.myVar"', function() {
    assert(constaninople.isConstant('this.myVar') === false);
  });
  it('handles "(function () { while (true); return 10; }())"', function() {
    assert(
      constaninople.isConstant(
        '(function () { while (true); return 10; }())'
      ) === false
    );
  });
  it('handles "({}).toString.constructor("console.log(1)")()"', function() {
    assert(
      constaninople.isConstant(
        '({}).toString.constructor("console.log(1)")()'
      ) === false
    );
  });
});

describe('toConstant(src)', function() {
  it('handles "[5 + 3 + 10]"', function() {
    assert.deepEqual(constaninople.toConstant('[5 + 3 + 10]'), [5 + 3 + 10]);
  });
  it('handles "/[a-z]/i.test(\'a\')"', function() {
    assert(constaninople.toConstant("/[a-z]/i.test('a')") === true);
  });
  it("handles \"{'class': [('data')]}\"", function() {
    assert.deepEqual(constaninople.toConstant("{'class': [('data')]}"), {
      class: ['data'],
    });
  });
  it('handles "Math.random()"', function() {
    try {
      constaninople.toConstant('Math.random()');
    } catch (ex) {
      return;
    }
    assert(false, 'Math.random() should result in an error');
  });
  it('handles "Math.random("', function() {
    try {
      constaninople.toConstant('Math.random(');
    } catch (ex) {
      return;
    }
    assert(false, 'Math.random( should result in an error');
  });
  it('handles "Math.floor(10.5)" with {Math: Math} as constants', function() {
    assert(constaninople.toConstant('Math.floor(10.5)', {Math: Math}) === 10);
  });
  it('handles "(function () { while (true); return 10; }())"', function() {
    try {
      constaninople.toConstant('(function () { while (true); return 10; }())');
    } catch (ex) {
      return;
    }
    assert(
      false,
      '(function () { while (true); return 10; }()) should result in an error'
    );
  });
});
