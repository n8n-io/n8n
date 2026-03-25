var lunr = require('../lunr.js'),
    Benchmark = require('benchmark'),
    wordList = require('word-list'),
    fs = require('fs')

var suite = function (name, fn) {
  var s = new Benchmark.Suite(name, {
    onStart: function (e) { console.log(e.currentTarget.name) },
    onCycle: function (e) { console.log("  " + String(e.target)) },
    onError: function (e) { console.error(e.target.error) }
  })

  fn.call(s, s)

  s.run()
}

var words = fs.readFileSync(wordList, 'utf-8')
  .split('\n')
  .slice(0, 1000)
  .sort()

global.lunr = lunr
global.Benchmark = Benchmark
global.suite = suite
global.words = words
