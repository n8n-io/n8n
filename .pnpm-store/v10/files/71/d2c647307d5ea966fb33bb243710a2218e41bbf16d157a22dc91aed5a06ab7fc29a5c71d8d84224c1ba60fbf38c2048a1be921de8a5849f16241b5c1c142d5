suite('lunr.stopWordFilter', function () {
  test('filters stop words', function () {
    var stopWords = ['the', 'and', 'but', 'than', 'when']

    stopWords.forEach(function (word) {
      assert.isUndefined(lunr.stopWordFilter(word))
    })
  })

  test('ignores non stop words', function () {
    var nonStopWords = ['interesting', 'words', 'pass', 'through']

    nonStopWords.forEach(function (word) {
      assert.equal(word, lunr.stopWordFilter(word))
    })
  })

  test('ignores properties of Object.prototype', function () {
    var nonStopWords = ['constructor', 'hasOwnProperty', 'toString', 'valueOf']

    nonStopWords.forEach(function (word) {
      assert.equal(word, lunr.stopWordFilter(word))
    })
  })

  test('is a registered pipeline function', function () {
    assert.equal('stopWordFilter', lunr.stopWordFilter.label)
    assert.equal(lunr.stopWordFilter, lunr.Pipeline.registeredFunctions['stopWordFilter'])
  })
})
