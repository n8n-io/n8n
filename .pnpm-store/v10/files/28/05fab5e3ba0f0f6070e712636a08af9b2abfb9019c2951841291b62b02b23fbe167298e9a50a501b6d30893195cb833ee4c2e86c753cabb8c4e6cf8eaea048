'use strict'

const { format, safe, safeand, safenot, safenotor } = require('./safe-format')
const genfun = require('./generate-function')
const { resolveReference, joinPath, getDynamicAnchors, hasKeywords } = require('./pointer')
const formats = require('./formats')
const { toPointer, ...functions } = require('./scope-functions')
const { scopeMethods } = require('./scope-utils')
const { buildName, types, jsHelpers } = require('./javascript')
const { knownKeywords, schemaVersions, knownVocabularies } = require('./known-keywords')
const { initTracing, andDelta, orDelta, applyDelta, isDynamic, inProperties } = require('./tracing')

const noopRegExps = new Set(['^[\\s\\S]*$', '^[\\S\\s]*$', '^[^]*$', '', '.*', '^', '$'])
const primitiveTypes = ['null', 'boolean', 'number', 'integer', 'string']

// for checking schema parts in consume()
const schemaTypes = new Map(
  Object.entries({
    boolean: (arg) => typeof arg === 'boolean',
    array: (arg) => Array.isArray(arg) && Object.getPrototypeOf(arg) === Array.prototype,
    object: (arg) => arg && Object.getPrototypeOf(arg) === Object.prototype,
    finite: (arg) => Number.isFinite(arg),
    natural: (arg) => Number.isInteger(arg) && arg >= 0,
    string: (arg) => typeof arg === 'string',
    jsonval: (arg) => functions.deepEqual(arg, JSON.parse(JSON.stringify(arg))),
  })
)
const isPlainObject = schemaTypes.get('object')
const isSchemaish = (arg) => isPlainObject(arg) || typeof arg === 'boolean'
const deltaEmpty = (delta) => functions.deepEqual(delta, { type: [] })

const schemaIsOlderThan = ($schema, ver) =>
  schemaVersions.indexOf($schema) > schemaVersions.indexOf(`https://json-schema.org/${ver}/schema`)

const schemaIsUnkownOrOlder = ($schema, ver) => {
  const normalized = `${$schema}`.replace(/^http:\/\//, 'https://').replace(/#$/, '')
  if (!schemaVersions.includes(normalized)) return true
  return schemaIsOlderThan(normalized, ver)
}

// Helper methods for semi-structured paths
const propvar = (parent, keyname, inKeys = false, number = false) =>
  Object.freeze({ parent, keyname, inKeys, number }) // property by variable
const propimm = (parent, keyval, checked = false) => Object.freeze({ parent, keyval, checked }) // property by immediate value

const evaluatedStatic = Symbol('evaluatedStatic')
const optDynamic = Symbol('optDynamic')
const optDynAnchors = Symbol('optDynAnchors')
const optRecAnchors = Symbol('optRecAnchors')

const constantValue = (schema) => {
  if (typeof schema === 'boolean') return schema
  if (isPlainObject(schema) && Object.keys(schema).length === 0) return true
  return undefined
}

const refsNeedFullValidation = new Set() // cleared before and after each full compilation
const rootMeta = new Map() // cleared before and after each full compilation
const generateMeta = (root, $schema, enforce, requireSchema) => {
  if ($schema) {
    const version = $schema.replace(/^http:\/\//, 'https://').replace(/#$/, '')
    enforce(schemaVersions.includes(version), 'Unexpected schema version:', version)
    rootMeta.set(root, {
      exclusiveRefs: schemaIsOlderThan(version, 'draft/2019-09'),
      contentValidation: schemaIsOlderThan(version, 'draft/2019-09'),
      dependentUnsupported: schemaIsOlderThan(version, 'draft/2019-09'),
      newItemsSyntax: !schemaIsOlderThan(version, 'draft/2020-12'),
      containsEvaluates: !schemaIsOlderThan(version, 'draft/2020-12'),
      objectContains: !schemaIsOlderThan(version, 'draft/next'),
      bookending: schemaIsOlderThan(version, 'draft/next'),
    })
  } else {
    enforce(!requireSchema, '[requireSchema] $schema is required')
    rootMeta.set(root, {})
  }
}

const compileSchema = (schema, root, opts, scope, basePathRoot = '') => {
  const {
    mode = 'default',
    useDefaults = false,
    removeAdditional = false, // supports additionalProperties: false and additionalItems: false
    includeErrors = false,
    allErrors = false,
    contentValidation,
    dryRun, // unused, just for rest siblings
    lint: lintOnly = false,
    allowUnusedKeywords = opts.mode === 'lax' || opts.mode === 'spec',
    allowUnreachable = opts.mode === 'lax' || opts.mode === 'spec',
    requireSchema = opts.mode === 'strong',
    requireValidation = opts.mode === 'strong',
    requireStringValidation = opts.mode === 'strong',
    forbidNoopValues = opts.mode === 'strong', // e.g. $recursiveAnchor: false (it's false by default)
    complexityChecks = opts.mode === 'strong',
    unmodifiedPrototypes = false, // assumes no mangled Object/Array prototypes
    isJSON = false, // assume input to be JSON, which e.g. makes undefined impossible
    $schemaDefault = null,
    formatAssertion = opts.mode !== 'spec' || schemaIsUnkownOrOlder(root.$schema, 'draft/2019-09'),
    formats: optFormats = {},
    weakFormats = opts.mode !== 'strong',
    extraFormats = false,
    schemas, // always a Map, produced at wrapper
    ...unknown
  } = opts
  const fmts = {
    ...formats.core,
    ...(weakFormats ? formats.weak : {}),
    ...(extraFormats ? formats.extra : {}),
    ...optFormats,
  }
  if (Object.keys(unknown).length !== 0)
    throw new Error(`Unknown options: ${Object.keys(unknown).join(', ')}`)

  if (!['strong', 'lax', 'default', 'spec'].includes(mode)) throw new Error(`Invalid mode: ${mode}`)
  if (!includeErrors && allErrors) throw new Error('allErrors requires includeErrors to be enabled')
  if (requireSchema && $schemaDefault) throw new Error('requireSchema forbids $schemaDefault')
  if (mode === 'strong') {
    const validation = { requireValidation, requireStringValidation }
    const strong = { ...validation, formatAssertion, complexityChecks, requireSchema }
    const weak = { weakFormats, allowUnusedKeywords }
    for (const [k, v] of Object.entries(strong)) if (!v) throw new Error(`Strong mode demands ${k}`)
    for (const [k, v] of Object.entries(weak)) if (v) throw new Error(`Strong mode forbids ${k}`)
  }

  const { gensym, getref, genref, genformat } = scopeMethods(scope)

  const buildPath = (prop) => {
    const path = []
    let curr = prop
    while (curr) {
      if (!curr.name) path.unshift(curr)
      curr = curr.parent || curr.errorParent
    }

    // fast case when there are no variables inside path
    if (path.every((part) => part.keyval !== undefined))
      return format('%j', toPointer(path.map((part) => part.keyval)))

    // Be very careful while refactoring, this code significantly affects includeErrors performance
    // It attempts to construct fast code presentation for paths, e.g. "#/abc/"+pointerPart(key0)+"/items/"+i0
    const stringParts = ['#']
    const stringJoined = () => {
      const value = stringParts.map(functions.pointerPart).join('/')
      stringParts.length = 0
      return value
    }
    let res = null
    for (const { keyname, keyval, number } of path) {
      if (keyname) {
        if (!number) scope.pointerPart = functions.pointerPart
        const value = number ? keyname : format('pointerPart(%s)', keyname)
        const str = `${stringJoined()}/`
        res = res ? format('%s+%j+%s', res, str, value) : format('%j+%s', str, value)
      } else if (keyval) stringParts.push(keyval)
    }
    return stringParts.length > 0 ? format('%s+%j', res, `/${stringJoined()}`) : res
  }

  const funname = genref(schema)
  let validate = null // resolve cyclic dependencies
  const wrap = (...args) => {
    const res = validate(...args)
    wrap.errors = validate.errors
    return res
  }
  scope[funname] = wrap

  const hasRefs = hasKeywords(schema, ['$ref', '$recursiveRef', '$dynamicRef'])
  const hasDynAnchors = opts[optDynAnchors] && hasRefs && hasKeywords(schema, ['$dynamicAnchor'])
  const dynAnchorsHead = () => {
    if (!opts[optDynAnchors]) return format('')
    return hasDynAnchors ? format(', dynAnchors = []') : format(', dynAnchors')
  }
  const recAnchorsHead = opts[optRecAnchors] ? format(', recursive') : format('')

  const fun = genfun()
  fun.write('function validate(data%s%s) {', recAnchorsHead, dynAnchorsHead())
  if (includeErrors) fun.write('validate.errors = null')
  if (allErrors) fun.write('let errorCount = 0')
  if (opts[optDynamic]) fun.write('validate.evaluatedDynamic = null')

  let dynamicAnchorsNext = opts[optDynAnchors] ? format(', dynAnchors') : format('')
  if (hasDynAnchors) {
    fun.write('const dynLocal = [{}]')
    dynamicAnchorsNext = format(', [...dynAnchors, dynLocal[0] || []]')
  }

  const helpers = jsHelpers(fun, scope, propvar, { unmodifiedPrototypes, isJSON }, noopRegExps)
  const { present, forObjectKeys, forArray, patternTest, compare } = helpers

  const recursiveLog = []
  const getMeta = () => rootMeta.get(root)
  const basePathStack = basePathRoot ? [basePathRoot] : []
  const visit = (errors, history, current, node, schemaPath, trace = {}, { constProp } = {}) => {
    // e.g. top-level data and property names, OR already checked by present() in history, OR in keys and not undefined
    const isSub = history.length > 0 && history[history.length - 1].prop === current
    const queryCurrent = () => history.filter((h) => h.prop === current)
    const definitelyPresent =
      !current.parent || current.checked || (current.inKeys && isJSON) || queryCurrent().length > 0

    const name = buildName(current)
    const currPropImm = (...args) => propimm(current, ...args)

    const error = ({ path = [], prop = current, source, suberr }) => {
      const schemaP = toPointer([...schemaPath, ...path])
      const dataP = includeErrors ? buildPath(prop) : null
      if (includeErrors === true && errors && source) {
        // we can include absoluteKeywordLocation later, perhaps
        scope.errorMerge = functions.errorMerge
        const args = [source, schemaP, dataP]
        if (allErrors) {
          fun.write('if (validate.errors === null) validate.errors = []')
          fun.write('validate.errors.push(...%s.map(e => errorMerge(e, %j, %s)))', ...args)
        } else fun.write('validate.errors = [errorMerge(%s[0], %j, %s)]', ...args)
      } else if (includeErrors === true && errors) {
        const errorJS = format('{ keywordLocation: %j, instanceLocation: %s }', schemaP, dataP)
        if (allErrors) {
          fun.write('if (%s === null) %s = []', errors, errors)
          fun.write('%s.push(%s)', errors, errorJS)
        } else fun.write('%s = [%s]', errors, errorJS) // Array assignment is significantly faster, do not refactor the two branches
      }
      if (suberr) mergeerror(suberr) // can only happen in allErrors
      if (allErrors) fun.write('errorCount++')
      else fun.write('return false')
    }
    const errorIf = (condition, errorArgs) => fun.if(condition, () => error(errorArgs))

    if (lintOnly && !scope.lintErrors) scope.lintErrors = [] // we can do this as we don't build functions in lint-only mode
    const fail = (msg, value) => {
      const comment = value !== undefined ? ` ${JSON.stringify(value)}` : ''
      const keywordLocation = joinPath(basePathRoot, toPointer(schemaPath))
      const message = `${msg}${comment} at ${keywordLocation}`
      if (lintOnly) return scope.lintErrors.push({ message, keywordLocation, schema }) // don't fail if we are just collecting all errors
      throw new Error(message)
    }
    const patternTestSafe = (pat, key) => {
      try {
        return patternTest(pat, key)
      } catch (e) {
        fail(e.message)
        return format('false') // for lint-only mode
      }
    }
    const enforce = (ok, ...args) => ok || fail(...args)
    const laxMode = (ok, ...args) => enforce(mode === 'lax' || mode === 'spec' || ok, ...args)
    const enforceMinMax = (a, b) => laxMode(!(node[b] < node[a]), `Invalid ${a} / ${b} combination`)
    const enforceValidation = (msg, suffix = 'should be specified') =>
      enforce(!requireValidation, `[requireValidation] ${msg} ${suffix}`)
    const subPath = (...args) => [...schemaPath, ...args]
    const uncertain = (msg) =>
      enforce(!removeAdditional && !useDefaults, `[removeAdditional/useDefaults] uncertain: ${msg}`)
    const complex = (msg, arg) => enforce(!complexityChecks, `[complexityChecks] ${msg}`, arg)
    const saveMeta = ($sch) => generateMeta(root, $sch || $schemaDefault, enforce, requireSchema)

    // evaluated tracing
    const stat = initTracing()
    const evaluateDelta = (delta) => applyDelta(stat, delta)

    if (typeof node === 'boolean') {
      if (node === true) {
        enforceValidation('schema = true', 'is not allowed') // any is valid here
        return { stat } // nothing is evaluated for true
      }
      errorIf(definitelyPresent || current.inKeys ? true : present(current), {}) // node === false
      evaluateDelta({ type: [] }) // everything is evaluated for false
      return { stat }
    }

    enforce(isPlainObject(node), 'Schema is not an object')
    for (const key of Object.keys(node))
      enforce(knownKeywords.includes(key) || allowUnusedKeywords, 'Keyword not supported:', key)

    if (Object.keys(node).length === 0) {
      enforceValidation('empty rules node', 'is not allowed')
      return { stat } // nothing to validate here, basically the same as node === true
    }

    const unused = new Set(Object.keys(node))
    const multiConsumable = new Set()
    const consume = (prop, ...ruleTypes) => {
      enforce(multiConsumable.has(prop) || unused.has(prop), 'Unexpected double consumption:', prop)
      enforce(functions.hasOwn(node, prop), 'Is not an own property:', prop)
      enforce(ruleTypes.every((t) => schemaTypes.has(t)), 'Invalid type used in consume')
      enforce(ruleTypes.some((t) => schemaTypes.get(t)(node[prop])), 'Unexpected type for', prop)
      unused.delete(prop)
    }
    const get = (prop, ...ruleTypes) => {
      if (node[prop] !== undefined) consume(prop, ...ruleTypes)
      return node[prop]
    }
    const handle = (prop, ruleTypes, handler, errorArgs = {}) => {
      if (node[prop] === undefined) return false
      // opt-out on null is explicit in both places here, don't set default
      consume(prop, ...ruleTypes)
      if (handler !== null) {
        try {
          const condition = handler(node[prop])
          if (condition !== null) errorIf(condition, { path: [prop], ...errorArgs })
        } catch (e) {
          if (lintOnly && !e.message.startsWith('[opt] ')) {
            fail(e.message) // for lint-only mode, but not processing special re-run errors
          } else {
            throw e
          }
        }
      }
      return true
    }

    if (node === root) {
      saveMeta(get('$schema', 'string'))
      handle('$vocabulary', ['object'], ($vocabulary) => {
        for (const [vocab, flag] of Object.entries($vocabulary)) {
          if (flag === false) continue
          enforce(flag === true && knownVocabularies.includes(vocab), 'Unknown vocabulary:', vocab)
        }
        return null
      })
    } else if (!getMeta()) saveMeta(root.$schema)

    if (getMeta().objectContains) {
      // When object contains is enabled, contains-related keywords can be consumed two times: in object branch and in array branch
      for (const prop of ['contains', 'minContains', 'maxContains']) multiConsumable.add(prop)
    }

    handle('examples', ['array'], null) // unused, meta-only
    handle('example', ['jsonval'], null) // unused, meta-only, OpenAPI
    for (const ignore of ['title', 'description', '$comment']) handle(ignore, ['string'], null) // unused, meta-only strings
    for (const ignore of ['deprecated', 'readOnly', 'writeOnly']) handle(ignore, ['boolean'], null) // unused, meta-only flags

    handle('$defs', ['object'], null) || handle('definitions', ['object'], null) // defs are allowed, those are validated on usage

    const compileSub = (sub, subR, path) =>
      sub === schema ? safe('validate') : getref(sub) || compileSchema(sub, subR, opts, scope, path)
    const basePath = () => (basePathStack.length > 0 ? basePathStack[basePathStack.length - 1] : '')
    const basePathStackLength = basePathStack.length // to restore at exit
    const setId = ($id) => {
      basePathStack.push(joinPath(basePath(), $id))
      return null
    }

    // None of the below should be handled if an exlusive pre-2019-09 $ref is present
    if (!getMeta().exclusiveRefs || !node.$ref) {
      handle('$id', ['string'], setId) || handle('id', ['string'], setId)
      handle('$anchor', ['string'], null) // $anchor is used only for ref resolution, on usage
      handle('$dynamicAnchor', ['string'], null) // handled separately and on ref resolution

      if (node.$recursiveAnchor || !forbidNoopValues) {
        handle('$recursiveAnchor', ['boolean'], (isRecursive) => {
          if (isRecursive) recursiveLog.push([node, root, basePath()])
          return null
        })
      }
    }

    // handle schema-wide dynamic anchors
    const isDynScope = hasDynAnchors && (node === schema || node.id || node.$id)
    if (isDynScope) {
      const allDynamic = getDynamicAnchors(node)
      if (node !== schema) fun.write('dynLocal.unshift({})') // inlined at top level
      for (const [key, subcheck] of allDynamic) {
        const resolved = resolveReference(root, schemas, `#${key}`, basePath())
        const [sub, subRoot, path] = resolved[0] || []
        enforce(sub === subcheck, `Unexpected $dynamicAnchor resolution: ${key}`)
        const n = compileSub(sub, subRoot, path)
        fun.write('dynLocal[0][%j] = %s', `#${key}`, n)
      }
    }

    // evaluated: declare dynamic
    const needUnevaluated = (rule) =>
      opts[optDynamic] && (node[rule] || node[rule] === false || node === schema)
    const local = Object.freeze({
      item: needUnevaluated('unevaluatedItems') ? gensym('evaluatedItem') : null,
      items: needUnevaluated('unevaluatedItems') ? gensym('evaluatedItems') : null,
      props: needUnevaluated('unevaluatedProperties') ? gensym('evaluatedProps') : null,
    })
    const dyn = Object.freeze({
      item: local.item || trace.item,
      items: local.items || trace.items,
      props: local.props || trace.props,
    })
    const canSkipDynamic = () =>
      (!dyn.items || stat.items === Infinity) && (!dyn.props || stat.properties.includes(true))
    const evaluateDeltaDynamic = (delta) => {
      // Skips applying those that have already been proved statically
      if (dyn.item && delta.item && stat.items !== Infinity)
        fun.write('%s.push(%s)', dyn.item, delta.item)
      if (dyn.items && delta.items > stat.items) fun.write('%s.push(%d)', dyn.items, delta.items)
      if (dyn.props && (delta.properties || []).includes(true) && !stat.properties.includes(true)) {
        fun.write('%s[0].push(true)', dyn.props)
      } else if (dyn.props) {
        const inStat = (properties, patterns) => inProperties(stat, { properties, patterns })
        const properties = (delta.properties || []).filter((x) => !inStat([x], []))
        const patterns = (delta.patterns || []).filter((x) => !inStat([], [x]))
        if (properties.length > 0) fun.write('%s[0].push(...%j)', dyn.props, properties)
        if (patterns.length > 0) fun.write('%s[1].push(...%j)', dyn.props, patterns)
        for (const sym of delta.propertiesVars || []) fun.write('%s[0].push(%s)', dyn.props, sym)
      }
    }
    const applyDynamicToDynamic = (target, item, items, props) => {
      if (isDynamic(stat).items && target.item && item)
        fun.write('%s.push(...%s)', target.item, item)
      if (isDynamic(stat).items && target.items && items)
        fun.write('%s.push(...%s)', target.items, items)
      if (isDynamic(stat).properties && target.props && props) {
        fun.write('%s[0].push(...%s[0])', target.props, props)
        fun.write('%s[1].push(...%s[1])', target.props, props)
      }
    }

    const makeRecursive = () => {
      if (!opts[optRecAnchors]) return format('') // recursive anchors disabled
      if (recursiveLog.length === 0) return format(', recursive') // no recursive default, i.e. no $recursiveAnchor has been set in this schema
      return format(', recursive || %s', compileSub(...recursiveLog[0]))
    }
    const applyRef = (n, errorArgs) => {
      // evaluated: propagate static from ref to current, skips cyclic.
      // Can do this before the call as the call is just a write
      const delta = (scope[n] && scope[n][evaluatedStatic]) || { unknown: true } // assume unknown if ref is cyclic
      evaluateDelta(delta)
      const call = format('%s(%s%s%s)', n, name, makeRecursive(), dynamicAnchorsNext)
      if (!includeErrors && canSkipDynamic()) return format('!%s', call) // simple case
      const res = gensym('res')
      const err = gensym('err') // Save and restore errors in case of recursion (if needed)
      const suberr = gensym('suberr')
      if (includeErrors) fun.write('const %s = validate.errors', err)
      fun.write('const %s = %s', res, call)
      if (includeErrors) fun.write('const %s = %s.errors', suberr, n)
      if (includeErrors) fun.write('validate.errors = %s', err)
      errorIf(safenot(res), { ...errorArgs, source: suberr })
      // evaluated: propagate dynamic from ref to current
      fun.if(res, () => {
        const item = isDynamic(delta).items ? format('%s.evaluatedDynamic[0]', n) : null
        const items = isDynamic(delta).items ? format('%s.evaluatedDynamic[1]', n) : null
        const props = isDynamic(delta).properties ? format('%s.evaluatedDynamic[2]', n) : null
        applyDynamicToDynamic(dyn, item, items, props)
      })

      return null
    }

    /* Preparation and methods, post-$ref validation will begin at the end of the function */

    // This is used for typechecks, null means * here
    const allIn = (arr, valid) => arr && arr.every((s) => valid.includes(s)) // all arr entries are in valid
    const someIn = (arr, possible) => possible.some((x) => arr === null || arr.includes(x)) // all possible are in arrs

    const parentCheckedType = (...valid) => queryCurrent().some((h) => allIn(h.stat.type, valid))
    const definitelyType = (...valid) => allIn(stat.type, valid) || parentCheckedType(...valid)
    const typeApplicable = (...possible) =>
      someIn(stat.type, possible) && queryCurrent().every((h) => someIn(h.stat.type, possible))

    const enforceRegex = (source, target = node) => {
      enforce(typeof source === 'string', 'Invalid pattern:', source)
      if (requireValidation || requireStringValidation)
        enforce(/^\^.*\$$/.test(source), 'Should start with ^ and end with $:', source)
      if (/([{+*].*[{+*]|\)[{+*]|^[^^].*[{+*].)/.test(source) && target.maxLength === undefined)
        complex('maxLength should be specified for pattern:', source)
    }

    // Those checks will need to be skipped if another error is set in this block before those ones
    const havePattern = node.pattern && !noopRegExps.has(node.pattern) // we won't generate code for noop
    const haveComplex = node.uniqueItems || havePattern || node.patternProperties || node.format
    const prev = allErrors && haveComplex ? gensym('prev') : null
    const prevWrap = (shouldWrap, writeBody) =>
      fun.if(shouldWrap && prev !== null ? format('errorCount === %s', prev) : true, writeBody)

    const nexthistory = () => [...history, { stat, prop: current }]
    // Can not be used before undefined check! The one performed by present()
    const rule = (...args) => visit(errors, nexthistory(), ...args).stat
    const subrule = (suberr, ...args) => {
      if (args[0] === current) {
        const constval = constantValue(args[1])
        if (constval === true) return { sub: format('true'), delta: {} }
        if (constval === false) return { sub: format('false'), delta: { type: [] } }
      }
      const sub = gensym('sub')
      fun.write('const %s = (() => {', sub)
      if (allErrors) fun.write('let errorCount = 0') // scoped error counter
      const { stat: delta } = visit(suberr, nexthistory(), ...args)
      if (allErrors) {
        fun.write('return errorCount === 0')
      } else fun.write('return true')
      fun.write('})()')
      return { sub, delta }
    }

    const suberror = () => {
      const suberr = includeErrors && allErrors ? gensym('suberr') : null
      if (suberr) fun.write('let %s = null', suberr)
      return suberr
    }
    const mergeerror = (suberr) => {
      if (errors === null || suberr === null) return // suberror can be null e.g. on failed empty contains, errors can be null in e.g. not or if
      fun.if(suberr, () => fun.write('%s.push(...%s)', errors, suberr))
    }

    // Extracted single additional(Items/Properties) rules, for reuse with unevaluated(Items/Properties)
    const willRemoveAdditional = () => {
      if (!removeAdditional) return false
      if (removeAdditional === true) return true
      if (removeAdditional === 'keyword') {
        if (!node.removeAdditional) return false
        consume('removeAdditional', 'boolean')
        return true
      }
      throw new Error(`Invalid removeAdditional: ${removeAdditional}`)
    }
    const additionalItems = (rulePath, limit, extra) => {
      const handled = handle(rulePath, ['object', 'boolean'], (ruleValue) => {
        if (ruleValue === false && willRemoveAdditional()) {
          fun.write('if (%s.length > %s) %s.length = %s', name, limit, name, limit)
          return null
        }
        if (ruleValue === false && !extra) return format('%s.length > %s', name, limit)
        forArray(current, limit, (prop, i) => {
          if (extra) fun.write('if (%s) continue', extra(i))
          return rule(prop, ruleValue, subPath(rulePath))
        })
        return null
      })
      if (handled) evaluateDelta({ items: Infinity })
    }
    const additionalProperties = (rulePath, condition) => {
      const handled = handle(rulePath, ['object', 'boolean'], (ruleValue) => {
        forObjectKeys(current, (sub, key) => {
          fun.if(condition(key), () => {
            if (ruleValue === false && willRemoveAdditional()) fun.write('delete %s[%s]', name, key)
            else rule(sub, ruleValue, subPath(rulePath))
          })
        })
        return null
      })
      if (handled) evaluateDelta({ properties: [true] })
    }
    const additionalCondition = (key, properties, patternProperties) =>
      safeand(
        ...properties.map((p) => format('%s !== %j', key, p)),
        ...patternProperties.map((p) => safenot(patternTestSafe(p, key)))
      )
    const lintRequired = (properties, patterns) => {
      const regexps = patterns.map((p) => new RegExp(p, 'u'))
      const known = (key) => properties.includes(key) || regexps.some((r) => r.test(key))
      for (const key of stat.required) enforce(known(key), `Unknown required property:`, key)
    }
    const finalLint = []

    /* Checks inside blocks are independent, they are happening on the same code depth */

    const checkNumbers = () => {
      const minMax = (value, operator) => format('!(%d %c %s)', value, operator, name) // don't remove negation, accounts for NaN

      if (Number.isFinite(node.exclusiveMinimum)) {
        handle('exclusiveMinimum', ['finite'], (min) => minMax(min, '<'))
      } else {
        handle('minimum', ['finite'], (min) => minMax(min, node.exclusiveMinimum ? '<' : '<='))
        handle('exclusiveMinimum', ['boolean'], null) // handled above
      }

      if (Number.isFinite(node.exclusiveMaximum)) {
        handle('exclusiveMaximum', ['finite'], (max) => minMax(max, '>'))
        enforceMinMax('minimum', 'exclusiveMaximum')
        enforceMinMax('exclusiveMinimum', 'exclusiveMaximum')
      } else if (node.maximum !== undefined) {
        handle('maximum', ['finite'], (max) => minMax(max, node.exclusiveMaximum ? '>' : '>='))
        handle('exclusiveMaximum', ['boolean'], null) // handled above
        enforceMinMax('minimum', 'maximum')
        enforceMinMax('exclusiveMinimum', 'maximum')
      }

      const multipleOf = node.multipleOf === undefined ? 'divisibleBy' : 'multipleOf' // draft3 support
      handle(multipleOf, ['finite'], (value) => {
        enforce(value > 0, `Invalid ${multipleOf}:`, value)
        const [part, exp] = `${value}`.split('e-')
        const frac = `${part}.`.split('.')[1]
        const e = frac.length + (exp ? Number(exp) : 0)
        if (Number.isInteger(value * 2 ** e)) return format('%s %% %d !== 0', name, value) // exact
        scope.isMultipleOf = functions.isMultipleOf
        const args = [name, value, e, Math.round(value * Math.pow(10, e))] // precompute for performance
        return format('!isMultipleOf(%s, %d, 1e%d, %d)', ...args)
      })
    }

    const checkStrings = () => {
      handle('maxLength', ['natural'], (max) => {
        scope.stringLength = functions.stringLength
        return format('%s.length > %d && stringLength(%s) > %d', name, max, name, max)
      })
      handle('minLength', ['natural'], (min) => {
        scope.stringLength = functions.stringLength
        return format('%s.length < %d || stringLength(%s) < %d', name, min, name, min)
      })
      enforceMinMax('minLength', 'maxLength')

      prevWrap(true, () => {
        const checkFormat = (fmtname, target, formatsObj = fmts) => {
          const known = typeof fmtname === 'string' && functions.hasOwn(formatsObj, fmtname)
          enforce(known, 'Unrecognized format used:', fmtname)
          const formatImpl = formatsObj[fmtname]
          const valid = formatImpl instanceof RegExp || typeof formatImpl === 'function'
          enforce(valid, 'Invalid format used:', fmtname)
          if (!formatAssertion) return null
          if (formatImpl instanceof RegExp) {
            // built-in formats are fine, check only ones from options
            if (functions.hasOwn(optFormats, fmtname)) enforceRegex(formatImpl.source)
            return format('!%s.test(%s)', genformat(formatImpl), target)
          }
          return format('!%s(%s)', genformat(formatImpl), target)
        }

        handle('format', ['string'], (value) => {
          evaluateDelta({ fullstring: true })
          return checkFormat(value, name)
        })

        handle('pattern', ['string'], (pattern) => {
          enforceRegex(pattern)
          evaluateDelta({ fullstring: true })
          return noopRegExps.has(pattern) ? null : safenot(patternTestSafe(pattern, name))
        })

        enforce(node.contentSchema !== false, 'contentSchema cannot be set to false')
        const cV = contentValidation === undefined ? getMeta().contentValidation : contentValidation
        const haveContent = node.contentEncoding || node.contentMediaType || node.contentSchema
        const contentErr =
          '"content*" keywords are disabled by default per spec, enable with { contentValidation = true } option (see doc/Options.md for more info)'
        enforce(!haveContent || cV || allowUnusedKeywords, contentErr)
        if (haveContent && cV) {
          const dec = gensym('dec')
          if (node.contentMediaType) fun.write('let %s = %s', dec, name)

          if (node.contentEncoding === 'base64') {
            errorIf(checkFormat('base64', name, formats.extra), { path: ['contentEncoding'] })
            if (node.contentMediaType) {
              scope.deBase64 = functions.deBase64
              fun.write('try {')
              fun.write('%s = deBase64(%s)', dec, dec)
            }
            consume('contentEncoding', 'string')
          } else enforce(!node.contentEncoding, 'Unknown contentEncoding:', node.contentEncoding)

          let json = false
          if (node.contentMediaType === 'application/json') {
            fun.write('try {')
            fun.write('%s = JSON.parse(%s)', dec, dec)
            json = true
            consume('contentMediaType', 'string')
          } else enforce(!node.contentMediaType, 'Unknown contentMediaType:', node.contentMediaType)

          if (node.contentSchema) {
            enforce(json, 'contentSchema requires contentMediaType application/json')
            const decprop = Object.freeze({ name: dec, errorParent: current })
            rule(decprop, node.contentSchema, subPath('contentSchema')) // TODO: isJSON true for speed?
            consume('contentSchema', 'object', 'array')
            evaluateDelta({ fullstring: true })
          }
          if (node.contentMediaType) {
            fun.write('} catch (e) {')
            error({ path: ['contentMediaType'] })
            fun.write('}')
            if (node.contentEncoding) {
              fun.write('} catch (e) {')
              error({ path: ['contentEncoding'] })
              fun.write('}')
            }
          }
        }
      })
    }

    const checkArrays = () => {
      handle('maxItems', ['natural'], (max) => {
        const prefixItemsName = getMeta().newItemsSyntax ? 'prefixItems' : 'items'
        if (Array.isArray(node[prefixItemsName]) && node[prefixItemsName].length > max)
          fail(`Invalid maxItems: ${max} is less than ${prefixItemsName} array length`)
        return format('%s.length > %d', name, max)
      })
      handle('minItems', ['natural'], (min) => format('%s.length < %d', name, min)) // can be higher that .items length with additionalItems
      enforceMinMax('minItems', 'maxItems')

      const checkItemsArray = (items) => {
        for (let p = 0; p < items.length; p++) rule(currPropImm(p), items[p], subPath(`${p}`))
        evaluateDelta({ items: items.length })
        return null
      }
      if (getMeta().newItemsSyntax) {
        handle('prefixItems', ['array'], checkItemsArray)
        additionalItems('items', format('%d', (node.prefixItems || []).length))
      } else if (Array.isArray(node.items)) {
        handle('items', ['array'], checkItemsArray)
        additionalItems('additionalItems', format('%d', node.items.length))
      } else {
        handle('items', ['object', 'boolean'], (items) => {
          forArray(current, format('0'), (prop) => rule(prop, items, subPath('items')))
          evaluateDelta({ items: Infinity })
          return null
        })
        // If items is not an array, additionalItems is allowed, but ignored per some spec tests!
        // We do nothing and let it throw except for in allowUnusedKeywords mode
        // As a result, omitting .items is not allowed by default, only in allowUnusedKeywords mode
      }

      checkContains((run) => {
        forArray(current, format('0'), (prop, i) => {
          run(prop, () => {
            evaluateDelta({ dyn: { item: true } })
            evaluateDeltaDynamic({ item: i })
          })
        })
      })

      const itemsSimple = (ischema) => {
        if (!isPlainObject(ischema)) return false
        if (ischema.enum || functions.hasOwn(ischema, 'const')) return true
        if (ischema.type) {
          const itemTypes = Array.isArray(ischema.type) ? ischema.type : [ischema.type]
          if (itemTypes.every((itemType) => primitiveTypes.includes(itemType))) return true
        }
        if (ischema.$ref) {
          const [sub] = resolveReference(root, schemas, ischema.$ref, basePath())[0] || []
          if (itemsSimple(sub)) return true
        }
        return false
      }
      const itemsSimpleOrFalse = (ischema) => ischema === false || itemsSimple(ischema)
      const uniqueSimple = () => {
        if (node.maxItems !== undefined || itemsSimpleOrFalse(node.items)) return true
        // In old format, .additionalItems requires .items to have effect
        if (Array.isArray(node.items) && itemsSimpleOrFalse(node.additionalItems)) return true
        return false
      }
      prevWrap(true, () => {
        handle('uniqueItems', ['boolean'], (uniqueItems) => {
          if (uniqueItems === false) return null
          if (!uniqueSimple()) complex('maxItems should be specified for non-primitive uniqueItems')
          Object.assign(scope, { unique: functions.unique, deepEqual: functions.deepEqual })
          return format('!unique(%s)', name)
        })
      })
    }

    // if allErrors is false, we can skip present check for required properties validated before
    const checked = (p) =>
      !allErrors &&
      (stat.required.includes(p) || queryCurrent().some((h) => h.stat.required.includes(p)))

    const checkObjects = () => {
      const propertiesCount = format('Object.keys(%s).length', name)
      handle('maxProperties', ['natural'], (max) => format('%s > %d', propertiesCount, max))
      handle('minProperties', ['natural'], (min) => format('%s < %d', propertiesCount, min))
      enforceMinMax('minProperties', 'maxProperties')

      handle('propertyNames', ['object', 'boolean'], (s) => {
        forObjectKeys(current, (sub, key) => {
          // Add default type for non-ref schemas, so strong mode is fine with omitting it
          const nameSchema = typeof s === 'object' && !s.$ref ? { type: 'string', ...s } : s
          const nameprop = Object.freeze({ name: key, errorParent: sub, type: 'string' })
          rule(nameprop, nameSchema, subPath('propertyNames'))
        })
        return null
      })

      handle('required', ['array'], (required) => {
        for (const req of required) {
          if (checked(req)) continue
          const prop = currPropImm(req)
          errorIf(safenot(present(prop)), { path: ['required'], prop })
        }
        evaluateDelta({ required })
        return null
      })

      for (const dependencies of ['dependencies', 'dependentRequired', 'dependentSchemas']) {
        if (dependencies !== 'dependencies' && getMeta().dependentUnsupported) continue
        handle(dependencies, ['object'], (value) => {
          for (const key of Object.keys(value)) {
            const deps = typeof value[key] === 'string' ? [value[key]] : value[key]
            const item = currPropImm(key, checked(key))
            if (Array.isArray(deps) && dependencies !== 'dependentSchemas') {
              const clauses = deps.filter((k) => !checked(k)).map((k) => present(currPropImm(k)))
              const condition = safenot(safeand(...clauses))
              const errorArgs = { path: [dependencies, key] }
              if (clauses.length === 0) {
                // nothing to do
              } else if (item.checked) {
                errorIf(condition, errorArgs)
                evaluateDelta({ required: deps })
              } else {
                errorIf(safeand(present(item), condition), errorArgs)
              }
            } else if (isSchemaish(deps) && dependencies !== 'dependentRequired') {
              uncertain(dependencies) // TODO: we don't always need this, remove when no uncertainity?
              fun.if(item.checked ? true : present(item), () => {
                const delta = rule(current, deps, subPath(dependencies, key), dyn)
                evaluateDelta(orDelta({}, delta))
                evaluateDeltaDynamic(delta)
              })
            } else fail(`Unexpected ${dependencies} entry`)
          }
          return null
        })
      }

      handle('propertyDependencies', ['object'], (propertyDependencies) => {
        for (const [key, variants] of Object.entries(propertyDependencies)) {
          enforce(isPlainObject(variants), 'propertyDependencies must be an object')
          uncertain('propertyDependencies') // TODO: we don't always need this, remove when no uncertainity?
          const item = currPropImm(key, checked(key))
          // NOTE: would it be useful to also check if it's a string?
          fun.if(item.checked ? true : present(item), () => {
            for (const [val, deps] of Object.entries(variants)) {
              enforce(isSchemaish(deps), 'propertyDependencies must contain schemas')
              fun.if(compare(buildName(item), val), () => {
                // TODO: we already know that we have an object here, optimize?
                const delta = rule(current, deps, subPath('propertyDependencies', key, val), dyn)
                evaluateDelta(orDelta({}, delta))
                evaluateDeltaDynamic(delta)
              })
            }
          })
        }
        return null
      })

      handle('properties', ['object'], (properties) => {
        for (const p of Object.keys(properties)) {
          if (constProp === p) continue // checked in discriminator, avoid double-check
          rule(currPropImm(p, checked(p)), properties[p], subPath('properties', p))
        }
        evaluateDelta({ properties: Object.keys(properties) })
        return null
      })

      prevWrap(node.patternProperties, () => {
        handle('patternProperties', ['object'], (patternProperties) => {
          forObjectKeys(current, (sub, key) => {
            for (const p of Object.keys(patternProperties)) {
              enforceRegex(p, node.propertyNames || {})
              fun.if(patternTestSafe(p, key), () => {
                rule(sub, patternProperties[p], subPath('patternProperties', p))
              })
            }
          })
          evaluateDelta({ patterns: Object.keys(patternProperties) })
          return null
        })
        if (node.additionalProperties || node.additionalProperties === false) {
          const properties = Object.keys(node.properties || {})
          const patternProperties = Object.keys(node.patternProperties || {})
          if (node.additionalProperties === false) {
            // Postpone the check to the end when all nested .required are collected
            finalLint.push(() => lintRequired(properties, patternProperties))
          }
          const condition = (key) => additionalCondition(key, properties, patternProperties)
          additionalProperties('additionalProperties', condition)
        }
      })

      if (getMeta().objectContains) {
        checkContains((run) => {
          forObjectKeys(current, (prop, i) => {
            run(prop, () => {
              evaluateDelta({ dyn: { properties: [true] } })
              evaluateDeltaDynamic({ propertiesVars: [i] })
            })
          })
        })
      }
    }

    const checkConst = () => {
      const handledConst = handle('const', ['jsonval'], (val) => safenot(compare(name, val)))
      if (handledConst && !allowUnusedKeywords) return true // enum can't be present, this is rechecked by allowUnusedKeywords
      const handledEnum = handle('enum', ['array'], (vals) => {
        const objects = vals.filter((value) => value && typeof value === 'object')
        const primitive = vals.filter((value) => !(value && typeof value === 'object'))
        return safenotor(...[...primitive, ...objects].map((value) => compare(name, value)))
      })
      return handledConst || handledEnum
    }

    const checkContains = (iterate) => {
      // This can be called two times, 'object' and 'array' separately
      handle('contains', ['object', 'boolean'], () => {
        uncertain('contains')

        if (getMeta().objectContains && typeApplicable('array') && typeApplicable('object')) {
          enforceValidation("possible type confusion in 'contains',", "forbid 'object' or 'array'")
        }

        const passes = gensym('passes')
        fun.write('let %s = 0', passes)

        const suberr = suberror()
        iterate((prop, evaluate) => {
          const { sub } = subrule(suberr, prop, node.contains, subPath('contains'))
          fun.if(sub, () => {
            fun.write('%s++', passes)
            if (getMeta().containsEvaluates) {
              enforce(!removeAdditional, 'Can\'t use removeAdditional with draft2020+ "contains"')
              evaluate()
            }
          })
        })

        if (!handle('minContains', ['natural'], (mn) => format('%s < %d', passes, mn), { suberr }))
          errorIf(format('%s < 1', passes), { path: ['contains'], suberr })

        handle('maxContains', ['natural'], (max) => format('%s > %d', passes, max))
        enforceMinMax('minContains', 'maxContains')
        return null
      })
    }

    const checkGeneric = () => {
      handle('not', ['object', 'boolean'], (not) => subrule(null, current, not, subPath('not')).sub)
      if (node.not) uncertain('not')

      const thenOrElse = node.then || node.then === false || node.else || node.else === false
      // if we allow lone "if" to be present with allowUnusedKeywords, then we must process it to do the evaluation
      // TODO: perhaps we can optimize this out if dynamic evaluation isn't needed _even with this if processed_
      if (thenOrElse || allowUnusedKeywords)
        handle('if', ['object', 'boolean'], (ifS) => {
          uncertain('if/then/else')
          const { sub, delta: deltaIf } = subrule(null, current, ifS, subPath('if'), dyn)
          let handleElse, handleThen, deltaElse, deltaThen
          handle('else', ['object', 'boolean'], (elseS) => {
            handleElse = () => {
              deltaElse = rule(current, elseS, subPath('else'), dyn)
              evaluateDeltaDynamic(deltaElse)
            }
            return null
          })
          handle('then', ['object', 'boolean'], (thenS) => {
            handleThen = () => {
              deltaThen = rule(current, thenS, subPath('then'), dyn)
              evaluateDeltaDynamic(andDelta(deltaIf, deltaThen))
            }
            return null
          })
          if (!handleThen && !deltaEmpty(deltaIf)) handleThen = () => evaluateDeltaDynamic(deltaIf)
          fun.if(sub, handleThen, handleElse)
          evaluateDelta(orDelta(deltaElse || {}, andDelta(deltaIf, deltaThen || {})))
          return null
        })

      const performAllOf = (allOf, rulePath = 'allOf') => {
        enforce(allOf.length > 0, `${rulePath} cannot be empty`)
        for (const [key, sch] of Object.entries(allOf))
          evaluateDelta(rule(current, sch, subPath(rulePath, key), dyn))
        return null
      }
      handle('allOf', ['array'], (allOf) => performAllOf(allOf))

      let handleDiscriminator = null
      handle('discriminator', ['object'], (discriminator) => {
        const seen = new Set()
        const fix = (check, message, arg) => enforce(check, `[discriminator]: ${message}`, arg)
        const { propertyName: pname, mapping: map, ...e0 } = discriminator
        const prop = currPropImm(pname)
        fix(pname && !node.oneOf !== !node.anyOf, 'need propertyName, oneOf OR anyOf')
        fix(Object.keys(e0).length === 0, 'only "propertyName" and "mapping" are supported')
        const keylen = (obj) => (isPlainObject(obj) ? Object.keys(obj).length : null)
        handleDiscriminator = (branches, ruleName) => {
          const runDiscriminator = () => {
            fun.write('switch (%s) {', buildName(prop)) // we could also have used ifs for complex types
            let delta
            for (const [i, branch] of Object.entries(branches)) {
              const { const: myval, enum: myenum, ...e1 } = (branch.properties || {})[pname] || {}
              let vals = myval !== undefined ? [myval] : myenum
              if (!vals && branch.$ref) {
                const [sub] = resolveReference(root, schemas, branch.$ref, basePath())[0] || []
                enforce(isPlainObject(sub), 'failed to resolve $ref:', branch.$ref)
                const rprop = (sub.properties || {})[pname] || {}
                vals = rprop.const !== undefined ? [rprop.const] : rprop.enum
              }
              const ok1 = Array.isArray(vals) && vals.length > 0
              fix(ok1, 'branches should have unique string const or enum values for [propertyName]')
              const ok2 = Object.keys(e1).length === 0 && (!myval || !myenum)
              fix(ok2, 'only const OR enum rules are allowed on [propertyName] in branches')
              for (const val of vals) {
                const okMapping = !map || (functions.hasOwn(map, val) && map[val] === branch.$ref)
                fix(okMapping, 'mismatching mapping for', val)
                const valok = typeof val === 'string' && !seen.has(val)
                fix(valok, 'const/enum values for [propertyName] should be unique strings')
                seen.add(val)
                fun.write('case %j:', val)
              }
              const subd = rule(current, branch, subPath(ruleName, i), dyn, { constProp: pname })
              evaluateDeltaDynamic(subd)
              delta = delta ? orDelta(delta, subd) : subd
              fun.write('break')
            }
            fix(map === undefined || keylen(map) === seen.size, 'mismatching mapping size')
            evaluateDelta(delta)
            fun.write('default:')
            error({ path: [ruleName] })
            fun.write('}')
          }
          const propCheck = () => {
            if (!checked(pname)) {
              const errorPath = ['discriminator', 'propertyName']
              fun.if(present(prop), runDiscriminator, () => error({ path: errorPath, prop }))
            } else runDiscriminator()
          }
          if (allErrors || !functions.deepEqual(stat.type, ['object'])) {
            fun.if(types.get('object')(name), propCheck, () => error({ path: ['discriminator'] }))
          } else propCheck()
          // can't evaluateDelta on type and required to not break the checks below, but discriminator
          // is usually used with refs anyway so those won't be of much use
          fix(functions.deepEqual(stat.type, ['object']), 'has to be checked for type:', 'object')
          fix(stat.required.includes(pname), 'propertyName should be placed in required:', pname)
          return null
        }
        return null
      })

      // Mark the schema as uncertain if the path taken is not determined solely by the branch type
      const uncertainBranchTypes = (key, arr) => {
        // In general, { const: [] } can interfere with other { type: 'array' }
        // Same for { const: {} } and { type: 'object' }
        // So this check doesn't treat those as non-conflicting, and instead labels those as uncertain conflicts
        const btypes = arr.map((x) => x.type || (Array.isArray(x.const) ? 'array' : typeof x.const)) // typeof can be 'undefined', but we don't care
        const maybeObj = btypes.filter((x) => !primitiveTypes.includes(x) && x !== 'array').length
        const maybeArr = btypes.filter((x) => !primitiveTypes.includes(x) && x !== 'object').length
        if (maybeObj > 1 || maybeArr > 1) uncertain(`${key}, use discriminator to make it certain`)
      }

      handle('anyOf', ['array'], (anyOf) => {
        enforce(anyOf.length > 0, 'anyOf cannot be empty')
        if (anyOf.length === 1) return performAllOf(anyOf)
        if (handleDiscriminator) return handleDiscriminator(anyOf, 'anyOf')
        const suberr = suberror()
        if (!canSkipDynamic()) {
          uncertainBranchTypes('anyOf', anyOf) // const sorting for removeAdditional is not supported in dynamic mode
          // In this case, all have to be checked to gather evaluated properties
          const entries = Object.entries(anyOf).map(([key, sch]) =>
            subrule(suberr, current, sch, subPath('anyOf', key), dyn)
          )
          evaluateDelta(entries.map((x) => x.delta).reduce((acc, cur) => orDelta(acc, cur)))
          errorIf(safenotor(...entries.map(({ sub }) => sub)), { path: ['anyOf'], suberr })
          for (const { delta, sub } of entries) fun.if(sub, () => evaluateDeltaDynamic(delta))
          return null
        }
        // We sort the variants to perform const comparisons first, then primitives/array/object/unknown
        // This way, we can be sure that array/object + removeAdditional do not affect const evaluation
        // Note that this _might_ e.g. remove all elements of an array in a 2nd branch _and_ fail with `const: []` in the 1st, but that's expected behavior
        // This can be done because we can stop on the first match in anyOf if we don't need dynamic evaluation
        const constBlocks = anyOf.filter((x) => functions.hasOwn(x, 'const'))
        const otherBlocks = anyOf.filter((x) => !functions.hasOwn(x, 'const'))
        uncertainBranchTypes('anyOf', otherBlocks)
        const blocks = [...constBlocks, ...otherBlocks]
        let delta

        if (!getMeta().exclusiveRefs) {
          // Under unevaluated* support, we can't optimize out branches using simple rules, see below
          const entries = Object.entries(anyOf).map(([key, sch]) =>
            subrule(suberr, current, sch, subPath('anyOf', key), dyn)
          )
          delta = entries.map((x) => x.delta).reduce((acc, cur) => orDelta(acc, cur))
          errorIf(safenotor(...entries.map(({ sub }) => sub)), { path: ['anyOf'], suberr })
        } else {
          // Optimization logic below isn't stable under unevaluated* presence, as branches can be the sole reason of
          // causing dynamic evaluation, and optimizing them out can miss the `if (!canSkipDynamic()) {` check above
          let body = () => error({ path: ['anyOf'], suberr })
          for (const [key, sch] of Object.entries(blocks).reverse()) {
            const oldBody = body
            body = () => {
              const { sub, delta: deltaVar } = subrule(suberr, current, sch, subPath('anyOf', key))
              fun.if(safenot(sub), oldBody) // this can exclude branches, see note above
              delta = delta ? orDelta(delta, deltaVar) : deltaVar
            }
          }
          body()
        }

        evaluateDelta(delta)
        return null
      })

      handle('oneOf', ['array'], (oneOf) => {
        enforce(oneOf.length > 0, 'oneOf cannot be empty')
        if (oneOf.length === 1) return performAllOf(oneOf)
        if (handleDiscriminator) return handleDiscriminator(oneOf, 'oneOf')
        uncertainBranchTypes('oneOf', oneOf)
        const passes = gensym('passes')
        fun.write('let %s = 0', passes)
        const suberr = suberror()
        let delta
        let i = 0
        const entries = Object.entries(oneOf).map(([key, sch]) => {
          if (!includeErrors && i++ > 1) errorIf(format('%s > 1', passes), { path: ['oneOf'] })
          const entry = subrule(suberr, current, sch, subPath('oneOf', key), dyn)
          fun.if(entry.sub, () => fun.write('%s++', passes))
          delta = delta ? orDelta(delta, entry.delta) : entry.delta
          return entry
        })
        evaluateDelta(delta)
        errorIf(format('%s !== 1', passes), { path: ['oneOf'] })
        fun.if(format('%s === 0', passes), () => mergeerror(suberr)) // if none matched, dump all errors
        for (const entry of entries) fun.if(entry.sub, () => evaluateDeltaDynamic(entry.delta))
        return null
      })
    }

    const typeWrap = (checkBlock, validTypes, queryType) => {
      const [funSize, unusedSize] = [fun.size(), unused.size]
      fun.if(definitelyType(...validTypes) ? true : queryType, checkBlock)
      // enforce check that non-applicable blocks are empty and no rules were applied
      if (funSize !== fun.size() || unusedSize !== unused.size)
        enforce(typeApplicable(...validTypes), `Unexpected rules in type`, node.type)
    }

    // Unevaluated validation
    const checkArraysFinal = () => {
      if (stat.items === Infinity) {
        // Everything is statically evaluated, so this check is unreachable. Allow only 'false' rule here.
        if (node.unevaluatedItems === false) consume('unevaluatedItems', 'boolean')
      } else if (node.unevaluatedItems || node.unevaluatedItems === false) {
        if (isDynamic(stat).items) {
          if (!opts[optDynamic]) throw new Error('[opt] Dynamic unevaluated tracing not enabled')
          const limit = format('Math.max(%d, ...%s)', stat.items, dyn.items)
          const extra = (i) => format('%s.includes(%s)', dyn.item, i)
          additionalItems('unevaluatedItems', limit, getMeta().containsEvaluates ? extra : null)
        } else {
          additionalItems('unevaluatedItems', format('%d', stat.items))
        }
      }
    }
    const checkObjectsFinal = () => {
      prevWrap(stat.patterns.length > 0 || stat.dyn.patterns.length > 0 || stat.unknown, () => {
        if (stat.properties.includes(true)) {
          // Everything is statically evaluated, so this check is unreachable. Allow only 'false' rule here.
          if (node.unevaluatedProperties === false) consume('unevaluatedProperties', 'boolean')
        } else if (node.unevaluatedProperties || node.unevaluatedProperties === false) {
          const notStatic = (key) => additionalCondition(key, stat.properties, stat.patterns)
          if (isDynamic(stat).properties) {
            if (!opts[optDynamic]) throw new Error('[opt] Dynamic unevaluated tracing not enabled')
            scope.propertyIn = functions.propertyIn
            const notDynamic = (key) => format('!propertyIn(%s, %s)', key, dyn.props)
            const condition = (key) => safeand(notStatic(key), notDynamic(key))
            additionalProperties('unevaluatedProperties', condition)
          } else {
            if (node.unevaluatedProperties === false) lintRequired(stat.properties, stat.patterns)
            additionalProperties('unevaluatedProperties', notStatic)
          }
        }
      })
    }

    const performValidation = () => {
      if (prev !== null) fun.write('const %s = errorCount', prev)
      if (checkConst()) {
        const typeKeys = [...types.keys()] // we don't extract type from const/enum, it's enough that we know that it's present
        evaluateDelta({ properties: [true], items: Infinity, type: typeKeys, fullstring: true }) // everything is evaluated for const
        if (!allowUnusedKeywords) {
          // const/enum shouldn't have any other validation rules except for already checked type/$ref
          enforce(unused.size === 0, 'Unexpected keywords mixed with const or enum:', [...unused])
          // If it does though, we should not short-circuit validation. This could be optimized by extracting types, but not significant
          return
        }
      }

      typeWrap(checkNumbers, ['number', 'integer'], types.get('number')(name))
      typeWrap(checkStrings, ['string'], types.get('string')(name))
      typeWrap(checkArrays, ['array'], types.get('array')(name))
      typeWrap(checkObjects, ['object'], types.get('object')(name))

      checkGeneric()

      // evaluated: apply static + dynamic
      typeWrap(checkArraysFinal, ['array'], types.get('array')(name))
      typeWrap(checkObjectsFinal, ['object'], types.get('object')(name))

      for (const lint of finalLint) lint()

      // evaluated: propagate dynamic to parent dynamic (aka trace)
      // static to parent is merged via return value
      applyDynamicToDynamic(trace, local.item, local.items, local.props)
    }

    // main post-presence check validation function
    const writeMain = () => {
      if (local.item) fun.write('const %s = []', local.item)
      if (local.items) fun.write('const %s = [0]', local.items)
      if (local.props) fun.write('const %s = [[], []]', local.props)

      // refs
      handle('$ref', ['string'], ($ref) => {
        const resolved = resolveReference(root, schemas, $ref, basePath())
        const [sub, subRoot, path] = resolved[0] || []
        if (!sub && sub !== false) {
          fail('failed to resolve $ref:', $ref)
          if (lintOnly) return null // failures are just collected in linter mode and don't throw, this makes a ref noop
        }
        const n = compileSub(sub, subRoot, path)
        const rn = sub === schema ? funname : n // resolve to actual name
        if (!scope[rn]) throw new Error('Unexpected: coherence check failed')
        if (!scope[rn][evaluatedStatic] && sub.type) {
          const type = Array.isArray(sub.type) ? sub.type : [sub.type]
          evaluateDelta({ type })
          if (requireValidation) {
            // We are inside a cyclic ref, label it as a one that needs full validation to support assumption in next clause
            refsNeedFullValidation.add(rn)
            // If validation is required, then a cyclic $ref is guranteed to validate all items and properties
            if (type.includes('array')) evaluateDelta({ items: Infinity })
            if (type.includes('object')) evaluateDelta({ properties: [true] })
          }
          if (requireStringValidation && type.includes('string')) {
            refsNeedFullValidation.add(rn)
            evaluateDelta({ fullstring: true })
          }
        }
        return applyRef(n, { path: ['$ref'] })
      })
      if (getMeta().exclusiveRefs) {
        enforce(!opts[optDynamic], 'unevaluated* is supported only on draft2019-09 and above')
        if (node.$ref) return // ref overrides any sibling keywords for older schemas
      }
      handle('$recursiveRef', ['string'], ($recursiveRef) => {
        if (!opts[optRecAnchors]) throw new Error('[opt] Recursive anchors are not enabled')
        enforce($recursiveRef === '#', 'Behavior of $recursiveRef is defined only for "#"')
        // Resolve to recheck that recursive ref is enabled
        const resolved = resolveReference(root, schemas, '#', basePath())
        const [sub, subRoot, path] = resolved[0]
        laxMode(sub.$recursiveAnchor, '$recursiveRef without $recursiveAnchor')
        const n = compileSub(sub, subRoot, path)
        // Apply deep recursion from here only if $recursiveAnchor is true, else just run self
        const nrec = sub.$recursiveAnchor ? format('(recursive || %s)', n) : n
        return applyRef(nrec, { path: ['$recursiveRef'] })
      })
      handle('$dynamicRef', ['string'], ($dynamicRef) => {
        if (!opts[optDynAnchors]) throw new Error('[opt] Dynamic anchors are not enabled')
        laxMode(/^[^#]*#[a-zA-Z0-9_-]+$/.test($dynamicRef), 'Unsupported $dynamicRef format')
        const dynamicTail = $dynamicRef.replace(/^[^#]+/, '')
        const resolved = resolveReference(root, schemas, $dynamicRef, basePath())
        if (!resolved[0] && !getMeta().bookending) {
          // TODO: this is draft/next only atm, recheck if dynamicResolve() can fail in runtime and what should happen
          // We have this allowed in lax mode only for now
          // Ref: https://github.com/json-schema-org/json-schema-spec/issues/1064#issuecomment-947223332
          // Ref: https://github.com/json-schema-org/json-schema-spec/pull/1139
          // Ref: https://github.com/json-schema-org/json-schema-spec/issues/1140 (unresolved)
          laxMode(false, '$dynamicRef bookending resolution failed (even though not required)')
          scope.dynamicResolve = functions.dynamicResolve
          const nrec = format('dynamicResolve(dynAnchors || [], %j)', dynamicTail)
          return applyRef(nrec, { path: ['$dynamicRef'] })
        }
        enforce(resolved[0], '$dynamicRef bookending resolution failed', $dynamicRef)
        const [sub, subRoot, path] = resolved[0]
        const ok = sub.$dynamicAnchor && `#${sub.$dynamicAnchor}` === dynamicTail
        laxMode(ok, '$dynamicRef without $dynamicAnchor in the same scope')
        const n = compileSub(sub, subRoot, path)
        scope.dynamicResolve = functions.dynamicResolve
        const nrec = ok ? format('(dynamicResolve(dynAnchors || [], %j) || %s)', dynamicTail, n) : n
        return applyRef(nrec, { path: ['$dynamicRef'] })
      })

      // typecheck
      let typeCheck = null
      handle('type', ['string', 'array'], (type) => {
        const typearr = Array.isArray(type) ? type : [type]
        for (const t of typearr) enforce(typeof t === 'string' && types.has(t), 'Unknown type:', t)
        if (current.type) {
          enforce(functions.deepEqual(typearr, [current.type]), 'One type allowed:', current.type)
          evaluateDelta({ type: [current.type] })
          return null
        }
        if (parentCheckedType(...typearr)) return null
        const filteredTypes = typearr.filter((t) => typeApplicable(t))
        if (filteredTypes.length === 0) fail('No valid types possible')
        evaluateDelta({ type: typearr }) // can be safely done here, filteredTypes already prepared
        typeCheck = safenotor(...filteredTypes.map((t) => types.get(t)(name)))
        return null
      })

      // main validation block
      // if type validation was needed and did not return early, wrap this inside an else clause.
      if (typeCheck && allErrors) {
        fun.if(typeCheck, () => error({ path: ['type'] }), performValidation)
      } else {
        if (typeCheck) errorIf(typeCheck, { path: ['type'] })
        performValidation()
      }

      // account for maxItems to recheck if they limit items. TODO: perhaps we could keep track of this in stat?
      if (stat.items < Infinity && node.maxItems <= stat.items) evaluateDelta({ items: Infinity })
    }

    // presence check and call main validation block
    if (node.default !== undefined && useDefaults) {
      if (definitelyPresent) fail('Can not apply default value here (e.g. at root)')
      const defvalue = get('default', 'jsonval')
      fun.if(present(current), writeMain, () => fun.write('%s = %j', name, defvalue))
    } else {
      handle('default', ['jsonval'], null) // unused
      fun.if(definitelyPresent ? true : present(current), writeMain)
    }

    basePathStack.length = basePathStackLength // restore basePath

    // restore recursiveAnchor history if it's not empty and ends with current node
    if (recursiveLog[0] && recursiveLog[recursiveLog.length - 1][0] === node) recursiveLog.pop()
    if (isDynScope && node !== schema) fun.write('dynLocal.shift()') // restore dynamic scope, no need on top-level

    // Checks related to static schema analysis
    if (!allowUnreachable) enforce(!fun.optimizedOut, 'some checks are never reachable')
    if (isSub) {
      const logicalOp = ['not', 'if', 'then', 'else'].includes(schemaPath[schemaPath.length - 1])
      const branchOp = ['oneOf', 'anyOf', 'allOf'].includes(schemaPath[schemaPath.length - 2])
      const depOp = ['dependencies', 'dependentSchemas'].includes(schemaPath[schemaPath.length - 2])
      const propDepOp = ['propertyDependencies'].includes(schemaPath[schemaPath.length - 3])
      // Coherence check, unreachable, double-check that we came from expected path
      enforce(logicalOp || branchOp || depOp || propDepOp, 'Unexpected logical path')
    } else if (!schemaPath.includes('not')) {
      // 'not' does not mark anything as evaluated (unlike even if/then/else), so it's safe to exclude from these
      // checks, as we are sure that everything will be checked without it. It can be viewed as a pure add-on.
      const isRefTop = schema !== root && node === schema // We are at the top-level of an opaque ref inside the schema object
      if (!isRefTop || refsNeedFullValidation.has(funname)) {
        refsNeedFullValidation.delete(funname)
        if (!stat.type) enforceValidation('type')
        // This can't be true for top-level schemas, only references with #/...
        if (typeApplicable('array') && stat.items !== Infinity)
          enforceValidation(node.items ? 'additionalItems or unevaluatedItems' : 'items rule')
        if (typeApplicable('object') && !stat.properties.includes(true))
          enforceValidation('additionalProperties or unevaluatedProperties')
        if (!stat.fullstring && requireStringValidation) {
          const stringWarning = 'pattern, format or contentSchema should be specified for strings'
          fail(`[requireStringValidation] ${stringWarning}, use pattern: ^[\\s\\S]*$ to opt-out`)
        }
      }
      if (typeof node.propertyNames !== 'object')
        for (const sub of ['additionalProperties', 'unevaluatedProperties'])
          if (node[sub]) enforceValidation(`wild-card ${sub}`, 'requires propertyNames')
    }
    if (node.properties && !node.required) enforceValidation('if properties is used, required')
    enforce(unused.size === 0 || allowUnusedKeywords, 'Unprocessed keywords:', [...unused])

    return { stat, local } // return statically evaluated
  }

  const { stat, local } = visit(format('validate.errors'), [], { name: safe('data') }, schema, [])
  if (refsNeedFullValidation.has(funname)) throw new Error('Unexpected: unvalidated cyclic ref')

  // evaluated: return dynamic for refs
  if (opts[optDynamic] && (isDynamic(stat).items || isDynamic(stat).properties)) {
    if (!local) throw new Error('Failed to trace dynamic properties') // Unreachable
    fun.write('validate.evaluatedDynamic = [%s, %s, %s]', local.item, local.items, local.props)
  }

  if (allErrors) fun.write('return errorCount === 0')
  else fun.write('return true')

  fun.write('}')

  if (!lintOnly) {
    validate = fun.makeFunction(scope)
    delete scope[funname] // more logical key order
    scope[funname] = validate
  }
  scope[funname][evaluatedStatic] = stat // still needed even in non-compiled lint for recursive refs check
  return funname
}

const compile = (schemas, opts) => {
  if (!Array.isArray(schemas)) throw new Error('Expected an array of schemas')
  try {
    const scope = Object.create(null)
    const { getref } = scopeMethods(scope)
    refsNeedFullValidation.clear() // for isolation/safeguard
    rootMeta.clear() // for isolation/safeguard
    const refs = schemas.map((s) => getref(s) || compileSchema(s, s, opts, scope))
    if (refsNeedFullValidation.size !== 0) throw new Error('Unexpected: not all refs are validated')
    return { scope, refs }
  } catch (e) {
    // For performance, we try to build the schema without dynamic tracing first, then re-run with
    // it enabled if needed. Enabling it without need can give up to about 40% performance drop.
    if (!opts[optDynamic] && e.message === '[opt] Dynamic unevaluated tracing not enabled')
      return compile(schemas, { ...opts, [optDynamic]: true })
    // Also enable dynamic and recursive refs only if needed
    if (!opts[optDynAnchors] && e.message === '[opt] Dynamic anchors are not enabled')
      return compile(schemas, { ...opts, [optDynAnchors]: true })
    if (!opts[optRecAnchors] && e.message === '[opt] Recursive anchors are not enabled')
      return compile(schemas, { ...opts, [optRecAnchors]: true })
    throw e
  } finally {
    refsNeedFullValidation.clear() // for gc
    rootMeta.clear() // for gc
  }
}

module.exports = { compile }
