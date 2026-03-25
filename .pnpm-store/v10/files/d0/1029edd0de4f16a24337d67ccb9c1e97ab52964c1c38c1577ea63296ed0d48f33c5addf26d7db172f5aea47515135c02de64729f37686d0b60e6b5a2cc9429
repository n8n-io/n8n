'use strict'
import createDebug from 'debug';
import { readFile } from 'node:fs/promises'
import { create } from '@apm-js-collab/code-transformer'
import parse from 'module-details-from-path'
import { fileURLToPath } from 'node:url'
import getPackageVersion from './lib/get-package-version.js'
const debug = createDebug('@apm-js-collab/tracing-hooks:esm-hook')
let transformers = null
let packages = null
let instrumentator = null

export async function initialize(data = {}) {
  const instrumentations = data?.instrumentations || []
  instrumentator = create(instrumentations)
  packages = new Set(instrumentations.map(i => i.module.name))
  transformers = new Map()
}

export async function resolve(specifier, context, nextResolve) {
  const url = await nextResolve(specifier, context)
  const resolvedModule = parse(url.url)
  if (resolvedModule && packages.has(resolvedModule.name)) {
    const path = fileURLToPath(resolvedModule.basedir)
    const version = getPackageVersion(path)
    const transformer = instrumentator.getTransformer(resolvedModule.name, version, resolvedModule.path)
    if (transformer) {
      transformers.set(url.url, transformer)
    }
  }
  return url
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context)
  if (transformers.has(url) === false) {
    return result
  }

  if (result.format === 'commonjs') {
    const parsedUrl = new URL(result.responseURL ?? url)
    result.source ??= await readFile(parsedUrl)
  }

  const code = result.source
  if (code) {
    const transformer = transformers.get(url)
    try {
      const transformedCode = transformer.transform(code.toString('utf8'), 'unknown')
      result.source = transformedCode?.code
      result.shortCircuit = true
    } catch(err) {
      debug('Error transforming module %s: %o', url, err)
    } finally {
      transformer.free()
    }
  }

  return result
}

