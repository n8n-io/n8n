// pass in a manifest with a 'bin' field here, and it'll turn it
// into a properly santized bin object
const { join, basename } = require('path')

const normalize = pkg =>
  !pkg.bin ? removeBin(pkg)
  : typeof pkg.bin === 'string' ? normalizeString(pkg)
  : Array.isArray(pkg.bin) ? normalizeArray(pkg)
  : typeof pkg.bin === 'object' ? normalizeObject(pkg)
  : removeBin(pkg)

const normalizeString = pkg => {
  if (!pkg.name) {
    return removeBin(pkg)
  }
  pkg.bin = { [pkg.name]: pkg.bin }
  return normalizeObject(pkg)
}

const normalizeArray = pkg => {
  pkg.bin = pkg.bin.reduce((acc, k) => {
    acc[basename(k)] = k
    return acc
  }, {})
  return normalizeObject(pkg)
}

const removeBin = pkg => {
  delete pkg.bin
  return pkg
}

const normalizeObject = pkg => {
  const orig = pkg.bin
  const clean = {}
  let hasBins = false
  Object.keys(orig).forEach(binKey => {
    const base = join('/', basename(binKey.replace(/\\|:/g, '/'))).slice(1)

    if (typeof orig[binKey] !== 'string' || !base) {
      return
    }

    const binTarget = join('/', orig[binKey].replace(/\\/g, '/'))
      .replace(/\\/g, '/').slice(1)

    if (!binTarget) {
      return
    }

    clean[base] = binTarget
    hasBins = true
  })

  if (hasBins) {
    pkg.bin = clean
  } else {
    delete pkg.bin
  }

  return pkg
}

module.exports = normalize
