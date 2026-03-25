'use strict'

// This module should *only* be loaded as a main script
// by child processes wrapped by spawn-wrap.  It sets up
// argv to include the injected argv (including the user's
// wrapper script) and any environment variables specified.
//
// If any argv were passed in (ie, if it's used to force
// a wrapper script, and not just ensure that an env is kept
// around through all the child procs), then we also set up
// a require('spawn-wrap').runMain() function that will strip
// off the injected arguments and run the main file.

// wrap in iife for babylon to handle module-level return
;(function () {

  if (module !== require.main) {
    throw new Error('spawn-wrap: cli wrapper invoked as non-main script')
  }

  const Module = require('module')
  const path = require('path')
  const settings = require('./settings.json')
  const {debug} = require(settings.deps.debug)

  debug('shim', [process.argv[0]].concat(process.execArgv, process.argv.slice(1)))

  const foregroundChild = require(settings.deps.foregroundChild)
  const IS_WINDOWS = settings.isWindows
  const argv = settings.argv
  const nargs = argv.length
  const env = settings.env
  const key = settings.key
  const node = process.env['SW_ORIG_' + key] || process.execPath

  Object.assign(process.env, env)

  const needExecArgv = settings.execArgv || []

  // If the user added their OWN wrapper pre-load script, then
  // this will pop that off of the argv, and load the "real" main
  function runMain () {
    debug('runMain pre', process.argv)
    process.argv.splice(1, nargs)
    process.argv[1] = path.resolve(process.argv[1])
    delete require.cache[process.argv[1]]
    debug('runMain post', process.argv)
    Module.runMain()
    debug('runMain after')
  }

  // Argv coming in looks like:
  // bin shim execArgv main argv
  //
  // Turn it into:
  // bin settings.execArgv execArgv settings.argv main argv
  //
  // If we don't have a main script, then just run with the necessary
  // execArgv
  let hasMain = false
  for (let a = 2; !hasMain && a < process.argv.length; a++) {
    switch (process.argv[a]) {
      case '-i':
      case '--interactive':
      case '--eval':
      case '-e':
      case '-p':
      case '-pe':
        hasMain = false
        a = process.argv.length
        continue

      case '-r':
      case '--require':
        a += 1
        continue

      default:
        // TODO: Double-check what's going on
        if (process.argv[a].startsWith('-')) {
          continue
        } else {
          hasMain = a
          a = process.argv.length
          break
        }
    }
  }
  debug('after argv parse hasMain=%j', hasMain)

  if (hasMain > 2) {
    // if the main file is above #2, then it means that there
    // was a --exec_arg *before* it.  This means that we need
    // to slice everything from 2 to hasMain, and pass that
    // directly to node.  This also splices out the user-supplied
    // execArgv from the argv.
    const addExecArgv = process.argv.splice(2, hasMain - 2)
    needExecArgv.push(...addExecArgv)
  }

  if (!hasMain) {
    // we got loaded by mistake for a `node -pe script` or something.
    const args = process.execArgv.concat(needExecArgv, process.argv.slice(2))
    debug('no main file!', args)
    foregroundChild(node, args)
    return
  }

  // If there are execArgv, and they're not the same as how this module
  // was executed, then we need to inject those.  This is for stuff like
  // --harmony or --use_strict that needs to be *before* the main
  // module.
  if (needExecArgv.length) {
    const pexec = process.execArgv
    if (JSON.stringify(pexec) !== JSON.stringify(needExecArgv)) {
      debug('need execArgv for this', pexec, '=>', needExecArgv)
      const sargs = pexec.concat(needExecArgv).concat(process.argv.slice(1))
      foregroundChild(node, sargs)
      return
    }
  }

  // At this point, we've verified that we got the correct execArgv,
  // and that we have a main file, and that the main file is sitting at
  // argv[2].  Splice this shim off the list so it looks like the main.
  process.argv.splice(1, 1, ...argv)

  // Unwrap the PATH environment var so that we're not mucking
  // with the environment.  It'll get re-added if they spawn anything
  if (IS_WINDOWS) {
    for (const i in process.env) {
      if (/^path$/i.test(i)) {
        process.env[i] = process.env[i].replace(__dirname + ';', '')
      }
    }
  } else {
    process.env.PATH = process.env.PATH.replace(__dirname + ':', '')
  }

  const spawnWrap = require(settings.module)
  if (nargs) {
    spawnWrap.runMain = function (original) {
      return function () {
        spawnWrap.runMain = original
        runMain()
      }
    }(spawnWrap.runMain)
  }
  spawnWrap(argv, env, __dirname)

  debug('shim runMain', process.argv)
  delete require.cache[process.argv[1]]
  Module.runMain()

// end iife wrapper for babylon
})()
