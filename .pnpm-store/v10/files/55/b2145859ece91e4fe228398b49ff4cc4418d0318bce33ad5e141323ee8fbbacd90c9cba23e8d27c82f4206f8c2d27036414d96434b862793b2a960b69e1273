'use strict'

const uuidv4 = require('./uuid-node')
const parser = require('uuid-parse')
const Buffer = loadBuffer()
function loadBuffer () {
  const b = require('buffer')
  // use third party module if no buffer module
  return b && b.Buffer
    ? b.Buffer
    : require('buffer/').Buffer
}
const base64Padding = Buffer.from('==', 'base64')

function hyperid (opts) {
  let fixedLength = false
  let urlSafe = false
  // gaurd if instantiated using boolean for fixedLength or with no args
  let maxInt = Math.pow(2, 31) - 1
  if (typeof opts === 'boolean') {
    fixedLength = opts
  } else {
    opts = opts || {}
    maxInt = opts.maxInt || Math.pow(2, 31) - 1
    urlSafe = !!opts.urlSafe
    fixedLength = !!opts.fixedLength
  }

  generate.uuid = uuidv4()
  generate.decode = decode

  let id = baseId(generate.uuid, urlSafe)
  let count = Math.floor(opts.startFrom || 0)

  if (isNaN(maxInt)) throw new Error(`maxInt must be a number. recieved ${opts.maxInt}`)

  if (isNaN(count) || !(maxInt > count && count >= 0)) {
    throw new Error([
      `when passed, opts.startFrom must be a number between 0 and ${maxInt}.`,
      'Only the integer part matters.',
      `- got: ${opts.startFrom}`
    ].join('\n'))
  }

  return generate

  function generate () {
    let result
    if (count === maxInt) {
      generate.uuid = uuidv4()
      id = baseId(generate.uuid, urlSafe) // rebase
      count = 0
    }
    if (fixedLength) {
      result = id + `0000000000${count}`.slice(-10)
    } else {
      result = id + count
    }
    count = (count + 1) | 0
    return result
  }
}

function baseId (id, urlSafe) {
  const base64Id = Buffer.concat([Buffer.from(parser.parse(id)), base64Padding]).toString('base64')
  if (urlSafe) {
    return base64Id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '-')
  }
  return base64Id.replace(/=+$/, '/')
}

function decode (id, opts) {
  opts = opts || {}
  const urlSafe = !!opts.urlSafe

  if (urlSafe) {
    id = id.replace(/-([^-]*)$/, '/' + '$1')
      .replace(/-/g, '+')
      .replace(/_/g, '/')
  }

  if (id.length < 22) {
    return null
  }
  const lastSlashIndex = id.lastIndexOf('/')
  if (lastSlashIndex === -1) {
    return null
  }
  const uuidPart = id.substring(0, lastSlashIndex)
  const countPart = Number(id.substring(lastSlashIndex + 1))
  if (!uuidPart || isNaN(countPart)) {
    return null
  }

  const result = {
    uuid: parser.unparse(Buffer.from(uuidPart + '==', 'base64')),
    count: countPart
  }

  return result
}

module.exports = hyperid
module.exports.decode = decode
