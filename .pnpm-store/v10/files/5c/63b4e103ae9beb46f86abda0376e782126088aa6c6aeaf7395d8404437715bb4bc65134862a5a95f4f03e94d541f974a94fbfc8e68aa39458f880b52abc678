module.exports = function parallel(fns, context, callback) {
  if (!callback) {
    if (typeof context === 'function') {
      callback = context
      context = null
    } else {
      callback = noop
    }
  }

  var pending = fns && fns.length
  if (!pending) return callback(null, []);

  var finished = false
  var results = new Array(pending)

  fns.forEach(context ? function (fn, i) {
    fn.call(context, maybeDone(i))
  } : function (fn, i) {
    fn(maybeDone(i))
  })

  function maybeDone(i) {
    return function (err, result) {
      if (finished) return;

      if (err) {
        callback(err, results)
        finished = true
        return
      }

      results[i] = result

      if (!--pending) callback(null, results);
    }
  }
}

function noop() {}
