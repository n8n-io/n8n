var FS  = require('fs')
var jju = require('../')

// this function registers json5 extension, so you
// can do `require("./config.json5")` kind of thing
module.exports.register = function() {
  var r = require, e = 'extensions'
  r[e]['.json5'] = function(m, f) {
    /*eslint no-sync:0*/
    m.exports = jju.parse(FS.readFileSync(f, 'utf8'))
  }
}

// this function monkey-patches JSON.parse, so it
// will return an exact position of error in case
// of parse failure
module.exports.patch_JSON_parse = function() {
  var _parse = JSON.parse
  JSON.parse = function(text, rev) {
    try {
      return _parse(text, rev)
    } catch(err) {
      // this call should always throw
      require('jju').parse(text, {
        mode: 'json',
        legacy: true,
        reviver: rev,
        reserved_keys: 'replace',
        null_prototype: false,
      })

      // if it didn't throw, but original parser did,
      // this is an error in this library and should be reported
      throw err
    }
  }
}

// this function is an express/connect middleware
// that accepts uploads in application/json5 format
module.exports.middleware = function() {
  return function(req, res, next) {
    throw Error('this function is removed, use express-json5 instead')
  }
}

