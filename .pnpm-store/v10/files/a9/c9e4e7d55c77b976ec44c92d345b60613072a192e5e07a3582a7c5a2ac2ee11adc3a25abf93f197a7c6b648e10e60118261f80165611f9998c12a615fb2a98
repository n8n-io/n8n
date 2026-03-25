'use strict'

module.exports = function basename (path) {
  if (typeof path !== 'string') { return '' }
  for (var i = path.length - 1; i >= 0; --i) { // eslint-disable-line no-var
    switch (path.charCodeAt(i)) {
      case 0x2F: // '/'
      case 0x5C: // '\'
        path = path.slice(i + 1)
        return (path === '..' || path === '.' ? '' : path)
    }
  }
  return (path === '..' || path === '.' ? '' : path)
}
