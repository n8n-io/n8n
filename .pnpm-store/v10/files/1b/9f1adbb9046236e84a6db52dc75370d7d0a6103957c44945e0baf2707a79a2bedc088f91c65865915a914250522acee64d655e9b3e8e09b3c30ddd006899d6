var fs = require('fs')

var path = require('path')

var glob = require('glob')
var normalizeData = require('normalize-package-data')
var safeJSON = require('json-parse-even-better-errors')
var util = require('util')
var normalizePackageBin = require('npm-normalize-package-bin')

module.exports = readJson

// put more stuff on here to customize.
readJson.extraSet = [
  bundleDependencies,
  gypfile,
  serverjs,
  scriptpath,
  authors,
  readme,
  mans,
  bins,
  githead
]

var typoWarned = {}
var cache = {}

function readJson (file, log_, strict_, cb_) {
  var log, strict, cb
  for (var i = 1; i < arguments.length - 1; i++) {
    if (typeof arguments[i] === 'boolean') {
      strict = arguments[i]
    } else if (typeof arguments[i] === 'function') {
      log = arguments[i]
    }
  }

  if (!log) log = function () {}
  cb = arguments[ arguments.length - 1 ]

  readJson_(file, log, strict, cb)
}

function readJson_ (file, log, strict, cb) {
  fs.readFile(file, 'utf8', function (er, d) {
    parseJson(file, er, d, log, strict, cb)
  })
}

function stripBOM (content) {
  // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
  // because the buffer-to-string conversion in `fs.readFileSync()`
  // translates it to FEFF, the UTF-16 BOM.
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1)
  return content
}

function jsonClone (obj) {
  if (obj == null) {
    return obj
  } else if (Array.isArray(obj)) {
    var newarr = new Array(obj.length)
    for (var ii in obj) {
      newarr[ii] = obj[ii]
    }
  } else if (typeof obj === 'object') {
    var newobj = {}
    for (var kk in obj) {
      newobj[kk] = jsonClone[kk]
    }
  } else {
    return obj
  }
}

function parseJson (file, er, d, log, strict, cb) {
  if (er && er.code === 'ENOENT') {
    return fs.stat(path.dirname(file), function (err, stat) {
      if (!err && stat && !stat.isDirectory()) {
        // ENOTDIR isn't used on Windows, but npm expects it.
        er = Object.create(er)
        er.code = 'ENOTDIR'
        return cb(er)
      } else {
        return indexjs(file, er, log, strict, cb)
      }
    })
  }
  if (er) return cb(er)

  if (cache[d]) return cb(null, jsonClone(cache[d]))

  var data

  try {
    data = safeJSON(stripBOM(d))
  } catch (er) {
    data = parseIndex(d)
    if (!data) return cb(parseError(er, file))
  }

  extrasCached(file, d, data, log, strict, cb)
}

function extrasCached (file, d, data, log, strict, cb) {
  extras(file, data, log, strict, function (err, data) {
    if (!err) {
      cache[d] = jsonClone(data)
    }
    cb(err, data)
  })
}

function indexjs (file, er, log, strict, cb) {
  if (path.basename(file) === 'index.js') return cb(er)

  var index = path.resolve(path.dirname(file), 'index.js')
  fs.readFile(index, 'utf8', function (er2, d) {
    if (er2) return cb(er)

    if (cache[d]) return cb(null, cache[d])

    var data = parseIndex(d)
    if (!data) return cb(er)

    extrasCached(file, d, data, log, strict, cb)
  })
}

readJson.extras = extras
function extras (file, data, log_, strict_, cb_) {
  var log, strict, cb
  for (var i = 2; i < arguments.length - 1; i++) {
    if (typeof arguments[i] === 'boolean') {
      strict = arguments[i]
    } else if (typeof arguments[i] === 'function') {
      log = arguments[i]
    }
  }

  if (!log) log = function () {}
  cb = arguments[i]

  var set = readJson.extraSet
  var n = set.length
  var errState = null
  set.forEach(function (fn) {
    fn(file, data, then)
  })

  function then (er) {
    if (errState) return
    if (er) return cb(errState = er)
    if (--n > 0) return
    final(file, data, log, strict, cb)
  }
}

function scriptpath (file, data, cb) {
  if (!data.scripts) return cb(null, data)
  var k = Object.keys(data.scripts)
  k.forEach(scriptpath_, data.scripts)
  cb(null, data)
}

function scriptpath_ (key) {
  var s = this[key]
  // This is never allowed, and only causes problems
  if (typeof s !== 'string') return delete this[key]

  var spre = /^(\.[/\\])?node_modules[/\\].bin[\\/]/
  if (s.match(spre)) {
    this[key] = this[key].replace(spre, '')
  }
}

function gypfile (file, data, cb) {
  var dir = path.dirname(file)
  var s = data.scripts || {}
  if (s.install || s.preinstall) return cb(null, data)

  glob('*.gyp', { cwd: dir }, function (er, files) {
    if (er) return cb(er)
    if (data.gypfile === false) return cb(null, data)
    gypfile_(file, data, files, cb)
  })
}

function gypfile_ (file, data, files, cb) {
  if (!files.length) return cb(null, data)
  var s = data.scripts || {}
  s.install = 'node-gyp rebuild'
  data.scripts = s
  data.gypfile = true
  return cb(null, data)
}

function serverjs (file, data, cb) {
  var dir = path.dirname(file)
  var s = data.scripts || {}
  if (s.start) return cb(null, data)
  glob('server.js', { cwd: dir }, function (er, files) {
    if (er) return cb(er)
    serverjs_(file, data, files, cb)
  })
}

function serverjs_ (file, data, files, cb) {
  if (!files.length) return cb(null, data)
  var s = data.scripts || {}
  s.start = 'node server.js'
  data.scripts = s
  return cb(null, data)
}

function authors (file, data, cb) {
  if (data.contributors) return cb(null, data)
  var af = path.resolve(path.dirname(file), 'AUTHORS')
  fs.readFile(af, 'utf8', function (er, ad) {
    // ignore error.  just checking it.
    if (er) return cb(null, data)
    authors_(file, data, ad, cb)
  })
}

function authors_ (file, data, ad, cb) {
  ad = ad.split(/\r?\n/g).map(function (line) {
    return line.replace(/^\s*#.*$/, '').trim()
  }).filter(function (line) {
    return line
  })
  data.contributors = ad
  return cb(null, data)
}

function readme (file, data, cb) {
  if (data.readme) return cb(null, data)
  var dir = path.dirname(file)
  var globOpts = { cwd: dir, nocase: true, mark: true }
  glob('{README,README.*}', globOpts, function (er, files) {
    if (er) return cb(er)
    // don't accept directories.
    files = files.filter(function (file) {
      return !file.match(/\/$/)
    })
    if (!files.length) return cb()
    var fn = preferMarkdownReadme(files)
    var rm = path.resolve(dir, fn)
    readme_(file, data, rm, cb)
  })
}

function preferMarkdownReadme (files) {
  var fallback = 0
  var re = /\.m?a?r?k?d?o?w?n?$/i
  for (var i = 0; i < files.length; i++) {
    if (files[i].match(re)) {
      return files[i]
    } else if (files[i].match(/README$/)) {
      fallback = i
    }
  }
  // prefer README.md, followed by README; otherwise, return
  // the first filename (which could be README)
  return files[fallback]
}

function readme_ (file, data, rm, cb) {
  var rmfn = path.basename(rm)
  fs.readFile(rm, 'utf8', function (er, rm) {
    // maybe not readable, or something.
    if (er) return cb()
    data.readme = rm
    data.readmeFilename = rmfn
    return cb(er, data)
  })
}

function mans (file, data, cb) {
  var m = data.directories && data.directories.man
  if (data.man || !m) return cb(null, data)
  m = path.resolve(path.dirname(file), m)
  glob('**/*.[0-9]', { cwd: m }, function (er, mans) {
    if (er) return cb(er)
    mans_(file, data, mans, cb)
  })
}

function mans_ (file, data, mans, cb) {
  var m = data.directories && data.directories.man
  data.man = mans.map(function (mf) {
    return path.resolve(path.dirname(file), m, mf)
  })
  return cb(null, data)
}

function bins (file, data, cb) {
  data = normalizePackageBin(data)

  var m = data.directories && data.directories.bin
  if (data.bin || !m) return cb(null, data)

  m = path.resolve(path.dirname(file), m)
  glob('**', { cwd: m }, function (er, bins) {
    if (er) return cb(er)
    bins_(file, data, bins, cb)
  })
}

function bins_ (file, data, bins, cb) {
  var m = (data.directories && data.directories.bin) || '.'
  data.bin = bins.reduce(function (acc, mf) {
    if (mf && mf.charAt(0) !== '.') {
      var f = path.basename(mf)
      acc[f] = path.join(m, mf)
    }
    return acc
  }, {})
  return cb(null, normalizePackageBin(data))
}

function bundleDependencies (file, data, cb) {
  var bd = 'bundleDependencies'
  var bdd = 'bundledDependencies'
  // normalize key name
  if (data[bdd] !== undefined) {
    if (data[bd] === undefined) data[bd] = data[bdd]
    delete data[bdd]
  }
  if (data[bd] === false) delete data[bd]
  else if (data[bd] === true) {
    data[bd] = Object.keys(data.dependencies || {})
  } else if (data[bd] !== undefined && !Array.isArray(data[bd])) {
    delete data[bd]
  }
  return cb(null, data)
}

function githead (file, data, cb) {
  if (data.gitHead) return cb(null, data)
  var dir = path.dirname(file)
  var head = path.resolve(dir, '.git/HEAD')
  fs.readFile(head, 'utf8', function (er, head) {
    if (er) return cb(null, data)
    githead_(file, data, dir, head, cb)
  })
}

function githead_ (file, data, dir, head, cb) {
  if (!head.match(/^ref: /)) {
    data.gitHead = head.trim()
    return cb(null, data)
  }
  var headRef = head.replace(/^ref: /, '').trim()
  var headFile = path.resolve(dir, '.git', headRef)
  fs.readFile(headFile, 'utf8', function (er, head) {
    if (er || !head) {
      var packFile = path.resolve(dir, '.git/packed-refs')
      return fs.readFile(packFile, 'utf8', function (er, refs) {
        if (er || !refs) {
          return cb(null, data)
        }
        refs = refs.split('\n')
        for (var i = 0; i < refs.length; i++) {
          var match = refs[i].match(/^([0-9a-f]{40}) (.+)$/)
          if (match && match[2].trim() === headRef) {
            data.gitHead = match[1]
            break
          }
        }
        return cb(null, data)
      })
    }
    head = head.replace(/^ref: /, '').trim()
    data.gitHead = head
    return cb(null, data)
  })
}

/**
 * Warn if the bin references don't point to anything.  This might be better in
 * normalize-package-data if it had access to the file path.
 */
function checkBinReferences_ (file, data, warn, cb) {
  if (!(data.bin instanceof Object)) return cb()

  var keys = Object.keys(data.bin)
  var keysLeft = keys.length
  if (!keysLeft) return cb()

  function handleExists (relName, result) {
    keysLeft--
    if (!result) warn('No bin file found at ' + relName)
    if (!keysLeft) cb()
  }

  keys.forEach(function (key) {
    var dirName = path.dirname(file)
    var relName = data.bin[key]
    /* istanbul ignore if - impossible, bins have been normalized */
    if (typeof relName !== 'string') {
      var msg = 'Bin filename for ' + key +
        ' is not a string: ' + util.inspect(relName)
      warn(msg)
      delete data.bin[key]
      handleExists(relName, true)
      return
    }
    var binPath = path.resolve(dirName, relName)
    fs.stat(binPath, (err) => handleExists(relName, !err))
  })
}

function final (file, data, log, strict, cb) {
  var pId = makePackageId(data)

  function warn (msg) {
    if (typoWarned[pId]) return
    if (log) log('package.json', pId, msg)
  }

  try {
    normalizeData(data, warn, strict)
  } catch (error) {
    return cb(error)
  }

  checkBinReferences_(file, data, warn, function () {
    typoWarned[pId] = true
    cb(null, data)
  })
}

function makePackageId (data) {
  var name = cleanString(data.name)
  var ver = cleanString(data.version)
  return name + '@' + ver
}

function cleanString (str) {
  return (!str || typeof (str) !== 'string') ? '' : str.trim()
}

// /**package { "name": "foo", "version": "1.2.3", ... } **/
function parseIndex (data) {
  data = data.split(/^\/\*\*package(?:\s|$)/m)

  if (data.length < 2) return null
  data = data[1]
  data = data.split(/\*\*\/$/m)

  if (data.length < 2) return null
  data = data[0]
  data = data.replace(/^\s*\*/mg, '')

  try {
    return safeJSON(data)
  } catch (er) {
    return null
  }
}

function parseError (ex, file) {
  var e = new Error('Failed to parse json\n' + ex.message)
  e.code = 'EJSONPARSE'
  e.file = file
  return e
}
