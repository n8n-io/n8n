const url = require('url')
const path = require('path')
const Stream = require('stream').Stream
const os = require('os')
const debug = require('./debug')

function validateString (data, k, val) {
  data[k] = String(val)
}

function validatePath (data, k, val) {
  if (val === true) {
    return false
  }
  if (val === null) {
    return true
  }

  val = String(val)

  const isWin = process.platform === 'win32'
  const homePattern = isWin ? /^~(\/|\\)/ : /^~\//
  const home = os.homedir()

  if (home && val.match(homePattern)) {
    data[k] = path.resolve(home, val.slice(2))
  } else {
    data[k] = path.resolve(val)
  }
  return true
}

function validateNumber (data, k, val) {
  debug('validate Number %j %j %j', k, val, isNaN(val))
  if (isNaN(val)) {
    return false
  }
  data[k] = +val
}

function validateDate (data, k, val) {
  const s = Date.parse(val)
  debug('validate Date %j %j %j', k, val, s)
  if (isNaN(s)) {
    return false
  }
  data[k] = new Date(val)
}

function validateBoolean (data, k, val) {
  if (typeof val === 'string') {
    if (!isNaN(val)) {
      val = !!(+val)
    } else if (val === 'null' || val === 'false') {
      val = false
    } else {
      val = true
    }
  } else {
    val = !!val
  }
  data[k] = val
}

function validateUrl (data, k, val) {
  // Changing this would be a breaking change in the npm cli
  /* eslint-disable-next-line node/no-deprecated-api */
  val = url.parse(String(val))
  if (!val.host) {
    return false
  }
  data[k] = val.href
}

function validateStream (data, k, val) {
  if (!(val instanceof Stream)) {
    return false
  }
  data[k] = val
}

module.exports = {
  String: { type: String, validate: validateString },
  Boolean: { type: Boolean, validate: validateBoolean },
  url: { type: url, validate: validateUrl },
  Number: { type: Number, validate: validateNumber },
  path: { type: path, validate: validatePath },
  Stream: { type: Stream, validate: validateStream },
  Date: { type: Date, validate: validateDate },
  Array: { type: Array },
}
