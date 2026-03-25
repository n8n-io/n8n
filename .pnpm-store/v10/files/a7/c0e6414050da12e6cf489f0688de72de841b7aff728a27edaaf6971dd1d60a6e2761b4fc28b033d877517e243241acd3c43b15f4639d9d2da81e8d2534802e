'use strict';

const fs = require("fs")
const path = require("path")
const {isNode} = require("../exe-type")
const whichOrUndefined = require("../which-or-undefined")

/**
 * Intercepts processes spawned through a script with a shebang line.
 *
 * @param workingDir {string} Absolute system-dependent path to the directory containing the shim files.
 * @param options {import("../munge").InternalSpawnOptions} Original internal spawn options.
 * @return {import("../munge").InternalSpawnOptions} Updated internal spawn options.
 */
function mungeShebang(workingDir, options) {
  const resolved = whichOrUndefined(options.file)
  if (resolved === undefined) {
    return {...options}
  }

  const shebang = fs.readFileSync(resolved, 'utf8')
  const match = shebang.match(/^#!([^\r\n]+)/)
  if (!match) {
    return {...options} // not a shebang script, probably a binary
  }

  const shebangbin = match[1].split(' ')[0]
  const maybeNode = path.basename(shebangbin)
  if (!isNode(maybeNode)) {
    return {...options} // not a node shebang, leave untouched
  }

  const originalNode = shebangbin
  const file = shebangbin
  const args = [shebangbin, path.join(workingDir, maybeNode)]
    .concat(resolved)
    .concat(match[1].split(' ').slice(1))
    .concat(options.args.slice(1))

  return {...options, file, args, originalNode};
}

module.exports = mungeShebang
