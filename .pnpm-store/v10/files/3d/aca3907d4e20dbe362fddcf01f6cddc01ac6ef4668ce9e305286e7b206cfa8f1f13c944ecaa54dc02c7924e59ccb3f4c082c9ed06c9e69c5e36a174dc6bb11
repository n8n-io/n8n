'use strict'

const uuid = require('uuid')
const crypto = require('crypto')
module.exports = typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID
  : uuid.v4
