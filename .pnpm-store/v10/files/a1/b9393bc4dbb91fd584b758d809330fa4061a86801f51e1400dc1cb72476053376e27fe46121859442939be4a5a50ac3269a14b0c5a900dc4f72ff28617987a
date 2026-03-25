suite('lunr.FieldRef', function () {
  suite('#toString', function () {
    test('combines document ref and field name', function () {
      var fieldName = "title",
          documentRef = "123",
          fieldRef = new lunr.FieldRef (documentRef, fieldName)

      assert.equal(fieldRef.toString(), "title/123")
    })
  })

  suite('.fromString', function () {
    test('splits string into parts', function () {
      var fieldRef = lunr.FieldRef.fromString("title/123")

      assert.equal(fieldRef.fieldName, "title")
      assert.equal(fieldRef.docRef, "123")
    })

    test('docRef contains join character', function () {
      var fieldRef = lunr.FieldRef.fromString("title/http://example.com/123")

      assert.equal(fieldRef.fieldName, "title")
      assert.equal(fieldRef.docRef, "http://example.com/123")
    })

    test('string does not contain join character', function () {
      var s = "docRefOnly"

      assert.throws(function () {
        lunr.FieldRef.fromString(s)
      })
    })
  })
})
