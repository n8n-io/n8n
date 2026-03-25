#!/usr/bin/env node

const usage = () => `
usage: mkdirp [DIR1,DIR2..] {OPTIONS}

  Create each supplied directory including any necessary parent directories
  that don't yet exist.

  If the directory already exists, do nothing.

OPTIONS are:

  -m<mode>       If a directory needs to be created, set the mode as an octal
  --mode=<mode>  permission string.

  -v --version   Print the mkdirp version number

  -h --help      Print this helpful banner

  -p --print     Print the first directories created for each path provided

  --manual       Use manual implementation, even if native is available
`

const dirs = []
const opts = {}
let print = false
let dashdash = false
let manual = false
for (const arg of process.argv.slice(2)) {
  if (dashdash)
    dirs.push(arg)
  else if (arg === '--')
    dashdash = true
  else if (arg === '--manual')
    manual = true
  else if (/^-h/.test(arg) || /^--help/.test(arg)) {
    console.log(usage())
    process.exit(0)
  } else if (arg === '-v' || arg === '--version') {
    console.log(require('../package.json').version)
    process.exit(0)
  } else if (arg === '-p' || arg === '--print') {
    print = true
  } else if (/^-m/.test(arg) || /^--mode=/.test(arg)) {
    const mode = parseInt(arg.replace(/^(-m|--mode=)/, ''), 8)
    if (isNaN(mode)) {
      console.error(`invalid mode argument: ${arg}\nMust be an octal number.`)
      process.exit(1)
    }
    opts.mode = mode
  } else
    dirs.push(arg)
}

const mkdirp = require('../')
const impl = manual ? mkdirp.manual : mkdirp
if (dirs.length === 0)
  console.error(usage())

Promise.all(dirs.map(dir => impl(dir, opts)))
  .then(made => print ? made.forEach(m => m && console.log(m)) : null)
  .catch(er => {
    console.error(er.message)
    if (er.code)
      console.error('  code: ' + er.code)
    process.exit(1)
  })
