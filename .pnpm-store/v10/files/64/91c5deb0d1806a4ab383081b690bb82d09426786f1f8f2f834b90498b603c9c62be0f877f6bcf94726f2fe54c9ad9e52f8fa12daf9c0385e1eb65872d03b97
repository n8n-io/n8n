suite('lunr.Builder', function () {
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

  this.add('build', function () {
    lunr(function () {
      this.ref('id')
      this.field('title')
      this.field('body')

      documents.forEach(function (doc) {
        this.add(doc)
      }, this)
    })
  })
})
