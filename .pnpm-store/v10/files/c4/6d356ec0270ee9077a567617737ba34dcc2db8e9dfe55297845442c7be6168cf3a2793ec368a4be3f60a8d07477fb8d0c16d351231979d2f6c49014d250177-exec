'use strict'

/* global __coverage__ */

const cachingTransform = require('caching-transform')
const findCacheDir = require('find-cache-dir')
const fs = require('./lib/fs-promises')
const os = require('os')
const { debuglog, promisify } = require('util')
const glob = promisify(require('glob'))
const Hash = require('./lib/hash')
const libCoverage = require('istanbul-lib-coverage')
const libHook = require('istanbul-lib-hook')
const { ProcessInfo, ProcessDB } = require('istanbul-lib-processinfo')
const mkdirp = require('make-dir')
const Module = require('module')
const onExit = require('signal-exit')
const path = require('path')
const rimraf = promisify(require('rimraf'))
const SourceMaps = require('./lib/source-maps')
const TestExclude = require('test-exclude')
const pMap = require('p-map')
const getPackageType = require('get-package-type')

const debugLog = debuglog('nyc')

const nycSelfCoverageHelper = Symbol.for('nyc self-test coverage helper')
/* istanbul ignore next */
const selfCoverageHelper = global[nycSelfCoverageHelper] || {
  // Avoid additional conditional code
  onExit () {}
}

function coverageFinder () {
  var coverage = global.__coverage__
  if (typeof __coverage__ === 'object') coverage = __coverage__
  if (!coverage) coverage = global.__coverage__ = {}
  return coverage
}

class NYC {
  constructor (config) {
    this.config = { ...config }

    this.subprocessBin = config.subprocessBin || path.resolve(__dirname, './bin/nyc.js')
    this._tempDirectory = config.tempDirectory || config.tempDir || './.nyc_output'
    this._instrumenterLib = require(config.instrumenter || './lib/instrumenters/istanbul')
    this._reportDir = config.reportDir || 'coverage'
    this._sourceMap = typeof config.sourceMap === 'boolean' ? config.sourceMap : true
    this._showProcessTree = config.showProcessTree || false
    this._eagerInstantiation = config.eager || false
    this.cwd = config.cwd || process.cwd()
    this.reporter = [].concat(config.reporter || 'text')

    this.cacheDirectory = (config.cacheDir && path.resolve(config.cacheDir)) || findCacheDir({ name: 'nyc', cwd: this.cwd })
    this.cache = Boolean(this.cacheDirectory && config.cache)

    this.extensions = [].concat(config.extension || [])
      .concat('.js')
      .map(ext => ext.toLowerCase())
      .filter((item, pos, arr) => arr.indexOf(item) === pos)

    this.exclude = new TestExclude({
      cwd: this.cwd,
      include: config.include,
      exclude: config.exclude,
      excludeNodeModules: config.excludeNodeModules !== false,
      extension: this.extensions
    })

    this.sourceMaps = new SourceMaps({
      cache: this.cache,
      cacheDirectory: this.cacheDirectory
    })

    // require extensions can be provided as config in package.json.
    this.require = [].concat(config.require || [])

    this.transforms = this.extensions.reduce((transforms, ext) => {
      transforms[ext] = this._createTransform(ext)
      return transforms
    }, {})

    this.hookRequire = config.hookRequire
    this.hookRunInContext = config.hookRunInContext
    this.hookRunInThisContext = config.hookRunInThisContext
    this.fakeRequire = null

    this.processInfo = new ProcessInfo(Object.assign({}, config._processInfo, {
      directory: path.resolve(this.tempDirectory(), 'processinfo')
    }))

    this.hashCache = {}
  }

  _createTransform (ext) {
    const opts = {
      salt: Hash.salt(this.config),
      hashData: (input, metadata) => [metadata.filename],
      filenamePrefix: metadata => path.parse(metadata.filename).name + '-',
      onHash: (input, metadata, hash) => {
        this.hashCache[metadata.filename] = hash
      },
      cacheDir: this.cacheDirectory,
      // when running --all we should not load source-file from
      // cache, we want to instead return the fake source.
      disableCache: this._disableCachingTransform(),
      ext: ext
    }
    if (this._eagerInstantiation) {
      opts.transform = this._transformFactory(this.cacheDirectory)
    } else {
      opts.factory = this._transformFactory.bind(this)
    }
    return cachingTransform(opts)
  }

  _disableCachingTransform () {
    return !(this.cache && this.config.isChildProcess)
  }

  _loadAdditionalModules () {
    if (!this.config.useSpawnWrap || this.require.length === 0) {
      return
    }

    const resolveFrom = require('resolve-from')
    this.require.forEach(requireModule => {
      // Attempt to require the module relative to the directory being instrumented.
      // Then try other locations, e.g. the nyc node_modules folder.
      require(resolveFrom.silent(this.cwd, requireModule) || requireModule)
    })
  }

  instrumenter () {
    return this._instrumenter || (this._instrumenter = this._createInstrumenter())
  }

  _createInstrumenter () {
    return this._instrumenterLib({
      ignoreClassMethods: [].concat(this.config.ignoreClassMethod).filter(a => a),
      produceSourceMap: this.config.produceSourceMap,
      compact: this.config.compact,
      preserveComments: this.config.preserveComments,
      esModules: this.config.esModules,
      parserPlugins: this.config.parserPlugins
    })
  }

  addFile (filename) {
    const source = this._readTranspiledSource(filename)
    this._maybeInstrumentSource(source, filename)
  }

  _readTranspiledSource (filePath) {
    var source = null
    var ext = path.extname(filePath)
    if (typeof Module._extensions[ext] === 'undefined') {
      ext = '.js'
    }
    Module._extensions[ext]({
      _compile: function (content, filename) {
        source = content
      }
    }, filePath)
    return source
  }

  _getSourceMap (code, filename, hash) {
    const sourceMap = {}
    if (this._sourceMap) {
      sourceMap.sourceMap = this.sourceMaps.extract(code, filename)
      sourceMap.registerMap = () => this.sourceMaps.registerMap(filename, hash, sourceMap.sourceMap)
    } else {
      sourceMap.registerMap = () => {}
    }

    return sourceMap
  }

  async addAllFiles () {
    this._loadAdditionalModules()

    this.fakeRequire = true
    const files = await this.exclude.glob(this.cwd)
    for (const relFile of files) {
      const filename = path.resolve(this.cwd, relFile)
      const ext = path.extname(filename)
      if (ext === '.mjs' || (ext === '.js' && await getPackageType(filename) === 'module')) {
        const source = await fs.readFile(filename, 'utf8')
        this.instrumenter().instrumentSync(
          source,
          filename,
          this._getSourceMap(source, filename)
        )
      } else {
        this.addFile(filename)
      }
      const coverage = coverageFinder()
      const lastCoverage = this.instrumenter().lastFileCoverage()
      if (lastCoverage) {
        coverage[lastCoverage.path] = {
          ...lastCoverage,
          // Only use this data if we don't have it without `all: true`
          all: true
        }
      }
    }
    this.fakeRequire = false

    this.writeCoverageFile()
  }

  async instrumentAllFiles (input, output) {
    let inputDir = '.' + path.sep
    const visitor = async relFile => {
      const inFile = path.resolve(inputDir, relFile)
      const inCode = await fs.readFile(inFile, 'utf-8')
      const outCode = this._transform(inCode, inFile) || inCode

      if (output) {
        const { mode } = await fs.stat(inFile)
        const outFile = path.resolve(output, relFile)

        await mkdirp(path.dirname(outFile))
        await fs.writeFile(outFile, outCode)
        await fs.chmod(outFile, mode)
      } else {
        console.log(outCode)
      }
    }

    this._loadAdditionalModules()

    const stats = await fs.lstat(input)
    if (stats.isDirectory()) {
      inputDir = input

      const filesToInstrument = await this.exclude.glob(input)

      const concurrency = output ? os.cpus().length : 1
      if (this.config.completeCopy && output) {
        const files = await glob(path.resolve(input, '**'), {
          dot: true,
          nodir: true,
          ignore: ['**/.git', '**/.git/**', path.join(output, '**')]
        })
        const destDirs = new Set(
          files.map(src => path.dirname(path.join(output, path.relative(input, src))))
        )

        await pMap(
          destDirs,
          dir => mkdirp(dir),
          { concurrency }
        )
        await pMap(
          files,
          src => fs.copyFile(src, path.join(output, path.relative(input, src))),
          { concurrency }
        )
      }

      await pMap(filesToInstrument, visitor, { concurrency })
    } else {
      await visitor(input)
    }
  }

  _transform (code, filename) {
    const extname = path.extname(filename).toLowerCase()
    const transform = this.transforms[extname] || (() => null)

    return transform(code, { filename })
  }

  _maybeInstrumentSource (code, filename) {
    if (!this.exclude.shouldInstrument(filename)) {
      return null
    }

    return this._transform(code, filename)
  }

  maybePurgeSourceMapCache () {
    if (!this.cache) {
      this.sourceMaps.purgeCache()
    }
  }

  _transformFactory (cacheDir) {
    const instrumenter = this.instrumenter()
    let instrumented

    return (code, metadata, hash) => {
      const filename = metadata.filename
      const sourceMap = this._getSourceMap(code, filename, hash)

      try {
        instrumented = instrumenter.instrumentSync(code, filename, sourceMap)
      } catch (e) {
        debugLog('failed to instrument ' + filename + ' with error: ' + e.stack)
        if (this.config.exitOnError) {
          console.error('Failed to instrument ' + filename)
          process.exit(1)
        } else {
          instrumented = code
        }
      }

      if (this.fakeRequire) {
        return 'function x () {}'
      } else {
        return instrumented
      }
    }
  }

  _handleJs (code, options) {
    // ensure the path has correct casing (see istanbuljs/nyc#269 and nodejs/node#6624)
    const filename = path.resolve(this.cwd, options.filename)
    return this._maybeInstrumentSource(code, filename) || code
  }

  _addHook (type) {
    const handleJs = this._handleJs.bind(this)
    const dummyMatcher = () => true // we do all processing in transformer
    libHook['hook' + type](dummyMatcher, handleJs, { extensions: this.extensions })
  }

  _addRequireHooks () {
    if (this.hookRequire) {
      this._addHook('Require')
    }
    if (this.hookRunInContext) {
      this._addHook('RunInContext')
    }
    if (this.hookRunInThisContext) {
      this._addHook('RunInThisContext')
    }
  }

  async createTempDirectory () {
    await mkdirp(this.tempDirectory())
    if (this.cache) {
      await mkdirp(this.cacheDirectory)
    }

    await mkdirp(this.processInfo.directory)
  }

  async reset () {
    if (!process.env.NYC_CWD) {
      await rimraf(this.tempDirectory())
    }

    await this.createTempDirectory()
  }

  _wrapExit () {
    selfCoverageHelper.registered = true

    // we always want to write coverage
    // regardless of how the process exits.
    onExit(
      () => {
        this.writeCoverageFile()
        selfCoverageHelper.onExit()
      },
      { alwaysLast: true }
    )
  }

  wrap (bin) {
    process.env.NYC_PROCESS_ID = this.processInfo.uuid
    // This is a bug with the spawn-wrap method where
    // we cannot force propagation of NYC_PROCESS_ID.
    if (!this.config.useSpawnWrap) {
      const updateVariable = require('./lib/register-env.js')
      updateVariable('NYC_PROCESS_ID')
    }
    this._addRequireHooks()
    this._wrapExit()
    this._loadAdditionalModules()
    return this
  }

  writeCoverageFile () {
    var coverage = coverageFinder()

    // Remove any files that should be excluded but snuck into the coverage
    Object.keys(coverage).forEach(function (absFile) {
      if (!this.exclude.shouldInstrument(absFile)) {
        delete coverage[absFile]
      }
    }, this)

    if (this.cache) {
      Object.keys(coverage).forEach(function (absFile) {
        if (this.hashCache[absFile] && coverage[absFile]) {
          coverage[absFile].contentHash = this.hashCache[absFile]
        }
      }, this)
    }

    var id = this.processInfo.uuid
    var coverageFilename = path.resolve(this.tempDirectory(), id + '.json')

    fs.writeFileSync(
      coverageFilename,
      JSON.stringify(coverage),
      'utf-8'
    )

    this.processInfo.coverageFilename = coverageFilename
    this.processInfo.files = Object.keys(coverage)
    this.processInfo.saveSync()
  }

  async getCoverageMapFromAllCoverageFiles (baseDirectory) {
    const map = libCoverage.createCoverageMap({})
    const files = await this.coverageFiles(baseDirectory)

    await pMap(
      files,
      async f => {
        const report = await this.coverageFileLoad(f, baseDirectory)
        map.merge(report)
      },
      { concurrency: os.cpus().length }
    )

    map.data = await this.sourceMaps.remapCoverage(map.data)

    // depending on whether source-code is pre-instrumented
    // or instrumented using a JIT plugin like @babel/require
    // you may opt to exclude files after applying
    // source-map remapping logic.
    if (this.config.excludeAfterRemap) {
      map.filter(filename => this.exclude.shouldInstrument(filename))
    }

    return map
  }

  async report () {
    const libReport = require('istanbul-lib-report')
    const reports = require('istanbul-reports')

    const context = libReport.createContext({
      dir: this.reportDirectory(),
      watermarks: this.config.watermarks,
      coverageMap: await this.getCoverageMapFromAllCoverageFiles()
    })

    this.reporter.forEach((_reporter) => {
      reports.create(_reporter, {
        skipEmpty: this.config.skipEmpty,
        skipFull: this.config.skipFull,
        projectRoot: this.cwd,
        maxCols: process.stdout.columns || 100
      }).execute(context)
    })

    if (this._showProcessTree) {
      await this.showProcessTree()
    }
  }

  async writeProcessIndex () {
    const db = new ProcessDB(this.processInfo.directory)
    await db.writeIndex()
  }

  async showProcessTree () {
    const db = new ProcessDB(this.processInfo.directory)
    console.log(await db.renderTree(this))
  }

  async checkCoverage (thresholds, perFile) {
    const map = await this.getCoverageMapFromAllCoverageFiles()

    if (perFile) {
      map.files().forEach(file => {
        // ERROR: Coverage for lines (90.12%) does not meet threshold (120%) for index.js
        this._checkCoverage(map.fileCoverageFor(file).toSummary(), thresholds, file)
      })
    } else {
      // ERROR: Coverage for lines (90.12%) does not meet global threshold (120%)
      this._checkCoverage(map.getCoverageSummary(), thresholds)
    }
  }

  _checkCoverage (summary, thresholds, file) {
    Object.keys(thresholds).forEach(function (key) {
      var coverage = summary[key].pct
      if (coverage < thresholds[key]) {
        process.exitCode = 1
        if (file) {
          console.error('ERROR: Coverage for ' + key + ' (' + coverage + '%) does not meet threshold (' + thresholds[key] + '%) for ' + file)
        } else {
          console.error('ERROR: Coverage for ' + key + ' (' + coverage + '%) does not meet global threshold (' + thresholds[key] + '%)')
        }
      }
    })
  }

  coverageFiles (baseDirectory = this.tempDirectory()) {
    return fs.readdir(baseDirectory)
  }

  async coverageFileLoad (filename, baseDirectory = this.tempDirectory()) {
    try {
      const report = JSON.parse(await fs.readFile(path.resolve(baseDirectory, filename)), 'utf8')
      await this.sourceMaps.reloadCachedSourceMaps(report)
      return report
    } catch (error) {
      return {}
    }
  }

  // TODO: Remove from nyc v16
  async coverageData (baseDirectory) {
    const files = await this.coverageFiles(baseDirectory)
    return pMap(
      files,
      f => this.coverageFileLoad(f, baseDirectory),
      { concurrency: os.cpus().length }
    )
  }

  tempDirectory () {
    return path.resolve(this.cwd, this._tempDirectory)
  }

  reportDirectory () {
    return path.resolve(this.cwd, this._reportDir)
  }
}

module.exports = NYC
