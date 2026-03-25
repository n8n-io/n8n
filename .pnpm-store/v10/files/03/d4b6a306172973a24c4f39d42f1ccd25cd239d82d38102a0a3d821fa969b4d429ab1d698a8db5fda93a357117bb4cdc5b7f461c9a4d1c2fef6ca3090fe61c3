suite('lunr.QueryLexer', function () {
  suite('#run', function () {

    var lex = function (str) {
      var lexer = new lunr.QueryLexer(str)
      lexer.run()
      return lexer
    }

    suite('single term', function () {
      setup(function () {
        this.lexer = lex('foo')
      })

      test('produces 1 lexeme', function () {
        assert.lengthOf(this.lexer.lexemes, 1)
      })

      suite('lexeme', function () {
        setup(function () {
          this.lexeme = this.lexer.lexemes[0]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.TERM, this.lexeme.type)
        })

        test('#str', function () {
          assert.equal('foo', this.lexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.lexeme.start)
        })

        test('#end', function () {
          assert.equal(3, this.lexeme.end)
        })
      })
    })

    // embedded hyphens should not be confused with
    // presence operators
    suite('single term with hyphen', function () {
      setup(function () {
        this.lexer = lex('foo-bar')
      })

      test('produces 2 lexeme', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })

      suite('lexeme', function () {
        setup(function () {
          this.fooLexeme = this.lexer.lexemes[0]
          this.barLexeme = this.lexer.lexemes[1]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.TERM, this.fooLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.barLexeme.type)
        })

        test('#str', function () {
          assert.equal('foo', this.fooLexeme.str)
          assert.equal('bar', this.barLexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.fooLexeme.start)
          assert.equal(4, this.barLexeme.start)
        })

        test('#end', function () {
          assert.equal(3, this.fooLexeme.end)
          assert.equal(7, this.barLexeme.end)
        })
      })
    })

    suite('term escape char', function () {
      setup(function () {
        this.lexer = lex("foo\\:bar")
      })

      test('produces 1 lexeme', function () {
        assert.lengthOf(this.lexer.lexemes, 1)
      })

      suite('lexeme', function () {
        setup(function () {
          this.lexeme = this.lexer.lexemes[0]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.TERM, this.lexeme.type)
        })

        test('#str', function () {
          assert.equal('foo:bar', this.lexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.lexeme.start)
        })

        test('#end', function () {
          assert.equal(8, this.lexeme.end)
        })
      })
    })

    suite('multiple terms', function () {
      setup(function () {
        this.lexer = lex('foo bar')
      })

      test('produces 2 lexems', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })

      suite('lexemes', function () {
        setup(function () {
          this.fooLexeme = this.lexer.lexemes[0]
          this.barLexeme = this.lexer.lexemes[1]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.TERM, this.fooLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.barLexeme.type)
        })

        test('#str', function () {
          assert.equal('foo', this.fooLexeme.str)
          assert.equal('bar', this.barLexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.fooLexeme.start)
          assert.equal(4, this.barLexeme.start)
        })

        test('#end', function () {
          assert.equal(3, this.fooLexeme.end)
          assert.equal(7, this.barLexeme.end)
        })
      })
    })

    suite('multiple terms with presence', function () {
      setup(function () {
        this.lexer = lex('+foo +bar')
      })

      test('produces 2 lexems', function () {
        assert.lengthOf(this.lexer.lexemes, 4)
      })

      suite('lexemes', function () {
        setup(function () {
          this.fooPresenceLexeme = this.lexer.lexemes[0]
          this.fooTermLexeme = this.lexer.lexemes[1]

          this.barPresenceLexeme = this.lexer.lexemes[2]
          this.barTermLexeme = this.lexer.lexemes[3]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.TERM, this.fooTermLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.barTermLexeme.type)

          assert.equal(lunr.QueryLexer.PRESENCE, this.fooPresenceLexeme.type)
          assert.equal(lunr.QueryLexer.PRESENCE, this.barPresenceLexeme.type)
        })

        test('#str', function () {
          assert.equal('foo', this.fooTermLexeme.str)
          assert.equal('bar', this.barTermLexeme.str)

          assert.equal('+', this.fooPresenceLexeme.str)
          assert.equal('+', this.barPresenceLexeme.str)
        })
      })
    })

    suite('multiple terms with presence and fuzz', function () {
      setup(function () {
        this.lexer = lex('+foo~1 +bar')
      })

      test('produces n lexemes', function () {
        assert.lengthOf(this.lexer.lexemes, 5)
      })

      suite('lexemes', function () {
        setup(function () {
          this.fooPresenceLexeme = this.lexer.lexemes[0]
          this.fooTermLexeme = this.lexer.lexemes[1]
          this.fooFuzzLexeme = this.lexer.lexemes[2]
          this.barPresenceLexeme = this.lexer.lexemes[3]
          this.barTermLexeme = this.lexer.lexemes[4]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.PRESENCE, this.fooPresenceLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.fooTermLexeme.type)
          assert.equal(lunr.QueryLexer.EDIT_DISTANCE, this.fooFuzzLexeme.type)
          assert.equal(lunr.QueryLexer.PRESENCE, this.barPresenceLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.barTermLexeme.type)
        })
      })
    })

    suite('separator length > 1', function () {
      setup(function () {
        this.lexer = lex('foo    bar')
      })

      test('produces 2 lexems', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })

      suite('lexemes', function () {
        setup(function () {
          this.fooLexeme = this.lexer.lexemes[0]
          this.barLexeme = this.lexer.lexemes[1]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.TERM, this.fooLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.barLexeme.type)
        })

        test('#str', function () {
          assert.equal('foo', this.fooLexeme.str)
          assert.equal('bar', this.barLexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.fooLexeme.start)
          assert.equal(7, this.barLexeme.start)
        })

        test('#end', function () {
          assert.equal(3, this.fooLexeme.end)
          assert.equal(10, this.barLexeme.end)
        })
      })
    })

    suite('hyphen (-) considered a seperator', function () {
      setup(function () {
        this.lexer = lex('foo-bar')
      })

      test('produces 1 lexeme', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })
    })

    suite('term with field', function () {
      setup(function () {
        this.lexer = lex('title:foo')
      })

      test('produces 2 lexems', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })

      suite('lexemes', function () {
        setup(function () {
          this.fieldLexeme = this.lexer.lexemes[0]
          this.termLexeme = this.lexer.lexemes[1]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.FIELD, this.fieldLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.termLexeme.type)
        })

        test('#str', function () {
          assert.equal('title', this.fieldLexeme.str)
          assert.equal('foo', this.termLexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.fieldLexeme.start)
          assert.equal(6, this.termLexeme.start)
        })

        test('#end', function () {
          assert.equal(5, this.fieldLexeme.end)
          assert.equal(9, this.termLexeme.end)
        })
      })
    })

    suite('term with field with escape char', function () {
      setup(function () {
        this.lexer = lex("ti\\:tle:foo")
      })

      test('produces 1 lexeme', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })

      suite('lexeme', function () {
        setup(function () {
          this.fieldLexeme = this.lexer.lexemes[0]
          this.termLexeme = this.lexer.lexemes[1]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.FIELD, this.fieldLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.termLexeme.type)
        })

        test('#str', function () {
          assert.equal('ti:tle', this.fieldLexeme.str)
          assert.equal('foo', this.termLexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.fieldLexeme.start)
          assert.equal(8, this.termLexeme.start)
        })

        test('#end', function () {
          assert.equal(7, this.fieldLexeme.end)
          assert.equal(11, this.termLexeme.end)
        })
      })
    })

    suite('term with presence required', function () {
      setup(function () {
        this.lexer = lex('+foo')
      })

      test('produces 2 lexemes', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })

      suite('lexemes', function () {
        setup(function () {
          this.presenceLexeme = this.lexer.lexemes[0]
          this.termLexeme = this.lexer.lexemes[1]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.PRESENCE, this.presenceLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.termLexeme.type)
        })

        test('#str', function () {
          assert.equal('+', this.presenceLexeme.str)
          assert.equal('foo', this.termLexeme.str)
        })

        test('#start', function () {
          assert.equal(1, this.termLexeme.start)
          assert.equal(0, this.presenceLexeme.start)
        })

        test('#end', function () {
          assert.equal(4, this.termLexeme.end)
          assert.equal(1, this.presenceLexeme.end)
        })
      })
    })

    suite('term with field with presence required', function () {
      setup(function () {
        this.lexer = lex('+title:foo')
      })

      test('produces 3 lexemes', function () {
        assert.lengthOf(this.lexer.lexemes, 3)
      })

      suite('lexemes', function () {
        setup(function () {
          this.presenceLexeme = this.lexer.lexemes[0]
          this.fieldLexeme = this.lexer.lexemes[1]
          this.termLexeme = this.lexer.lexemes[2]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.PRESENCE, this.presenceLexeme.type)
          assert.equal(lunr.QueryLexer.FIELD, this.fieldLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.termLexeme.type)
        })

        test('#str', function () {
          assert.equal('+', this.presenceLexeme.str)
          assert.equal('title', this.fieldLexeme.str)
          assert.equal('foo', this.termLexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.presenceLexeme.start)
          assert.equal(1, this.fieldLexeme.start)
          assert.equal(7, this.termLexeme.start)
        })

        test('#end', function () {
          assert.equal(1, this.presenceLexeme.end)
          assert.equal(6, this.fieldLexeme.end)
          assert.equal(10, this.termLexeme.end)
        })
      })
    })

    suite('term with presence prohibited', function () {
      setup(function () {
        this.lexer = lex('-foo')
      })

      test('produces 2 lexemes', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })

      suite('lexemes', function () {
        setup(function () {
          this.presenceLexeme = this.lexer.lexemes[0]
          this.termLexeme = this.lexer.lexemes[1]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.PRESENCE, this.presenceLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.termLexeme.type)
        })

        test('#str', function () {
          assert.equal('-', this.presenceLexeme.str)
          assert.equal('foo', this.termLexeme.str)
        })

        test('#start', function () {
          assert.equal(1, this.termLexeme.start)
          assert.equal(0, this.presenceLexeme.start)
        })

        test('#end', function () {
          assert.equal(4, this.termLexeme.end)
          assert.equal(1, this.presenceLexeme.end)
        })
      })
    })

    suite('term with edit distance', function () {
      setup(function () {
        this.lexer = lex('foo~2')
      })

      test('produces 2 lexems', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })

      suite('lexemes', function () {
        setup(function () {
          this.termLexeme = this.lexer.lexemes[0]
          this.editDistanceLexeme = this.lexer.lexemes[1]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.TERM, this.termLexeme.type)
          assert.equal(lunr.QueryLexer.EDIT_DISTANCE, this.editDistanceLexeme.type)
        })

        test('#str', function () {
          assert.equal('foo', this.termLexeme.str)
          assert.equal('2', this.editDistanceLexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.termLexeme.start)
          assert.equal(4, this.editDistanceLexeme.start)
        })

        test('#end', function () {
          assert.equal(3, this.termLexeme.end)
          assert.equal(5, this.editDistanceLexeme.end)
        })
      })
    })

    suite('term with boost', function () {
      setup(function () {
        this.lexer = lex('foo^10')
      })

      test('produces 2 lexems', function () {
        assert.lengthOf(this.lexer.lexemes, 2)
      })

      suite('lexemes', function () {
        setup(function () {
          this.termLexeme = this.lexer.lexemes[0]
          this.boostLexeme = this.lexer.lexemes[1]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.TERM, this.termLexeme.type)
          assert.equal(lunr.QueryLexer.BOOST, this.boostLexeme.type)
        })

        test('#str', function () {
          assert.equal('foo', this.termLexeme.str)
          assert.equal('10', this.boostLexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.termLexeme.start)
          assert.equal(4, this.boostLexeme.start)
        })

        test('#end', function () {
          assert.equal(3, this.termLexeme.end)
          assert.equal(6, this.boostLexeme.end)
        })
      })
    })

    suite('term with field, boost and edit distance', function () {
      setup(function () {
        this.lexer = lex('title:foo^10~5')
      })

      test('produces 4 lexems', function () {
        assert.lengthOf(this.lexer.lexemes, 4)
      })

      suite('lexemes', function () {
        setup(function () {
          this.fieldLexeme = this.lexer.lexemes[0]
          this.termLexeme = this.lexer.lexemes[1]
          this.boostLexeme = this.lexer.lexemes[2]
          this.editDistanceLexeme = this.lexer.lexemes[3]
        })

        test('#type', function () {
          assert.equal(lunr.QueryLexer.FIELD, this.fieldLexeme.type)
          assert.equal(lunr.QueryLexer.TERM, this.termLexeme.type)
          assert.equal(lunr.QueryLexer.BOOST, this.boostLexeme.type)
          assert.equal(lunr.QueryLexer.EDIT_DISTANCE, this.editDistanceLexeme.type)
        })

        test('#str', function () {
          assert.equal('title', this.fieldLexeme.str)
          assert.equal('foo', this.termLexeme.str)
          assert.equal('10', this.boostLexeme.str)
          assert.equal('5', this.editDistanceLexeme.str)
        })

        test('#start', function () {
          assert.equal(0, this.fieldLexeme.start)
          assert.equal(6, this.termLexeme.start)
          assert.equal(10, this.boostLexeme.start)
          assert.equal(13, this.editDistanceLexeme.start)
        })

        test('#end', function () {
          assert.equal(5, this.fieldLexeme.end)
          assert.equal(9, this.termLexeme.end)
          assert.equal(12, this.boostLexeme.end)
          assert.equal(14, this.editDistanceLexeme.end)
        })
      })
    })

  })
})
