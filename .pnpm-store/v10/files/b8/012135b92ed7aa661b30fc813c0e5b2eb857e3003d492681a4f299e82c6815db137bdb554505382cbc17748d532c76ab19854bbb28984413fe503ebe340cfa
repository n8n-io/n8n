const fs = require('fs')

function detectEncoding (filepath) {
  const buffer = fs.readFileSync(filepath)

  // check for UTF-16LE BOM (Byte Order Mark)
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'utf16le'
  }

  /* c8 ignore start */
  // check for UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf8'
  }

  /* c8 ignore stop */

  return 'utf8'
}

module.exports = detectEncoding
