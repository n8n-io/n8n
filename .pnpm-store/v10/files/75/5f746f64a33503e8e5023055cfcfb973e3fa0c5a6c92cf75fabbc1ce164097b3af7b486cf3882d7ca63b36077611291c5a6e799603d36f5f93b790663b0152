const semver = require('semver')

const satisfies = (range) => {
  return semver.satisfies(process.version, range, { includePrerelease: true })
}

module.exports = {
  satisfies,
}
