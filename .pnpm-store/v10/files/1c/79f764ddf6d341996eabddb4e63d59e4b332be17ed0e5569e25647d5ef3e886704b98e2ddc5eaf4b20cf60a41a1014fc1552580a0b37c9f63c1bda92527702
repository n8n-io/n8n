'use strict'

const NYC = require('../../index.js')
const path = require('path')
const { promisify } = require('util')
const resolveFrom = require('resolve-from')
const rimraf = promisify(require('rimraf'))
const { cliWrapper, setupOptions } = require('./helpers.js')

exports.command = 'instrument <input> [output]'

exports.describe = 'instruments a file or a directory tree and writes the instrumented code to the desired output location'

exports.builder = function (yargs) {
  yargs
    .demandCommand(0, 0)
    .example('$0 instrument ./lib ./output', 'instrument all .js files in ./lib with coverage and output in ./output')

  setupOptions(yargs, 'instrument')
}

exports.handler = cliWrapper(async argv => {
  if (argv.output && !argv.inPlace && (path.resolve(argv.cwd, argv.input) === path.resolve(argv.cwd, argv.output))) {
    throw new Error('cannot instrument files in place, <input> must differ from <output>.  Set \'--in-place\' to force')
  }

  if (path.relative(argv.cwd, path.resolve(argv.cwd, argv.input)).startsWith('..')) {
    throw new Error('cannot instrument files outside project root directory')
  }

  if (argv.delete && argv.inPlace) {
    throw new Error('cannot use \'--delete\' when instrumenting files in place')
  }

  if (argv.delete && argv.output && argv.output.length !== 0) {
    const relPath = path.relative(process.cwd(), path.resolve(argv.output))
    if (relPath !== '' && !relPath.startsWith('..')) {
      await rimraf(argv.output)
    } else {
      throw new Error(`attempt to delete '${process.cwd()}' or containing directory.`)
    }
  }

  // If instrument is set to false enable a noop instrumenter.
  argv.instrumenter = (argv.instrument)
    ? './lib/instrumenters/istanbul'
    : './lib/instrumenters/noop'

  if (argv.inPlace) {
    argv.output = argv.input
    argv.completeCopy = false
  }

  const nyc = new NYC(argv)
  if (!argv.useSpawnWrap) {
    nyc.require.forEach(requireModule => {
      const mod = resolveFrom.silent(nyc.cwd, requireModule) || requireModule
      require(mod)
    })
  }

  await nyc.instrumentAllFiles(argv.input, argv.output)
})
