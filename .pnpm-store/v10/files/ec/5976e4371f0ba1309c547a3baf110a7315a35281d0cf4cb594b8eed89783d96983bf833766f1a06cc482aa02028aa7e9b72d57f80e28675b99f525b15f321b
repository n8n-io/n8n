'use strict'
const path = require('path')
const makeDir = require('make-dir')
const fs = require('../fs-promises')
const { cliWrapper, setupOptions } = require('./helpers.js')

const NYC = require('../../index.js')

exports.command = 'merge <input-directory> [output-file]'

exports.describe = 'merge istanbul format coverage output in a given folder'

exports.builder = function (yargs) {
  yargs
    .demandCommand(0, 0)
    .example('$0 merge ./out coverage.json', 'merge together reports in ./out and output as coverage.json')
    .positional('input-directory', {
      describe: 'directory containing multiple istanbul coverage files',
      type: 'text',
      default: './.nyc_output'
    })
    .positional('output-file', {
      describe: 'file to output combined istanbul format coverage to',
      type: 'text',
      default: 'coverage.json'
    })

  setupOptions(yargs, 'merge')
  yargs.default('exclude-after-remap', false)
}

exports.handler = cliWrapper(async argv => {
  process.env.NYC_CWD = process.cwd()
  const nyc = new NYC(argv)
  const inputStat = await fs.stat(argv.inputDirectory).catch(error => {
    throw new Error(`failed access input directory ${argv.inputDirectory} with error:\n\n${error.message}`)
  })

  if (!inputStat.isDirectory()) {
    throw new Error(`${argv.inputDirectory} was not a directory`)
  }
  await makeDir(path.dirname(argv.outputFile))
  const map = await nyc.getCoverageMapFromAllCoverageFiles(argv.inputDirectory)
  await fs.writeFile(argv.outputFile, JSON.stringify(map), 'utf8')
  console.info(`coverage files in ${argv.inputDirectory} merged into ${argv.outputFile}`)
})
