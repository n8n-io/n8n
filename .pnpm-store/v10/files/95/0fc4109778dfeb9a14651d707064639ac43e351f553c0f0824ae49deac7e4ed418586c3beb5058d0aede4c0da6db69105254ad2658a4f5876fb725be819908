suite('lunr.Set', function () {
  suite('#contains', function () {
    suite('complete set', function () {
      test('returns true', function () {
        assert.isOk(lunr.Set.complete.contains('foo'))
      })
    })

    suite('empty set', function () {
      test('returns false', function () {
        assert.isNotOk(lunr.Set.empty.contains('foo'))
      })
    })

    suite('populated set', function () {
      setup(function () {
        this.set = new lunr.Set (['foo'])
      })

      test('element contained in set', function () {
        assert.isOk(this.set.contains('foo'))
      })

      test('element not contained in set', function () {
        assert.isNotOk(this.set.contains('bar'))
      })
    })
  })

  suite('#union', function () {
    setup(function () {
      this.set = new lunr.Set(['foo'])
    })

    suite('complete set', function () {
      test('union is complete', function () {
        var result = lunr.Set.complete.union(this.set)
        assert.isOk(result.contains('foo'))
        assert.isOk(result.contains('bar'))
      })
    })

    suite('empty set', function () {
      test('contains element', function () {
        var result = lunr.Set.empty.union(this.set)
        assert.isOk(result.contains('foo'))
        assert.isNotOk(result.contains('bar'))
      })
    })

    suite('populated set', function () {
      suite('with other populated set', function () {
        test('contains both elements', function () {
          var target = new lunr.Set (['bar'])
          var result = target.union(this.set)

          assert.isOk(result.contains('foo'))
          assert.isOk(result.contains('bar'))
          assert.isNotOk(result.contains('baz'))
        })
      })

      suite('with empty set', function () {
        test('contains all elements', function () {
          var target = new lunr.Set (['bar'])
          var result = target.union(lunr.Set.empty)

          assert.isOk(result.contains('bar'))
          assert.isNotOk(result.contains('baz'))
        })
      })

      suite('with complete set', function () {
        test('contains all elements', function () {
          var target = new lunr.Set (['bar'])
          var result = target.union(lunr.Set.complete)

          assert.isOk(result.contains('foo'))
          assert.isOk(result.contains('bar'))
          assert.isOk(result.contains('baz'))
        })
      })
    })
  })

  suite('#intersect', function () {
    setup(function () {
      this.set = new lunr.Set(['foo'])
    })

    suite('complete set', function () {
      test('contains element', function () {
        var result = lunr.Set.complete.intersect(this.set)
        assert.isOk(result.contains('foo'))
        assert.isNotOk(result.contains('bar'))
      })
    })

    suite('empty set', function () {
      test('does not contain element', function () {
        var result = lunr.Set.empty.intersect(this.set)
        assert.isNotOk(result.contains('foo'))
      })
    })

    suite('populated set', function () {
      suite('no intersection', function () {
        test('does not contain intersection elements', function () {
          var target = new lunr.Set (['bar'])
          var result = target.intersect(this.set)

          assert.isNotOk(result.contains('foo'))
          assert.isNotOk(result.contains('bar'))
        })
      })

      suite('intersection', function () {
        test('contains intersection elements', function () {
          var target = new lunr.Set (['foo', 'bar'])
          var result = target.intersect(this.set)

          assert.isOk(result.contains('foo'))
          assert.isNotOk(result.contains('bar'))
        })
      })

      suite('with empty set', function () {
        test('returns empty set', function () {
          var target = new lunr.Set(['foo']),
              result = target.intersect(lunr.Set.empty)

          assert.isNotOk(result.contains('foo'))
        })
      })

      suite('with complete set', function () {
        test('returns populated set', function () {
          var target = new lunr.Set(['foo']),
              result = target.intersect(lunr.Set.complete)

          assert.isOk(result.contains('foo'))
          assert.isNotOk(result.contains('bar'))
        })
      })
    })
  })
})
