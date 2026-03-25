suite('lunr.Builder', function () {
  suite('#add', function () {
    setup(function () {
      this.builder = new lunr.Builder
    })

    test('field contains terms that clash with object prototype', function () {
      this.builder.field('title')
      this.builder.add({ id: 'id', title: 'constructor'})

      assert.deepProperty(this.builder.invertedIndex, 'constructor.title.id')
      assert.deepEqual(this.builder.invertedIndex.constructor.title.id, {})

      assert.equal(this.builder.fieldTermFrequencies['title/id'].constructor, 1)
    })

    test('field name clashes with object prototype', function () {
      this.builder.field('constructor')
      this.builder.add({ id: 'id', constructor: 'constructor'})

      assert.deepProperty(this.builder.invertedIndex, 'constructor.constructor.id')
      assert.deepEqual(this.builder.invertedIndex.constructor.constructor.id, {})
    })

    test('document ref clashes with object prototype', function () {
      this.builder.field('title')
      this.builder.add({ id: 'constructor', title: 'word'})

      assert.deepProperty(this.builder.invertedIndex, 'word.title.constructor')
      assert.deepEqual(this.builder.invertedIndex.word.title.constructor, {})
    })

    test('token metadata clashes with object prototype', function () {
      var pipelineFunction = function (t) {
        t.metadata['constructor'] = 'foo'
        return t
      }

      lunr.Pipeline.registerFunction(pipelineFunction, 'test')
      this.builder.pipeline.add(pipelineFunction)

      // the registeredFunctions object is global, this is to prevent
      // polluting any other tests.
      delete lunr.Pipeline.registeredFunctions.test

      this.builder.metadataWhitelist.push('constructor')

      this.builder.field('title')
      this.builder.add({ id: 'id', title: 'word'})
      assert.deepProperty(this.builder.invertedIndex, 'word.title.id.constructor')
      assert.deepEqual(this.builder.invertedIndex.word.title.id.constructor, ['foo'])
    })

    test('extracting nested properties from a document', function () {
      var extractor = function (d) { return d.person.name }

      this.builder.field('name', {
        extractor: extractor
      })

      this.builder.add({
        id: 'id',
        person: {
          name: 'bob'
        }
      })

      assert.deepProperty(this.builder.invertedIndex, 'bob.name.id')
    })
  })

  suite('#field', function () {
    test('defining fields to index', function () {
      var builder = new lunr.Builder
      builder.field('foo')
      assert.property(builder._fields, 'foo')
    })

    test('field with illegal characters', function () {
      var builder = new lunr.Builder
      assert.throws(function () {
        builder.field('foo/bar')
      })
    })
  })

  suite('#ref', function () {
    test('default reference', function () {
      var builder = new lunr.Builder
      assert.equal('id', builder._ref)
    })

    test('defining a reference field', function () {
      var builder = new lunr.Builder
      builder.ref('foo')
      assert.equal('foo', builder._ref)
    })
  })

  suite('#b', function () {
    test('default value', function () {
      var builder = new lunr.Builder
      assert.equal(0.75, builder._b)
    })

    test('values less than zero', function () {
      var builder = new lunr.Builder
      builder.b(-1)
      assert.equal(0, builder._b)
    })

    test('values higher than one', function () {
      var builder = new lunr.Builder
      builder.b(1.5)
      assert.equal(1, builder._b)
    })

    test('value within range', function () {
      var builder = new lunr.Builder
      builder.b(0.5)
      assert.equal(0.5, builder._b)
    })
  })

  suite('#k1', function () {
    test('default value', function () {
      var builder = new lunr.Builder
      assert.equal(1.2, builder._k1)
    })

    test('values less than zero', function () {
      var builder = new lunr.Builder
      builder.k1(1.6)
      assert.equal(1.6, builder._k1)
    })
  })

  suite('#use', function () {
    setup(function () {
      this.builder = new lunr.Builder
    })

    test('calls plugin function', function () {
      var wasCalled = false,
          plugin = function () { wasCalled = true }

      this.builder.use(plugin)
      assert.isTrue(wasCalled)
    })

    test('sets context to the builder instance', function () {
      var context = null,
          plugin = function () { context = this }

      this.builder.use(plugin)
      assert.equal(context, this.builder)
    })

    test('passes builder as first argument', function () {
      var arg = null,
          plugin = function (a) { arg = a }

      this.builder.use(plugin)
      assert.equal(arg, this.builder)
    })

    test('forwards arguments to the plugin', function () {
      var args = null,
          plugin = function () { args = [].slice.call(arguments) }

      this.builder.use(plugin, 1, 2, 3)
      assert.deepEqual(args, [this.builder, 1, 2, 3])
    })
  })

  suite('#build', function () {
    setup(function () {
      var builder = new lunr.Builder,
          doc = { id: 'id', title: 'test', body: 'missing' }

      builder.ref('id')
      builder.field('title')
      builder.add(doc)
      builder.build()

      this.builder = builder
    })

    test('adds tokens to invertedIndex', function () {
      assert.deepProperty(this.builder.invertedIndex, 'test.title.id')
    })

    test('builds a vector space of the document fields', function () {
      assert.property(this.builder.fieldVectors, 'title/id')
      assert.instanceOf(this.builder.fieldVectors['title/id'], lunr.Vector)
    })

    test('skips fields not defined for indexing', function () {
      assert.notProperty(this.builder.invertedIndex, 'missing')
    })

    test('builds a token set for the corpus', function () {
      var needle = lunr.TokenSet.fromString('test')
      assert.include(this.builder.tokenSet.intersect(needle).toArray(), 'test')
    })

    test('calculates document count', function () {
      assert.equal(1, this.builder.documentCount)
    })

    test('calculates average field length', function () {
      assert.equal(1, this.builder.averageFieldLength['title'])
    })

    test('index returned', function () {
      var builder = new lunr.Builder,
          doc = { id: 'id', title: 'test', body: 'missing' }

      builder.ref('id')
      builder.field('title')
      builder.add(doc)
      assert.instanceOf(builder.build(), lunr.Index)
    })
  })
})
