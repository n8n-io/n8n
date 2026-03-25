'use strict'

const { knownKeywords } = require('./known-keywords')

/*
 * JSON pointer collection/resolution logic
 */

function safeSet(map, key, value, comment = 'keys') {
  if (!map.has(key)) return map.set(key, value)
  if (map.get(key) !== value) throw new Error(`Conflicting duplicate ${comment}: ${key}`)
}

function untilde(string) {
  if (!string.includes('~')) return string
  return string.replace(/~[01]/g, (match) => {
    switch (match) {
      case '~1':
        return '/'
      case '~0':
        return '~'
    }
    /* c8 ignore next */
    throw new Error('Unreachable')
  })
}

function get(obj, pointer, objpath) {
  if (typeof obj !== 'object') throw new Error('Invalid input object')
  if (typeof pointer !== 'string') throw new Error('Invalid JSON pointer')
  const parts = pointer.split('/')
  if (!['', '#'].includes(parts.shift())) throw new Error('Invalid JSON pointer')
  if (parts.length === 0) return obj

  let curr = obj
  for (const part of parts) {
    if (typeof part !== 'string') throw new Error('Invalid JSON pointer')
    if (objpath) objpath.push(curr) // does not include target itself, but includes head
    const prop = untilde(part)
    if (typeof curr !== 'object') return undefined
    if (!Object.prototype.hasOwnProperty.call(curr, prop)) return undefined
    curr = curr[prop]
  }
  return curr
}

const protocolRegex = /^https?:\/\//

function joinPath(baseFull, sub) {
  if (typeof baseFull !== 'string' || typeof sub !== 'string') throw new Error('Unexpected path!')
  if (sub.length === 0) return baseFull
  const base = baseFull.replace(/#.*/, '')
  if (sub.startsWith('#')) return `${base}${sub}`
  if (!base.includes('/') || protocolRegex.test(sub)) return sub
  if (protocolRegex.test(base)) return `${new URL(sub, base)}`
  if (sub.startsWith('/')) return sub
  return [...base.split('/').slice(0, -1), sub].join('/')
}

function objpath2path(objpath) {
  const ids = objpath.map((obj) => (obj && (obj.$id || obj.id)) || '')
  return ids.filter((id) => id && typeof id === 'string').reduce(joinPath, '')
}

const withSpecialChilds = ['properties', 'patternProperties', '$defs', 'definitions']
const skipChilds = ['const', 'enum', 'examples', 'example', 'comment']
const sSkip = Symbol('skip')

function traverse(schema, work) {
  const visit = (sub, specialChilds = false) => {
    if (!sub || typeof sub !== 'object') return
    const res = work(sub)
    if (res !== undefined) return res === sSkip ? undefined : res
    for (const k of Object.keys(sub)) {
      if (!specialChilds && !Array.isArray(sub) && !knownKeywords.includes(k)) continue
      if (!specialChilds && skipChilds.includes(k)) continue
      const kres = visit(sub[k], !specialChilds && withSpecialChilds.includes(k))
      if (kres !== undefined) return kres
    }
  }
  return visit(schema)
}

// Returns a list of resolved entries, in a form: [schema, root, basePath]
// basePath doesn't contain the target object $id itself
function resolveReference(root, schemas, ref, base = '') {
  const ptr = joinPath(base, ref)
  const results = []

  const [main, hash = ''] = ptr.split('#')
  const local = decodeURI(hash)

  // Find in self by id path
  const visit = (sub, oldPath, specialChilds = false, dynamic = false) => {
    if (!sub || typeof sub !== 'object') return

    const id = sub.$id || sub.id
    let path = oldPath
    if (id && typeof id === 'string') {
      path = joinPath(path, id)
      if (path === ptr || (path === main && local === '')) {
        results.push([sub, root, oldPath])
      } else if (path === main && local[0] === '/') {
        const objpath = []
        const res = get(sub, local, objpath)
        if (res !== undefined) results.push([res, root, joinPath(oldPath, objpath2path(objpath))])
      }
    }
    const anchor = dynamic ? sub.$dynamicAnchor : sub.$anchor
    if (anchor && typeof anchor === 'string') {
      if (anchor.includes('#')) throw new Error("$anchor can't include '#'")
      if (anchor.startsWith('/')) throw new Error("$anchor can't start with '/'")
      path = joinPath(path, `#${anchor}`)
      if (path === ptr) results.push([sub, root, oldPath])
    }

    for (const k of Object.keys(sub)) {
      if (!specialChilds && !Array.isArray(sub) && !knownKeywords.includes(k)) continue
      if (!specialChilds && skipChilds.includes(k)) continue
      visit(sub[k], path, !specialChilds && withSpecialChilds.includes(k))
    }
    if (!dynamic && sub.$dynamicAnchor) visit(sub, oldPath, specialChilds, true)
  }
  visit(root, main)

  // Find in self by pointer
  if (main === base.replace(/#$/, '') && (local[0] === '/' || local === '')) {
    const objpath = []
    const res = get(root, local, objpath)
    if (res !== undefined) results.push([res, root, objpath2path(objpath)])
  }

  // Find in additional schemas
  if (schemas.has(main) && schemas.get(main) !== root) {
    const additional = resolveReference(schemas.get(main), schemas, `#${hash}`, main)
    results.push(...additional.map(([res, rRoot, rPath]) => [res, rRoot, joinPath(main, rPath)]))
  }

  // Full refs to additional schemas
  if (schemas.has(ptr)) results.push([schemas.get(ptr), schemas.get(ptr), ptr])

  return results
}

function getDynamicAnchors(schema) {
  const results = new Map()
  traverse(schema, (sub) => {
    if (sub !== schema && (sub.$id || sub.id)) return sSkip // base changed, no longer in the same resource
    const anchor = sub.$dynamicAnchor
    if (anchor && typeof anchor === 'string') {
      if (anchor.includes('#')) throw new Error("$dynamicAnchor can't include '#'")
      if (!/^[a-zA-Z0-9_-]+$/.test(anchor)) throw new Error(`Unsupported $dynamicAnchor: ${anchor}`)
      safeSet(results, anchor, sub, '$dynamicAnchor')
    }
  })
  return results
}

const hasKeywords = (schema, keywords) =>
  traverse(schema, (s) => Object.keys(s).some((k) => keywords.includes(k)) || undefined) || false

const addSchemasArrayToMap = (schemas, input, optional = false) => {
  if (!Array.isArray(input)) throw new Error('Expected an array of schemas')
  // schema ids are extracted from the schemas themselves
  for (const schema of input) {
    traverse(schema, (sub) => {
      const idRaw = sub.$id || sub.id
      const id = idRaw && typeof idRaw === 'string' ? idRaw.replace(/#$/, '') : null // # is allowed only as the last symbol here
      if (id && id.includes('://') && !id.includes('#')) {
        safeSet(schemas, id, sub, "schema $id in 'schemas'")
      } else if (sub === schema && !optional) {
        throw new Error("Schema with missing or invalid $id in 'schemas'")
      }
    })
  }
  return schemas
}

const buildSchemas = (input, extra) => {
  if (extra) return addSchemasArrayToMap(buildSchemas(input), extra, true)
  if (input) {
    switch (Object.getPrototypeOf(input)) {
      case Object.prototype:
        return new Map(Object.entries(input))
      case Map.prototype:
        return new Map(input)
      case Array.prototype:
        return addSchemasArrayToMap(new Map(), input)
    }
  }
  throw new Error("Unexpected value for 'schemas' option")
}

module.exports = { get, joinPath, resolveReference, getDynamicAnchors, hasKeywords, buildSchemas }
