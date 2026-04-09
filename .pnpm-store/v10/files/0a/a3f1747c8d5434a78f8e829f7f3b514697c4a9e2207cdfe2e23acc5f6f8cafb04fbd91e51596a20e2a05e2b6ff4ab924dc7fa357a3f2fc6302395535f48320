const path = require('path')

function localDisplayPath (filepath) {
  if (!filepath) return '.env.keys'
  if (!path.isAbsolute(filepath)) return filepath

  const relative = path.relative(process.cwd(), filepath)
  return relative || path.basename(filepath)
}

module.exports = localDisplayPath
