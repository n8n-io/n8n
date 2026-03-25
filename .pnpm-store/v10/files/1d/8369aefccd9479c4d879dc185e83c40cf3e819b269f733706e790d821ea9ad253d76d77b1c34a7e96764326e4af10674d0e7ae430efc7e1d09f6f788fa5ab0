var vows = require('vows')
  , toposort = require('./index')
  , assert = require('assert')

var suite = vows.describe('toposort')
suite.addBatch(
{ 'acyclic graphs':
  { topic: function() {
      /*(read downwards)
      6  3
      |  |
      5->2
      |  |
      4  1
      */
      return toposort(
      [ ["3", '2']
      , ["2", "1"]
      , ["6", "5"]
      , ["5", "2"]
      , ["5", "4"]
      ])
    }
  , 'should be sorted correctly': function(er, result) {
      assert.instanceOf(result, Array)
      var failed = [], passed
      // valid permutations
      ;[ [ '3','6','5','2','1','4' ]
      , [ '3','6','5','2','4','1' ]
      , [ '6','3','5','2','1','4' ]
      , [ '6','5','3','2','1','4' ]
      , [ '6','5','3','2','4','1' ]
      , [ '6','5', '4','3','2','1' ]
      ].forEach(function(solution) {
        try {
          assert.deepEqual(result, solution)
          passed = true
        }catch (e) {
          failed.push(e)
        }
      })
      if (!passed) {
        console.log(failed)
        throw failed[0];
      }
    }
  }
, 'simple cyclic graphs':
  { topic: function() {
      /*
      foo<->bar
      */
      return toposort(
      [ ["foo", 'bar']
      , ["bar", "foo"]// cyclic dependecy
      ])
    }
  , 'should throw an exception': function(_, val) {
      assert.instanceOf(val, Error)
    }
  }
, 'complex cyclic graphs':
  { topic: function() {
      /*
      foo
      |
      bar<-john
      |     ^
      ron->tom
      */
      return toposort(
      [ ["foo", 'bar']
      , ["bar", "ron"]
      , ["john", "bar"]
      , ["tom", "john"]
      , ["ron", "tom"]// cyclic dependecy
      ])
    }
  , 'should throw an exception': function(_, val) {
      assert.instanceOf(val, Error)
    }
  }
, 'unknown nodes in edges':
  { topic: function() {
      return toposort.array(['bla'],
      [ ["foo", 'bar']
      , ["bar", "ron"]
      , ["john", "bar"]
      , ["tom", "john"]
      , ["ron", "tom"]
      ])
    }
  , 'should throw an exception': function(_, val) {
      assert.instanceOf(val, Error)
    }
  }
, 'triangular dependency':
  { topic: function() {
      /*
      a-> b
      |  /
      c<-
      */
      return toposort([
        ['a', 'b']
      , ['a', 'c']
      , ['b', 'c']
      ]);
    }
  , 'shouldn\'t throw an error': function(er, result) {
      assert.deepEqual(result, ['a', 'b', 'c'])
    }
  }
, 'toposort.array':
  { topic: function() {
      return toposort.array(['d', 'c', 'a', 'b'], [['a','b'],['b','c']])
    }
  , 'should include unconnected nodes': function(er, result){
      var i = result.indexOf('d')
      assert(i >= 0)
      result.splice(i, 1)
      assert.deepEqual(result, ['a', 'b', 'c'])
    }
  }
, 'toposort.array mutation':
  { topic: function() {
    var array = ['d', 'c', 'a', 'b']
    toposort.array(array, [['a','b'],['b','c']])
    return array
    }
  , 'should not mutate its arguments': function(er, result){
     assert.deepEqual(result, ['d', 'c', 'a', 'b'])
    }
  }
, 'giant graphs':
  {
    topic: function() {
      var graph = []
        , nodeCount = 100000
      for (var i = 0; i < nodeCount; i++) {
        graph.push([i, i + 1])
      }
      return graph
    }
  , 'should sort quickly': function(er, result){
     var start = (new Date).getTime()
     var sorted = toposort(result)
     var end = (new Date).getTime()
     var elapsedSeconds = (end - start) / 1000
     assert(elapsedSeconds < 1)
    }
  }
, 'object keys':
  {
    topic: function() {
      var o1 = {k1: 'v1', nested: {k2: 'v2'}}
      var o2 = {k2: 'v2'}
      var o3 = {k3: 'v3'}
      var graph = [[o1, o2], [o2, o3]]
      return graph
    }
  , 'should handle object nodes': function(er, result){
      var sorted = toposort(result)
      assert.deepEqual(sorted, [{k1: 'v1', nested: {k2: 'v2'}}, {k2: 'v2'}, {k3: 'v3'}])
    }
  }
})
.run(null, function() {
  (suite.results.broken+suite.results.errored) > 0 && process.exit(1)
  process.exit(0)
})
