const resolveHome = require('./resolveHome')

function dotenvOptionPaths (options) {
  let optionPaths = []

  if (options && options.path) {
    if (!Array.isArray(options.path)) {
      optionPaths = [resolveHome(options.path)]
    } else {
      optionPaths = [] // reset default

      for (const filepath of options.path) {
        optionPaths.push(resolveHome(filepath))
      }
    }
  }

  return optionPaths
}

module.exports = dotenvOptionPaths
