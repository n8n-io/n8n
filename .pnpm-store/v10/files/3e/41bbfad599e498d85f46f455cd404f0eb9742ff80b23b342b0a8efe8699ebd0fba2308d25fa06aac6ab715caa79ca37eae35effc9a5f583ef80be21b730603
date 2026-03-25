'use strict'
const { v4: uuidv4 } = require('uuid');
const archy = require('archy')
const libCoverage = require('istanbul-lib-coverage')
const {dirname, resolve} = require('path')
const {promisify} = require('util')
/* Shallow clone so we can promisify in-place */
const fs = { ...require('fs') }
const {spawn} = require('cross-spawn')
const rimraf = promisify(require('rimraf'))
const pMap = require('p-map')

const _nodes = Symbol('nodes')
const _label = Symbol('label')
const _coverageMap = Symbol('coverageMap')
const _processInfoDirectory = Symbol('processInfo.directory')
// shared symbol for testing
const _spawnArgs = Symbol.for('spawnArgs')

;['writeFile', 'readFile', 'readdir'].forEach(fn => {
  fs[fn] = promisify(fs[fn])
})

// the enumerable fields
const defaults = () => ({
  parent: null,
  pid: process.pid,
  argv: process.argv,
  execArgv: process.execArgv,
  cwd: process.cwd(),
  time: Date.now(),
  ppid: process.ppid,
  coverageFilename: null,
  externalId: '',
  [_nodes]: [],
  [_label]: null,
  [_coverageMap]: null
})

/* istanbul ignore next */
const fromEntries = Object.fromEntries || (
  entries => entries.reduce((obj, [name, value]) => {
    obj[name] = value
    return obj
  }, {})
)

class ProcessInfo {
  constructor (fields = {}) {
    Object.assign(this, defaults(), fields)

    if (!this.uuid) {
      this.uuid = uuidv4()
    }
  }

  get nodes () {
    return this[_nodes]
  }

  set nodes (n) {
    this[_nodes] = n
  }

  set directory (d) {
    this[_processInfoDirectory] = resolve(d)
  }

  get directory () {
    return this[_processInfoDirectory]
  }

  saveSync () {
    const f = resolve(this.directory, this.uuid + '.json')
    fs.writeFileSync(f, JSON.stringify(this), 'utf-8')
  }

  async save () {
    const f = resolve(this.directory, this.uuid + '.json')
    await fs.writeFile(f, JSON.stringify(this), 'utf-8')
  }

  async getCoverageMap (nyc) {
    if (this[_coverageMap]) {
      return this[_coverageMap]
    }

    const childMaps = await Promise.all(this.nodes.map(child => child.getCoverageMap(nyc)))

    this[_coverageMap] = await mapMerger(nyc, this.coverageFilename, childMaps)

    return this[_coverageMap]
  }

  get label () {
    if (this[_label]) {
      return this[_label]
    }

    const covInfo = this[_coverageMap]
      ? '\n  ' + this[_coverageMap].getCoverageSummary().lines.pct + ' % Lines'
      : ''

    return this[_label] = this.argv.join(' ') + covInfo
  }
}

const mapMerger = async (nyc, filename, maps) => {
  const map = libCoverage.createCoverageMap({})
  if (filename) {
    map.merge(await nyc.coverageFileLoad(filename))
  }
  maps.forEach(otherMap => map.merge(otherMap))
  return map
}

// Operations on the processinfo database as a whole,
// and the root of the tree rendering operation.
class ProcessDB {
  constructor (directory) {
    if (!directory) {
      const nycConfig = process.env.NYC_CONFIG;
      if (nycConfig) {
        directory = resolve(JSON.parse(nycConfig).tempDir, 'processinfo')
      }

      if (!directory) {
        throw new TypeError('must provide directory argument when outside of NYC')
      }
    }

    Object.defineProperty(this, 'directory', { get: () => directory, enumerable: true })
    this.nodes = []
    this[_label] = null
    this[_coverageMap] = null
  }

  get label () {
    if (this[_label]) {
      return this[_label]
    }

    const covInfo = this[_coverageMap]
      ? '\n  ' + this[_coverageMap].getCoverageSummary().lines.pct + ' % Lines'
      : ''

    return this[_label] = 'nyc' + covInfo
  }

  async getCoverageMap (nyc) {
    if (this[_coverageMap]) {
      return this[_coverageMap]
    }

    const childMaps = await Promise.all(this.nodes.map(child => child.getCoverageMap(nyc)))
    this[_coverageMap] = await mapMerger(nyc, undefined, childMaps)
    return this[_coverageMap]
  }

  async renderTree (nyc) {
    await this.buildProcessTree()
    await this.getCoverageMap(nyc)

    return archy(this)
  }

  async buildProcessTree () {
    const infos = await this.readProcessInfos(this.directory)
    const index = await this.readIndex()
    for (const id in index.processes) {
      const node = infos[id]
      if (!node) {
        throw new Error(`Invalid entry in processinfo index: ${id}`)
      }
      const idx = index.processes[id]
      node.nodes = idx.children.map(id => infos[id])
        .sort((a, b) => a.time - b.time)
      if (!node.parent) {
        this.nodes.push(node)
      }
    }
  }

  async _readJSON (file) {
    if (Array.isArray(file)) {
      const result = await pMap(
        file,
        f => this._readJSON(f),
        { concurrency: 8 }
      )
      return result.filter(Boolean)
    }

    try {
      return JSON.parse(await fs.readFile(resolve(this.directory, file), 'utf-8'))
    } catch (error) {
    }
  }

  async readProcessInfos () {
    const files = await fs.readdir(this.directory)
    const fileData = await this._readJSON(files.filter(f => f !== 'index.json'))

    return fromEntries(fileData.map(info => [
      info.uuid,
      new ProcessInfo(info)
    ]))
  }

  _createIndex (infos) {
    const infoMap = fromEntries(infos.map(info => [
      info.uuid,
      Object.assign(info, {children: []})
    ]))

    // create all the parent-child links
    infos.forEach(info => {
      if (info.parent) {
        const parentInfo = infoMap[info.parent]
        if (parentInfo && !parentInfo.children.includes(info.uuid)) {
          parentInfo.children.push(info.uuid)
        }
      }
    })

    // figure out which files were touched by each process.
    const files = infos.reduce((files, info) => {
      info.files.forEach(f => {
        files[f] = files[f] || []
        if (!files[f].includes(info.uuid)) {
          files[f].push(info.uuid)
        }
      })
      return files
    }, {})

    const processes = fromEntries(infos.map(info => [
      info.uuid,
      {
        parent: info.parent,
        ...(info.externalId ? { externalId: info.externalId } : {}),
        children: Array.from(info.children)
      }
    ]))

    const eidList = new Set()
    const externalIds = fromEntries(infos.filter(info => info.externalId).map(info => {
      if (eidList.has(info.externalId)) {
        throw new Error(
          `External ID ${info.externalId} used by multiple processes`)
      }

      eidList.add(info.externalId)

      const children = Array.from(info.children)
      // flatten the descendant sets of all the externalId procs
      // push the next generation onto the list so we accumulate them all
      for (let i = 0; i < children.length; i++) {
        children.push(...processes[children[i]].children.filter(uuid => !children.includes(uuid)))
      }

      return [
        info.externalId,
        {
          root: info.uuid,
          children
        }
      ]
    }))

    return { processes, files, externalIds }
  }

  async writeIndex () {
    const {directory} = this
    const files = await fs.readdir(directory)
    const infos = await this._readJSON(files.filter(f => f !== 'index.json'))
    const index = this._createIndex(infos)
    const indexFile = resolve(directory, 'index.json')
    await fs.writeFile(indexFile, JSON.stringify(index))

    return index
  }

  async readIndex () {
    return await this._readJSON('index.json') || await this.writeIndex()
  }

  // delete all coverage and processinfo for a given process
  // Warning!  Doing this makes the index out of date, so make sure
  // to update it when you're done!
  // Not multi-process safe, because it cannot be done atomically.
  async expunge (id) {
    const index = await this.readIndex()
    const entry = index.externalIds[id]
    if (!entry) {
      return
    }

    await pMap(
      [].concat(
        `${dirname(this.directory)}/${entry.root}.json`,
        `${this.directory}/${entry.root}.json`,
        ...entry.children.map(c => [
          `${dirname(this.directory)}/${c}.json`,
          `${this.directory}/${c}.json`
        ])
      ),
      f => rimraf(f),
      { concurrency: 8 }
    )
  }

  [_spawnArgs] (name, file, args, options) {
    if (!Array.isArray(args)) {
      options = args
      args = []
    }
    if (!options) {
      options = {}
    }

    if (!process.env.NYC_CONFIG) {
      const nyc = options.nyc || 'nyc'
      const nycArgs = options.nycArgs || []
      args = [...nycArgs, file, ...args]
      file = nyc
    }

    options.env = {
      ...(options.env || process.env),
      NYC_PROCESSINFO_EXTERNAL_ID: name
    }

    return [name, file, args, options]
  }

  // spawn an externally named process
  async spawn (...spawnArgs) {
    const [name, file, args, options] = this[_spawnArgs](...spawnArgs)
    await this.expunge(name)
    return spawn(file, args, options)
  }
}

exports.ProcessDB = ProcessDB
exports.ProcessInfo = ProcessInfo
