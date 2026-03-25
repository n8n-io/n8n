var Vue = require('vue')

Object.keys(Vue).forEach(function(key) {
  exports[key] = Vue[key]
})

exports.set = function(target, key, val) {
  if (Array.isArray(target)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  target[key] = val
  return val
}

exports.del = function(target, key) {
  if (Array.isArray(target)) {
    target.splice(key, 1)
    return
  }
  delete target[key]
}

exports.Vue = Vue
exports.Vue2 = undefined
exports.isVue2 = false
exports.isVue3 = true
exports.install = function(){}
