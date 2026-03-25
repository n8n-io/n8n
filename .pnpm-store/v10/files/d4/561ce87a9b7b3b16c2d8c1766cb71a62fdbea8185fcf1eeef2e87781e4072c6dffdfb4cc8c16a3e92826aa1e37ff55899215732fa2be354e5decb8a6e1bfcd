'use strict'

const path = require('path')
const findUp = require('find-up')
const Yargs = require('yargs/yargs')

const { setupOptions } = require('./commands/helpers')
const processArgs = require('./process-args')
const { loadNycConfig } = require('@istanbuljs/load-nyc-config')

async function guessCWD (cwd) {
  cwd = cwd || process.env.NYC_CWD || process.cwd()
  const pkgPath = await findUp('package.json', { cwd })
  if (pkgPath) {
    cwd = path.dirname(pkgPath)
  }

  return cwd
}

async function processConfig (cwd) {
  cwd = await guessCWD(cwd)
  const yargs = Yargs([])
    .usage('$0 [command] [options]')
    .usage('$0 [options] [bin-to-instrument]')
    .showHidden(false)

  setupOptions(yargs, null, cwd)

  yargs
    .example('$0 npm test', 'instrument your tests with coverage')
    .example('$0 --require @babel/register npm test', 'instrument your tests with coverage and transpile with Babel')
    .example('$0 report --reporter=text-lcov', 'output lcov report after running your tests')
    .epilog('visit https://git.io/vHysA for list of available reporters')
    .boolean('h')
    .boolean('version')
    .help(false)
    .version(false)

  const instrumenterArgs = processArgs.hideInstrumenteeArgs()

  // This yargs.parse must come before any options that exit post-hoc
  const childArgs = processArgs.hideInstrumenterArgs(yargs.parse(process.argv.slice(2)))
  const config = await loadNycConfig(yargs.parse(instrumenterArgs))

  yargs
    .config(config)
    .help('h')
    .alias('h', 'help')
    .version()
    .command(require('./commands/check-coverage'))
    .command(require('./commands/instrument'))
    .command(require('./commands/report'))
    .command(require('./commands/merge'))

  return {
    get argv () {
      return yargs.parse(instrumenterArgs)
    },
    childArgs,
    yargs
  }
}

module.exports = processConfig
