// Modules
var Type = require('type-of-is')
var Utils = require('../utils')

// Type Mapping
var types = {
  boolean: 'BOOLEAN',
  string: 'TEXT',
  number: 'INT',
  date: 'DATE',
  timestamp: 'TIMESTAMP',
  'regexp': 'TEXT',
  'undefined': 'TEXT',
  'null': 'TEXT'
}

var lang = {
  create: function (name) {
    return ['CREATE TABLE ', name, ' ('].join('')
  },

  close: function () {
    return ');'
  },

  id: function (name, value) {
    return ['  ', name, '_id ', value, ','].join('')
  },

  property: function (name, value) {
    return ['  ', name, ' ', value, ','].join('')
  },

  primary: function (id) {
    return ['  PRIMARY KEY (', id, '),'].join('')
  },

  foreign: function (key1, table, key2) {
    return ['  FOREIGN KEY (', key1, ') REFERENCES ', table, '(', key2, '),'].join('')
  },
}

function processObject (obj, options) {
  var name = options.tableName
  var parent = options.parentTableName
  var parentId = options.parentTableId
  var parentIdType = options.parentTableIdType

  // In-memory storage
  var keys = Object.keys(obj)
  var output = []
  var tables = []

  // Table variables
  var id = null
  var idType = 'string'

  // Initialize Table
  output.push(lang.create(name))

  if (parent) {
    output.push(lang.property(parent + '_' + parentId, types[parentIdType]))
  }
  
  // Obtain ID
  var nkey
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === 'id' || keys[i].toLowerCase().indexOf('_id') > -1) {
      nkey = keys[i]
      obj[nkey] = obj[keys[i]]
      keys[i] = nkey
      id = keys[i]
      idType = typeof obj[keys[i]]
    }
  }

  if (!id) {
    id = 'id'
    idType = parentIdType || idType
    output.push(lang.property(id, types[idType]))
  }

  // Create table properties
  var key, value, type
  for (var i = 0; i < keys.length; i++) {
    key = keys[i]
    value = obj[key]
    type = value instanceof Date
      ? 'date'
      : Type.string(value).toLowerCase()

    if (type !== 'undefined') {
      type = Utils.isTimestamp(value) ? 'timestamp' : type
    }

    if (type === 'function') {
      continue
    }
    
    // pojo
    if (type === 'object' && !value.length) {
      tables.push('')
      tables.push(processObject(value, {
        parentTableName: name,
        parentTableId: id,
        parentTableIdType: idType,
        tableName: name + '_' + key
      }).join('\n'))
      continue
    }

    // array
    if (type === 'object' || type === 'array') {
      if (typeof value[0] === 'object') {
        tables.push('')
        tables.push(processObject(value[0], {
          parentTableName: name,
          parentTableId: id,
          parentTableIdType: idType,
          tableName: name + '_' + key
        }).join('\n'))
        continue      
      }
      
      tables.push('')
      tables.push(processObject({ 
        value: typeof value[0]
      }, {
        parentTableName: name,
        parentTableId: id,
        parentTableIdType: idType,
        tableName: name + '_' + key
      }).join('\n'))

      continue
    }

    output.push(lang.property(key, types[type]))
  }

  // Handle table keys
  output.push(lang.primary(id))
  
  if (parent) {
    output.push(lang.foreign(parent + '_id', parent, parentId))
  }

  output[output.length - 1] = Utils.arrayLastItem(output)
    .substr(0, Utils.arrayLastItem(output).length - 1)

  output.push(lang.close())

  return output.concat(tables)
}

module.exports = function Process (tableName, object) {
  if (typeof tableName !== 'string') {
    object = tableName
    tableName = 'generic'
  }

  return processObject(object, {
    tableName: tableName
  }).join('\n')
}
