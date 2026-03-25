suite('lunr.QueryParser', function () {
  var parse = function (q) {
    var query = new lunr.Query (['title', 'body']),
        parser = new lunr.QueryParser(q, query)

    parser.parse()

    return query.clauses
  }

  suite('#parse', function () {
    suite('single term', function () {
      setup(function () {
        this.clauses = parse('foo')
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      suite('clauses', function () {
        setup(function () {
          this.clause = this.clauses[0]
        })

        test('term', function () {
          assert.equal('foo', this.clause.term)
        })

        test('fields', function () {
          assert.sameMembers(['title', 'body'], this.clause.fields)
        })

        test('presence', function () {
          assert.equal(lunr.Query.presence.OPTIONAL, this.clause.presence)
        })

        test('usePipeline', function () {
          assert.ok(this.clause.usePipeline)
        })
      })
    })

    suite('single term, uppercase', function () {
      setup(function () {
        this.clauses = parse('FOO')
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      suite('clauses', function () {
        setup(function () {
          this.clause = this.clauses[0]
        })

        test('term', function () {
          assert.equal('foo', this.clause.term)
        })

        test('fields', function () {
          assert.sameMembers(['title', 'body'], this.clause.fields)
        })

        test('usePipeline', function () {
          assert.ok(this.clause.usePipeline)
        })
      })
    })

    suite('single term with wildcard', function () {
      setup(function () {
        this.clauses = parse('fo*')
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      suite('clauses', function () {
        setup(function () {
          this.clause = this.clauses[0]
        })

        test('#term', function () {
          assert.equal('fo*', this.clause.term)
        })

        test('#usePipeline', function () {
          assert.ok(!this.clause.usePipeline)
        })
      })
    })

    suite('multiple terms', function () {
      setup(function () {
        this.clauses = parse('foo bar')
      })

      test('has 2 clause', function () {
        assert.lengthOf(this.clauses, 2)
      })

      suite('clauses', function () {
        test('#term', function () {
          assert.equal('foo', this.clauses[0].term)
          assert.equal('bar', this.clauses[1].term)
        })
      })
    })

    suite('multiple terms with presence', function () {
      setup(function () {
        this.clauses = parse('+foo +bar')
      })

      test('has 2 clause', function () {
        assert.lengthOf(this.clauses, 2)
      })
    })

    suite('edit distance followed by presence', function () {
      setup(function () {
        this.clauses = parse('foo~10 +bar')
      })

      test('has 2 clause', function () {
        assert.lengthOf(this.clauses, 2)
      })

      suite('clauses', function () {
        setup(function () {
          this.fooClause = this.clauses[0]
          this.barClause = this.clauses[1]
        })

        test('#term', function () {
          assert.equal('foo', this.fooClause.term)
          assert.equal('bar', this.barClause.term)
        })

        test('#presence', function () {
          assert.equal(lunr.Query.presence.OPTIONAL, this.fooClause.presence)
          assert.equal(lunr.Query.presence.REQUIRED, this.barClause.presence)
        })

        test('#editDistance', function () {
          assert.equal(10, this.fooClause.editDistance)
          // It feels dirty asserting that something is undefined
          // but there is no Optional so this is what we are reduced to
          assert.isUndefined(this.barClause.editDistance)
        })
      })
    })

    suite('boost followed by presence', function () {
      setup(function () {
        this.clauses = parse('foo^10 +bar')
      })

      test('has 2 clause', function () {
        assert.lengthOf(this.clauses, 2)
      })

      suite('clauses', function () {
        setup(function () {
          this.fooClause = this.clauses[0]
          this.barClause = this.clauses[1]
        })

        test('#term', function () {
          assert.equal('foo', this.fooClause.term)
          assert.equal('bar', this.barClause.term)
        })

        test('#presence', function () {
          assert.equal(lunr.Query.presence.OPTIONAL, this.fooClause.presence)
          assert.equal(lunr.Query.presence.REQUIRED, this.barClause.presence)
        })

        test('#boost', function () {
          assert.equal(10, this.fooClause.boost)
          assert.equal(1, this.barClause.boost)
        })
      })
    })

    suite('field without a term', function () {
      test('fails with lunr.QueryParseError', function () {
        assert.throws(function () { parse('title:') }, lunr.QueryParseError)
      })
    })

    suite('unknown field', function () {
      test('fails with lunr.QueryParseError', function () {
        assert.throws(function () { parse('unknown:foo') }, lunr.QueryParseError)
      })
    })

    suite('term with field', function () {
      setup(function () {
        this.clauses = parse('title:foo')
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('clause contains only scoped field', function () {
        assert.sameMembers(this.clauses[0].fields, ['title'])
      })
    })

    suite('uppercase field with uppercase term', function () {
      setup(function () {
        // Using a different query to the rest of the tests
        // so that only this test has to worry about an upcase field name
        var query = new lunr.Query (['TITLE']),
            parser = new lunr.QueryParser("TITLE:FOO", query)

        parser.parse()

        this.clauses = query.clauses
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('clause contains downcased term', function () {
        assert.equal(this.clauses[0].term, 'foo')
      })

      test('clause contains only scoped field', function () {
        assert.sameMembers(this.clauses[0].fields, ['TITLE'])
      })
    })

    suite('multiple terms scoped to different fields', function () {
      setup(function () {
        this.clauses = parse('title:foo body:bar')
      })

      test('has 2 clauses', function () {
        assert.lengthOf(this.clauses, 2)
      })

      test('fields', function () {
        assert.sameMembers(['title'], this.clauses[0].fields)
        assert.sameMembers(['body'], this.clauses[1].fields)
      })

      test('terms', function () {
        assert.equal('foo', this.clauses[0].term)
        assert.equal('bar', this.clauses[1].term)
      })
    })

    suite('single term with edit distance', function () {
      setup(function () {
        this.clauses = parse('foo~2')
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
      })

      test('editDistance', function () {
        assert.equal(2, this.clauses[0].editDistance)
      })

      test('fields', function () {
        assert.sameMembers(['title', 'body'], this.clauses[0].fields)
      })
    })

    suite('multiple terms with edit distance', function () {
      setup(function () {
        this.clauses = parse('foo~2 bar~3')
      })

      test('has 2 clauses', function () {
        assert.lengthOf(this.clauses, 2)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
        assert.equal('bar', this.clauses[1].term)
      })

      test('editDistance', function () {
        assert.equal(2, this.clauses[0].editDistance)
        assert.equal(3, this.clauses[1].editDistance)
      })

      test('fields', function () {
        assert.sameMembers(['title', 'body'], this.clauses[0].fields)
        assert.sameMembers(['title', 'body'], this.clauses[1].fields)
      })
    })

    suite('single term scoped to field with edit distance', function () {
      setup(function () {
        this.clauses = parse('title:foo~2')
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
      })

      test('editDistance', function () {
        assert.equal(2, this.clauses[0].editDistance)
      })

      test('fields', function () {
        assert.sameMembers(['title'], this.clauses[0].fields)
      })
    })

    suite('non-numeric edit distance', function () {
      test('throws lunr.QueryParseError', function () {
        assert.throws(function () { parse('foo~a') }, lunr.QueryParseError)
      })
    })

    suite('edit distance without a term', function () {
      test('throws lunr.QueryParseError', function () {
        assert.throws(function () { parse('~2') }, lunr.QueryParseError)
      })
    })

    suite('single term with boost', function () {
      setup(function () {
        this.clauses = parse('foo^2')
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
      })

      test('boost', function () {
        assert.equal(2, this.clauses[0].boost)
      })

      test('fields', function () {
        assert.sameMembers(['title', 'body'], this.clauses[0].fields)
      })
    })

    suite('non-numeric boost', function () {
      test('throws lunr.QueryParseError', function () {
        assert.throws(function () { parse('foo^a') }, lunr.QueryParseError)
      })
    })

    suite('boost without a term', function () {
      test('throws lunr.QueryParseError', function () {
        assert.throws(function () { parse('^2') }, lunr.QueryParseError)
      })
    })

    suite('multiple terms with boost', function () {
      setup(function () {
        this.clauses = parse('foo^2 bar^3')
      })

      test('has 2 clauses', function () {
        assert.lengthOf(this.clauses, 2)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
        assert.equal('bar', this.clauses[1].term)
      })

      test('boost', function () {
        assert.equal(2, this.clauses[0].boost)
        assert.equal(3, this.clauses[1].boost)
      })

      test('fields', function () {
        assert.sameMembers(['title', 'body'], this.clauses[0].fields)
        assert.sameMembers(['title', 'body'], this.clauses[1].fields)
      })
    })

    suite('term scoped by field with boost', function () {
      setup(function () {
        this.clauses = parse('title:foo^2')
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
      })

      test('boost', function () {
        assert.equal(2, this.clauses[0].boost)
      })

      test('fields', function () {
        assert.sameMembers(['title'], this.clauses[0].fields)
      })
    })

    suite('term with presence required', function () {
      setup(function () {
        this.clauses = parse('+foo')
      })

      test('has 1 clauses', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
      })

      test('boost', function () {
        assert.equal(1, this.clauses[0].boost)
      })

      test('fields', function () {
        assert.sameMembers(['title', 'body'], this.clauses[0].fields)
      })

      test('presence', function () {
        assert.equal(lunr.Query.presence.REQUIRED, this.clauses[0].presence)
      })
    })

    suite('term with presence prohibited', function () {
      setup(function () {
        this.clauses = parse('-foo')
      })

      test('has 1 clauses', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
      })

      test('boost', function () {
        assert.equal(1, this.clauses[0].boost)
      })

      test('fields', function () {
        assert.sameMembers(['title', 'body'], this.clauses[0].fields)
      })

      test('presence', function () {
        assert.equal(lunr.Query.presence.PROHIBITED, this.clauses[0].presence)
      })
    })

    suite('term scoped by field with presence required', function () {
      setup(function () {
        this.clauses = parse('+title:foo')
      })

      test('has 1 clauses', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
      })

      test('boost', function () {
        assert.equal(1, this.clauses[0].boost)
      })

      test('fields', function () {
        assert.sameMembers(['title'], this.clauses[0].fields)
      })

      test('presence', function () {
        assert.equal(lunr.Query.presence.REQUIRED, this.clauses[0].presence)
      })
    })

    suite('term scoped by field with presence prohibited', function () {
      setup(function () {
        this.clauses = parse('-title:foo')
      })

      test('has 1 clauses', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
      })

      test('boost', function () {
        assert.equal(1, this.clauses[0].boost)
      })

      test('fields', function () {
        assert.sameMembers(['title'], this.clauses[0].fields)
      })

      test('presence', function () {
        assert.equal(lunr.Query.presence.PROHIBITED, this.clauses[0].presence)
      })
    })
  })

  suite('term with boost and edit distance', function () {
      setup(function () {
        this.clauses = parse('foo^2~3')
      })

      test('has 1 clause', function () {
        assert.lengthOf(this.clauses, 1)
      })

      test('term', function () {
        assert.equal('foo', this.clauses[0].term)
      })

      test('editDistance', function () {
        assert.equal(3, this.clauses[0].editDistance)
      })

      test('boost', function () {
        assert.equal(2, this.clauses[0].boost)
      })

      test('fields', function () {
        assert.sameMembers(['title', 'body'], this.clauses[0].fields)
      })
  })
})
