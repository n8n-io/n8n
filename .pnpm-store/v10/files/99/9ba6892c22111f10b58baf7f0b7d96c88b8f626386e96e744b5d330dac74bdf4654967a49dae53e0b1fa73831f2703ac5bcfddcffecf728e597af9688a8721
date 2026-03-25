/* eslint-disable node/no-deprecated-api */

'use strict'

const semver = require('semver')
const url = require('url')
const path = require('path')
const log = require('npmlog')

// versions where -headers.tar.gz started shipping
const headersTarballRange = '>= 3.0.0 || ~0.12.10 || ~0.10.42'
const bitsre = /\/win-(x86|x64|arm64)\//
const bitsreV3 = /\/win-(x86|ia32|x64)\// // io.js v3.x.x shipped with "ia32" but should
// have been "x86"

// Captures all the logic required to determine download URLs, local directory and
// file names. Inputs come from command-line switches (--target, --dist-url),
// `process.version` and `process.release` where it exists.
function processRelease (argv, gyp, defaultVersion, defaultRelease) {
  var version = (semver.valid(argv[0]) && argv[0]) || gyp.opts.target || defaultVersion
  var versionSemver = semver.parse(version)
  var overrideDistUrl = gyp.opts['dist-url'] || gyp.opts.disturl
  var isDefaultVersion
  var isNamedForLegacyIojs
  var name
  var distBaseUrl
  var baseUrl
  var libUrl32
  var libUrl64
  var libUrlArm64
  var tarballUrl
  var canGetHeaders

  if (!versionSemver) {
    // not a valid semver string, nothing we can do
    return { version: version }
  }
  // flatten version into String
  version = versionSemver.version

  // defaultVersion should come from process.version so ought to be valid semver
  isDefaultVersion = version === semver.parse(defaultVersion).version

  // can't use process.release if we're using --target=x.y.z
  if (!isDefaultVersion) {
    defaultRelease = null
  }

  if (defaultRelease) {
    // v3 onward, has process.release
    name = defaultRelease.name.replace(/io\.js/, 'iojs') // remove the '.' for directory naming purposes
  } else {
    // old node or alternative --target=
    // semver.satisfies() doesn't like prerelease tags so test major directly
    isNamedForLegacyIojs = versionSemver.major >= 1 && versionSemver.major < 4
    // isNamedForLegacyIojs is required to support Electron < 4 (in particular Electron 3)
    // as previously this logic was used to ensure "iojs" was used to download iojs releases
    // and "node" for node releases.  Unfortunately the logic was broad enough that electron@3
    // published release assets as "iojs" so that the node-gyp logic worked.  Once Electron@3 has
    // been EOL for a while (late 2019) we should remove this hack.
    name = isNamedForLegacyIojs ? 'iojs' : 'node'
  }

  // check for the nvm.sh standard mirror env variables
  if (!overrideDistUrl && process.env.NODEJS_ORG_MIRROR) {
    overrideDistUrl = process.env.NODEJS_ORG_MIRROR
  }

  if (overrideDistUrl) {
    log.verbose('download', 'using dist-url', overrideDistUrl)
  }

  if (overrideDistUrl) {
    distBaseUrl = overrideDistUrl.replace(/\/+$/, '')
  } else {
    distBaseUrl = 'https://nodejs.org/dist'
  }
  distBaseUrl += '/v' + version + '/'

  // new style, based on process.release so we have a lot of the data we need
  if (defaultRelease && defaultRelease.headersUrl && !overrideDistUrl) {
    baseUrl = url.resolve(defaultRelease.headersUrl, './')
    libUrl32 = resolveLibUrl(name, defaultRelease.libUrl || baseUrl || distBaseUrl, 'x86', versionSemver.major)
    libUrl64 = resolveLibUrl(name, defaultRelease.libUrl || baseUrl || distBaseUrl, 'x64', versionSemver.major)
    libUrlArm64 = resolveLibUrl(name, defaultRelease.libUrl || baseUrl || distBaseUrl, 'arm64', versionSemver.major)
    tarballUrl = defaultRelease.headersUrl
  } else {
    // older versions without process.release are captured here and we have to make
    // a lot of assumptions, additionally if you --target=x.y.z then we can't use the
    // current process.release
    baseUrl = distBaseUrl
    libUrl32 = resolveLibUrl(name, baseUrl, 'x86', versionSemver.major)
    libUrl64 = resolveLibUrl(name, baseUrl, 'x64', versionSemver.major)
    libUrlArm64 = resolveLibUrl(name, baseUrl, 'arm64', versionSemver.major)

    // making the bold assumption that anything with a version number >3.0.0 will
    // have a *-headers.tar.gz file in its dist location, even some frankenstein
    // custom version
    canGetHeaders = semver.satisfies(versionSemver, headersTarballRange)
    tarballUrl = url.resolve(baseUrl, name + '-v' + version + (canGetHeaders ? '-headers' : '') + '.tar.gz')
  }

  return {
    version: version,
    semver: versionSemver,
    name: name,
    baseUrl: baseUrl,
    tarballUrl: tarballUrl,
    shasumsUrl: url.resolve(baseUrl, 'SHASUMS256.txt'),
    versionDir: (name !== 'node' ? name + '-' : '') + version,
    ia32: {
      libUrl: libUrl32,
      libPath: normalizePath(path.relative(url.parse(baseUrl).path, url.parse(libUrl32).path))
    },
    x64: {
      libUrl: libUrl64,
      libPath: normalizePath(path.relative(url.parse(baseUrl).path, url.parse(libUrl64).path))
    },
    arm64: {
      libUrl: libUrlArm64,
      libPath: normalizePath(path.relative(url.parse(baseUrl).path, url.parse(libUrlArm64).path))
    }
  }
}

function normalizePath (p) {
  return path.normalize(p).replace(/\\/g, '/')
}

function resolveLibUrl (name, defaultUrl, arch, versionMajor) {
  var base = url.resolve(defaultUrl, './')
  var hasLibUrl = bitsre.test(defaultUrl) || (versionMajor === 3 && bitsreV3.test(defaultUrl))

  if (!hasLibUrl) {
    // let's assume it's a baseUrl then
    if (versionMajor >= 1) {
      return url.resolve(base, 'win-' + arch + '/' + name + '.lib')
    }
    // prior to io.js@1.0.0 32-bit node.lib lives in /, 64-bit lives in /x64/
    return url.resolve(base, (arch === 'x86' ? '' : arch + '/') + name + '.lib')
  }

  // else we have a proper url to a .lib, just make sure it's the right arch
  return defaultUrl.replace(versionMajor === 3 ? bitsreV3 : bitsre, '/win-' + arch + '/')
}

module.exports = processRelease
