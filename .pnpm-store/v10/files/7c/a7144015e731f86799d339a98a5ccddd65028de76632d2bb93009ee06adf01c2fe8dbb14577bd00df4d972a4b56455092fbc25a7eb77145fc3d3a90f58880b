var Benchpress = require('@mariocasciaro/benchpress')
var benchmark = new Benchpress()
var op = require('./')

var testObj = {
  level1_a: {
    level2_a: {
      level3_a: {
        level4_a: {
        }
      }
    }
  }
}

var testObj2

benchmark
  .add('get existing', {
    iterations: 100000,
    fn: function() {
      op.get(testObj, ['level1_a', 'level2_a', 'level3_a', 'level4_a'])
    }
  })
  .add('get non-existing', {
    iterations: 100000,
    fn: function() {
      op.get(testObj, ['level5_a'])
    }
  })
  .add('push', {
    iterations: 100000,
    fn: function() {
      op.push(testObj, ['level1_a', 'level2_a', 'level3_a', 'level4_a', 'level5_a'], 'val')
    }
  })
  .add('set non existing', {
    iterations: 100000,
    fn: function() {
      op.set(testObj2, ['level1_a', 'level2_b', 'level3_b', 'level4_b', 'level5_b'], 'val')
    },
    beforeEach: function() {
      testObj2 = {}
    }
  })
  .add('set existing', {
    iterations: 100000,
    fn: function() {
      op.set(testObj, ['level1_a', 'level2_a', 'level3_a', 'level4_a', 'level5_b'], 'val')
    }
  })
  .run()
