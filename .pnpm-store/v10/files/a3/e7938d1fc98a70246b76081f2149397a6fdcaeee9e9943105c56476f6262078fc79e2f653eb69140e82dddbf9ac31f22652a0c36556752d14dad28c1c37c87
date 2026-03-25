suite('search', function () {
  var documents = [{
    id: 'a',
    title: 'Mr. Green kills Colonel Mustard',
    body: 'Mr. Green killed Colonel Mustard in the study with the candlestick. Mr. Green is not a very nice fellow.',
    wordCount: 19
  },{
    id: 'b',
    title: 'Plumb waters plant',
    body: 'Professor Plumb has a green plant in his study',
    wordCount: 9
  },{
    id: 'c',
    title: 'Scarlett helps Professor',
    body: 'Miss Scarlett watered Professor Plumbs green plant while he was away from his office last week.',
    wordCount: 16
  }]

  var idx = lunr(function () {
    this.ref('id')
    this.field('title')
    this.field('body')

    documents.forEach(function (doc) {
      this.add(doc)
    }, this)
  })

  this.add('single term', function () {
    idx.search('green')
  })

  this.add('multi term', function () {
    idx.search('green plant')
  })

  this.add('trailing wildcard', function () {
    idx.search('pl*')
  })

  this.add('leading wildcard', function () {
    idx.search('*ant')
  })

  this.add('contained wildcard', function () {
    idx.search('p*t')
  })

  this.add('with field', function () {
    idx.search('title:plant')
  })

  this.add('edit distance', function () {
    idx.search('plint~2')
  })

  this.add('typeahead', function () {
    idx.query(function (q) {
      q.term("pl", { boost: 100, usePipeline: true })
      q.term("pl", { boost: 10, usePipeline: false, wildcard: lunr.Query.wildcard.TRAILING })
      q.term("pl", { boost: 1, editDistance: 1 })
    })
  })

  this.add('negated query', function () {
    idx.search('-plant')
  })

  this.add('required term', function () {
    idx.search('green +plant')
  })
})
