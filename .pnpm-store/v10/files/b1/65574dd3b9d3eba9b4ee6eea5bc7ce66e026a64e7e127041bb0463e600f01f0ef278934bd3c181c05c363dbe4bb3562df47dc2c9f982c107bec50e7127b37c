'use strict'
module.exports = validate

function isArguments (thingy) {
  return thingy != null && typeof thingy === 'object' && thingy.hasOwnProperty('callee')
}

const types = {
  '*': {label: 'any', check: () => true},
  A: {label: 'array', check: _ => Array.isArray(_) || isArguments(_)},
  S: {label: 'string', check: _ => typeof _ === 'string'},
  N: {label: 'number', check: _ => typeof _ === 'number'},
  F: {label: 'function', check: _ => typeof _ === 'function'},
  O: {label: 'object', check: _ => typeof _ === 'object' && _ != null && !types.A.check(_) && !types.E.check(_)},
  B: {label: 'boolean', check: _ => typeof _ === 'boolean'},
  E: {label: 'error', check: _ => _ instanceof Error},
  Z: {label: 'null', check: _ => _ == null}
}

function addSchema (schema, arity) {
  const group = arity[schema.length] = arity[schema.length] || []
  if (group.indexOf(schema) === -1) group.push(schema)
}

function validate (rawSchemas, args) {
  if (arguments.length !== 2) throw wrongNumberOfArgs(['SA'], arguments.length)
  if (!rawSchemas) throw missingRequiredArg(0, 'rawSchemas')
  if (!args) throw missingRequiredArg(1, 'args')
  if (!types.S.check(rawSchemas)) throw invalidType(0, ['string'], rawSchemas)
  if (!types.A.check(args)) throw invalidType(1, ['array'], args)
  const schemas = rawSchemas.split('|')
  const arity = {}

  schemas.forEach(schema => {
    for (let ii = 0; ii < schema.length; ++ii) {
      const type = schema[ii]
      if (!types[type]) throw unknownType(ii, type)
    }
    if (/E.*E/.test(schema)) throw moreThanOneError(schema)
    addSchema(schema, arity)
    if (/E/.test(schema)) {
      addSchema(schema.replace(/E.*$/, 'E'), arity)
      addSchema(schema.replace(/E/, 'Z'), arity)
      if (schema.length === 1) addSchema('', arity)
    }
  })
  let matching = arity[args.length]
  if (!matching) {
    throw wrongNumberOfArgs(Object.keys(arity), args.length)
  }
  for (let ii = 0; ii < args.length; ++ii) {
    let newMatching = matching.filter(schema => {
      const type = schema[ii]
      const typeCheck = types[type].check
      return typeCheck(args[ii])
    })
    if (!newMatching.length) {
      const labels = matching.map(_ => types[_[ii]].label).filter(_ => _ != null)
      throw invalidType(ii, labels, args[ii])
    }
    matching = newMatching
  }
}

function missingRequiredArg (num) {
  return newException('EMISSINGARG', 'Missing required argument #' + (num + 1))
}

function unknownType (num, type) {
  return newException('EUNKNOWNTYPE', 'Unknown type ' + type + ' in argument #' + (num + 1))
}

function invalidType (num, expectedTypes, value) {
  let valueType
  Object.keys(types).forEach(typeCode => {
    if (types[typeCode].check(value)) valueType = types[typeCode].label
  })
  return newException('EINVALIDTYPE', 'Argument #' + (num + 1) + ': Expected ' +
    englishList(expectedTypes) + ' but got ' + valueType)
}

function englishList (list) {
  return list.join(', ').replace(/, ([^,]+)$/, ' or $1')
}

function wrongNumberOfArgs (expected, got) {
  const english = englishList(expected)
  const args = expected.every(ex => ex.length === 1)
    ? 'argument'
    : 'arguments'
  return newException('EWRONGARGCOUNT', 'Expected ' + english + ' ' + args + ' but got ' + got)
}

function moreThanOneError (schema) {
  return newException('ETOOMANYERRORTYPES',
    'Only one error type per argument signature is allowed, more than one found in "' + schema + '"')
}

function newException (code, msg) {
  const err = new TypeError(msg)
  err.code = code
  /* istanbul ignore else */
  if (Error.captureStackTrace) Error.captureStackTrace(err, validate)
  return err
}
