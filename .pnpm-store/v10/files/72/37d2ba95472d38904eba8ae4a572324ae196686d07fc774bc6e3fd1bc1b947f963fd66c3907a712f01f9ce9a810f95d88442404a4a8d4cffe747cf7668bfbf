var test = require('tap').test
var spinner = require('../spin.js')

test('does nothing when not a tty', function(t) {
  var int = spinner({
    stream: { write: function(c) {
      throw new Error('wrote something: ' + JSON.stringify(c))
    }, isTTY: false },
  })
  t.notOk(int)
  t.end()
})

test('write spinny stuff', function(t) {
  var output = ''
  var written = 0
  var expect = "b\u001b[0Gc\u001b[0Gd\u001b[0Ge\u001b[0Gf\u001b[0Gg\u001b[0Gh\u001b[0Gi\u001b[0Gj\u001b[0Gk\u001b[0Gl\u001b[0Gm\u001b[0Gn\u001b[0Go\u001b[0Gp\u001b[0Ga\u001b[0Gb\u001b[0Gc\u001b[0Gd\u001b[0Ge\u001b[0Gf\u001b[0Gg\u001b[0Gh\u001b[0Gi\u001b[0Gj\u001b[0Gk\u001b[0Gl\u001b[0Gm\u001b[0Gn\u001b[0Go\u001b[0Gp\u001b[0Ga\u001b[0Gb\u001b[0Gc\u001b[0Gd\u001b[0Ge\u001b[0Gf\u001b[0Gg\u001b[0Gh\u001b[0Gi\u001b[0Gj\u001b[0Gk\u001b[0Gl\u001b[0Gm\u001b[0Gn\u001b[0Go\u001b[0Gp\u001b[0Ga\u001b[0Gb\u001b[0Gc\u001b[0G"

  var int = spinner({
    interval: 0,
    string: 'abcdefghijklmnop',
    stream: {
      write: function(c) {
        output += c
        if (++written == 50) {
          t.equal(output, expect)
          clearInterval(int)
          t.end()
        }
      },
      isTTY: true
    },
    cleanup: false
  })
})
