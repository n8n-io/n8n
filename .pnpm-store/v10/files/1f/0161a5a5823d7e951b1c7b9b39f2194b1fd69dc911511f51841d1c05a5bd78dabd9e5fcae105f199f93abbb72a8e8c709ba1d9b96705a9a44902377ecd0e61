var it = require('it-is').style('colour')
  , split = require('..')

exports ['maximum buffer limit'] = function (test) {
  var s = split(JSON.parse, null, {
    maxLength: 2
  })
    , caughtError = false
    , rows = []

  s.on('error', function (err) {
    caughtError = true
  })

  s.on('data', function (row) { rows.push(row) })

  s.write('{"a":1}\n{"')
  s.write('{    "')
  it(caughtError).equal(true)

  s.end()
  test.done()
}
