function escapeForRegex (str) {
  return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d')
}

module.exports = escapeForRegex
