var first = require('../')
  , assert = require('assert')
  , array = [0, 1, 2, 3, 4, 5]

suite('first-match', function() {
  test('Iterator defaults to a truth check', function() {
    var truth = [false, null, 0, undefined, '', 5, 12]
    assert.equal(first(truth), 5)
  })
  test('Returns undefined when no truthy values are found', function() {
    assert.equal(first(array, function() { return false }), undefined)
  })
  test('Context defaults to the array being checked', function() {
    first(array, function() { assert.equal(this, array) })
  })
  test('Context can be overridden using third argument', function() {
    var other = {}
    first(array, function() { assert.equal(this, other) }, other)
  })
  test('Returns the first element that passes a truth test', function() {
    [{
      result: 1,
      test: function(n) { return n % 2 }
    }, {
      result: 4,
      test: function(n) { return n > 3 }
    }, {
      result: 0,
      test: function(n) { return n < 2 }
    }, {
      result: 5,
      test: function(n) { return n + 2 > this.length }
    }, {
      result: 2,
      test: function(n) { return n > 0 && !(n % 2) }
    }].forEach(function(fn) {
      assert.equal(fn.result, first(array, fn.test))
    })
  })
});