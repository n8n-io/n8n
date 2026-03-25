suite('lunr.TokenSet', function () {
  var tokenSet = lunr.TokenSet.fromArray([
    'january', 'february', 'march', 'april',
    'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december'
  ].sort())

  var noWildcard = lunr.TokenSet.fromString('september')
  var withWildcard = lunr.TokenSet.fromString('*ber')

  this.add('.fromArray', function () {
    lunr.TokenSet.fromArray(words)
  })

  this.add('.fromString (no wildcard)', function () {
    lunr.TokenSet.fromString('javascript')
  })

  this.add('.fromString (with wildcard)', function () {
    lunr.TokenSet.fromString('java*cript')
  })

  this.add('.fromFuzzyString', function () {
    lunr.TokenSet.fromFuzzyString('javascript', 2)
  })

  this.add('#toArray', function () {
    tokenSet.toArray()
  })

  this.add('#toString', function () {
    tokenSet.toString()
  })

  this.add('#intersect (no wildcard)', function () {
    tokenSet.intersect(noWildcard)
  })

  this.add('#intersect (with wildcard)', function () {
    tokenSet.intersect(withWildcard)
  })
})
