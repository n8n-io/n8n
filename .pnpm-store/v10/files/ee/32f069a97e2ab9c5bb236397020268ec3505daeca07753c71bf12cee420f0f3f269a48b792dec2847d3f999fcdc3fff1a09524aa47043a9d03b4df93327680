const assert = require('assert')
const convertSourceMap = require('convert-source-map')
const util = require('util')
const debuglog = util.debuglog('c8')
const { dirname, isAbsolute, join, resolve } = require('path')
const { fileURLToPath } = require('url')
const CovBranch = require('./branch')
const CovFunction = require('./function')
const CovSource = require('./source')
const { sliceRange } = require('./range')
const compatError = Error(`requires Node.js ${require('../package.json').engines.node}`)
let readFile = () => { throw compatError }
try {
  readFile = require('fs').promises.readFile
} catch (_err) {
  // most likely we're on an older version of Node.js.
}
const { TraceMap } = require('@jridgewell/trace-mapping')
const isOlderNode10 = /^v10\.(([0-9]\.)|(1[0-5]\.))/u.test(process.version)
const isNode8 = /^v8\./.test(process.version)

// Injected when Node.js is loading script into isolate pre Node 10.16.x.
// see: https://github.com/nodejs/node/pull/21573.
const cjsWrapperLength = isOlderNode10 ? require('module').wrapper[0].length : 0

module.exports = class V8ToIstanbul {
  constructor (scriptPath, wrapperLength, sources, excludePath) {
    assert(typeof scriptPath === 'string', 'scriptPath must be a string')
    assert(!isNode8, 'This module does not support node 8 or lower, please upgrade to node 10')
    this.path = parsePath(scriptPath)
    this.wrapperLength = wrapperLength === undefined ? cjsWrapperLength : wrapperLength
    this.excludePath = excludePath || (() => false)
    this.sources = sources || {}
    this.generatedLines = []
    this.branches = {}
    this.functions = {}
    this.covSources = []
    this.rawSourceMap = undefined
    this.sourceMap = undefined
    this.sourceTranspiled = undefined
    // Indicate that this report was generated with placeholder data from
    // running --all:
    this.all = false
  }

  async load () {
    const rawSource = this.sources.source || await readFile(this.path, 'utf8')
    this.rawSourceMap = this.sources.sourceMap ||
      // if we find a source-map (either inline, or a .map file) we load
      // both the transpiled and original source, both of which are used during
      // the backflips we perform to remap absolute to relative positions.
      convertSourceMap.fromSource(rawSource) || convertSourceMap.fromMapFileSource(rawSource, dirname(this.path))

    if (this.rawSourceMap) {
      if (this.rawSourceMap.sourcemap.sources.length > 1) {
        this.sourceMap = new TraceMap(this.rawSourceMap.sourcemap)
        if (!this.sourceMap.sourcesContent) {
          this.sourceMap.sourcesContent = await this.sourcesContentFromSources()
        }
        this.covSources = this.sourceMap.sourcesContent.map((rawSource, i) => ({ source: new CovSource(rawSource, this.wrapperLength), path: this.sourceMap.sources[i] }))
        this.sourceTranspiled = new CovSource(rawSource, this.wrapperLength)
      } else {
        const candidatePath = this.rawSourceMap.sourcemap.sources.length >= 1 ? this.rawSourceMap.sourcemap.sources[0] : this.rawSourceMap.sourcemap.file
        this.path = this._resolveSource(this.rawSourceMap, candidatePath || this.path)
        this.sourceMap = new TraceMap(this.rawSourceMap.sourcemap)

        let originalRawSource
        if (this.sources.sourceMap && this.sources.sourceMap.sourcemap && this.sources.sourceMap.sourcemap.sourcesContent && this.sources.sourceMap.sourcemap.sourcesContent.length === 1) {
          // If the sourcesContent field has been provided, return it rather than attempting
          // to load the original source from disk.
          // TODO: investigate whether there's ever a case where we hit this logic with 1:many sources.
          originalRawSource = this.sources.sourceMap.sourcemap.sourcesContent[0]
        } else if (this.sources.originalSource) {
          // Original source may be populated on the sources object.
          originalRawSource = this.sources.originalSource
        } else if (this.sourceMap.sourcesContent && this.sourceMap.sourcesContent[0]) {
          // perhaps we loaded sourcesContent was populated by an inline source map, or .map file?
          // TODO: investigate whether there's ever a case where we hit this logic with 1:many sources.
          originalRawSource = this.sourceMap.sourcesContent[0]
        } else {
          // We fallback to reading the original source from disk.
          originalRawSource = await readFile(this.path, 'utf8')
        }
        this.covSources = [{ source: new CovSource(originalRawSource, this.wrapperLength), path: this.path }]
        this.sourceTranspiled = new CovSource(rawSource, this.wrapperLength)
      }
    } else {
      this.covSources = [{ source: new CovSource(rawSource, this.wrapperLength), path: this.path }]
    }
  }

  async sourcesContentFromSources () {
    const fileList = this.sourceMap.sources.map(relativePath => {
      const realPath = this._resolveSource(this.rawSourceMap, relativePath)
      return readFile(realPath, 'utf-8')
        .then(result => result)
        .catch(err => {
          debuglog(`failed to load ${realPath}: ${err.message}`)
        })
    })
    return await Promise.all(fileList)
  }

  destroy () {
    // no longer necessary, but preserved for backwards compatibility.
  }

  _resolveSource (rawSourceMap, sourcePath) {
    if (sourcePath.startsWith('file://')) {
      return fileURLToPath(sourcePath)
    }
    sourcePath = sourcePath.replace(/^webpack:\/\//, '')
    const sourceRoot = rawSourceMap.sourcemap.sourceRoot ? rawSourceMap.sourcemap.sourceRoot.replace('file://', '') : ''
    const candidatePath = join(sourceRoot, sourcePath)

    if (isAbsolute(candidatePath)) {
      return candidatePath
    } else {
      return resolve(dirname(this.path), candidatePath)
    }
  }

  applyCoverage (blocks) {
    blocks.forEach(block => {
      block.ranges.forEach((range, i) => {
        const { startCol, endCol, path, covSource } = this._maybeRemapStartColEndCol(range)
        if (this.excludePath(path)) {
          return
        }
        let lines
        if (block.functionName === '(empty-report)') {
          // (empty-report), this will result in a report that has all lines zeroed out.
          lines = covSource.lines.filter((line) => {
            line.count = 0
            return true
          })
          this.all = lines.length > 0
        } else {
          lines = sliceRange(covSource.lines, startCol, endCol)
        }
        if (!lines.length) {
          return
        }

        const startLineInstance = lines[0]
        const endLineInstance = lines[lines.length - 1]

        if (block.isBlockCoverage) {
          this.branches[path] = this.branches[path] || []
          // record branches.
          this.branches[path].push(new CovBranch(
            startLineInstance.line,
            startCol - startLineInstance.startCol,
            endLineInstance.line,
            endCol - endLineInstance.startCol,
            range.count
          ))

          // if block-level granularity is enabled, we still create a single
          // CovFunction tracking object for each set of ranges.
          if (block.functionName && i === 0) {
            this.functions[path] = this.functions[path] || []
            this.functions[path].push(new CovFunction(
              block.functionName,
              startLineInstance.line,
              startCol - startLineInstance.startCol,
              endLineInstance.line,
              endCol - endLineInstance.startCol,
              range.count
            ))
          }
        } else if (block.functionName) {
          this.functions[path] = this.functions[path] || []
          // record functions.
          this.functions[path].push(new CovFunction(
            block.functionName,
            startLineInstance.line,
            startCol - startLineInstance.startCol,
            endLineInstance.line,
            endCol - endLineInstance.startCol,
            range.count
          ))
        }

        // record the lines (we record these as statements, such that we're
        // compatible with Istanbul 2.0).
        lines.forEach(line => {
          // make sure branch spans entire line; don't record 'goodbye'
          // branch in `const foo = true ? 'hello' : 'goodbye'` as a
          // 0 for line coverage.
          //
          // All lines start out with coverage of 1, and are later set to 0
          // if they are not invoked; line.ignore prevents a line from being
          // set to 0, and is set if the special comment /* c8 ignore next */
          // is used.

          if (startCol <= line.startCol && endCol >= line.endCol && !line.ignore) {
            line.count = range.count
          }
        })
      })
    })
  }

  _maybeRemapStartColEndCol (range) {
    let covSource = this.covSources[0].source
    let startCol = Math.max(0, range.startOffset - covSource.wrapperLength)
    let endCol = Math.min(covSource.eof, range.endOffset - covSource.wrapperLength)
    let path = this.path

    if (this.sourceMap) {
      startCol = Math.max(0, range.startOffset - this.sourceTranspiled.wrapperLength)
      endCol = Math.min(this.sourceTranspiled.eof, range.endOffset - this.sourceTranspiled.wrapperLength)

      const { startLine, relStartCol, endLine, relEndCol, source } = this.sourceTranspiled.offsetToOriginalRelative(
        this.sourceMap,
        startCol,
        endCol
      )

      const matchingSource = this.covSources.find(covSource => covSource.path === source)
      covSource = matchingSource ? matchingSource.source : this.covSources[0].source
      path = matchingSource ? matchingSource.path : this.covSources[0].path

      // next we convert these relative positions back to absolute positions
      // in the original source (which is the format expected in the next step).
      startCol = covSource.relativeToOffset(startLine, relStartCol)
      endCol = covSource.relativeToOffset(endLine, relEndCol)
    }

    return {
      path,
      covSource,
      startCol,
      endCol
    }
  }

  getInnerIstanbul (source, path) {
    // We apply the "Resolving Sources" logic (as defined in
    // sourcemaps.info/spec.html) as a final step for 1:many source maps.
    // for 1:1 source maps, the resolve logic is applied while loading.
    //
    // TODO: could we move the resolving logic for 1:1 source maps to the final
    // step as well? currently this breaks some tests in c8.
    let resolvedPath = path
    if (this.rawSourceMap && this.rawSourceMap.sourcemap.sources.length > 1) {
      resolvedPath = this._resolveSource(this.rawSourceMap, path)
    }

    if (this.excludePath(resolvedPath)) {
      return
    }

    return {
      [resolvedPath]: {
        path: resolvedPath,
        all: this.all,
        ...this._statementsToIstanbul(source, path),
        ...this._branchesToIstanbul(source, path),
        ...this._functionsToIstanbul(source, path)
      }
    }
  }

  toIstanbul () {
    return this.covSources.reduce((istanbulOuter, { source, path }) => Object.assign(istanbulOuter, this.getInnerIstanbul(source, path)), {})
  }

  _statementsToIstanbul (source, path) {
    const statements = {
      statementMap: {},
      s: {}
    }
    source.lines.forEach((line, index) => {
      statements.statementMap[`${index}`] = line.toIstanbul()
      statements.s[`${index}`] = line.count
    })
    return statements
  }

  _branchesToIstanbul (source, path) {
    const branches = {
      branchMap: {},
      b: {}
    }
    this.branches[path] = this.branches[path] || []
    this.branches[path].forEach((branch, index) => {
      const srcLine = source.lines[branch.startLine - 1]
      const ignore = srcLine === undefined ? true : srcLine.ignore
      branches.branchMap[`${index}`] = branch.toIstanbul()
      branches.b[`${index}`] = [ignore ? 1 : branch.count]
    })
    return branches
  }

  _functionsToIstanbul (source, path) {
    const functions = {
      fnMap: {},
      f: {}
    }
    this.functions[path] = this.functions[path] || []
    this.functions[path].forEach((fn, index) => {
      const srcLine = source.lines[fn.startLine - 1]
      const ignore = srcLine === undefined ? true : srcLine.ignore
      functions.fnMap[`${index}`] = fn.toIstanbul()
      functions.f[`${index}`] = ignore ? 1 : fn.count
    })
    return functions
  }
}

function parsePath (scriptPath) {
  return scriptPath.startsWith('file://') ? fileURLToPath(scriptPath) : scriptPath
}
