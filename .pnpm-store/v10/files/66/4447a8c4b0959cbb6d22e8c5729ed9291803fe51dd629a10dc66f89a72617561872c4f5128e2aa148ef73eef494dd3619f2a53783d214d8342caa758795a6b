'use strict'

const genfun = require('./generate-function')
const { buildSchemas } = require('./pointer')
const { compile } = require('./compile')
const { deepEqual } = require('./scope-functions')

const jsonCheckWithErrors = (validate) =>
  function validateIsJSON(data) {
    if (!deepEqual(data, JSON.parse(JSON.stringify(data)))) {
      validateIsJSON.errors = [{ instanceLocation: '#', error: 'not JSON compatible' }]
      return false
    }
    const res = validate(data)
    validateIsJSON.errors = validate.errors
    return res
  }

const jsonCheckWithoutErrors = (validate) => (data) =>
  deepEqual(data, JSON.parse(JSON.stringify(data))) && validate(data)

const validator = (
  schema,
  { parse = false, multi = false, jsonCheck = false, isJSON = false, schemas = [], ...opts } = {}
) => {
  if (jsonCheck && isJSON) throw new Error('Can not specify both isJSON and jsonCheck options')
  if (parse && (jsonCheck || isJSON))
    throw new Error('jsonCheck and isJSON options are not applicable in parser mode')
  const mode = parse ? 'strong' : 'default' // strong mode is default in parser, can be overriden
  const willJSON = isJSON || jsonCheck || parse
  const arg = multi ? schema : [schema]
  const options = { mode, ...opts, schemas: buildSchemas(schemas, arg), isJSON: willJSON }
  const { scope, refs } = compile(arg, options) // only a single ref
  if (opts.dryRun) return
  if (opts.lint) return scope.lintErrors
  const fun = genfun()
  if (parse) {
    scope.parseWrap = opts.includeErrors ? parseWithErrors : parseWithoutErrors
  } else if (jsonCheck) {
    scope.deepEqual = deepEqual
    scope.jsonCheckWrap = opts.includeErrors ? jsonCheckWithErrors : jsonCheckWithoutErrors
  }
  if (multi) {
    fun.write('[')
    for (const ref of refs.slice(0, -1)) fun.write('%s,', ref)
    if (refs.length > 0) fun.write('%s', refs[refs.length - 1])
    fun.write(']')
    if (parse) fun.write('.map(parseWrap)')
    else if (jsonCheck) fun.write('.map(jsonCheckWrap)')
  } else {
    if (parse) fun.write('parseWrap(%s)', refs[0])
    else if (jsonCheck) fun.write('jsonCheckWrap(%s)', refs[0])
    else fun.write('%s', refs[0])
  }
  const validate = fun.makeFunction(scope)
  validate.toModule = ({ semi = true } = {}) => fun.makeModule(scope) + (semi ? ';' : '')
  validate.toJSON = () => schema
  return validate
}

const parseWithErrors = (validate) => (src) => {
  if (typeof src !== 'string') return { valid: false, error: 'Input is not a string' }
  try {
    const value = JSON.parse(src)
    if (!validate(value)) {
      const { keywordLocation, instanceLocation } = validate.errors[0]
      const keyword = keywordLocation.slice(keywordLocation.lastIndexOf('/') + 1)
      const error = `JSON validation failed for ${keyword} at ${instanceLocation}`
      return { valid: false, error, errors: validate.errors }
    }
    return { valid: true, value }
  } catch ({ message }) {
    return { valid: false, error: message }
  }
}

const parseWithoutErrors = (validate) => (src) => {
  if (typeof src !== 'string') return { valid: false }
  try {
    const value = JSON.parse(src)
    if (!validate(value)) return { valid: false }
    return { valid: true, value }
  } catch (e) {
    return { valid: false }
  }
}

const parser = function(schema, { parse = true, ...opts } = {}) {
  if (!parse) throw new Error('can not disable parse in parser')
  return validator(schema, { parse, ...opts })
}

const lint = function(schema, { lint: lintOption = true, ...opts } = {}) {
  if (!lintOption) throw new Error('can not disable lint option in lint()')
  return validator(schema, { lint: lintOption, ...opts })
}

module.exports = { validator, parser, lint }
