'use strict';

const path = require('path')
const {debug} = require("../debug")
const {getExeBasename} = require("../exe-type")
const whichOrUndefined = require("../which-or-undefined")

/**
 * Intercepts Node spawned processes.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {import("../munge").InternalSpawnOptions} Original internal spawn options.
 * @return {import("../munge").InternalSpawnOptions} Updated internal spawn options.
 */
function mungeNode(workingDir, options) {
  // Remember the original Node command to use it in the shim
  const originalNode = options.file

  const command = getExeBasename(options.file)
  // make sure it has a main script.
  // otherwise, just let it through.
  let a = 0
  let hasMain = false
  let mainIndex = 1
  for (a = 1; !hasMain && a < options.args.length; a++) {
    switch (options.args[a]) {
      case '-p':
      case '-i':
      case '--interactive':
      case '--eval':
      case '-e':
      case '-pe':
        hasMain = false
        a = options.args.length
        continue

      case '-r':
      case '--require':
        a += 1
        continue

      default:
        // TODO: Double-check this part
        if (options.args[a].startsWith('-')) {
          continue
        } else {
          hasMain = true
          mainIndex = a
          a = options.args.length
          break
        }
    }
  }

  const newArgs = [...options.args];
  let newFile = options.file;

  if (hasMain) {
    const replace = path.join(workingDir, command)
    newArgs.splice(mainIndex, 0, replace)
  }

  // If the file is just something like 'node' then that'll
  // resolve to our shim, and so to prevent double-shimming, we need
  // to resolve that here first.
  // This also handles the case where there's not a main file, like
  // `node -e 'program'`, where we want to avoid the shim entirely.
  if (options.file === command) {
    const realNode = whichOrUndefined(options.file) || process.execPath
    newArgs[0] = realNode
    newFile = realNode
  }

  debug('mungeNode after', options.file, options.args)

  return {...options, file: newFile, args: newArgs, originalNode};
}

module.exports = mungeNode
