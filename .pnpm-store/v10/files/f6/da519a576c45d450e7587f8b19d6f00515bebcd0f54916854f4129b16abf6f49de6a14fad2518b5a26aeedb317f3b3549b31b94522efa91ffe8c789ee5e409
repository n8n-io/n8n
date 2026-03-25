const { readFile, lstat, readdir } = require('fs/promises')
const parse = require('json-parse-even-better-errors')
const normalizePackageBin = require('npm-normalize-package-bin')
const { resolve, dirname, join, relative } = require('path')

const rpj = path => readFile(path, 'utf8')
  .then(data => readBinDir(path, normalize(stripUnderscores(parse(data)))))
  .catch(er => {
    er.path = path
    throw er
  })

// load the directories.bin folder as a 'bin' object
const readBinDir = async (path, data) => {
  if (data.bin) {
    return data
  }

  const m = data.directories && data.directories.bin
  if (!m || typeof m !== 'string') {
    return data
  }

  // cut off any monkey business, like setting directories.bin
  // to ../../../etc/passwd or /etc/passwd or something like that.
  const root = dirname(path)
  const dir = join('.', join('/', m))
  data.bin = await walkBinDir(root, dir, {})
  return data
}

const walkBinDir = async (root, dir, obj) => {
  const entries = await readdir(resolve(root, dir)).catch(() => [])
  for (const entry of entries) {
    if (entry.charAt(0) === '.') {
      continue
    }
    const f = resolve(root, dir, entry)
    // ignore stat errors, weird file types, symlinks, etc.
    const st = await lstat(f).catch(() => null)
    if (!st) {
      continue
    } else if (st.isFile()) {
      obj[entry] = relative(root, f)
    } else if (st.isDirectory()) {
      await walkBinDir(root, join(dir, entry), obj)
    }
  }
  return obj
}

// do not preserve _fields set in files, they are sus
const stripUnderscores = data => {
  for (const key of Object.keys(data).filter(k => /^_/.test(k))) {
    delete data[key]
  }
  return data
}

const normalize = data => {
  addId(data)
  fixBundled(data)
  pruneRepeatedOptionals(data)
  fixScripts(data)
  fixFunding(data)
  normalizePackageBin(data)
  return data
}

rpj.normalize = normalize

const addId = data => {
  if (data.name && data.version) {
    data._id = `${data.name}@${data.version}`
  }
  return data
}

// it was once common practice to list deps both in optionalDependencies
// and in dependencies, to support npm versions that did not know abbout
// optionalDependencies.  This is no longer a relevant need, so duplicating
// the deps in two places is unnecessary and excessive.
const pruneRepeatedOptionals = data => {
  const od = data.optionalDependencies
  const dd = data.dependencies || {}
  if (od && typeof od === 'object') {
    for (const name of Object.keys(od)) {
      delete dd[name]
    }
  }
  if (Object.keys(dd).length === 0) {
    delete data.dependencies
  }
  return data
}

const fixBundled = data => {
  const bdd = data.bundledDependencies
  const bd = data.bundleDependencies === undefined ? bdd
    : data.bundleDependencies

  if (bd === false) {
    data.bundleDependencies = []
  } else if (bd === true) {
    data.bundleDependencies = Object.keys(data.dependencies || {})
  } else if (bd && typeof bd === 'object') {
    if (!Array.isArray(bd)) {
      data.bundleDependencies = Object.keys(bd)
    } else {
      data.bundleDependencies = bd
    }
  } else {
    delete data.bundleDependencies
  }

  delete data.bundledDependencies
  return data
}

const fixScripts = data => {
  if (!data.scripts || typeof data.scripts !== 'object') {
    delete data.scripts
    return data
  }

  for (const [name, script] of Object.entries(data.scripts)) {
    if (typeof script !== 'string') {
      delete data.scripts[name]
    }
  }
  return data
}

const fixFunding = data => {
  if (data.funding && typeof data.funding === 'string') {
    data.funding = { url: data.funding }
  }
  return data
}

module.exports = rpj
