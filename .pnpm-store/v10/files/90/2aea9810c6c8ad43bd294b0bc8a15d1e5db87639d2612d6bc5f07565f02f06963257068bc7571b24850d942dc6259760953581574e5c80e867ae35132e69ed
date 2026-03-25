suite('lunr.Query', function () {
  var allFields = ['title', 'body']

  suite('#term', function () {
    setup(function () {
      this.query = new lunr.Query (allFields)
    })

    suite('single string term', function () {
      setup(function () {
        this.query.term('foo')
      })

      test('adds a single clause', function () {
        assert.equal(this.query.clauses.length, 1)
      })

      test('clause has the correct term', function () {
        assert.equal(this.query.clauses[0].term, 'foo')
      })
    })

    suite('single token term', function () {
      setup(function () {
        this.query.term(new lunr.Token('foo'))
      })

      test('adds a single clause', function () {
        assert.equal(this.query.clauses.length, 1)
      })

      test('clause has the correct term', function () {
        assert.equal(this.query.clauses[0].term, 'foo')
      })
    })

    suite('multiple string terms', function () {
      setup(function () {
        this.query.term(['foo', 'bar'])
      })

      test('adds a single clause', function () {
        assert.equal(this.query.clauses.length, 2)
      })

      test('clause has the correct term', function () {
        var terms = this.query.clauses.map(function (c) { return c.term })
        assert.sameMembers(terms, ['foo', 'bar'])
      })
    })

    suite('multiple string terms with options', function () {
      setup(function () {
        this.query.term(['foo', 'bar'], { usePipeline: false })
      })

      test('clause has the correct term', function () {
        var terms = this.query.clauses.map(function (c) { return c.term })
        assert.sameMembers(terms, ['foo', 'bar'])
      })
    })

    suite('multiple token terms', function () {
      setup(function () {
        this.query.term(lunr.tokenizer('foo bar'))
      })

      test('adds a single clause', function () {
        assert.equal(this.query.clauses.length, 2)
      })

      test('clause has the correct term', function () {
        var terms = this.query.clauses.map(function (c) { return c.term })
        assert.sameMembers(terms, ['foo', 'bar'])
      })
    })
  })

  suite('#clause', function () {
    setup(function () {
      this.query = new lunr.Query (allFields)
    })

    suite('defaults', function () {
      setup(function () {
        this.query.clause({term: 'foo'})
        this.clause = this.query.clauses[0]
      })

      test('fields', function () {
        assert.sameMembers(this.clause.fields, allFields)
      })

      test('boost', function () {
        assert.equal(this.clause.boost, 1)
      })

      test('usePipeline', function () {
        assert.isTrue(this.clause.usePipeline)
      })
    })

    suite('specified', function () {
      setup(function () {
        this.query.clause({
          term: 'foo',
          boost: 10,
          fields: ['title'],
          usePipeline: false
        })

        this.clause = this.query.clauses[0]
      })

      test('fields', function () {
        assert.sameMembers(this.clause.fields, ['title'])
      })

      test('boost', function () {
        assert.equal(this.clause.boost, 10)
      })

      test('usePipeline', function () {
        assert.isFalse(this.clause.usePipeline)
      })
    })

    suite('wildcards', function () {
      suite('none', function () {
        setup(function () {
          this.query.clause({
            term: 'foo',
            wildcard: lunr.Query.wildcard.NONE
          })

          this.clause = this.query.clauses[0]
        })

        test('no wildcard', function () {
          assert.equal(this.clause.term, 'foo')
        })
      })

      suite('leading', function () {
        setup(function () {
          this.query.clause({
            term: 'foo',
            wildcard: lunr.Query.wildcard.LEADING
          })

          this.clause = this.query.clauses[0]
        })

        test('adds wildcard', function () {
          assert.equal(this.clause.term, '*foo')
        })
      })

      suite('trailing', function () {
        setup(function () {
          this.query.clause({
            term: 'foo',
            wildcard: lunr.Query.wildcard.TRAILING
          })

          this.clause = this.query.clauses[0]
        })

        test('adds wildcard', function () {
          assert.equal(this.clause.term, 'foo*')
        })
      })

      suite('leading and trailing', function () {
        setup(function () {
          this.query.clause({
            term: 'foo',
            wildcard: lunr.Query.wildcard.TRAILING | lunr.Query.wildcard.LEADING
          })

          this.clause = this.query.clauses[0]
        })

        test('adds wildcards', function () {
          assert.equal(this.clause.term, '*foo*')
        })
      })

      suite('existing', function () {
        setup(function () {
          this.query.clause({
            term: '*foo*',
            wildcard: lunr.Query.wildcard.TRAILING | lunr.Query.wildcard.LEADING
          })

          this.clause = this.query.clauses[0]
        })

        test('no additional wildcards', function () {
          assert.equal(this.clause.term, '*foo*')
        })
      })
    })
  })

  suite('#isNegated', function () {
    setup(function () {
      this.query = new lunr.Query (allFields)
    })

    suite('all prohibited', function () {
      setup(function () {
        this.query.term('foo', { presence: lunr.Query.presence.PROHIBITED })
        this.query.term('bar', { presence: lunr.Query.presence.PROHIBITED })
      })

      test('is negated', function () {
        assert.isTrue(this.query.isNegated())
      })
    })

    suite('some prohibited', function () {
      setup(function () {
        this.query.term('foo', { presence: lunr.Query.presence.PROHIBITED })
        this.query.term('bar', { presence: lunr.Query.presence.REQUIRED })
      })

      test('is negated', function () {
        assert.isFalse(this.query.isNegated())
      })
    })

    suite('none prohibited', function () {
      setup(function () {
        this.query.term('foo', { presence: lunr.Query.presence.OPTIONAL })
        this.query.term('bar', { presence: lunr.Query.presence.REQUIRED })
      })

      test('is negated', function () {
        assert.isFalse(this.query.isNegated())
      })
    })
  })
})
