module.exports = function series(fns, context, callback) {
  if (!callback) {
    if (typeof context === 'function') {
      callback = context
      context = null
    } else {
      callback = noop
    }
  }

  if (!(fns && fns.length)) return callback();

  fns = fns.slice(0)

  var call = context
  ? function () {
    fns.length
      ? fns.shift().call(context, next)
      : callback()
  }
  : function () {
    fns.length
      ? fns.shift()(next)
      : callback()
  }

  call()

  function next(err) {
    err ? callback(err) : call()
  }
}

function noop() {}
