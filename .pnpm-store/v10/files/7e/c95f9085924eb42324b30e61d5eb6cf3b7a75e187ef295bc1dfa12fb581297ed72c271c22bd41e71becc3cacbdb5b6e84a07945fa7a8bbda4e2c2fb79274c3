'use strict';

const path = require("path")
const {debug} = require("../debug")
const whichOrUndefined = require("../which-or-undefined")

/**
 * Intercepts npm spawned processes.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {import("../munge").InternalSpawnOptions} Original internal spawn options.
 * @return {import("../munge").InternalSpawnOptions} Updated internal spawn options.
 */
function mungeNpm(workingDir, options) {
  debug('munge npm')
  // XXX weird effects of replacing a specific npm with a global one
  const npmPath = whichOrUndefined('npm')

  if (npmPath === undefined) {
    return {...options};
  }

  const newArgs = [...options.args]

  newArgs[0] = npmPath
  const file = path.join(workingDir, 'node')
  newArgs.unshift(file)

  return {...options, file, args: newArgs}
}

module.exports = mungeNpm
