'use strict';

const isWindows = require("is-windows")
const path = require("path")
const {debug} = require("../debug")
const {isNode} = require("../exe-type")
const whichOrUndefined = require("../which-or-undefined")

/**
 * Intercepts Node and npm processes spawned through a Linux shell.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {import("../munge").InternalSpawnOptions} Original internal spawn options.
 * @return {import("../munge").InternalSpawnOptions} Updated internal spawn options.
 */
function mungeSh(workingDir, options) {
  const cmdi = options.args.indexOf('-c')
  if (cmdi === -1) {
    return {...options} // no -c argument
  }

  let c = options.args[cmdi + 1]
  const re = /^\s*((?:[^\= ]*\=[^\=\s]*)*[\s]*)([^\s]+|"[^"]+"|'[^']+')( .*)?$/
  const match = c.match(re)
  if (match === null) {
    return {...options} // not a command invocation.  weird but possible
  }

  let command = match[2]
  // strip quotes off the command
  const quote = command.charAt(0)
  if ((quote === '"' || quote === '\'') && command.endsWith(quote)) {
    command = command.slice(1, -1)
  }
  const exe = path.basename(command)

  let newArgs = [...options.args];
  // Remember the original Node command to use it in the shim
  let originalNode;
  const workingNode = path.join(workingDir, 'node')

  if (isNode(exe)) {
    originalNode = command
    c = `${match[1]}${match[2]} "${workingNode}" ${match[3]}`
    newArgs[cmdi + 1] = c
  } else if (exe === 'npm' && !isWindows()) {
    // XXX this will exhibit weird behavior when using /path/to/npm,
    // if some other npm is first in the path.
    const npmPath = whichOrUndefined('npm')

    if (npmPath) {
      c = c.replace(re, `$1 "${workingNode}" "${npmPath}" $3`)
      newArgs[cmdi + 1] = c
      debug('npm munge!', c)
    }
  }

  return {...options, args: newArgs, originalNode};
}

module.exports = mungeSh
