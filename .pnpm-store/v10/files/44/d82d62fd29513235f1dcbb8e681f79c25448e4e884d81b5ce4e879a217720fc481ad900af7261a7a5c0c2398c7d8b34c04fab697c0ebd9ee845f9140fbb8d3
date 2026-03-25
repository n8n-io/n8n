
throw new Error("TODO: Not yet implemented.")

/*
usage:

Like asyncMap, but only can take a single cb, and guarantees
the order of the results.
*/

module.exports = asyncMapOrdered

function asyncMapOrdered (list, fn, cb_) {
  if (typeof cb_ !== "function") throw new Error(
    "No callback provided to asyncMapOrdered")

  if (typeof fn !== "function") throw new Error(
    "No map function provided to asyncMapOrdered")

  if (list === undefined || list === null) return cb_(null, [])
  if (!Array.isArray(list)) list = [list]
  if (!list.length) return cb_(null, [])

  var errState = null
    , l = list.length
    , a = l
    , res = []
    , resCount = 0
    , maxArgLen = 0

  function cb (index) { return function () {
    if (errState) return
    var er = arguments[0]
    var argLen = arguments.length
    maxArgLen = Math.max(maxArgLen, argLen)
    res[index] = argLen === 1 ? [er] : Array.apply(null, arguments)

    // see if any new things have been added.
    if (list.length > l) {
      var newList = list.slice(l)
      a += (list.length - l)
      var oldLen = l
      l = list.length
      process.nextTick(function () {
        newList.forEach(function (ar, i) { fn(ar, cb(i + oldLen)) })
      })
    }

    if (er || --a === 0) {
      errState = er
      cb_.apply(null, [errState].concat(flip(res, resCount, maxArgLen)))
    }
  }}
  // expect the supplied cb function to be called
  // "n" times for each thing in the array.
  list.forEach(function (ar) {
    steps.forEach(function (fn, i) { fn(ar, cb(i)) })
  })
}

function flip (res, resCount, argLen) {
  var flat = []
  // res = [[er, x, y], [er, x1, y1], [er, x2, y2, z2]]
  // return [[x, x1, x2], [y, y1, y2], [undefined, undefined, z2]]
  
