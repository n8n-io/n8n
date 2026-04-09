#!/usr/bin/env node
'use strict'

const { parseArgs } = require('node:util')
const { safeRegex } = require('../index.js')

const { version } = require('../package.json')

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    version: {
      type: 'boolean',
      short: 'v',
      default: false,
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false,
    }
  },
})

function help () {
  console.log(`Usage: safe-regex2 [options] <regex>

Check if a regular expression is safe to use in a production environment.

Options:
  -v, --version          Display the version number
  -h, --help             Display this help message
  <regex>                The regular expression to check`
  )
}

if (options.help) {
  help()
} else if (options.version) {
  console.log(version)
} else {
  if (positionals.length === 0) {
    help()
  } else if (positionals.length > 1) {
    console.error('Error: Too many positional arguments.')
    help()
  } else {
    const regex = positionals[0]
    const isSafe = safeRegex(regex)
    if (isSafe === false) {
      console.error('Provided regex is invalid or unsafe.')
      process.exit(1)
    } else {
      console.log('Provided regex is safe.')
      process.exit(0)
    }
  }
}
