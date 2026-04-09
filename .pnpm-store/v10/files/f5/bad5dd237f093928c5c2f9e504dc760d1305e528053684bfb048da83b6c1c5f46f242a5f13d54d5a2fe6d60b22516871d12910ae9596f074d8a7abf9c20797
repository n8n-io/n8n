const lib = require('./nopt-lib')
const defaultTypeDefs = require('./type-defs')

// This is the version of nopt's API that requires setting typeDefs and invalidHandler
// on the required `nopt` object since it is a singleton. To not do a breaking change
// an API that requires all options be passed in is located in `nopt-lib.js` and
// exported here as lib.
// TODO(breaking): make API only work in non-singleton mode

module.exports = exports = nopt
exports.clean = clean
exports.typeDefs = defaultTypeDefs
exports.lib = lib

function nopt (types, shorthands, args = process.argv, slice = 2) {
  return lib.nopt(args.slice(slice), {
    types: types || {},
    shorthands: shorthands || {},
    typeDefs: exports.typeDefs,
    invalidHandler: exports.invalidHandler,
  })
}

function clean (data, types, typeDefs = exports.typeDefs) {
  return lib.clean(data, {
    types: types || {},
    typeDefs,
    invalidHandler: exports.invalidHandler,
  })
}
