var assert = require('assert')
var deindent = require('./index')

describe('de-indent', function () {

  it('0 indent', function () {
    var str = '\nabc\n  bcd\n  cde\nefg'
    var res = deindent(str)
    assert.equal(str, res)
  })

  it('non-0 indent', function () {
    var str = '  abc\n    bcd\n  cde\n    efg'
    var res = deindent(str)
    assert.equal(res, 'abc\n  bcd\ncde\n  efg')
  })

  it('tabs', function () {
    var str = '\tabc\n\t\tbcd\n\tcde\n\t\tefg'
    var res = deindent(str)
    assert.equal(res, 'abc\n\tbcd\ncde\n\tefg')
  })

  it('single line', function () {
    var str = '\n  <h2 class="red">{{msg}}</h2>\n'
    var res = deindent(str)
    assert.equal(res, '\n<h2 class="red">{{msg}}</h2>\n')
  })

})
