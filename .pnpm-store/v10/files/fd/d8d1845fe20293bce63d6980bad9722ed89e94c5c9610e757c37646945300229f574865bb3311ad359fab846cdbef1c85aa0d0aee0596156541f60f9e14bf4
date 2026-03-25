import crypto from 'crypto'
import * as sharedState from './sharedState'

/**
 * Calculate the hash of a string.
 *
 * This doesn't need to be cryptographically secure or
 * anything like that since it's used only to detect
 * when the CSS changes to invalidate the context.
 *
 * This is wrapped in a try/catch because it's really dependent
 * on how Node itself is build and the environment and OpenSSL
 * version / build that is installed on the user's machine.
 *
 * Based on the environment this can just outright fail.
 *
 * See https://github.com/nodejs/node/issues/40455
 *
 * @param {string} str
 */
function getHash(str) {
  try {
    return crypto.createHash('md5').update(str, 'utf-8').digest('binary')
  } catch (err) {
    return ''
  }
}

/**
 * Determine if the CSS tree is different from the
 * previous version for the given `sourcePath`.
 *
 * @param {string} sourcePath
 * @param {import('postcss').Node} root
 */
export function hasContentChanged(sourcePath, root) {
  let css = root.toString()

  // We only care about files with @tailwind directives
  // Other files use an existing context
  if (!css.includes('@tailwind')) {
    return false
  }

  let existingHash = sharedState.sourceHashMap.get(sourcePath)
  let rootHash = getHash(css)
  let didChange = existingHash !== rootHash

  sharedState.sourceHashMap.set(sourcePath, rootHash)

  return didChange
}
