'use strict'

function getInvalidatingOptions (config) {
  return [
    'compact',
    'esModules',
    'ignoreClassMethods',
    'instrument',
    'instrumenter',
    'parserPlugins',
    'preserveComments',
    'produceSourceMap',
    'sourceMap'
  ].reduce((acc, optName) => {
    acc[optName] = config[optName]
    return acc
  }, {})
}

module.exports = {
  salt (config) {
    return JSON.stringify({
      modules: {
        'istanbul-lib-instrument': require('istanbul-lib-instrument/package.json').version,
        nyc: require('../package.json').version
      },
      nycrc: getInvalidatingOptions(config)
    })
  }
}
