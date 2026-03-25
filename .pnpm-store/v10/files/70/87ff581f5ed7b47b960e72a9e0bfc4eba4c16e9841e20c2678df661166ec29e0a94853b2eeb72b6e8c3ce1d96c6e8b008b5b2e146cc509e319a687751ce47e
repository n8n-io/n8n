'use strict'

const autocannon = require('../autocannon')
const exampleResult = require('./fixtures/example-result.json')
const crossArgv = require('cross-argv')

let opts = null

if (process.argv.length > 2) {
  const args = crossArgv(process.argv.slice(2))
  opts = autocannon.parseArguments(args)
}

const resultStr = autocannon.printResult(exampleResult, opts)
process.stderr.write(resultStr)
