// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

const { URL, fileURLToPath } = require('url')
const { inspect } = require('util')
const { builtinModules } = require('module')
const specifiers = new Map()
const isWin = process.platform === 'win32'
let experimentalPatchInternals = false

// FIXME: Typescript extensions are added temporarily until we find a better
// way of supporting arbitrary extensions
const EXTENSION_RE = /\.(js|mjs|cjs|ts|mts|cts)$/
const NODE_VERSION = process.versions.node.split('.')
const NODE_MAJOR = Number(NODE_VERSION[0])
const NODE_MINOR = Number(NODE_VERSION[1])
const HANDLED_FORMATS = new Set(['builtin', 'module', 'commonjs'])

let entrypoint

let getExports
if (NODE_MAJOR >= 20 || (NODE_MAJOR === 18 && NODE_MINOR >= 19)) {
  getExports = require('./lib/get-exports.js')
} else {
  getExports = (url) => import(url).then(Object.keys)
}

function hasIitm (url) {
  try {
    return new URL(url).searchParams.has('iitm')
  } catch {
    return false
  }
}

function isIitm (url, meta) {
  return url === meta.url || url === meta.url.replace('hook.mjs', 'hook.js')
}

function deleteIitm (url) {
  let resultUrl
  try {
    const urlObj = new URL(url)
    if (urlObj.searchParams.has('iitm')) {
      urlObj.searchParams.delete('iitm')
      resultUrl = urlObj.href
      if (resultUrl.startsWith('file:node:')) {
        resultUrl = resultUrl.replace('file:', '')
      }
      if (resultUrl.startsWith('file:///node:')) {
        resultUrl = resultUrl.replace('file:///', '')
      }
    } else {
      resultUrl = urlObj.href
    }
  } catch {
    resultUrl = url
  }
  return resultUrl
}

function isNodeMajor16AndMinor17OrGreater () {
  return NODE_MAJOR === 16 && NODE_MINOR >= 17
}

function isFileProtocol (urlObj) {
  return urlObj.protocol === 'file:'
}

function isNodeProtocol (urlObj) {
  return urlObj.protocol === 'node:'
}

function needsToAddFileProtocol (urlObj) {
  if (NODE_MAJOR === 17) {
    return !isFileProtocol(urlObj)
  }
  if (isNodeMajor16AndMinor17OrGreater()) {
    return !isFileProtocol(urlObj) && !isNodeProtocol(urlObj)
  }
  return !isFileProtocol(urlObj) && NODE_MAJOR < 18
}

/**
 * Determines if a specifier represents an export all ESM line.
 * Note that the expected `line` isn't 100% valid ESM. It is derived
 * from the `getExports` function wherein we have recognized the true
 * line and re-mapped it to one we expect.
 *
 * @param {string} line
 * @returns {boolean}
 */
function isStarExportLine (line) {
  return /^\* from /.test(line)
}

function isBareSpecifier (specifier) {
  // Relative and absolute paths are not bare specifiers.
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/')) {
    return false
  }

  // Valid URLs are not bare specifiers. (file:, http:, node:, etc.)

  // eslint-disable-next-line no-prototype-builtins
  if (URL.hasOwnProperty('canParse')) {
    return !URL.canParse(specifier)
  }

  try {
    // eslint-disable-next-line no-new
    new URL(specifier)
    return false
  } catch (err) {
    return true
  }
}

/**
 * Determines whether the input is a bare specifier, file URL or a regular expression.
 *
 * - node: prefixed URL strings are considered bare specifiers in this context.
 */
function isBareSpecifierFileUrlOrRegex (input) {
  if (input instanceof RegExp) {
    return true
  }

  // Relative and absolute paths
  if (
    input.startsWith('.') ||
    input.startsWith('/')) {
    return false
  }

  try {
    // eslint-disable-next-line no-new
    const url = new URL(input)
    // We consider node: URLs bare specifiers in this context
    return url.protocol === 'file:' || url.protocol === 'node:'
  } catch (err) {
    // Anything that fails parsing is a bare specifier
    return true
  }
}

/**
 * Ensure an array only contains bare specifiers, file URLs or regular expressions.
 *
 * - We consider node: prefixed URL string as bare specifiers in this context.
 * - For node built-in modules, we add additional node: prefixed modules to the
 *   output array.
 */
function ensureArrayWithBareSpecifiersFileUrlsAndRegex (array, type) {
  if (!Array.isArray(array)) {
    return undefined
  }

  const invalid = array.filter(s => !isBareSpecifierFileUrlOrRegex(s))

  if (invalid.length) {
    throw new Error(`'${type}' option only supports bare specifiers, file URLs or regular expressions. Invalid entries: ${inspect(invalid)}`)
  }

  // Rather than evaluate whether we have a node: scoped built-in-module for
  // every call to resolve, we just add them to include/exclude now.
  for (const each of array) {
    if (typeof each === 'string' && !each.startsWith('node:') && builtinModules.includes(each)) {
      array.push(`node:${each}`)
    }
  }

  return array
}

function emitWarning (err) {
  // Unfortunately, process.emitWarning does not output the full error
  // with error.cause like console.warn does so we need to inspect it when
  // tracing warnings
  const warnMessage = process.execArgv.includes('--trace-warnings') ? inspect(err) : err
  process.emitWarning(warnMessage)
}

/**
 * Processes a module's exports and builds a set of setter blocks.
 *
 * @param {object} params
 * @param {string} params.srcUrl The full URL to the module to process.
 * @param {object} params.context Provided by the loaders API.
 * @param {Function} params.parentGetSource Provides the source code for the parent module.
 * @param {bool} params.excludeDefault Exclude the default export.
 *
 * @returns {Promise<Map<string, string>>} The shimmed setters for all the exports
 * from the module and any transitive export all modules.
 */
async function processModule ({ srcUrl, context, parentGetSource, parentResolve, excludeDefault }) {
  const exportNames = await getExports(srcUrl, context, parentGetSource)
  const starExports = new Set()
  const setters = new Map()

  const addSetter = (name, setter, isStarExport = false) => {
    if (setters.has(name)) {
      if (isStarExport) {
        // If there's already a matching star export, delete it
        if (starExports.has(name)) {
          setters.delete(name)
        }
        // and return so this is excluded
        return
      }

      // if we already have this export but it is from a * export, overwrite it
      if (starExports.has(name)) {
        starExports.delete(name)
        setters.set(name, setter)
      }
    } else {
      // Store export * exports so we know they can be overridden by explicit
      // named exports
      if (isStarExport) {
        starExports.add(name)
      }

      setters.set(name, setter)
    }
  }

  for (const n of exportNames) {
    if (n === 'default' && excludeDefault) continue

    if (isStarExportLine(n) === true) {
      const [, modFile] = n.split('* from ')

      // Relative paths need to be resolved relative to the parent module
      const newSpecifier = isBareSpecifier(modFile) ? modFile : new URL(modFile, srcUrl).href
      // We need to call `parentResolve` to resolve bare specifiers to a full
      // URL. We also need to call `parentResolve` for all sub-modules to get
      // the `format`. We can't rely on the parents `format` to know if this
      // sub-module is ESM or CJS!
      const result = await parentResolve(newSpecifier, { parentURL: srcUrl })

      const subSetters = await processModule({
        srcUrl: result.url,
        context: { ...context, format: result.format },
        parentGetSource,
        parentResolve,
        excludeDefault: true
      })

      for (const [name, setter] of subSetters.entries()) {
        addSetter(name, setter, true)
      }
    } else {
      const variableName = `$${n.replace(/[^a-zA-Z0-9_$]/g, '_')}`
      const objectKey = JSON.stringify(n)
      const reExportedName = n === 'default' || NODE_MAJOR < 16 ? n : objectKey

      addSetter(n, `
      let ${variableName}
      try {
        ${variableName} = _[${objectKey}] = namespace[${objectKey}]
      } catch (err) {
        if (!(err instanceof ReferenceError)) throw err
      }
      export { ${variableName} as ${reExportedName} }
      set[${objectKey}] = (v) => {
        ${variableName} = v
        return true
      }
      get[${objectKey}] = () => ${variableName}
      `)
    }
  }

  return setters
}

function addIitm (url) {
  const urlObj = new URL(url)
  urlObj.searchParams.set('iitm', 'true')
  return needsToAddFileProtocol(urlObj) ? 'file:' + urlObj.href : urlObj.href
}

function createHook (meta) {
  let cachedResolve
  const iitmURL = new URL('lib/register.js', meta.url).toString()
  let includeModules, excludeModules

  async function initialize (data) {
    if (global.__import_in_the_middle_initialized__) {
      process.emitWarning("The 'import-in-the-middle' hook has already been initialized")
    }

    global.__import_in_the_middle_initialized__ = true

    if (data) {
      if (data.experimentalPatchInternals) {
        experimentalPatchInternals = true
      }

      includeModules = ensureArrayWithBareSpecifiersFileUrlsAndRegex(data.include, 'include')
      excludeModules = ensureArrayWithBareSpecifiersFileUrlsAndRegex(data.exclude, 'exclude')

      if (data.addHookMessagePort) {
        data.addHookMessagePort.on('message', (modules) => {
          if (includeModules === undefined) {
            includeModules = []
          }

          for (const each of modules) {
            if (!each.startsWith('node:') && builtinModules.includes(each)) {
              includeModules.push(`node:${each}`)
            }

            includeModules.push(each)
          }

          data.addHookMessagePort.postMessage('ack')
        }).unref()
      }
    }
  }

  async function resolve (specifier, context, parentResolve) {
    cachedResolve = parentResolve

    // See https://github.com/nodejs/import-in-the-middle/pull/76.
    if (specifier === iitmURL) {
      return {
        url: specifier,
        shortCircuit: true
      }
    }

    const { parentURL = '' } = context
    const newSpecifier = deleteIitm(specifier)
    if (isWin && parentURL.indexOf('file:node') === 0) {
      context.parentURL = ''
    }
    const result = await parentResolve(newSpecifier, context, parentResolve)
    if (parentURL === '' && !EXTENSION_RE.test(result.url)) {
      entrypoint = result.url
      return { url: result.url, format: 'commonjs' }
    }

    // For included/excluded modules, we check the specifier to match libraries
    // that are loaded with bare specifiers from node_modules.
    //
    // For non-bare specifier imports, we match to the full file URL because
    // using relative paths would be very error prone!
    function match (each) {
      if (each instanceof RegExp) {
        return each.test(result.url)
      }

      return each === specifier || each === result.url || (result.url.startsWith('file:') && each === fileURLToPath(result.url))
    }

    if (result.format && !HANDLED_FORMATS.has(result.format)) {
      return result
    }

    if (includeModules && !includeModules.some(match)) {
      return result
    }

    if (excludeModules && excludeModules.some(match)) {
      return result
    }

    if (isIitm(parentURL, meta) || hasIitm(parentURL)) {
      return result
    }

    // We don't want to attempt to wrap native modules
    if (result.url.endsWith('.node')) {
      return result
    }

    // Node.js v21 renames importAssertions to importAttributes
    const importAttributes = context.importAttributes || context.importAssertions
    if (importAttributes && importAttributes.type === 'json') {
      return result
    }

    // If the file is referencing itself, we need to skip adding the iitm search params
    if (result.url === parentURL) {
      return {
        url: result.url,
        shortCircuit: true,
        format: result.format
      }
    }

    specifiers.set(result.url, specifier)

    return {
      url: addIitm(result.url),
      shortCircuit: true,
      format: result.format
    }
  }

  async function getSource (url, context, parentGetSource) {
    if (hasIitm(url)) {
      const realUrl = deleteIitm(url)

      try {
        const setters = await processModule({
          srcUrl: realUrl,
          context,
          parentGetSource,
          parentResolve: cachedResolve
        })
        return {
          source: `
import { register } from '${iitmURL}'
import * as namespace from ${JSON.stringify(realUrl)}
${experimentalPatchInternals ? `import { setExperimentalPatchInternals } from '${iitmURL}'\nsetExperimentalPatchInternals(true)` : ''}

// Mimic a Module object (https://tc39.es/ecma262/#sec-module-namespace-objects).
const _ = Object.create(null, { [Symbol.toStringTag]: { value: 'Module' } })
const set = {}
const get = {}

${Array.from(setters.values()).join('\n')}

register(${JSON.stringify(realUrl)}, _, set, get, ${JSON.stringify(specifiers.get(realUrl))})
`
        }
      } catch (cause) {
        // If there are other ESM loader hooks registered as well as iitm,
        // depending on the order they are registered, source might not be
        // JavaScript.
        //
        // If we fail to parse a module for exports, we should fall back to the
        // parent loader. These modules will not be wrapped with proxies and
        // cannot be Hook'ed but at least this does not take down the entire app
        // and block iitm from being used.
        //
        // We log the error because there might be bugs in iitm and without this
        // it would be very tricky to debug
        const err = new Error(`'import-in-the-middle' failed to wrap '${realUrl}'`)
        err.cause = cause
        emitWarning(err)

        // Revert back to the non-iitm URL
        url = realUrl
      }
    }

    return parentGetSource(url, context, parentGetSource)
  }

  // For Node.js 16.12.0 and higher.
  async function load (url, context, parentLoad) {
    if (hasIitm(url)) {
      const { source } = await getSource(url, context, parentLoad)
      return {
        source,
        shortCircuit: true,
        format: 'module'
      }
    }

    return parentLoad(url, context, parentLoad)
  }

  if (NODE_MAJOR >= 17 || (NODE_MAJOR === 16 && NODE_MINOR >= 12)) {
    return { initialize, load, resolve }
  } else {
    return {
      initialize,
      load,
      resolve,
      getSource,
      getFormat (url, context, parentGetFormat) {
        if (hasIitm(url)) {
          return {
            format: 'module'
          }
        }
        if (url === entrypoint) {
          return {
            format: 'commonjs'
          }
        }

        return parentGetFormat(url, context, parentGetFormat)
      }
    }
  }
}

module.exports = { createHook }
