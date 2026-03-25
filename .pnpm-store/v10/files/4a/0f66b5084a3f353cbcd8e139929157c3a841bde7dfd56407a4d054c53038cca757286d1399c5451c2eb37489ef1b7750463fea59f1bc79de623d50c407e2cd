'use strict';

const path = require("path")
const whichOrUndefined = require("../which-or-undefined")

/**
 * Intercepts Node and npm processes spawned through Windows' `cmd.exe`.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {import("../munge").InternalSpawnOptions} Original internal spawn options.
 * @return {import("../munge").InternalSpawnOptions} Updated internal spawn options.
 */
function mungeCmd(workingDir, options) {
  const cmdi = options.args.indexOf('/c')
  if (cmdi === -1) {
    return {...options}
  }

  const re = /^\s*("*)([^"]*?\bnode(?:\.exe|\.EXE)?)("*)( .*)?$/
  const npmre = /^\s*("*)([^"]*?\b(?:npm))("*)( |$)/

  const command = options.args[cmdi + 1]
  if (command === undefined) {
    return {...options}
  }

  let newArgs = [...options.args];
  // Remember the original Node command to use it in the shim
  let originalNode;

  let m = command.match(re)
  let replace
  if (m) {
    originalNode = m[2]
    // TODO: Remove `replace`: seems unused
    replace = m[1] + path.join(workingDir, 'node.cmd') + m[3] + m[4]
    newArgs[cmdi + 1] = m[1] + m[2] + m[3] +
      ' "' + path.join(workingDir, 'node') + '"' + m[4]
  } else {
    // XXX probably not a good idea to rewrite to the first npm in the
    // path if it's a full path to npm.  And if it's not a full path to
    // npm, then the dirname will not work properly!
    m = command.match(npmre)
    if (m === null) {
      return {...options}
    }

    let npmPath = whichOrUndefined('npm') || 'npm'
    npmPath = path.join(path.dirname(npmPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
    replace = m[1] + '"' + path.join(workingDir, 'node.cmd') + '"' +
      ' "' + npmPath + '"' +
      m[3] + m[4]
    newArgs[cmdi + 1] = command.replace(npmre, replace)
  }

  return {...options, args: newArgs, originalNode};
}

module.exports = mungeCmd
