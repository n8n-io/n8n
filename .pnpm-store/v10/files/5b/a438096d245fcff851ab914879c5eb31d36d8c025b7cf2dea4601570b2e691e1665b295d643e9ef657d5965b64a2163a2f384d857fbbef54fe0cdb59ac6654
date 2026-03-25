module.exports = spinner

function spinner(opt) {
  opt = opt || {}
  var str = opt.stream || process.stderr
  var tty = typeof opt.tty === 'boolean' ? opt.tty : true
  var string = opt.string || '/-\\|'
  var ms = typeof opt.interval === 'number' ? opt.interval : 50
  if (ms < 0) ms = 0
  if (tty && !str.isTTY) return false
  var CR = str.isTTY ? '\u001b[0G' : '\u000d';
  var CLEAR = str.isTTY ? '\u001b[2K' : '\u000d \u000d';

  var s = 0
  var sprite = string.split('')
  var wrote = false

  var delay = typeof opt.delay === 'number' ? opt.delay : 2

  var interval = setInterval(function() {
    if (--delay >= 0) return
    s = ++s % sprite.length
    var c = sprite[s]
    str.write(c + CR)
    wrote = true
  }, ms)

  var unref = typeof opt.unref === 'boolean' ? opt.unref : true
  if (unref && typeof interval.unref === 'function') {
    interval.unref()
  }

  var cleanup = typeof opt.cleanup === 'boolean' ? opt.cleanup : true
  if (cleanup) {
    process.on('exit', function() {
      if (wrote) {
          str.write(CLEAR);
      }
    })
  }

  module.exports.clear = function () {
    str.write(CLEAR);
  };
  
  return interval
}

module.exports.clear = function () {};


