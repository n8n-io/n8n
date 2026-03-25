let objectify = require('./objectifier')

module.exports = function processResult(result) {
  if (console && console.warn) {
    result.warnings().forEach(warn => {
      let source = warn.plugin || 'PostCSS'
      console.warn(source + ': ' + warn.text)
    })
  }
  return objectify(result.root)
}
