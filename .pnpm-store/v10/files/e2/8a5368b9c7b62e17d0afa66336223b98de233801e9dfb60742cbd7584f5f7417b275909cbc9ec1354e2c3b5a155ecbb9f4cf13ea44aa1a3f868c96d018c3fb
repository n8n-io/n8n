'use strict'

const getEsmExports = require('./get-esm-exports.js')
const { parse: parseCjs } = require('cjs-module-lexer')
const { readFileSync, existsSync } = require('fs')
const { builtinModules } = require('module')
const { fileURLToPath, pathToFileURL } = require('url')
const { dirname, join } = require('path')

function addDefault (arr) {
  return new Set(['default', ...arr])
}

// Cached exports for Node built-in modules
const BUILT_INS = new Map()

function getExportsForNodeBuiltIn (name) {
  let exports = BUILT_INS.get()

  if (!exports) {
    exports = new Set(addDefault(Object.keys(require(name))))
    BUILT_INS.set(name, exports)
  }

  return exports
}

const urlsBeingProcessed = new Set() // Guard against circular imports.

/**
 * This function looks for the package.json which contains the specifier trying to resolve.
 * Once the package.json file has been found, we extract the file path from the specifier
 * @param {string} specifier The specifier that is being search for inside the imports object
 * @param {URL|string} fromUrl The url from which the search starts from
 * @returns array with url and resolvedExport
 */
function resolvePackageImports (specifier, fromUrl) {
  try {
    const fromPath = fileURLToPath(fromUrl)
    let currentDir = dirname(fromPath)

    // search for package.json file which has the real url to export
    while (currentDir !== dirname(currentDir)) {
      const packageJsonPath = join(currentDir, 'package.json')

      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
        if (packageJson.imports && packageJson.imports[specifier]) {
          const imports = packageJson.imports[specifier]

          // Look for path inside packageJson
          let resolvedExport
          if (imports && typeof imports === 'object') {
            const requireExport = imports.require
            const importExport = imports.import
            // look for the possibility of require and import which is standard for CJS/ESM
            if (requireExport || importExport) {
              // trying to resolve based on order of importance
              resolvedExport = requireExport.node || requireExport.default || importExport.node || importExport.default
            } else if (imports.node || imports.default) {
              resolvedExport = imports.node || imports.default
            }
          } else if (typeof imports === 'string') {
            resolvedExport = imports
          }

          if (resolvedExport) {
            const url = resolvedExport.startsWith('.')
              ? pathToFileURL(join(currentDir, resolvedExport))
              : fromUrl
            return [url, resolvedExport]
          }
        }
        // return if we find a package.json but did not find an import
        return null
      }

      currentDir = dirname(currentDir)
    }
  } catch (cause) {
    throw Error(`Failed to find export: ${specifier}`, { cause })
  }
  return null
}

async function getCjsExports (url, context, parentLoad, source) {
  if (urlsBeingProcessed.has(url)) {
    return []
  }
  urlsBeingProcessed.add(url)

  try {
    const result = parseCjs(source)
    const full = addDefault(result.exports)

    await Promise.all(result.reexports.map(async re => {
      if (re.startsWith('node:') || builtinModules.includes(re)) {
        for (const each of getExportsForNodeBuiltIn(re)) {
          full.add(each)
        }
      } else {
        if (re === '.') {
          re = './'
        }

        // Entries in the import field should always start with #
        if (re.startsWith('#')) {
          const resolved = resolvePackageImports(re, url)
          if (!resolved) return
          [url, re] = resolved
        }

        const newUrl = pathToFileURL(require.resolve(re, { paths: [dirname(fileURLToPath(url))] })).href

        if (newUrl.endsWith('.node') || newUrl.endsWith('.json')) {
          return
        }

        for (const each of await getExports(newUrl, context, parentLoad)) {
          full.add(each)
        }
      }
    }))

    return full
  } finally {
    urlsBeingProcessed.delete(url)
  }
}

/**
 * Inspects a module for its type (commonjs or module), attempts to get the
 * source code for said module from the loader API, and parses the result
 * for the entities exported from that module.
 *
 * @param {string} url A file URL string pointing to the module that
 * we should get the exports of.
 * @param {object} context Context object as provided by the `load`
 * hook from the loaders API.
 * @param {Function} parentLoad Next hook function in the loaders API
 * hook chain.
 *
 * @returns {Promise<Set<string>>} An array of identifiers exported by the module.
 * Please see {@link getEsmExports} for caveats on special identifiers that may
 * be included in the result set.
 */
async function getExports (url, context, parentLoad) {
  // `parentLoad` gives us the possibility of getting the source
  // from an upstream loader. This doesn't always work though,
  // so later on we fall back to reading it from disk.
  const parentCtx = await parentLoad(url, context)
  let source = parentCtx.source
  const format = parentCtx.format

  if (!source) {
    if (format === 'builtin') {
      // Builtins don't give us the source property, so we're stuck
      // just requiring it to get the exports.
      return getExportsForNodeBuiltIn(url)
    }

    // Sometimes source is retrieved by parentLoad, CommonJs isn't.
    source = readFileSync(fileURLToPath(url), 'utf8')
  }

  try {
    if (format === 'module') {
      return getEsmExports(source)
    }

    if (format === 'commonjs') {
      return await getCjsExports(url, context, parentLoad, source)
    }

    // At this point our `format` is either undefined or not known by us. Fall
    // back to parsing as ESM/CJS.
    const esmExports = getEsmExports(source)
    if (!esmExports.length) {
      // TODO(bengl) it's might be possible to get here if somehow the format
      // isn't set at first and yet we have an ESM module with no exports.
      // I couldn't construct an example that would do this, so maybe it's
      // impossible?
      return await getCjsExports(url, context, parentLoad, source)
    }
  } catch (cause) {
    const err = new Error(`Failed to parse '${url}'`)
    err.cause = cause
    throw err
  }
}

module.exports = getExports
