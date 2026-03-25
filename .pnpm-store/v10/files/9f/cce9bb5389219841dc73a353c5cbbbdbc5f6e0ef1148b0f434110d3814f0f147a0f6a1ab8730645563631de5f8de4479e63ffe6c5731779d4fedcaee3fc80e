suite('lunr.Token', function () {
  suite('#toString', function () {
    test('converts the token to a string', function () {
      var token = new lunr.Token('foo')
      assert.equal('foo', token.toString())
    })
  })

  suite('#metadata', function () {
    test('can attach arbitrary metadata', function () {
      var token = new lunr.Token('foo', { length: 3 })
      assert.equal(3, token.metadata.length)
    })
  })

  suite('#update', function () {
    test('can update the token value', function () {
      var token = new lunr.Token('foo')

      token.update(function (s) {
        return s.toUpperCase()
      })

      assert.equal('FOO', token.toString())
    })

    test('metadata is yielded when updating', function () {
      var metadata = { bar: true },
          token = new lunr.Token('foo', metadata),
          yieldedMetadata

      token.update(function (_, md) {
        yieldedMetadata = md
      })

      assert.equal(metadata, yieldedMetadata)
    })
  })

  suite('#clone', function () {
    var token = new lunr.Token('foo', { bar: true })

    test('clones value', function () {
      assert.equal(token.toString(), token.clone().toString())
    })

    test('clones metadata', function () {
      assert.equal(token.metadata, token.clone().metadata)
    })

    test('clone and modify', function () {
      var clone = token.clone(function (s) {
        return s.toUpperCase()
      })

      assert.equal('FOO', clone.toString())
      assert.equal(token.metadata, clone.metadata)
    })
  })
})
