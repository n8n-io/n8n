'use strict'

const cp = require('child_process') // eslint-disable-line security/detect-child-process
const path = require('path')
const {promisify} = require('util')

const fs = require('graceful-fs')
const flattenDeep = require('lodash.flattendeep')
const hasha = require('hasha')
const releaseZalgo = require('release-zalgo')

const PACKAGE_FILE = require.resolve('./package.json')
const TEN_MEBIBYTE = 1024 * 1024 * 10
const execFile = promisify(cp.execFile)

const readFile = {
  async: promisify(fs.readFile),
  sync: fs.readFileSync
}

const tryReadFile = {
  async (file) {
    return readFile.async(file).catch(() => null)
  },

  sync (file) {
    try {
      return fs.readFileSync(file)
    } catch (err) {
      return null
    }
  }
}

const tryExecFile = {
  async (file, args, options) {
    return execFile(file, args, options)
      .then(({stdout}) => stdout)
      .catch(() => null)
  },

  sync (file, args, options) {
    try {
      return cp.execFileSync(file, args, options)
    } catch (err) {
      return null
    }
  }
}

const git = {
  tryGetRef (zalgo, dir, head) {
    const m = /^ref: (.+)$/.exec(head.toString('utf8').trim())
    if (!m) return null

    return zalgo.run(tryReadFile, path.join(dir, '.git', m[1]))
  },

  tryGetDiff (zalgo, dir) {
    return zalgo.run(tryExecFile,
      'git',
      // Attempt to get consistent output no matter the platform. Diff both
      // staged and unstaged changes.
      ['--no-pager', 'diff', 'HEAD', '--no-color', '--no-ext-diff'],
      {
        cwd: dir,
        maxBuffer: TEN_MEBIBYTE,
        env: Object.assign({}, process.env, {
          // Force the GIT_DIR to prevent git from diffing a parent repository
          // in case the directory isn't actually a repository.
          GIT_DIR: path.join(dir, '.git')
        }),
        // Ignore stderr.
        stdio: ['ignore', 'pipe', 'ignore']
      })
  }
}

function addPackageData (zalgo, pkgPath) {
  const dir = path.dirname(pkgPath)

  return zalgo.all([
    dir,
    zalgo.run(readFile, pkgPath),
    zalgo.run(tryReadFile, path.join(dir, '.git', 'HEAD'))
      .then(head => {
        if (!head) return []

        return zalgo.all([
          zalgo.run(tryReadFile, path.join(dir, '.git', 'packed-refs')),
          git.tryGetRef(zalgo, dir, head),
          git.tryGetDiff(zalgo, dir)
        ])
          .then(results => {
            return [head].concat(results.filter(Boolean))
          })
      })
  ])
}

function computeHash (zalgo, paths, pepper, salt) {
  const inputs = []
  if (pepper) inputs.push(pepper)

  if (typeof salt !== 'undefined') {
    if (Buffer.isBuffer(salt) || typeof salt === 'string') {
      inputs.push(salt)
    } else if (typeof salt === 'object' && salt !== null) {
      inputs.push(JSON.stringify(salt))
    } else {
      throw new TypeError('Salt must be an Array, Buffer, Object or string')
    }
  }

  // TODO: Replace flattenDeep with Array#flat(Infinity) after node.js 10 is dropped
  return zalgo.all(paths.map(pkgPath => addPackageData(zalgo, pkgPath)))
    .then(furtherInputs => hasha(flattenDeep([inputs, furtherInputs]), {algorithm: 'sha256'}))
}

let ownHash = null
let ownHashPromise = null
function run (zalgo, paths, salt) {
  if (!ownHash) {
    return zalgo.run({
      async () {
        if (!ownHashPromise) {
          ownHashPromise = computeHash(zalgo, [PACKAGE_FILE])
        }
        return ownHashPromise
      },
      sync () {
        return computeHash(zalgo, [PACKAGE_FILE])
      }
    })
      .then(hash => {
        ownHash = Buffer.from(hash, 'hex')
        ownHashPromise = null
        return run(zalgo, paths, salt)
      })
  }

  if (paths === PACKAGE_FILE && typeof salt === 'undefined') {
    // Special case that allow the pepper value to be obtained. Mainly here for
    // testing purposes.
    return zalgo.returns(ownHash.toString('hex'))
  }

  paths = Array.isArray(paths) ? paths : [paths]
  return computeHash(zalgo, paths, ownHash, salt)
}

module.exports = (paths, salt) => {
  try {
    return run(releaseZalgo.async(), paths, salt)
  } catch (err) {
    return Promise.reject(err)
  }
}
module.exports.sync = (paths, salt) => {
  const result = run(releaseZalgo.sync(), paths, salt)
  return releaseZalgo.unwrapSync(result)
}
