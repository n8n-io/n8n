'use strict'

const NYC = require('../../index.js')
const { cliWrapper, suppressEPIPE, setupOptions } = require('./helpers.js')

exports.command = 'report'

exports.describe = 'run coverage report for .nyc_output'

exports.builder = function (yargs) {
  yargs
    .demandCommand(0, 0)
    .example('$0 report --reporter=lcov', 'output an HTML lcov report to ./coverage')

  setupOptions(yargs, 'report')
}

exports.handler = cliWrapper(async argv => {
  process.env.NYC_CWD = process.cwd()
  var nyc = new NYC(argv)
  await nyc.report().catch(suppressEPIPE)
  if (argv.checkCoverage) {
    await nyc.checkCoverage({
      lines: argv.lines,
      functions: argv.functions,
      branches: argv.branches,
      statements: argv.statements
    }, argv['per-file']).catch(suppressEPIPE)
  }
})
