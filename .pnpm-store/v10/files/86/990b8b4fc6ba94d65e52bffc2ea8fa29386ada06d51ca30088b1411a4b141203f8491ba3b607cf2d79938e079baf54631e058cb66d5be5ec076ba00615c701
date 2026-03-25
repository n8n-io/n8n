suite('lunr.tokenizer', function () {
  var toString = function (o) { return o.toString() }

  test('splitting into tokens', function () {
    var tokens = lunr.tokenizer('foo bar baz')
      .map(toString)

    assert.sameMembers(['foo', 'bar', 'baz'], tokens)
  })

  test('downcases tokens', function () {
    var tokens = lunr.tokenizer('Foo BAR BAZ')
      .map(toString)

    assert.sameMembers(['foo', 'bar', 'baz'], tokens)
  })

  test('array of strings', function () {
    var tokens = lunr.tokenizer(['foo', 'bar', 'baz'])
      .map(toString)

    assert.sameMembers(['foo', 'bar', 'baz'], tokens)
  })

  test('undefined is converted to empty string', function () {
    var tokens = lunr.tokenizer(['foo', undefined, 'baz'])
      .map(toString)

    assert.sameMembers(['foo', '', 'baz'], tokens)
  })

  test('null is converted to empty string', function () {
    var tokens = lunr.tokenizer(['foo', null, 'baz'])
      .map(toString)

    assert.sameMembers(['foo', '', 'baz'], tokens)
  })

  test('multiple white space is stripped', function () {
    var tokens = lunr.tokenizer('   foo    bar   baz  ')
      .map(toString)

    assert.sameMembers(['foo', 'bar', 'baz'], tokens)
  })

  test('handling null-like arguments', function () {
    assert.lengthOf(lunr.tokenizer(), 0)
    assert.lengthOf(lunr.tokenizer(undefined), 0)
    assert.lengthOf(lunr.tokenizer(null), 0)
  })

  test('converting a date to tokens', function () {
    var date = new Date(Date.UTC(2013, 0, 1, 12))

    // NOTE: slicing here to prevent asserting on parts
    // of the date that might be affected by the timezone
    // the test is running in.
    assert.sameMembers(['tue', 'jan', '01', '2013'], lunr.tokenizer(date).slice(0, 4).map(toString))
  })

  test('converting a number to tokens', function () {
    assert.equal('41', lunr.tokenizer(41).map(toString))
  })

  test('converting a boolean to tokens', function () {
    assert.equal('false', lunr.tokenizer(false).map(toString))
  })

  test('converting an object to tokens', function () {
    var obj = {
      toString: function () { return 'custom object' }
    }

    assert.sameMembers(lunr.tokenizer(obj).map(toString), ['custom', 'object'])
  })

  test('splits strings with hyphens', function () {
    assert.sameMembers(lunr.tokenizer('foo-bar').map(toString), ['foo', 'bar'])
  })

  test('splits strings with hyphens and spaces', function () {
    assert.sameMembers(lunr.tokenizer('foo - bar').map(toString), ['foo', 'bar'])
  })

  test('tracking the token index', function () {
    var tokens = lunr.tokenizer('foo bar')
    assert.equal(tokens[0].metadata.index, 0)
    assert.equal(tokens[1].metadata.index, 1)
  })

  test('tracking the token position', function () {
    var tokens = lunr.tokenizer('foo bar')
    assert.deepEqual(tokens[0].metadata.position, [0, 3])
    assert.deepEqual(tokens[1].metadata.position, [4, 3])
  })

  test('tracking the token position with additional left-hand whitespace', function () {
    var tokens = lunr.tokenizer(' foo bar')
    assert.deepEqual(tokens[0].metadata.position, [1, 3])
    assert.deepEqual(tokens[1].metadata.position, [5, 3])
  })

  test('tracking the token position with additional right-hand whitespace', function () {
    var tokens = lunr.tokenizer('foo bar ')
    assert.deepEqual(tokens[0].metadata.position, [0, 3])
    assert.deepEqual(tokens[1].metadata.position, [4, 3])
  })

  test('providing additional metadata', function () {
    var tokens = lunr.tokenizer('foo bar', { 'hurp': 'durp' })
    assert.deepEqual(tokens[0].metadata.hurp, 'durp')
    assert.deepEqual(tokens[1].metadata.hurp, 'durp')
  })
})
