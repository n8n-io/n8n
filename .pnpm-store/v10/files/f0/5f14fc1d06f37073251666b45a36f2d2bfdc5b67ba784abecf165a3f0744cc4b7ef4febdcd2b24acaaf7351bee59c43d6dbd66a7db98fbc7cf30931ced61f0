suite('lunr.TokenSet', function () {
  suite('#toString', function () {
    test('includes node finality', function () {
      var nonFinal = new lunr.TokenSet,
          final = new lunr.TokenSet,
          otherFinal = new lunr.TokenSet

      final.final = true
      otherFinal.final = true

      assert.notEqual(nonFinal.toString(), final.toString())
      assert.equal(otherFinal.toString(), final.toString())
    })

    test('includes all edges', function () {
      var zeroEdges = new lunr.TokenSet,
          oneEdge = new lunr.TokenSet,
          twoEdges = new lunr.TokenSet

      oneEdge.edges['a'] = 1
      twoEdges.edges['a'] = 1
      twoEdges.edges['b'] = 1

      assert.notEqual(zeroEdges.toString(), oneEdge.toString())
      assert.notEqual(twoEdges.toString(), oneEdge.toString())
      assert.notEqual(twoEdges.toString(), zeroEdges.toString())
    })

    test('includes edge id', function () {
      var childA = new lunr.TokenSet,
          childB = new lunr.TokenSet,
          parentA = new lunr.TokenSet,
          parentB = new lunr.TokenSet,
          parentC = new lunr.TokenSet

      parentA.edges['a'] = childA
      parentB.edges['a'] = childB
      parentC.edges['a'] = childB

      assert.equal(parentB.toString(), parentC.toString())
      assert.notEqual(parentA.toString(), parentC.toString())
      assert.notEqual(parentA.toString(), parentB.toString())
    })
  })

  suite('.fromString', function () {
    test('without wildcard', function () {
      lunr.TokenSet._nextId = 1
      var x = lunr.TokenSet.fromString('a')

      assert.equal(x.toString(), '0a2')
      assert.isOk(x.edges['a'].final)
    })

    test('with trailing wildcard', function () {
      var x = lunr.TokenSet.fromString('a*'),
          wild = x.edges['a'].edges['*']

      // a state reached by a wildcard has
      // an edge with a wildcard to itself.
      // the resulting automota is
      // non-determenistic
      assert.equal(wild, wild.edges['*'])
      assert.isOk(wild.final)
    })
  })

  suite('.fromArray', function () {
    test('with unsorted array', function () {
      assert.throws(function () {
        lunr.TokenSet.fromArray(['z', 'a'])
      })
    })

    test('with sorted array', function () {
      var tokenSet = lunr.TokenSet.fromArray(['a', 'z'])

      assert.deepEqual(['a', 'z'], tokenSet.toArray().sort())
    })

    test('is minimal', function () {
      var tokenSet = lunr.TokenSet.fromArray(['ac', 'dc']),
          acNode = tokenSet.edges['a'].edges['c'],
          dcNode = tokenSet.edges['d'].edges['c']

      assert.deepEqual(acNode, dcNode)
    })
  })

  suite('#toArray', function () {
    test('includes all words', function () {
      var words = ['bat', 'cat'],
          tokenSet = lunr.TokenSet.fromArray(words)

      assert.sameMembers(words, tokenSet.toArray())
    })

    test('includes single words', function () {
      var word = 'bat',
          tokenSet = lunr.TokenSet.fromString(word)

      assert.sameMembers([word], tokenSet.toArray())
    })
  })

  suite('#intersect', function () {
    test('no intersection', function () {
      var x = lunr.TokenSet.fromString('cat'),
          y = lunr.TokenSet.fromString('bar'),
          z = x.intersect(y)

      assert.equal(0, z.toArray().length)
    })

    test('simple intersection', function () {
      var x = lunr.TokenSet.fromString('cat'),
          y = lunr.TokenSet.fromString('cat'),
          z = x.intersect(y)

      assert.sameMembers(['cat'], z.toArray())
    })

    test('trailing wildcard intersection', function () {
      var x = lunr.TokenSet.fromString('cat'),
          y = lunr.TokenSet.fromString('c*'),
          z = x.intersect(y)

      assert.sameMembers(['cat'], z.toArray())
    })

    test('trailing wildcard no intersection', function () {
      var x = lunr.TokenSet.fromString('cat'),
          y = lunr.TokenSet.fromString('b*'),
          z = x.intersect(y)

      assert.equal(0, z.toArray().length)
    })

    test('leading wildcard intersection', function () {
      var x = lunr.TokenSet.fromString('cat'),
          y = lunr.TokenSet.fromString('*t'),
          z = x.intersect(y)

      assert.sameMembers(['cat'], z.toArray())
    })

    test('leading wildcard backtracking intersection', function () {
      var x = lunr.TokenSet.fromString('aaacbab'),
          y = lunr.TokenSet.fromString('*ab'),
          z = x.intersect(y)

      assert.sameMembers(['aaacbab'], z.toArray())
    })

    test('leading wildcard no intersection', function () {
      var x = lunr.TokenSet.fromString('cat'),
          y = lunr.TokenSet.fromString('*r'),
          z = x.intersect(y)

      assert.equal(0, z.toArray().length)
    })

    test('leading wildcard backtracking no intersection', function () {
      var x = lunr.TokenSet.fromString('aaabdcbc'),
          y = lunr.TokenSet.fromString('*abc'),
          z = x.intersect(y)

      assert.equal(0, z.toArray().length)
    })

    test('contained wildcard intersection', function () {
      var x = lunr.TokenSet.fromString('foo'),
          y = lunr.TokenSet.fromString('f*o'),
          z = x.intersect(y)

      assert.sameMembers(['foo'], z.toArray())
    })

    test('contained wildcard backtracking intersection', function () {
      var x = lunr.TokenSet.fromString('ababc'),
          y = lunr.TokenSet.fromString('a*bc'),
          z = x.intersect(y)

      assert.sameMembers(['ababc'], z.toArray())
    })

    test('contained wildcard no intersection', function () {
      var x = lunr.TokenSet.fromString('foo'),
          y = lunr.TokenSet.fromString('b*r'),
          z = x.intersect(y)

      assert.equal(0, z.toArray().length)
    })

    test('contained wildcard backtracking no intersection', function () {
      var x = lunr.TokenSet.fromString('ababc'),
          y = lunr.TokenSet.fromString('a*ac'),
          z = x.intersect(y)

      assert.equal(0, z.toArray().length)
    })

    test('wildcard matches zero or more characters', function () {
      var x = lunr.TokenSet.fromString('foo'),
          y = lunr.TokenSet.fromString('foo*'),
          z = x.intersect(y)

      assert.sameMembers(['foo'], z.toArray())
    })

    // This test is intended to prevent 'bugs' that have lead to these
    // kind of intersections taking a _very_ long time. The assertion
    // is not of interest, just that the test does not timeout.
    test('catastrophic backtracking with leading characters', function () {
      var x = lunr.TokenSet.fromString('fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
          y = lunr.TokenSet.fromString('*ff'),
          z = x.intersect(y)

      assert.equal(1, z.toArray().length)
    })

    test('leading and trailing backtracking intersection', function () {
      var x = lunr.TokenSet.fromString('acbaabab'),
          y = lunr.TokenSet.fromString('*ab*'),
          z = x.intersect(y)

      assert.sameMembers(['acbaabab'], z.toArray())
    })

    test('multiple contained wildcard backtracking', function () {
      var x = lunr.TokenSet.fromString('acbaabab'),
          y = lunr.TokenSet.fromString('a*ba*b'),
          z = x.intersect(y)

      assert.sameMembers(['acbaabab'], z.toArray())
    })

    test('intersect with fuzzy string substitution', function () {
      var x1 = lunr.TokenSet.fromString('bar'),
          x2 = lunr.TokenSet.fromString('cur'),
          x3 = lunr.TokenSet.fromString('cat'),
          x4 = lunr.TokenSet.fromString('car'),
          x5 = lunr.TokenSet.fromString('foo'),
          y = lunr.TokenSet.fromFuzzyString('car', 1)

      assert.sameMembers(x1.intersect(y).toArray(), ["bar"])
      assert.sameMembers(x2.intersect(y).toArray(), ["cur"])
      assert.sameMembers(x3.intersect(y).toArray(), ["cat"])
      assert.sameMembers(x4.intersect(y).toArray(), ["car"])
      assert.equal(x5.intersect(y).toArray().length, 0)
    })

    test('intersect with fuzzy string deletion', function () {
      var x1 = lunr.TokenSet.fromString('ar'),
          x2 = lunr.TokenSet.fromString('br'),
          x3 = lunr.TokenSet.fromString('ba'),
          x4 = lunr.TokenSet.fromString('bar'),
          x5 = lunr.TokenSet.fromString('foo'),
          y = lunr.TokenSet.fromFuzzyString('bar', 1)

      assert.sameMembers(x1.intersect(y).toArray(), ["ar"])
      assert.sameMembers(x2.intersect(y).toArray(), ["br"])
      assert.sameMembers(x3.intersect(y).toArray(), ["ba"])
      assert.sameMembers(x4.intersect(y).toArray(), ["bar"])
      assert.equal(x5.intersect(y).toArray().length, 0)
    })

    test('intersect with fuzzy string insertion', function () {
      var x1 = lunr.TokenSet.fromString('bbar'),
          x2 = lunr.TokenSet.fromString('baar'),
          x3 = lunr.TokenSet.fromString('barr'),
          x4 = lunr.TokenSet.fromString('bar'),
          x5 = lunr.TokenSet.fromString('ba'),
          x6 = lunr.TokenSet.fromString('foo'),
          x7 = lunr.TokenSet.fromString('bara'),
          y = lunr.TokenSet.fromFuzzyString('bar', 1)

      assert.sameMembers(x1.intersect(y).toArray(), ["bbar"])
      assert.sameMembers(x2.intersect(y).toArray(), ["baar"])
      assert.sameMembers(x3.intersect(y).toArray(), ["barr"])
      assert.sameMembers(x4.intersect(y).toArray(), ["bar"])
      assert.sameMembers(x5.intersect(y).toArray(), ["ba"])
      assert.equal(x6.intersect(y).toArray().length, 0)
      assert.sameMembers(x7.intersect(y).toArray(), ["bara"])
    })

    test('intersect with fuzzy string transpose', function () {
      var x1 = lunr.TokenSet.fromString('abr'),
          x2 = lunr.TokenSet.fromString('bra'),
          x3 = lunr.TokenSet.fromString('foo'),
          y = lunr.TokenSet.fromFuzzyString('bar', 1)

      assert.sameMembers(x1.intersect(y).toArray(), ["abr"])
      assert.sameMembers(x2.intersect(y).toArray(), ["bra"])
      assert.equal(x3.intersect(y).toArray().length, 0)
    })

    test('fuzzy string insertion', function () {
      var x = lunr.TokenSet.fromString('abcxx'),
          y = lunr.TokenSet.fromFuzzyString('abc', 2)

      assert.sameMembers(x.intersect(y).toArray(), ['abcxx'])
    })

    test('fuzzy string substitution', function () {
      var x = lunr.TokenSet.fromString('axx'),
          y = lunr.TokenSet.fromFuzzyString('abc', 2)

      assert.sameMembers(x.intersect(y).toArray(), ['axx'])
    })

    test('fuzzy string deletion', function () {
      var x = lunr.TokenSet.fromString('a'),
          y = lunr.TokenSet.fromFuzzyString('abc', 2)

      assert.sameMembers(x.intersect(y).toArray(), ['a'])
    })

    test('fuzzy string transpose', function () {
      var x = lunr.TokenSet.fromString('bca'),
          y = lunr.TokenSet.fromFuzzyString('abc', 2)

      assert.sameMembers(x.intersect(y).toArray(), ['bca'])
    })

  })
})
