'use strict'

const TYPES = require('./datatypes').TYPES
const Table = require('./table')

let PromiseLibrary = Promise
const driver = {}
const map = []

/**
 * Register you own type map.
 *
 * @path module.exports.map
 * @param {*} jstype JS data type.
 * @param {*} sqltype SQL data type.
 */

map.register = function (jstype, sqltype) {
  for (let index = 0; index < this.length; index++) {
    const item = this[index]
    if (item.js === jstype) {
      this.splice(index, 1)
      break
    }
  }

  this.push({
    js: jstype,
    sql: sqltype
  })

  return null
}

map.register(String, TYPES.NVarChar)
map.register(Number, TYPES.Int)
map.register(Boolean, TYPES.Bit)
map.register(Date, TYPES.DateTime)
map.register(Buffer, TYPES.VarBinary)
map.register(Table, TYPES.TVP)

/**
 * @ignore
 */

const getTypeByValue = function (value) {
  if ((value === null) || (value === undefined)) { return TYPES.NVarChar }

  switch (typeof value) {
    case 'string':
      for (const item of Array.from(map)) {
        if (item.js === String) {
          return item.sql
        }
      }

      return TYPES.NVarChar

    case 'number':
    case 'bigint':
      if (value % 1 === 0) {
        if (value < -2147483648 || value > 2147483647) {
          return TYPES.BigInt
        } else {
          return TYPES.Int
        }
      } else {
        return TYPES.Float
      }

    case 'boolean':
      for (const item of Array.from(map)) {
        if (item.js === Boolean) {
          return item.sql
        }
      }

      return TYPES.Bit

    case 'object':
      for (const item of Array.from(map)) {
        if (value instanceof item.js) {
          return item.sql
        }
      }

      return TYPES.NVarChar

    default:
      return TYPES.NVarChar
  }
}

module.exports = {
  driver,
  getTypeByValue,
  map
}

Object.defineProperty(module.exports, 'Promise', {
  get: () => {
    return PromiseLibrary
  },
  set: (value) => {
    PromiseLibrary = value
  }
})

Object.defineProperty(module.exports, 'valueHandler', {
  enumerable: true,
  value: new Map(),
  writable: false,
  configurable: false
})
