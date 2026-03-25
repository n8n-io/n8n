#!/usr/bin/env node

const which = require('../lib')
const argv = process.argv.slice(2)

const usage = (err) => {
  if (err) {
    console.error(`which: ${err}`)
  }
  console.error('usage: which [-as] program ...')
  process.exit(1)
}

if (!argv.length) {
  return usage()
}

let dashdash = false
const [commands, flags] = argv.reduce((acc, arg) => {
  if (dashdash || arg === '--') {
    dashdash = true
    return acc
  }

  if (!/^-/.test(arg)) {
    acc[0].push(arg)
    return acc
  }

  for (const flag of arg.slice(1).split('')) {
    if (flag === 's') {
      acc[1].silent = true
    } else if (flag === 'a') {
      acc[1].all = true
    } else {
      usage(`illegal option -- ${flag}`)
    }
  }

  return acc
}, [[], {}])

for (const command of commands) {
  try {
    const res = which.sync(command, { all: flags.all })
    if (!flags.silent) {
      console.log([].concat(res).join('\n'))
    }
  } catch (err) {
    process.exitCode = 1
  }
}
