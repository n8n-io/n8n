// info about each config option.

var debug = process.env.DEBUG_NOPT || process.env.NOPT_DEBUG
  ? function () {
    console.error.apply(console, arguments)
  }
  : function () {}

var url = require('url')
var path = require('path')
var Stream = require('stream').Stream
var abbrev = require('abbrev')
var os = require('os')

module.exports = exports = nopt
exports.clean = clean

exports.typeDefs =
  { String: { type: String, validate: validateString },
    Boolean: { type: Boolean, validate: validateBoolean },
    url: { type: url, validate: validateUrl },
    Number: { type: Number, validate: validateNumber },
    path: { type: path, validate: validatePath },
    Stream: { type: Stream, validate: validateStream },
    Date: { type: Date, validate: validateDate },
  }

function nopt (types, shorthands, args, slice) {
  args = args || process.argv
  types = types || {}
  shorthands = shorthands || {}
  if (typeof slice !== 'number') {
    slice = 2
  }

  debug(types, shorthands, args, slice)

  args = args.slice(slice)
  var data = {}
  var argv = {
    remain: [],
    cooked: args,
    original: args.slice(0),
  }

  parse(args, data, argv.remain, types, shorthands)
  // now data is full
  clean(data, types, exports.typeDefs)
  data.argv = argv
  Object.defineProperty(data.argv, 'toString', { value: function () {
    return this.original.map(JSON.stringify).join(' ')
  },
  enumerable: false })
  return data
}

function clean (data, types, typeDefs) {
  typeDefs = typeDefs || exports.typeDefs
  var remove = {}
  var typeDefault = [false, true, null, String, Array]

  Object.keys(data).forEach(function (k) {
    if (k === 'argv') {
      return
    }
    var val = data[k]
    var isArray = Array.isArray(val)
    var type = types[k]
    if (!isArray) {
      val = [val]
    }
    if (!type) {
      type = typeDefault
    }
    if (type === Array) {
      type = typeDefault.concat(Array)
    }
    if (!Array.isArray(type)) {
      type = [type]
    }

    debug('val=%j', val)
    debug('types=', type)
    val = val.map(function (v) {
      // if it's an unknown value, then parse false/true/null/numbers/dates
      if (typeof v === 'string') {
        debug('string %j', v)
        v = v.trim()
        if ((v === 'null' && ~type.indexOf(null))
            || (v === 'true' &&
               (~type.indexOf(true) || ~type.indexOf(Boolean)))
            || (v === 'false' &&
               (~type.indexOf(false) || ~type.indexOf(Boolean)))) {
          v = JSON.parse(v)
          debug('jsonable %j', v)
        } else if (~type.indexOf(Number) && !isNaN(v)) {
          debug('convert to number', v)
          v = +v
        } else if (~type.indexOf(Date) && !isNaN(Date.parse(v))) {
          debug('convert to date', v)
          v = new Date(v)
        }
      }

      if (!Object.prototype.hasOwnProperty.call(types, k)) {
        return v
      }

      // allow `--no-blah` to set 'blah' to null if null is allowed
      if (v === false && ~type.indexOf(null) &&
          !(~type.indexOf(false) || ~type.indexOf(Boolean))) {
        v = null
      }

      var d = {}
      d[k] = v
      debug('prevalidated val', d, v, types[k])
      if (!validate(d, k, v, types[k], typeDefs)) {
        if (exports.invalidHandler) {
          exports.invalidHandler(k, v, types[k], data)
        } else if (exports.invalidHandler !== false) {
          debug('invalid: ' + k + '=' + v, types[k])
        }
        return remove
      }
      debug('validated v', d, v, types[k])
      return d[k]
    }).filter(function (v) {
      return v !== remove
    })

    // if we allow Array specifically, then an empty array is how we
    // express 'no value here', not null.  Allow it.
    if (!val.length && type.indexOf(Array) === -1) {
      debug('VAL HAS NO LENGTH, DELETE IT', val, k, type.indexOf(Array))
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

function validateString (data, k, val) {
  data[k] = String(val)
}

function validatePath (data, k, val) {
  if (val === true) {
    return false
  }
  if (val === null) {
    return true
  }

  val = String(val)

  var isWin = process.platform === 'win32'
  var homePattern = isWin ? /^~(\/|\\)/ : /^~\//
  var home = os.homedir()

  if (home && val.match(homePattern)) {
    data[k] = path.resolve(home, val.slice(2))
  } else {
    data[k] = path.resolve(val)
  }
  return true
}

function validateNumber (data, k, val) {
  debug('validate Number %j %j %j', k, val, isNaN(val))
  if (isNaN(val)) {
    return false
  }
  data[k] = +val
}

function validateDate (data, k, val) {
  var s = Date.parse(val)
  debug('validate Date %j %j %j', k, val, s)
  if (isNaN(s)) {
    return false
  }
  data[k] = new Date(val)
}

function validateBoolean (data, k, val) {
  if (val instanceof Boolean) {
    val = val.valueOf()
  } else if (typeof val === 'string') {
    if (!isNaN(val)) {
      val = !!(+val)
    } else if (val === 'null' || val === 'false') {
      val = false
    } else {
      val = true
    }
  } else {
    val = !!val
  }
  data[k] = val
}

function validateUrl (data, k, val) {
  // Changing this would be a breaking change in the npm cli
  /* eslint-disable-next-line node/no-deprecated-api */
  val = url.parse(String(val))
  if (!val.host) {
    return false
  }
  data[k] = val.href
}

function validateStream (data, k, val) {
  if (!(val instanceof Stream)) {
    return false
  }
  data[k] = val
}

function validate (data, k, val, type, typeDefs) {
  // arrays are lists of types.
  if (Array.isArray(type)) {
    for (let i = 0, l = type.length; i < l; i++) {
      if (type[i] === Array) {
        continue
      }
      if (validate(data, k, val, type[i], typeDefs)) {
        return true
      }
    }
    delete data[k]
    return false
  }

  // an array of anything?
  if (type === Array) {
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
    // if (isArray) (data[k] = data[k] || []).push(val)
    // else data[k] = val
    data[k] = val
    return true
  }

  // now go through the list of typeDefs, validate against each one.
  var ok = false
  var types = Object.keys(typeDefs)
  for (let i = 0, l = types.length; i < l; i++) {
    debug('test type %j %j %j', k, val, types[i])
    var t = typeDefs[types[i]]
    if (t && (
      (type && type.name && t.type && t.type.name) ?
        (type.name === t.type.name) :
        (type === t.type)
    )) {
      var d = {}
      ok = t.validate(d, k, val) !== false
      val = d[k]
      if (ok) {
        // if (isArray) (data[k] = data[k] || []).push(val)
        // else data[k] = val
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

function parse (args, data, remain, types, shorthands) {
  debug('parse', args, data, remain)

  var abbrevs = abbrev(Object.keys(types))
  var shortAbbr = abbrev(Object.keys(shorthands))

  for (var i = 0; i < args.length; i++) {
    var arg = args[i]
    debug('arg', arg)

    if (arg.match(/^-{2,}$/)) {
      // done with keys.
      // the rest are args.
      remain.push.apply(remain, args.slice(i + 1))
      args[i] = '--'
      break
    }
    var hadEq = false
    if (arg.charAt(0) === '-' && arg.length > 1) {
      var at = arg.indexOf('=')
      if (at > -1) {
        hadEq = true
        var v = arg.slice(at + 1)
        arg = arg.slice(0, at)
        args.splice(i, 1, arg, v)
      }

      // see if it's a shorthand
      // if so, splice and back up to re-parse it.
      var shRes = resolveShort(arg, shorthands, shortAbbr, abbrevs)
      debug('arg=%j shRes=%j', arg, shRes)
      if (shRes) {
        debug(arg, shRes)
        args.splice.apply(args, [i, 1].concat(shRes))
        if (arg !== shRes[0]) {
          i--
          continue
        }
      }
      arg = arg.replace(/^-+/, '')
      var no = null
      while (arg.toLowerCase().indexOf('no-') === 0) {
        no = !no
        arg = arg.slice(3)
      }

      if (abbrevs[arg]) {
        arg = abbrevs[arg]
      }

      var argType = types[arg]
      var isTypeArray = Array.isArray(argType)
      if (isTypeArray && argType.length === 1) {
        isTypeArray = false
        argType = argType[0]
      }

      var isArray = argType === Array ||
        isTypeArray && argType.indexOf(Array) !== -1

      // allow unknown things to be arrays if specified multiple times.
      if (
        !Object.prototype.hasOwnProperty.call(types, arg) &&
        Object.prototype.hasOwnProperty.call(data, arg)
      ) {
        if (!Array.isArray(data[arg])) {
          data[arg] = [data[arg]]
        }
        isArray = true
      }

      var val
      var la = args[i + 1]

      var isBool = typeof no === 'boolean' ||
        argType === Boolean ||
        isTypeArray && argType.indexOf(Boolean) !== -1 ||
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
                      ~argType.indexOf(Number)) {
            // number
            val = +la
            i++
          } else if (!la.match(/^-[^-]/) && ~argType.indexOf(String)) {
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

      if (argType === String) {
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

function resolveShort (arg, shorthands, shortAbbr, abbrevs) {
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
  var singles = shorthands.___singles
  if (!singles) {
    singles = Object.keys(shorthands).filter(function (s) {
      return s.length === 1
    }).reduce(function (l, r) {
      l[r] = true
      return l
    }, {})
    shorthands.___singles = singles
    debug('shorthand singles', singles)
  }

  var chrs = arg.split('').filter(function (c) {
    return singles[c]
  })

  if (chrs.join('') === arg) {
    return chrs.map(function (c) {
      return shorthands[c]
    }).reduce(function (l, r) {
      return l.concat(r)
    }, [])
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
