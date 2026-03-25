const textParsers = require('./lib/textParsers')
const binaryParsers = require('./lib/binaryParsers')
const builtinTypes = require('./lib/builtins')

exports.getTypeParser = getTypeParser
exports.setTypeParser = setTypeParser
exports.builtins = builtinTypes

const typeParsers = {
  text: {},
  binary: {}
}

// the empty parse function
function noParse (val) {
  return String(val)
};

// returns a function used to convert a specific type (specified by
// oid) into a result javascript type
// note: the oid can be obtained via the following sql query:
// SELECT oid FROM pg_type WHERE typname = 'TYPE_NAME_HERE';
function getTypeParser (oid, format) {
  format = format || 'text'
  if (!typeParsers[format]) {
    return noParse
  }
  return typeParsers[format][oid] || noParse
};

function setTypeParser (oid, format, parseFn) {
  if (typeof format === 'function') {
    parseFn = format
    format = 'text'
  }
  if (!Number.isInteger(oid)) {
    throw new TypeError('oid must be an integer: ' + oid)
  }
  typeParsers[format][oid] = parseFn
};

textParsers.init(function (oid, converter) {
  typeParsers.text[oid] = converter
})

binaryParsers.init(function (oid, converter) {
  typeParsers.binary[oid] = converter
})
