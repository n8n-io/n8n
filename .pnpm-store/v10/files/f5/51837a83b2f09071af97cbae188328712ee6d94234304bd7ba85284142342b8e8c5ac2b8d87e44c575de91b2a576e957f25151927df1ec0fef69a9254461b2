suite('lunr.Pipeline', function () {
  var noop = function () {}

  setup(function () {
    this.existingRegisteredFunctions = lunr.Pipeline.registeredFunctions
    this.existingWarnIfFunctionNotRegistered = lunr.Pipeline.warnIfFunctionNotRegistered

    lunr.Pipeline.registeredFunctions = {}
    lunr.Pipeline.warnIfFunctionNotRegistered = noop

    this.pipeline = new lunr.Pipeline
  })

  teardown(function () {
    lunr.Pipeline.registeredFunctions = this.existingRegisteredFunctions
    lunr.Pipeline.warnIfFunctionNotRegistered = this.existingWarnIfFunctionNotRegistered
  })

  suite('#add', function () {
    test('add function to pipeline', function () {
      this.pipeline.add(noop)
      assert.equal(1, this.pipeline._stack.length)
    })

    test('add multiple functions to the pipeline', function () {
      this.pipeline.add(noop, noop)
      assert.equal(2, this.pipeline._stack.length)
    })
  })

  suite('#remove', function () {
    test('function exists in pipeline', function () {
      this.pipeline.add(noop)
      assert.equal(1, this.pipeline._stack.length)
      this.pipeline.remove(noop)
      assert.equal(0, this.pipeline._stack.length)
    })

    test('function does not exist in pipeline', function () {
      var fn = function () {}
      this.pipeline.add(noop)
      assert.equal(1, this.pipeline._stack.length)
      this.pipeline.remove(fn)
      assert.equal(1, this.pipeline._stack.length)
    })
  })

  suite('#before', function () {
    var fn = function () {}

    test('other function exists', function () {
      this.pipeline.add(noop)
      this.pipeline.before(noop, fn)

      assert.deepEqual([fn, noop], this.pipeline._stack)
    })

    test('other function does not exist', function () {
      var action = function () {
        this.pipeline.before(noop, fn)
      }

      assert.throws(action.bind(this))
      assert.equal(0, this.pipeline._stack.length)
    })
  })

  suite('#after', function () {
    var fn = function () {}

    test('other function exists', function () {
      this.pipeline.add(noop)
      this.pipeline.after(noop, fn)

      assert.deepEqual([noop, fn], this.pipeline._stack)
    })

    test('other function does not exist', function () {
      var action = function () {
        this.pipeline.after(noop, fn)
      }

      assert.throws(action.bind(this))
      assert.equal(0, this.pipeline._stack.length)
    })
  })

  suite('#run', function () {
    test('calling each function for each token', function () {
      var count1 = 0, count2 = 0,
          fn1 = function (t) { count1++; return t },
          fn2 = function (t) { count2++; return t }

      this.pipeline.add(fn1, fn2)
      this.pipeline.run([1,2,3])

      assert.equal(3, count1)
      assert.equal(3, count2)
    })

    test('passes token to pipeline function', function () {
      this.pipeline.add(function (token) {
        assert.equal('foo', token)
      })

      this.pipeline.run(['foo'])
    })

    test('passes index to pipeline function', function () {
      this.pipeline.add(function (_, index) {
        assert.equal(0, index)
      })

      this.pipeline.run(['foo'])
    })

    test('passes entire token array to pipeline function', function () {
      this.pipeline.add(function (_, _, tokens) {
        assert.deepEqual(['foo'], tokens)
      })

      this.pipeline.run(['foo'])
    })

    test('passes output of one function as input to the next', function () {
      this.pipeline.add(function (t) {
        return t.toUpperCase()
      })

      this.pipeline.add(function (t) {
        assert.equal('FOO', t)
      })

      this.pipeline.run(['foo'])
    })

    test('returns the results of the last function', function () {
      this.pipeline.add(function (t) {
        return t.toUpperCase()
      })

      assert.deepEqual(['FOO'], this.pipeline.run(['foo']))
    })

    test('filters out null, undefined and empty string values', function () {
      var tokens = [],
          output

      // only pass on tokens for even token indexes
      // return null for 'foo'
      // return undefined for 'bar'
      // return '' for 'baz'
      this.pipeline.add(function (t, i) {
        if (i == 4) {
          return null
        } else if (i == 5) {
          return ''
        } if (i % 2) {
          return t
        } else {
          return undefined
        }
      })

      this.pipeline.add(function (t) {
        tokens.push(t)
        return t
      })

      output = this.pipeline.run(['a', 'b', 'c', 'd', 'foo', 'bar', 'baz'])

      assert.sameMembers(['b', 'd'], tokens)
      assert.sameMembers(['b', 'd'], output)
    })

    suite('expanding tokens', function () {
      test('passed to output', function () {
        this.pipeline.add(function (t) {
          return [t, t.toUpperCase()]
        })

        assert.sameMembers(["foo", "FOO"], this.pipeline.run(['foo']))
      })

      test('not passed to same function', function () {
        var received = []

        this.pipeline.add(function (t) {
          received.push(t)
          return [t, t.toUpperCase()]
        })

        this.pipeline.run(['foo'])

        assert.sameMembers(['foo'], received)
      })

      test('passed to the next pipeline function', function () {
        var received = []

        this.pipeline.add(function (t) {
          return [t, t.toUpperCase()]
        })

        this.pipeline.add(function (t) {
          received.push(t)
        })

        this.pipeline.run(['foo'])

        assert.sameMembers(['foo', 'FOO'], received)
      })
    })
  })

  suite('#toJSON', function () {
    test('returns an array of registered function labels', function () {
      var fn = function () {}

      lunr.Pipeline.registerFunction(fn, 'fn')

      this.pipeline.add(fn)

      assert.sameMembers(['fn'], this.pipeline.toJSON())
    })
  })

  suite('.registerFunction', function () {
    setup(function () {
      this.fn = function () {}
    })

    test('adds a label property to the function', function () {
      lunr.Pipeline.registerFunction(this.fn, 'fn')

      assert.equal('fn', this.fn.label)
    })

    test('adds function to the list of registered functions', function () {
      lunr.Pipeline.registerFunction(this.fn, 'fn')

      assert.equal(this.fn, lunr.Pipeline.registeredFunctions['fn'])
    })
  })

  suite('.load', function () {
    test('with registered functions', function () {
      var fn = function () {},
          serializedPipeline = ['fn'],
          pipeline

      lunr.Pipeline.registerFunction(fn, 'fn')

      pipeline = lunr.Pipeline.load(serializedPipeline)

      assert.equal(1, pipeline._stack.length)
      assert.equal(fn, pipeline._stack[0])
    })

    test('with unregisterd functions', function () {
      var serializedPipeline = ['fn']

      assert.throws(function () {
        lunr.Pipeline.load(serializedPipeline)
      })
    })
  })

  suite('#reset', function () {
    test('empties the stack', function () {
      this.pipeline.add(function () {})

      assert.equal(1, this.pipeline._stack.length)

      this.pipeline.reset()

      assert.equal(0, this.pipeline._stack.length)
    })
  })
})
