suite('lunr.QueryParser', function () {
  var parse = function (q) {
    var query = new lunr.Query (['title', 'body']),
        parser = new lunr.QueryParser(q, query)

    parser.parse()
  }

  this.add('simple', function () {
    parse('foo bar')
  })

  this.add('field', function () {
    parse('title:foo bar')
  })

  this.add('modifier', function () {
    parse('foo~2 bar')
  })

  this.add('complex', function () {
    parse('title:foo~2^6 bar')
  })
})
