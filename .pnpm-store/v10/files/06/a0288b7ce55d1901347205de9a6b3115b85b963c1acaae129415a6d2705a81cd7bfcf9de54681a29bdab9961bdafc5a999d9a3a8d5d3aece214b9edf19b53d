// Modules
var Type = require('type-of-is')
var Utils = require('../utils')

function getNativeType (string) {
  switch (string) {
    case "array":
      return 'Array'

    case "buffer":
      return 'Buffer'

    case "boolean":
      return 'Boolean'

    case "date":
      return 'Date'

    case "number":
      return 'Number'

    case "string":
      return 'String'

    case "objectid":
      return 'ObjectId'

    case "null":
    case "undefined":
    case "regexp":
    default:
      return 'Mixed'
  }
}

module.exports = function Process (object, output) {
  var output = output || {}

  for (var key in object) {
    var value = object[key]
    var originalType = null
    var elementType = null
    var type = null

    if (value instanceof Buffer) {
      type = 'buffer'
    }

    if (value != null && typeof value.toString !== 'undefined' && value.toString().match(/^[0-9a-fA-F]{24}$/)) {
      type = 'objectid'
    }

    if (!type) {
      type = Type.string(value).toLowerCase()
    }

    if (type === 'string' && Utils.isDate(value)) {
      type = 'date'
    }

    if (type === 'object') {
      output[key] = Process(object[key])
    } else {
      if (type === 'undefined') {
        type = 'null'
      }

      if (type === 'array' && value.length) {
        originalType = type
        type = undefined

        for (var index = 0, length = value.length; index < length; index++) {
          elementType = Type.string(value[index]).toLowerCase()

          if (type && elementType !== type) {
            type = 'mixed'
            break
          } else {
            type = elementType
          }
        }
      }

      if (originalType && originalType === 'array') {
        output[key] = { type: [getNativeType(type)] }
      } else {
        output[key] = { type: getNativeType(type) }
      }
    }
  }

  return output
}