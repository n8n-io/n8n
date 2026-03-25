'use strict';

const isWindows = require("is-windows")
const path = require("path")
const homedir = require("../homedir")

const pathRe = isWindows() ? /^PATH=/i : /^PATH=/;

/**
 * Updates the environment variables to intercept `node` commands and pass down options.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {import("../munge").InternalSpawnOptions} Original internal spawn options.
 * @return {import("../munge").InternalSpawnOptions} Updated internal spawn options.
 */
function mungeEnv(workingDir, options) {
  let pathEnv

  const envPairs = options.envPairs.map((ep) => {
    if (pathRe.test(ep)) {
      // `PATH` env var: prefix its value with `workingDir`
      // `5` corresponds to the length of `PATH=`
      pathEnv = ep.substr(5)
      const k = ep.substr(0, 5)
      return k + workingDir + path.delimiter + pathEnv
    } else {
      // Return as-is
      return ep;
    }
  });

  if (pathEnv === undefined) {
    envPairs.push((isWindows() ? 'Path=' : 'PATH=') + workingDir)
  }
  if (options.originalNode) {
    const key = path.basename(workingDir).substr('.node-spawn-wrap-'.length)
    envPairs.push('SW_ORIG_' + key + '=' + options.originalNode)
  }

  envPairs.push('SPAWN_WRAP_SHIM_ROOT=' + homedir)

  if (process.env.SPAWN_WRAP_DEBUG === '1') {
    envPairs.push('SPAWN_WRAP_DEBUG=1')
  }

  return {...options, envPairs};
}

module.exports = mungeEnv
