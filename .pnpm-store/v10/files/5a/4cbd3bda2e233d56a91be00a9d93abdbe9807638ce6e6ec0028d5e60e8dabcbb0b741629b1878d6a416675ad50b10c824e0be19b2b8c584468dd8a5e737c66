// Modules
var Type = require('type-of-is')

// Constants
var DRAFT = 'http://json-schema.org/draft-04/schema#'

function getPropertyFormat(value) {
  var type = Type.string(value).toLowerCase()

  if (type === 'date') return 'date-time'

  return null
}

function getPropertyType(value) {
  var type = Type.string(value).toLowerCase()

  if (type === 'date') return 'string'
  if (type === 'regexp') return 'string'
  if (type === 'function') return 'string'

  return type
}

function getUniqueKeys(a, b, c) {
  a = Object.keys(a)
  b = Object.keys(b)
  c = c || []

  var value
  var cIndex
  var aIndex

  for (var keyIndex = 0, keyLength = b.length; keyIndex < keyLength; keyIndex++) {
    value = b[keyIndex]
    aIndex = a.indexOf(value)
    cIndex = c.indexOf(value)

    if (aIndex === -1) {
      if (cIndex !== -1) {
        // Value is optional, it doesn't exist in A but exists in B(n)
        c.splice(cIndex, 1)
      }
    } else if (cIndex === -1) {
      // Value is required, it exists in both B and A, and is not yet present in C
      c.push(value)
    }
  }

  return c
}

function processArray(array, output, nested) {
  var format
  var oneOf
  var type

  if (nested && output) {
    output = { items: output }
  } else {
    output = output || {}
    output.type = getPropertyType(array)
    output.items = output.items || {}
    type = output.items.type || null
  }

  // Determine whether each item is different
  for (var arrIndex = 0, arrLength = array.length; arrIndex < arrLength; arrIndex++) {
    var elementType = getPropertyType(array[arrIndex])
    var elementFormat = getPropertyFormat(array[arrIndex])

    if (type && elementType !== type) {
      output.items.oneOf = []
      oneOf = true
      break
    } else {
      type = elementType
      format = elementFormat
    }
  }

  // Setup type otherwise
  if (!oneOf && type) {
    output.items.type = type
    if (format) {
      output.items.format = format
    }
  } else if (oneOf && type !== 'object') {
    output.items = {
      oneOf: [{ type: type }],
      required: output.items.required
    }
  }

  // Process each item depending
  if (typeof output.items.oneOf !== 'undefined' || type === 'object') {
    for (var itemIndex = 0, itemLength = array.length; itemIndex < itemLength; itemIndex++) {
      var value = array[itemIndex]
      var itemType = getPropertyType(value)
      var itemFormat = getPropertyFormat(value)
      var arrayItem
      if (itemType === 'object') {
        if (output.items.properties) {
          output.items.required = getUniqueKeys(output.items.properties, value, output.items.required)
        }
        arrayItem = processObject(value, oneOf ? {} : output.items.properties, true)
      } else if (itemType === 'array') {
        arrayItem = processArray(value, oneOf ? {} : output.items.properties, true)
      } else {
        arrayItem = {}
        arrayItem.type = itemType
        if (itemFormat) {
          arrayItem.format = itemFormat
        }
      }
      if (oneOf) {
        var childType = Type.string(value).toLowerCase()
        var tempObj = {}
        if (!arrayItem.type && childType === 'object') {
          tempObj.properties = arrayItem
          tempObj.type = 'object'
          arrayItem = tempObj
        }
        output.items.oneOf.push(arrayItem)
      } else {
        if (output.items.type !== 'object') {
          continue;
        }
        output.items.properties = arrayItem
      }
    }
  }
  return nested ? output.items : output
}

function processObject(object, output, nested) {
  if (nested && output) {
    output = { properties: output }
  } else {
    output = output || {}
    output.type = getPropertyType(object)
    output.properties = output.properties || {}
  }

  for (var key in object) {
    var value = object[key]
    var type = getPropertyType(value)
    var format = getPropertyFormat(value)

    type = type === 'undefined' ? 'null' : type

    if (type === 'object') {
      output.properties[key] = processObject(value, output.properties[key])
      continue
    }

    if (type === 'array') {
      output.properties[key] = processArray(value, output.properties[key])
      continue
    }

    if (output.properties[key]) {
      var entry = output.properties[key]
      var hasTypeArray = Array.isArray(entry.type)

      // When an array already exists, we check the existing
      // type array to see if it contains our current property
      // type, if not, we add it to the array and continue
      if (hasTypeArray && entry.type.indexOf(type) < 0) {
        entry.type.push(type)
      }

      // When multiple fields of differing types occur,
      // json schema states that the field must specify the
      // primitive types the field allows in array format.
      if (!hasTypeArray && entry.type !== type) {
        entry.type = [entry.type, type]
      }

      continue
    }

    output.properties[key] = {}
    output.properties[key].type = type

    if (format) {
      output.properties[key].format = format
    }
  }

  return nested ? output.properties : output
}

module.exports = function Process (title, object) {
  var processOutput
  var output = {
    $schema: DRAFT
  }

  // Determine title exists
  if (typeof title !== 'string') {
    object = title
    title = undefined
  } else {
    output.title = title
  }

  // Set initial object type
  output.type = Type.string(object).toLowerCase()

  // Process object
  if (output.type === 'object') {
    processOutput = processObject(object)
    output.type = processOutput.type
    output.properties = processOutput.properties
  }

  if (output.type === 'array') {
    processOutput = processArray(object)
    output.type = processOutput.type
    output.items = processOutput.items

    if (output.title) {
      output.items.title = output.title
      output.title += ' Set'
    }
  }

  // Output
  return output
}
