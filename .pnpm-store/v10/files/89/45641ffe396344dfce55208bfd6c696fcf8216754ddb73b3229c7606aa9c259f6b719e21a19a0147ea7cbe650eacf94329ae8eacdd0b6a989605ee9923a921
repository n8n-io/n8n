'use strict'
const { create } = require('@apm-js-collab/code-transformer')
const Module = require('node:module')
const parse = require('module-details-from-path')
const getPackageVersion = require('./lib/get-package-version')
const debug = require('debug')('@apm-js-collab/tracing-hooks:module-patch')

class ModulePatch {
  constructor({ instrumentations = [] } = {}) {
    this.packages = new Set(instrumentations.map(i => i.module.name))
    this.instrumentator = create(instrumentations)
    this.compile = Module.prototype._compile
  }

  /**
   * Patches the Node.js module class method that is responsible for compiling code.
   * If a module is found that has an instrumentator, it will transform the code before compiling it
   * with tracing channel methods.
   */
  patch() {
    const self = this
    Module.prototype._compile = function wrappedCompile(...args) {
      const [content, filename] = args
      const resolvedModule = parse(filename)
      if (resolvedModule && self.packages.has(resolvedModule.name)) {
        debug('found resolved module, checking if there is a transformer %s', filename)
        const version = getPackageVersion(resolvedModule.basedir, resolvedModule.name)
        const transformer = self.instrumentator.getTransformer(resolvedModule.name, version, resolvedModule.path)
        if (transformer) {
          debug('transforming file %s', filename)
          try {
            const transformedCode = transformer.transform(content, 'unknown')
            args[0] = transformedCode?.code
            if (process.env.TRACING_DUMP) {
              dump(args[0], filename)
            }
          } catch (error) {
            debug('Error transforming module %s: %o', filename, error)
          } finally {
            transformer.free()
          }
        }
      }

      return self.compile.apply(this, args)
    }
  }

  /**
   * Restores the original Module.prototype._compile method
   * **Note**: This is intended to be used in testing only.
   */
  unpatch() {
    Module.prototype._compile = this.compile
  }
}

function dump(code, filename) {
  const os = require('node:os')
  const path = require('node:path')
  const fs = require('node:fs')

  const base = process.env.TRACING_DUMP_DIR ?? os.tmpdir()
  const dirname = path.dirname(filename)
  const basename = path.basename(filename)
  const targetDir = path.join(base, dirname)
  const targetFile = path.join(targetDir, basename)

  debug('Dumping patched code to: %s', targetFile)
  fs.mkdirSync(targetDir, { recursive: true })
  fs.writeFileSync(targetFile, code)
}

module.exports = ModulePatch

