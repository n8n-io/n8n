const fs = require('fs')

const ENCODING = 'utf8'

function readFileX (filepath, encoding = null) {
  if (!encoding) {
    encoding = ENCODING
  }

  return fs.readFileSync(filepath, encoding) // utf8 default so it returns a string
}

function writeFileX (filepath, str) {
  return fs.writeFileSync(filepath, str, ENCODING) // utf8 always
}

const fsx = {
  chmodSync: fs.chmodSync,
  existsSync: fs.existsSync,
  readdirSync: fs.readdirSync,
  readFileSync: fs.readFileSync,
  writeFileSync: fs.writeFileSync,
  appendFileSync: fs.appendFileSync,

  // fsx special commands
  readFileX,
  writeFileX
}

module.exports = fsx
