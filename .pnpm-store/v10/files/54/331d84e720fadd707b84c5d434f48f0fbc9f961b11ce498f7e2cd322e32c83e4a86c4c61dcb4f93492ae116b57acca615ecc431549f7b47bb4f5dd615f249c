'use strict'

var Client = require('./client')
var defaults = require('./defaults')
var Connection = require('./connection')
var Pool = require('pg-pool')
const { DatabaseError } = require('pg-protocol')
const { escapeIdentifier, escapeLiteral } = require('./utils')

const poolFactory = (Client) => {
  return class BoundPool extends Pool {
    constructor(options) {
      super(options, Client)
    }
  }
}

var PG = function (clientConstructor) {
  this.defaults = defaults
  this.Client = clientConstructor
  this.Query = this.Client.Query
  this.Pool = poolFactory(this.Client)
  this._pools = []
  this.Connection = Connection
  this.types = require('pg-types')
  this.DatabaseError = DatabaseError
  this.escapeIdentifier = escapeIdentifier
  this.escapeLiteral = escapeLiteral
}

if (typeof process.env.NODE_PG_FORCE_NATIVE !== 'undefined') {
  module.exports = new PG(require('./native'))
} else {
  module.exports = new PG(Client)

  // lazy require native module...the native module may not have installed
  Object.defineProperty(module.exports, 'native', {
    configurable: true,
    enumerable: false,
    get() {
      var native = null
      try {
        native = new PG(require('./native'))
      } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND') {
          throw err
        }
      }

      // overwrite module.exports.native so that getter is never called again
      Object.defineProperty(module.exports, 'native', {
        value: native,
      })

      return native
    },
  })
}
