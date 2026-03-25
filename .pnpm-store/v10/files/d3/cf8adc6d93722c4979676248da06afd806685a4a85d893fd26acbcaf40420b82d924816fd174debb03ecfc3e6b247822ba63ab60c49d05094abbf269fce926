import globParent from 'glob-parent'

// Based on `glob-base`
// https://github.com/micromatch/glob-base/blob/master/index.js
export function parseGlob(pattern) {
  let glob = pattern
  let base = globParent(pattern)

  if (base !== '.') {
    glob = pattern.substr(base.length)
    if (glob.charAt(0) === '/') {
      glob = glob.substr(1)
    }
  }

  if (glob.substr(0, 2) === './') {
    glob = glob.substr(2)
  }
  if (glob.charAt(0) === '/') {
    glob = glob.substr(1)
  }

  return { base, glob }
}
