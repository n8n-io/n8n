'use strict'
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const packageVersions = new Map()

/**
 * Retrieves the version of a package from its package.json file.
 * If the package.json file cannot be read, it defaults to the Node.js version.
 * @param {string} baseDir - The base directory where the package.json file is located.
 * @returns {string} The version of the package or the Node.js version if the package.json cannot be read.
 */
function getPackageVersion(baseDir) {
  if (packageVersions.has(baseDir)) {
    return packageVersions.get(baseDir)
  }

  try {
    const packageJsonPath = join(baseDir, 'package.json')
    const jsonFile = readFileSync(packageJsonPath)
    const { version } = JSON.parse(jsonFile)
    packageVersions.set(baseDir, version)
    return version
  } catch {
    return process.version.slice(1)
  }
}

module.exports = getPackageVersion

