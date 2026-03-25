'use strict'

function NOOP () {
  const { readInitialCoverage } = require('istanbul-lib-instrument')

  return {
    instrumentSync (code, filename) {
      const extracted = readInitialCoverage(code)
      if (extracted) {
        this.fileCoverage = extracted.coverageData
      } else {
        this.fileCoverage = null
      }
      return code
    },
    lastFileCoverage () {
      return this.fileCoverage
    }
  }
}

module.exports = NOOP
