const { Command } = require('commander')

const examples = require('./../examples')
const executeExtension = require('../../lib/helpers/executeExtension')
const removeDynamicHelpSection = require('../../lib/helpers/removeDynamicHelpSection')

const ext = new Command('ext')

ext
  .description('🔌 extensions')
  .allowUnknownOption()

// list known extensions here you want to display
ext.addHelpText('after', '  vault                             🔐 manage .env.vault files')

ext
  .argument('[command]', 'dynamic ext command')
  .argument('[args...]', 'dynamic ext command arguments')
  .action((command, args, cmdObj) => {
    const rawArgs = process.argv.slice(3) // adjust the index based on where actual args start
    executeExtension(ext, command, rawArgs)
  })

// dotenvx ext ls
ext.command('ls')
  .description('print all .env files in a tree structure')
  .argument('[directory]', 'directory to list .env files from', '.')
  .option('-f, --env-file <filenames...>', 'path(s) to your env file(s)', '.env*')
  .option('-ef, --exclude-env-file <excludeFilenames...>', 'path(s) to exclude from your env file(s) (default: none)')
  .action(require('./../actions/ls'))

// dotenvx ext genexample
ext.command('genexample')
  .description('generate .env.example')
  .argument('[directory]', 'directory to generate from', '.')
  .option('-f, --env-file <paths...>', 'path(s) to your env file(s)', '.env')
  .action(require('./../actions/ext/genexample'))

// dotenvx ext gitignore
ext.command('gitignore')
  .description('append to .gitignore file (and if existing, .dockerignore, .npmignore, and .vercelignore)')
  .addHelpText('after', examples.gitignore)
  .option('--pattern <patterns...>', 'pattern(s) to gitignore', ['.env*'])
  .action(require('./../actions/ext/gitignore'))

// dotenvx ext prebuild
ext.command('prebuild')
  .description('prevent including .env files in docker builds')
  .addHelpText('after', examples.prebuild)
  .argument('[directory]', 'directory to prevent including .env files from', '.')
  .action(require('./../actions/ext/prebuild'))

// dotenvx ext precommit
ext.command('precommit')
  .description('prevent committing .env files to code')
  .addHelpText('after', examples.precommit)
  .argument('[directory]', 'directory to prevent committing .env files from', '.')
  .option('-i, --install', 'install to .git/hooks/pre-commit')
  .action(require('./../actions/ext/precommit'))

// dotenvx scan
ext.command('scan')
  .description('scan for leaked secrets')
  .action(require('./../actions/ext/scan'))

// override helpInformation to hide dynamic commands
ext.helpInformation = function () {
  const originalHelp = Command.prototype.helpInformation.call(this)
  const lines = originalHelp.split('\n')

  removeDynamicHelpSection(lines)

  return lines.join('\n')
}

module.exports = ext
