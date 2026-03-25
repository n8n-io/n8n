'use strict'

const { Parser } = require('yargs/yargs')
const commands = [
  'report',
  'check-coverage',
  'instrument',
  'merge'
]

module.exports = {
  // don't pass arguments that are meant
  // for nyc to the bin being instrumented.
  hideInstrumenterArgs: function (yargv) {
    var argv = process.argv.slice(1)
    argv = argv.slice(argv.indexOf(yargv._[0]))
    if (argv[0][0] === '-') {
      argv.unshift(process.execPath)
    }
    return argv
  },
  // don't pass arguments for the bin being
  // instrumented to nyc.
  hideInstrumenteeArgs: function () {
    var argv = process.argv.slice(2)
    var yargv = Parser(argv)
    if (!yargv._.length) return argv
    for (var i = 0, command; (command = yargv._[i]) !== undefined; i++) {
      if (~commands.indexOf(command)) return argv
    }

    // drop all the arguments after the bin being
    // instrumented by nyc.
    argv = argv.slice(0, argv.indexOf(yargv._[0]))
    argv.push(yargv._[0])

    return argv
  }
}
