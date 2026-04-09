const abbrev = require('abbrev')
const debug = require('./debug')
const defaultTypeDefs = require('./type-defs')

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

const getType = (k, { types, dynamicTypes }) => {
  let hasType = hasOwn(types, k)
  let type = types[k]
  if (!hasType && typeof dynamicTypes === 'function') {
    const matchedType = dynamicTypes(k)
    if (matchedType !== undefined) {
      type = matchedType
      hasType = true
    }
  }
  return [hasType, type]
}

const isTypeDef = (type, def) => def && type === def
const hasTypeDef = (type, def) => def && type.indexOf(def) !== -1
const doesNotHaveTypeDef = (type, def) => def && !hasTypeDef(type, def)

function nopt (args, {
  types,
  shorthands,
  typeDefs,
  invalidHandler,
  typeDefault,
  dynamicTypes,
} = {}) {
  debug(types, shorthands, args, typeDefs)

  const data = {}
  const argv = {
    remain: [],
    cooked: args,
    original: args.slice(0),
  }

  parse(args, data, argv.remain, { typeDefs, types, dynamicTypes, shorthands })

  // now data is full
  clean(data, { types, dynamicTypes, typeDefs, invalidHandler, typeDefault })
  data.argv = argv

  Object.defineProperty(data.argv, 'toString', {
    value: function () {
      return this.original.map(JSON.stringify).join(' ')
    },
    enumerable: false,
  })

  return data
}

function clean (data, {
  types = {},
  typeDefs = {},
  dynamicTypes,
  invalidHandler,
  typeDefault,
} = {}) {
  const StringType = typeDefs.String?.type
  const NumberType = typeDefs.Number?.type
  const ArrayType = typeDefs.Array?.type
  const BooleanType = typeDefs.Boolean?.type
  const DateType = typeDefs.Date?.type

  const hasTypeDefault = typeof typeDefault !== 'undefined'
  if (!hasTypeDefault) {
    typeDefault = [false, true, null]
    if (StringType) {
      typeDefault.push(StringType)
    }
    if (ArrayType) {
      typeDefault.push(ArrayType)
    }
  }

  const remove = {}

  Object.keys(data).forEach((k) => {
    if (k === 'argv') {
      return
    }
    let val = data[k]
    debug('val=%j', val)
    const isArray = Array.isArray(val)
    let [hasType, rawType] = getType(k, { types, dynamicTypes })
    let type = rawType
    if (!isArray) {
      val = [val]
    }
    if (!type) {
      type = typeDefault
    }
    if (isTypeDef(type, ArrayType)) {
      type = typeDefault.concat(ArrayType)
    }
    if (!Array.isArray(type)) {
      type = [type]
    }

    debug('val=%j', val)
    debug('types=', type)
    val = val.map((v) => {
      // if it's an unknown value, then parse false/true/null/numbers/dates
      if (typeof v === 'string') {
        debug('string %j', v)
        v = v.trim()
        if ((v === 'null' && ~type.indexOf(null))
            || (v === 'true' &&
               (~type.indexOf(true) || hasTypeDef(type, BooleanType)))
            || (v === 'false' &&
               (~type.indexOf(false) || hasTypeDef(type, BooleanType)))) {
          v = JSON.parse(v)
          debug('jsonable %j', v)
        } else if (hasTypeDef(type, NumberType) && !isNaN(v)) {
          debug('convert to number', v)
          v = +v
        } else if (hasTypeDef(type, DateType) && !isNaN(Date.parse(v))) {
          debug('convert to date', v)
          v = new Date(v)
        }
      }

      if (!hasType) {
        if (!hasTypeDefault) {
          return v
        }
        // if the default type has been passed in then we want to validate the
        // unknown data key instead of bailing out earlier. we also set the raw
        // type which is passed to the invalid handler so that it can be
        // determined if during validation if it is unknown vs invalid
        rawType = typeDefault
      }

      // allow `--no-blah` to set 'blah' to null if null is allowed
      if (v === false && ~type.indexOf(null) &&
          !(~type.indexOf(false) || hasTypeDef(type, BooleanType))) {
        v = null
      }

      const d = {}
      d[k] = v
      debug('prevalidated val', d, v, rawType)
      if (!validate(d, k, v, rawType, { typeDefs })) {
        if (invalidHandler) {
          invalidHandler(k, v, rawType, data)
        } else if (invalidHandler !== false) {
          debug('invalid: ' + k + '=' + v, rawType)
        }
        return remove
      }
      debug('validated v', d, v, rawType)
      return d[k]
    }).filter((v) => v !== remove)

    // if we allow Array specifically, then an empty array is how we
    // express 'no value here', not null.  Allow it.
    if (!val.length && doesNotHaveTypeDef(type, ArrayType)) {
      debug('VAL HAS NO LENGTH, DELETE IT', val, k, type.indexOf(ArrayType))
      delete data[k]
    } else if (isArray) {
      debug(isArray, data[k], val)
      data[k] = val
    } else {
      data[k] = val[0]
    }

    debug('k=%s val=%j', k, val, data[k])
  })
}

function validate (data, k, val, type, { typeDefs } = {}) {
  const ArrayType = typeDefs?.Array?.type
  // arrays are lists of types.
  if (Array.isArray(type)) {
    for (let i = 0, l = type.length; i < l; i++) {
      if (isTypeDef(type[i], ArrayType)) {
        continue
      }
      if (validate(data, k, val, type[i], { typeDefs })) {
        return true
      }
    }
    delete data[k]
    return false
  }

  // an array of anything?
  if (isTypeDef(type, ArrayType)) {
    return true
  }

  // Original comment:
  // NaN is poisonous.  Means that something is not allowed.
  // New comment: Changing this to an isNaN check breaks a lot of tests.
  // Something is being assumed here that is not actually what happens in
  // practice.  Fixing it is outside the scope of getting linting to pass in
  // this repo. Leaving as-is for now.
  /* eslint-disable-next-line no-self-compare */
  if (type !== type) {
    debug('Poison NaN', k, val, type)
    delete data[k]
    return false
  }

  // explicit list of values
  if (val === type) {
    debug('Explicitly allowed %j', val)
    data[k] = val
    return true
  }

  // now go through the list of typeDefs, validate against each one.
  let ok = false
  const types = Object.keys(typeDefs)
  for (let i = 0, l = types.length; i < l; i++) {
    debug('test type %j %j %j', k, val, types[i])
    const t = typeDefs[types[i]]
    if (t && (
      (type && type.name && t.type && t.type.name) ?
        (type.name === t.type.name) :
        (type === t.type)
    )) {
      const d = {}
      ok = t.validate(d, k, val) !== false
      val = d[k]
      if (ok) {
        data[k] = val
        break
      }
    }
  }
  debug('OK? %j (%j %j %j)', ok, k, val, types[types.length - 1])

  if (!ok) {
    delete data[k]
  }
  return ok
}

function parse (args, data, remain, {
  types = {},
  typeDefs = {},
  shorthands = {},
  dynamicTypes,
} = {}) {
  const StringType = typeDefs.String?.type
  const NumberType = typeDefs.Number?.type
  const ArrayType = typeDefs.Array?.type
  const BooleanType = typeDefs.Boolean?.type

  debug('parse', args, data, remain)

  const abbrevs = abbrev(Object.keys(types))
  debug('abbrevs=%j', abbrevs)
  const shortAbbr = abbrev(Object.keys(shorthands))

  for (let i = 0; i < args.length; i++) {
    let arg = args[i]
    debug('arg', arg)

    if (arg.match(/^-{2,}$/)) {
      // done with keys.
      // the rest are args.
      remain.push.apply(remain, args.slice(i + 1))
      args[i] = '--'
      break
    }
    let hadEq = false
    if (arg.charAt(0) === '-' && arg.length > 1) {
      const at = arg.indexOf('=')
      if (at > -1) {
        hadEq = true
        const v = arg.slice(at + 1)
        arg = arg.slice(0, at)
        args.splice(i, 1, arg, v)
      }

      // see if it's a shorthand
      // if so, splice and back up to re-parse it.
      const shRes = resolveShort(arg, shortAbbr, abbrevs, { shorthands })
      debug('arg=%j shRes=%j', arg, shRes)
      if (shRes) {
        args.splice.apply(args, [i, 1].concat(shRes))
        if (arg !== shRes[0]) {
          i--
          continue
        }
      }
      arg = arg.replace(/^-+/, '')
      let no = null
      while (arg.toLowerCase().indexOf('no-') === 0) {
        no = !no
        arg = arg.slice(3)
      }

      if (abbrevs[arg]) {
        arg = abbrevs[arg]
      }

      let [hasType, argType] = getType(arg, { types, dynamicTypes })
      let isTypeArray = Array.isArray(argType)
      if (isTypeArray && argType.length === 1) {
        isTypeArray = false
        argType = argType[0]
      }

      let isArray = isTypeDef(argType, ArrayType) ||
        isTypeArray && hasTypeDef(argType, ArrayType)

      // allow unknown things to be arrays if specified multiple times.
      if (!hasType && hasOwn(data, arg)) {
        if (!Array.isArray(data[arg])) {
          data[arg] = [data[arg]]
        }
        isArray = true
      }

      let val
      let la = args[i + 1]

      const isBool = typeof no === 'boolean' ||
        isTypeDef(argType, BooleanType) ||
        isTypeArray && hasTypeDef(argType, BooleanType) ||
        (typeof argType === 'undefined' && !hadEq) ||
        (la === 'false' &&
         (argType === null ||
          isTypeArray && ~argType.indexOf(null)))

      if (isBool) {
        // just set and move along
        val = !no
        // however, also support --bool true or --bool false
        if (la === 'true' || la === 'false') {
          val = JSON.parse(la)
          la = null
          if (no) {
            val = !val
          }
          i++
        }

        // also support "foo":[Boolean, "bar"] and "--foo bar"
        if (isTypeArray && la) {
          if (~argType.indexOf(la)) {
            // an explicit type
            val = la
            i++
          } else if (la === 'null' && ~argType.indexOf(null)) {
            // null allowed
            val = null
            i++
          } else if (!la.match(/^-{2,}[^-]/) &&
                      !isNaN(la) &&
                      hasTypeDef(argType, NumberType)) {
            // number
            val = +la
            i++
          } else if (!la.match(/^-[^-]/) && hasTypeDef(argType, StringType)) {
            // string
            val = la
            i++
          }
        }

        if (isArray) {
          (data[arg] = data[arg] || []).push(val)
        } else {
          data[arg] = val
        }

        continue
      }

      if (isTypeDef(argType, StringType)) {
        if (la === undefined) {
          la = ''
        } else if (la.match(/^-{1,2}[^-]+/)) {
          la = ''
          i--
        }
      }

      if (la && la.match(/^-{2,}$/)) {
        la = undefined
        i--
      }

      val = la === undefined ? true : la
      if (isArray) {
        (data[arg] = data[arg] || []).push(val)
      } else {
        data[arg] = val
      }

      i++
      continue
    }
    remain.push(arg)
  }
}

const SINGLES = Symbol('singles')
const singleCharacters = (arg, shorthands) => {
  let singles = shorthands[SINGLES]
  if (!singles) {
    singles = Object.keys(shorthands).filter((s) => s.length === 1).reduce((l, r) => {
      l[r] = true
      return l
    }, {})
    shorthands[SINGLES] = singles
    debug('shorthand singles', singles)
  }
  const chrs = arg.split('').filter((c) => singles[c])
  return chrs.join('') === arg ? chrs : null
}

function resolveShort (arg, ...rest) {
  const { types = {}, shorthands = {} } = rest.length ? rest.pop() : {}
  const shortAbbr = rest[0] ?? abbrev(Object.keys(shorthands))
  const abbrevs = rest[1] ?? abbrev(Object.keys(types))

  // handle single-char shorthands glommed together, like
  // npm ls -glp, but only if there is one dash, and only if
  // all of the chars are single-char shorthands, and it's
  // not a match to some other abbrev.
  arg = arg.replace(/^-+/, '')

  // if it's an exact known option, then don't go any further
  if (abbrevs[arg] === arg) {
    return null
  }

  // if it's an exact known shortopt, same deal
  if (shorthands[arg]) {
    // make it an array, if it's a list of words
    if (shorthands[arg] && !Array.isArray(shorthands[arg])) {
      shorthands[arg] = shorthands[arg].split(/\s+/)
    }

    return shorthands[arg]
  }

  // first check to see if this arg is a set of single-char shorthands
  const chrs = singleCharacters(arg, shorthands)
  if (chrs) {
    return chrs.map((c) => shorthands[c]).reduce((l, r) => l.concat(r), [])
  }

  // if it's an arg abbrev, and not a literal shorthand, then prefer the arg
  if (abbrevs[arg] && !shorthands[arg]) {
    return null
  }

  // if it's an abbr for a shorthand, then use that
  if (shortAbbr[arg]) {
    arg = shortAbbr[arg]
  }

  // make it an array, if it's a list of words
  if (shorthands[arg] && !Array.isArray(shorthands[arg])) {
    shorthands[arg] = shorthands[arg].split(/\s+/)
  }

  return shorthands[arg]
}

module.exports = {
  nopt,
  clean,
  parse,
  validate,
  resolveShort,
  typeDefs: defaultTypeDefs,
}
