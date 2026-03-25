'use strict'

function InstrumenterIstanbul (options) {
  const { createInstrumenter } = require('istanbul-lib-instrument')
  const convertSourceMap = require('convert-source-map')

  const instrumenter = createInstrumenter({
    autoWrap: true,
    coverageVariable: '__coverage__',
    embedSource: true,
    compact: options.compact,
    preserveComments: options.preserveComments,
    produceSourceMap: options.produceSourceMap,
    ignoreClassMethods: options.ignoreClassMethods,
    esModules: options.esModules,
    parserPlugins: options.parserPlugins
  })

  return {
    instrumentSync (code, filename, { sourceMap, registerMap }) {
      var instrumented = instrumenter.instrumentSync(code, filename, sourceMap)
      if (instrumented !== code) {
        registerMap()
      }

      // the instrumenter can optionally produce source maps,
      // this is useful for features like remapping stack-traces.
      if (options.produceSourceMap) {
        var lastSourceMap = instrumenter.lastSourceMap()
        /* istanbul ignore else */
        if (lastSourceMap) {
          instrumented += '\n' + convertSourceMap.fromObject(lastSourceMap).toComment()
        }
      }

      return instrumented
    },
    lastFileCoverage () {
      return instrumenter.lastFileCoverage()
    }
  }
}

module.exports = InstrumenterIstanbul
