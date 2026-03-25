export function getGlobal (str) {
  var ctx = (typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this)
  return typeof str !== 'undefined' ? ctx[str] : ctx
}
