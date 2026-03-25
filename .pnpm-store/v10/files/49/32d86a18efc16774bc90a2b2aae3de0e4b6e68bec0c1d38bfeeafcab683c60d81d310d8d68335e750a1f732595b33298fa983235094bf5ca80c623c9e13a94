suite('lunr.Vector', function () {
  var vectorFromArgs = function () {
    var vector = new lunr.Vector

    Array.prototype.slice.call(arguments)
      .forEach(function (el, i) {
        vector.insert(i, el)
      })

    return vector
  }

  suite('#magnitude', function () {
    test('calculates magnitude of a vector', function () {
      var vector = vectorFromArgs(4,5,6)
      assert.equal(Math.sqrt(77), vector.magnitude())
    })
  })

  suite('#dot', function () {
    test('calculates dot product of two vectors', function () {
      var v1 = vectorFromArgs(1, 3, -5),
          v2 = vectorFromArgs(4, -2, -1)

      assert.equal(3, v1.dot(v2))
    })
  })

  suite('#similarity', function () {
    test('calculates the similarity between two vectors', function () {
      var v1 = vectorFromArgs(1, 3, -5),
          v2 = vectorFromArgs(4, -2, -1)

      assert.approximately(v1.similarity(v2), 0.5, 0.01)
    })

    test('empty vector', function () {
      var vEmpty = new lunr.Vector,
          v1 = vectorFromArgs(1)

      assert.equal(0, vEmpty.similarity(v1))
      assert.equal(0, v1.similarity(vEmpty))
    })

    test('non-overlapping vector', function () {
      var v1 = new lunr.Vector([1, 1]),
          v2 = new lunr.Vector([2, 1])

      assert.equal(0, v1.similarity(v2))
      assert.equal(0, v2.similarity(v1))
    })
  })

  suite('#insert', function () {
    test('invalidates magnitude cache', function () {
      var vector = vectorFromArgs(4,5,6)

      assert.equal(Math.sqrt(77), vector.magnitude())

      vector.insert(3, 7)

      assert.equal(Math.sqrt(126), vector.magnitude())
    })

    test('keeps items in index specified order', function () {
      var vector = new lunr.Vector

      vector.insert(2, 4)
      vector.insert(1, 5)
      vector.insert(0, 6)

      assert.deepEqual([6,5,4], vector.toArray())
    })

    test('fails when duplicate entry', function () {
      var vector = vectorFromArgs(4, 5, 6)
      assert.throws(function () { vector.insert(0, 44) })
    })
  })

  suite('#upsert', function () {
    test('invalidates magnitude cache', function () {
      var vector = vectorFromArgs(4,5,6)

      assert.equal(Math.sqrt(77), vector.magnitude())

      vector.upsert(3, 7)

      assert.equal(Math.sqrt(126), vector.magnitude())
    })

    test('keeps items in index specified order', function () {
      var vector = new lunr.Vector

      vector.upsert(2, 4)
      vector.upsert(1, 5)
      vector.upsert(0, 6)

      assert.deepEqual([6,5,4], vector.toArray())
    })

    test('calls fn for value on duplicate', function () {
      var vector = vectorFromArgs(4, 5, 6)
      vector.upsert(0, 4, function (current, passed) { return current + passed })
      assert.deepEqual([8, 5, 6], vector.toArray())
    })
  })

  suite('#positionForIndex', function () {
    var vector = new lunr.Vector ([
        1, 'a',
        2, 'b',
        4, 'c',
        7, 'd',
        11, 'e'
    ])

    test('at the beginning', function () {
      assert.equal(0, vector.positionForIndex(0))
    })

    test('at the end', function () {
      assert.equal(10, vector.positionForIndex(20))
    })

    test('consecutive', function () {
      assert.equal(4, vector.positionForIndex(3))
    })

    test('non-consecutive gap after', function () {
      assert.equal(6, vector.positionForIndex(5))
    })

    test('non-consecutive gap before', function () {
      assert.equal(6, vector.positionForIndex(6))
    })

    test('non-consecutive gave before and after', function () {
      assert.equal(8, vector.positionForIndex(9))
    })

    test('duplicate at the beginning', function () {
      assert.equal(0, vector.positionForIndex(1))
    })

    test('duplicate at the end', function () {
      assert.equal(8, vector.positionForIndex(11))
    })

    test('duplicate consecutive', function () {
      assert.equal(4, vector.positionForIndex(4))
    })
  })
})
