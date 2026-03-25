suite('lunr.utils', function () {
  suite('#clone', function () {
    var subject = function (obj) {
      setup(function () {
        this.obj = obj
        this.clone = lunr.utils.clone(obj)
      })
    }

    suite('handles null', function () {
      subject(null)

      test('returns null', function () {
        assert.equal(null, this.clone)
        assert.equal(this.obj, this.clone)
      })
    })

    suite('handles undefined', function () {
      subject(undefined)

      test('returns null', function () {
        assert.equal(undefined, this.clone)
        assert.equal(this.obj, this.clone)
      })
    })

    suite('object with primatives', function () {
      subject({
        number: 1,
        string: 'foo',
        bool: true
      })

      test('clones number correctly', function () {
        assert.equal(this.obj.number, this.clone.number)
      })

      test('clones string correctly', function () {
        assert.equal(this.obj.string, this.clone.string)
      })

      test('clones bool correctly', function () {
        assert.equal(this.obj.bool, this.clone.bool)
      })
    })

    suite('object with array property', function () {
      subject({
        array: [1, 2, 3]
      })

      test('clones array correctly', function () {
        assert.deepEqual(this.obj.array, this.clone.array)
      })

      test('mutations on clone do not affect orginial', function () {
        this.clone.array.push(4)
        assert.notDeepEqual(this.obj.array, this.clone.array)
        assert.equal(this.obj.array.length, 3)
        assert.equal(this.clone.array.length, 4)
      })
    })

    suite('nested object', function () {
      test('throws type error', function () {
        assert.throws(function () {
          lunr.utils.clone({
            'foo': {
              'bar': 1
            }
          })
        }, TypeError)
      })
    })
  })
})
