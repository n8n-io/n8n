#!/usr/bin/env node

/* c8 ignore start */
const { Command } = require('commander')
const program = new Command()

const { setLogLevel, logger } = require('../shared/logger')
const examples = require('./examples')
const packageJson = require('./../lib/helpers/packageJson')
const Errors = require('./../lib/helpers/errors')
const getCommanderVersion = require('./../lib/helpers/getCommanderVersion')
const executeDynamic = require('./../lib/helpers/executeDynamic')
const removeDynamicHelpSection = require('./../lib/helpers/removeDynamicHelpSection')
const removeOptionsHelpParts = require('./../lib/helpers/removeOptionsHelpParts')

// for use with run
const envs = []
function collectEnvs (type) {
  return function (value, previous) {
    envs.push({ type, value })
    return previous.concat([value])
  }
}

// surface hoisting problems
const commanderVersion = getCommanderVersion()
if (commanderVersion && parseInt(commanderVersion.split('.')[0], 10) >= 12) {
  const message = `dotenvx depends on commander@11.x.x but you are attempting to hoist commander@${commanderVersion}`
  const error = new Errors({ message }).dangerousDependencyHoist()
  logger.error(error.message)
  if (error.help) logger.error(error.help)
}

// global log levels
program
  .usage('run -- yourcommand')
  .option('-l, --log-level <level>', 'set log level', 'info')
  .option('-q, --quiet', 'sets log level to error')
  .option('-v, --verbose', 'sets log level to verbose')
  .option('-d, --debug', 'sets log level to debug')
  .hook('preAction', (thisCommand, actionCommand) => {
    const options = thisCommand.opts()

    setLogLevel(options)
  })

// for dynamic loading of dotenvx-ops, etc
program
  .argument('[command]', 'dynamic command')
  .argument('[args...]', 'dynamic command arguments')
  .action((command, args, cmdObj) => {
    const rawArgs = process.argv.slice(3) // adjust the index based on where actual args start
    executeDynamic(program, command, rawArgs)
  })

// cli
program
  .name('dotenvx')
  .description(packageJson.description)
  .version(packageJson.version)
  .allowUnknownOption()

// dotenvx run -- node index.js
const runAction = require('./actions/run')
program.command('run')
  .description('inject env at runtime [dotenvx run -- yourcommand]')
  .addHelpText('after', examples.run)
  .option('-e, --env <strings...>', 'environment variable(s) set as string (example: "HELLO=World")', collectEnvs('env'), [])
  .option('-f, --env-file <paths...>', 'path(s) to your env file(s)', collectEnvs('envFile'), [])
  .option('-fk, --env-keys-file <path>', 'path to your .env.keys file (default: same path as your env file)')
  .option('-fv, --env-vault-file <paths...>', 'path(s) to your .env.vault file(s)', collectEnvs('envVaultFile'), [])
  .option('-o, --overload', 'override existing env variables (by default, existing env vars take precedence over .env files)')
  .option('--strict', 'process.exit(1) on any errors', false)
  .option('--convention <name>', 'load a .env convention (available conventions: [\'nextjs\', \'flow\'])')
  .option('--ignore <errorCodes...>', 'error code(s) to ignore (example: --ignore=MISSING_ENV_FILE)')
  .option('--ops-off', 'disable dotenvx-ops features', false)
  .action(function (...args) {
    this.envs = envs
    runAction.apply(this, args)
  })

// dotenvx get
const getAction = require('./actions/get')
program.command('get')
  .usage('[KEY] [options]')
  .description('return a single environment variable')
  .argument('[KEY]', 'environment variable name')
  .option('-e, --env <strings...>', 'environment variable(s) set as string (example: "HELLO=World")', collectEnvs('env'), [])
  .option('-f, --env-file <paths...>', 'path(s) to your env file(s)', collectEnvs('envFile'), [])
  .option('-fk, --env-keys-file <path>', 'path to your .env.keys file (default: same path as your env file)')
  .option('-fv, --env-vault-file <paths...>', 'path(s) to your .env.vault file(s)', collectEnvs('envVaultFile'), [])
  .option('-o, --overload', 'override existing env variables (by default, existing env vars take precedence over .env files)')
  .option('--strict', 'process.exit(1) on any errors', false)
  .option('--convention <name>', 'load a .env convention (available conventions: [\'nextjs\', \'flow\'])')
  .option('--ignore <errorCodes...>', 'error code(s) to ignore (example: --ignore=MISSING_ENV_FILE)')
  .option('-a, --all', 'include all machine envs as well')
  .option('-pp, --pretty-print', 'pretty print output')
  .option('--format <type>', 'format of the output (json, shell, eval)', 'json')
  .option('--ops-off', 'disable dotenvx-ops features', false)
  .action(function (...args) {
    this.envs = envs
    getAction.apply(this, args)
  })

// dotenvx set
const setAction = require('./actions/set')
program.command('set')
  .usage('<KEY> <value> [options]')
  .description('set a single environment variable')
  .addHelpText('after', examples.set)
  .allowUnknownOption()
  .argument('KEY', 'KEY')
  .argument('value', 'value')
  .option('-f, --env-file <paths...>', 'path(s) to your env file(s)', collectEnvs('envFile'), [])
  .option('-fk, --env-keys-file <path>', 'path to your .env.keys file (default: same path as your env file)')
  .option('-c, --encrypt', 'encrypt value', true)
  .option('-p, --plain', 'store value as plain text', false)
  .option('--ops-off', 'disable dotenvx-ops features', false)
  .action(function (...args) {
    this.envs = envs
    setAction.apply(this, args)
  })

// dotenvx encrypt
const encryptAction = require('./actions/encrypt')
program.command('encrypt')
  .description('convert .env file(s) to encrypted .env file(s)')
  .option('-f, --env-file <paths...>', 'path(s) to your env file(s)', collectEnvs('envFile'), [])
  .option('-fk, --env-keys-file <path>', 'path to your .env.keys file (default: same path as your env file)')
  .option('-k, --key <keys...>', 'keys(s) to encrypt (default: all keys in file)')
  .option('-ek, --exclude-key <excludeKeys...>', 'keys(s) to exclude from encryption (default: none)')
  .option('--ops-off', 'disable dotenvx-ops features', false)
  .option('--stdout', 'send to stdout')
  .action(function (...args) {
    this.envs = envs
    encryptAction.apply(this, args)
  })

// dotenvx decrypt
const decryptAction = require('./actions/decrypt')
program.command('decrypt')
  .description('convert encrypted .env file(s) to plain .env file(s)')
  .option('-f, --env-file <paths...>', 'path(s) to your env file(s)', collectEnvs('envFile'), [])
  .option('-fk, --env-keys-file <path>', 'path to your .env.keys file (default: same path as your env file)')
  .option('-k, --key <keys...>', 'keys(s) to decrypt (default: all keys in file)')
  .option('-ek, --exclude-key <excludeKeys...>', 'keys(s) to exclude from decryption (default: none)')
  .option('--ops-off', 'disable dotenvx-ops features', false)
  .option('--stdout', 'send to stdout')
  .action(function (...args) {
    this.envs = envs
    decryptAction.apply(this, args)
  })

// dotenvx keypair
const keypairAction = require('./actions/keypair')
program.command('keypair')
  .usage('[KEY] [options]')
  .description('print public/private keys for .env file(s)')
  .argument('[KEY]', 'environment variable key name')
  .option('-f, --env-file <paths...>', 'path(s) to your env file(s)')
  .option('-fk, --env-keys-file <path>', 'path to your .env.keys file (default: same path as your env file)')
  .option('--ops-off', 'disable dotenvx-ops features', false)
  .option('-pp, --pretty-print', 'pretty print output')
  .option('--format <type>', 'format of the output (json, shell)', 'json')
  .action(keypairAction)

// dotenvx ls
const lsAction = require('./actions/ls')
program.command('ls')
  .description('print all .env files in a tree structure')
  .argument('[directory]', 'directory to list .env files from', '.')
  .option('-f, --env-file <filenames...>', 'path(s) to your env file(s)', '.env*')
  .option('-ef, --exclude-env-file <excludeFilenames...>', 'path(s) to exclude from your env file(s) (default: none)')
  .action(lsAction)

// dotenvx rotate
const rotateAction = require('./actions/rotate')
program.command('rotate')
  .description('rotate keypair(s) and re-encrypt .env file(s)')
  .option('-f, --env-file <paths...>', 'path(s) to your env file(s)', collectEnvs('envFile'), [])
  .option('-fk, --env-keys-file <path>', 'path to your .env.keys file (default: same path as your env file)')
  .option('-k, --key <keys...>', 'keys(s) to encrypt (default: all keys in file)')
  .option('-ek, --exclude-key <excludeKeys...>', 'keys(s) to exclude from encryption (default: none)')
  .option('--ops-off', 'disable dotenvx-ops features', false)
  .option('--stdout', 'send to stdout')
  .action(function (...args) {
    this.envs = envs
    rotateAction.apply(this, args)
  })

// dotenvx help
program.command('help [command]')
  .description('display help for command')
  .action((command) => {
    if (command) {
      const subCommand = program.commands.find(c => c.name() === command)
      if (subCommand) {
        subCommand.outputHelp()
      } else {
        program.outputHelp()
      }
    } else {
      program.outputHelp()
    }
  })

// dotenvx pro
program.addHelpText('after', ' ')
program.addHelpText('after', 'Advanced: ')
program.addHelpText('after', '  ops                          🛡️  ops')
program.addHelpText('after', '  ext                          🔌 extensions')

// dotenvx ext
program.addCommand(require('./commands/ext'))

//
// MOVED
//
const prebuildAction = require('./actions/ext/prebuild')
program.command('prebuild')
  .description('DEPRECATED: moved to [dotenvx ext prebuild]')
  .addHelpText('after', examples.prebuild)
  .action(function (...args) {
    logger.warn('DEPRECATION NOTICE: [prebuild] has moved to [dotenvx ext prebuild]')

    prebuildAction.apply(this, args)
  })

const precommitAction = require('./actions/ext/precommit')
program.command('precommit')
  .description('DEPRECATED: moved to [dotenvx ext precommit]')
  .addHelpText('after', examples.precommit)
  .option('-i, --install', 'install to .git/hooks/pre-commit')
  .action(function (...args) {
    logger.warn('DEPRECATION NOTICE: [precommit] has moved to [dotenvx ext precommit]')

    precommitAction.apply(this, args)
  })

// override helpInformation to hide DEPRECATED and 'ext' commands
program.helpInformation = function () {
  const originalHelp = Command.prototype.helpInformation.call(this)
  const lines = originalHelp.split('\n')

  removeDynamicHelpSection(lines)
  removeOptionsHelpParts(lines)

  // Filter out the hidden command from the help output
  const filteredLines = lines.filter(line =>
    !line.includes('DEPRECATED') &&
    !line.includes('help [command]') &&
    !line.includes('🔌 extensions')
  )

  return filteredLines.join('\n')
}
/* c8 ignore stop */

program.parse(process.argv)
