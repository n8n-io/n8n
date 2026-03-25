
var test = require('tape')
var printf = require('pff')
var getTypeParser = require('../').getTypeParser
var types = require('./types')

test('types', function (t) {
  Object.keys(types).forEach(function (typeName) {
    var type = types[typeName]
    t.test(typeName, function (t) {
      var parser = getTypeParser(type.id, type.format)
      type.tests.forEach(function (tests) {
        var input = tests[0]
        var expected = tests[1]
        var result = parser(input)
        if (typeof expected === 'function') {
          return expected(t, result)
        }
        t.equal(result, expected)
      })
      t.end()
    })
  })
})
