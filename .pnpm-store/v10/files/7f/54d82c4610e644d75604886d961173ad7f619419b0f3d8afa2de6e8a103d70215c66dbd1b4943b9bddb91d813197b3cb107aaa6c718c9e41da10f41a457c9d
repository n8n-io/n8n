var utils = require('../utils')

function getPropertyMode (value) {
  return Array.isArray(value) ? 'REPEATED' : 'NULLABLE'
}

function getPropertyType (value) {
  if (Array.isArray(value)) {
    return getPropertyType(value[0])
  }

  if (value instanceof Date) return 'TIMESTAMP'
  if (typeof value === 'object') return 'RECORD'
  if (typeof value === 'boolean') return 'BOOLEAN'
  if (typeof value === 'string') {
    if (utils.isDateString(value)) return 'DATE'
    if (utils.isTimestamp(value)) return 'TIMESTAMP'
  }

  if (!isNaN(value)) {
    return Number.isInteger(parseFloat(value)) ? 'INTEGER' : 'FLOAT'
  }

  return 'STRING'
}

function processFields (data) {
  return Object.keys(data).map(function (key) {
    var value = data[key]
    var entry = {
      name: key,
      type: getPropertyType(data[key]),
      mode: getPropertyMode(data[key])
    }

    if (entry.type === 'RECORD') {
      entry.fields = processFields((entry.mode === 'REPEATED') ? value[0] : value)
    }

    return entry
  })
}

module.exports = function Process (data) {
  return processFields(data)
}
