// ES6 Map
var map
try {
  map = Map
} catch (_) { }
var set

// ES6 Set
try {
  set = Set
} catch (_) { }

function baseClone (src, circulars, clones) {
  // Null/undefined/functions/etc
  if (!src || typeof src !== 'object' || typeof src === 'function') {
    return src
  }

  // DOM Node
  if (src.nodeType && 'cloneNode' in src) {
    return src.cloneNode(true)
  }

  // Date
  if (src instanceof Date) {
    return new Date(src.getTime())
  }

  // RegExp
  if (src instanceof RegExp) {
    return new RegExp(src)
  }

  // Arrays
  if (Array.isArray(src)) {
    return src.map(clone)
  }

  // ES6 Maps
  if (map && src instanceof map) {
    return new Map(Array.from(src.entries()))
  }

  // ES6 Sets
  if (set && src instanceof set) {
    return new Set(Array.from(src.values()))
  }

  // Object
  if (src instanceof Object) {
    circulars.push(src)
    var obj = Object.create(src)
    clones.push(obj)
    for (var key in src) {
      var idx = circulars.findIndex(function (i) {
        return i === src[key]
      })
      obj[key] = idx > -1 ? clones[idx] : baseClone(src[key], circulars, clones)
    }
    return obj
  }

  // ???
  return src
}

export default function clone (src) {
  return baseClone(src, [], [])
}
