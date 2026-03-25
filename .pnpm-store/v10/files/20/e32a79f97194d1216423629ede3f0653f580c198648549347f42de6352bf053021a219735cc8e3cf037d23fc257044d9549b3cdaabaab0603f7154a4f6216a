'use strict'

const convertSourceMap = require('convert-source-map')
const libCoverage = require('istanbul-lib-coverage')
const libSourceMaps = require('istanbul-lib-source-maps')
const fs = require('./fs-promises')
const os = require('os')
const path = require('path')
const pMap = require('p-map')

class SourceMaps {
  constructor (opts) {
    this.cache = opts.cache
    this.cacheDirectory = opts.cacheDirectory
    this.loadedMaps = {}
    this._sourceMapCache = libSourceMaps.createSourceMapStore()
  }

  cachedPath (source, hash) {
    return path.join(
      this.cacheDirectory,
      `${path.parse(source).name}-${hash}.map`
    )
  }

  purgeCache () {
    this._sourceMapCache = libSourceMaps.createSourceMapStore()
    this.loadedMaps = {}
  }

  extract (code, filename) {
    const sourceMap = convertSourceMap.fromSource(code) || convertSourceMap.fromMapFileSource(code, path.dirname(filename))
    return sourceMap ? sourceMap.toObject() : undefined
  }

  registerMap (filename, hash, sourceMap) {
    if (!sourceMap) {
      return
    }

    if (this.cache && hash) {
      const mapPath = this.cachedPath(filename, hash)
      fs.writeFileSync(mapPath, JSON.stringify(sourceMap))
    } else {
      this._sourceMapCache.registerMap(filename, sourceMap)
    }
  }

  async remapCoverage (obj) {
    const transformed = await this._sourceMapCache.transformCoverage(
      libCoverage.createCoverageMap(obj)
    )
    return transformed.data
  }

  async reloadCachedSourceMaps (report) {
    await pMap(
      Object.entries(report),
      async ([absFile, fileReport]) => {
        if (!fileReport || !fileReport.contentHash) {
          return
        }

        const hash = fileReport.contentHash
        if (!(hash in this.loadedMaps)) {
          try {
            const mapPath = this.cachedPath(absFile, hash)
            this.loadedMaps[hash] = JSON.parse(await fs.readFile(mapPath, 'utf8'))
          } catch (e) {
            // set to false to avoid repeatedly trying to load the map
            this.loadedMaps[hash] = false
          }
        }

        if (this.loadedMaps[hash]) {
          this._sourceMapCache.registerMap(absFile, this.loadedMaps[hash])
        }
      },
      { concurrency: os.cpus().length }
    )
  }
}

module.exports = SourceMaps
