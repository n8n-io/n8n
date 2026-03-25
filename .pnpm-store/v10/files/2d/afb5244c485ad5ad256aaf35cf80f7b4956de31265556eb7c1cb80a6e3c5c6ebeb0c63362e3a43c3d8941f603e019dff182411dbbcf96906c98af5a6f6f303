'use strict';

const isWindows = require("is-windows")
const path = require("path")

function isCmd(file) {
  const comspec = path.basename(process.env.comspec || '').replace(/\.exe$/i, '')
  return isWindows() && (file === comspec || /^cmd(?:\.exe)?$/i.test(file))
}

function isNode(file) {
  const cmdname = path.basename(process.execPath).replace(/\.exe$/i, '')
  return file === 'node' || cmdname === file
}

function isNpm(file) {
  // XXX is this even possible/necessary?
  // wouldn't npm just be detected as a node shebang?
  return file === 'npm' && !isWindows()
}

function isSh(file) {
  return ['dash', 'sh', 'bash', 'zsh'].includes(file)
}

/**
 * Returns the basename of the executable.
 *
 * On Windows, strips the `.exe` extension (if any) and normalizes the name to
 * lowercase.
 *
 * @param exePath {string} Path of the executable as passed to spawned processes:
 *   either command or a path to a file.
 * @return {string} Basename of the executable.
 */
function getExeBasename(exePath) {
  const baseName = path.basename(exePath);
  if (isWindows()) {
    // Stripping `.exe` seems to be enough for our usage. We may eventually
    // want to handle all executable extensions (such as `.bat` or `.cmd`).
    return baseName.replace(/\.exe$/i, "").toLowerCase();
  } else {
    return baseName;
  }
}

module.exports = {
  isCmd,
  isNode,
  isNpm,
  isSh,
  getExeBasename,
}
