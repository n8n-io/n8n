'use strict'

const TYPES = require('./datatypes').TYPES
const declareType = require('./datatypes').declare
const objectHasProperty = require('./utils').objectHasProperty

const MAX = 65535 // (1 << 16) - 1
const JSON_COLUMN_ID = 'JSON_F52E2B61-18A1-11d1-B105-00805F49916B'

function Table (name) {
  if (name) {
    const parsed = Table.parseName(name)
    this.name = parsed.name
    this.schema = parsed.schema
    this.database = parsed.database
    this.path = (this.database ? `[${this.database}].` : '') + (this.schema ? `[${this.schema}].` : '') + `[${this.name}]`
    this.temporary = this.name.charAt(0) === '#'
  }

  this.columns = []
  this.rows = []

  Object.defineProperty(this.columns, 'add', {
    value (name, column, options) {
      if (column == null) {
        throw new Error('Column data type is not defined.')
      }
      if (column instanceof Function) {
        column = column()
      }

      options = options || {}
      column.name = name;

      ['nullable', 'primary', 'identity', 'readOnly', 'length'].forEach(prop => {
        if (objectHasProperty(options, prop)) {
          column[prop] = options[prop]
        }
      })

      return this.push(column)
    }
  })

  Object.defineProperty(this.rows, 'add', {
    value () {
      return this.push(Array.prototype.slice.call(arguments))
    }
  }
  )

  Object.defineProperty(this.rows, 'clear', {
    value () {
      return this.splice(0, this.length)
    }
  }
  )
}

/*
@private
*/

Table.prototype._makeBulk = function _makeBulk () {
  for (let i = 0; i < this.columns.length; i++) {
    const col = this.columns[i]
    switch (col.type) {
      case TYPES.Date:
      case TYPES.DateTime:
      case TYPES.DateTime2:
        for (let j = 0; j < this.rows.length; j++) {
          const dateValue = this.rows[j][i]
          if (typeof dateValue === 'string' || typeof dateValue === 'number') {
            const date = new Date(dateValue)
            if (isNaN(date.getDate())) {
              throw new TypeError('Invalid date value passed to bulk rows')
            }
            this.rows[j][i] = date
          }
        }
        break

      case TYPES.Xml:
        col.type = TYPES.NVarChar(MAX).type
        break

      case TYPES.UDT:
      case TYPES.Geography:
      case TYPES.Geometry:
        col.type = TYPES.VarBinary(MAX).type
        break

      default:
        break
    }
  }

  return this
}

Table.prototype.declare = function declare () {
  const pkey = this.columns.filter(col => col.primary === true).map(col => `[${col.name}]`)
  const cols = this.columns.map(col => {
    const def = [`[${col.name}] ${declareType(col.type, col)}`]

    if (col.nullable === true) {
      def.push('null')
    } else if (col.nullable === false) {
      def.push('not null')
    }

    if (col.primary === true && pkey.length === 1) {
      def.push('primary key')
    }

    return def.join(' ')
  })

  const constraint = pkey.length > 1 ? `, constraint [PK_${this.temporary ? this.name.substr(1) : this.name}] primary key (${pkey.join(', ')})` : ''
  return `create table ${this.path} (${cols.join(', ')}${constraint})`
}

Table.fromRecordset = function fromRecordset (recordset, name) {
  const t = new this(name)

  for (const colName in recordset.columns) {
    if (objectHasProperty(recordset.columns, colName)) {
      const col = recordset.columns[colName]

      t.columns.add(colName, {
        type: col.type,
        length: col.length,
        scale: col.scale,
        precision: col.precision
      }, {
        nullable: col.nullable,
        identity: col.identity,
        readOnly: col.readOnly
      })
    }
  }

  if (t.columns.length === 1 && t.columns[0].name === JSON_COLUMN_ID) {
    for (let i = 0; i < recordset.length; i++) {
      t.rows.add(JSON.stringify(recordset[i]))
    }
  } else {
    for (let i = 0; i < recordset.length; i++) {
      t.rows.add.apply(t.rows, t.columns.map(col => recordset[i][col.name]))
    }
  }

  return t
}

Table.parseName = function parseName (name) {
  const length = name.length
  let cursor = -1
  let buffer = ''
  let escaped = false
  const path = []

  while (++cursor < length) {
    const char = name.charAt(cursor)
    if (char === '[') {
      if (escaped) {
        buffer += char
      } else {
        escaped = true
      }
    } else if (char === ']') {
      if (escaped) {
        escaped = false
      } else {
        throw new Error('Invalid table name.')
      }
    } else if (char === '.') {
      if (escaped) {
        buffer += char
      } else {
        path.push(buffer)
        buffer = ''
      }
    } else {
      buffer += char
    }
  }

  if (buffer) {
    path.push(buffer)
  }

  switch (path.length) {
    case 1:
      return {
        name: path[0],
        schema: null,
        database: null
      }

    case 2:
      return {
        name: path[1],
        schema: path[0],
        database: null
      }

    case 3:
      return {
        name: path[2],
        schema: path[1],
        database: path[0]
      }

    default:
      throw new Error('Invalid table name.')
  }
}

module.exports = Table
