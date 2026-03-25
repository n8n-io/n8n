module.exports = function () {
  try {
    return typeof require('async_hooks').createHook === 'function'
  } catch (err) {
    return false
  }
}
