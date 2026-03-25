'use strict'

const NYC = require('../../index.js')
const { cliWrapper, suppressEPIPE, setupOptions } = require('./helpers.js')

exports.command = 'check-coverage'

exports.describe = 'check whether coverage is within thresholds provided'

exports.builder = function (yargs) {
  yargs
    .demandCommand(0, 0)
    .example('$0 check-coverage --lines 95', "check whether the JSON in nyc's output folder meets the thresholds provided")

  setupOptions(yargs, 'check-coverage')
}

exports.handler = cliWrapper(async argv => {
  process.env.NYC_CWD = process.cwd()

  const nyc = new NYC(argv)
  await nyc.checkCoverage({
    lines: argv.lines,
    functions: argv.functions,
    branches: argv.branches,
    statements: argv.statements
  }, argv['per-file']).catch(suppressEPIPE)
})
