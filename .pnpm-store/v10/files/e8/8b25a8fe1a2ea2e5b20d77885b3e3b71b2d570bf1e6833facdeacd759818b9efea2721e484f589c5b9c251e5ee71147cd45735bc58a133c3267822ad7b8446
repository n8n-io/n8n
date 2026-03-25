// Modules
var Type = require('type-of-is')
var Utils = require('../utils')

module.exports = function Process (object, output) {
  output = output || {}

  for (var key in object) {
    var value = object[key]
    var type = Type.string(value).toLowerCase()

    if (type === 'undefined') {
      type = 'null'
    }

    if (type === 'string' && Utils.isDate(value)) {
      type = 'date'
    }

    if (type !== 'object') {
      output[key] = {
        type: type
      }
    } else {
      output[key] = Process(object[key])
      output[key].type = type
    }
  }

  return output
}