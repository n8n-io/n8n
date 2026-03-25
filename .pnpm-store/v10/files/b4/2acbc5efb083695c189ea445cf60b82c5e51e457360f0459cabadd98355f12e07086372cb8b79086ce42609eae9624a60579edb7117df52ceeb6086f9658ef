const { URL, domainToUnicode } = require('url')

const CHAR_LOWERCASE_A = 97
const CHAR_LOWERCASE_Z = 122

const isWindows = process.platform === 'win32'

class ERR_INVALID_FILE_URL_HOST extends TypeError {
  constructor (platform) {
    super(`File URL host must be "localhost" or empty on ${platform}`)
    this.code = 'ERR_INVALID_FILE_URL_HOST'
  }

  toString () {
    return `${this.name} [${this.code}]: ${this.message}`
  }
}

class ERR_INVALID_FILE_URL_PATH extends TypeError {
  constructor (msg) {
    super(`File URL path ${msg}`)
    this.code = 'ERR_INVALID_FILE_URL_PATH'
  }

  toString () {
    return `${this.name} [${this.code}]: ${this.message}`
  }
}

class ERR_INVALID_ARG_TYPE extends TypeError {
  constructor (name, actual) {
    super(`The "${name}" argument must be one of type string or an instance ` +
      `of URL. Received type ${typeof actual} ${actual}`)
    this.code = 'ERR_INVALID_ARG_TYPE'
  }

  toString () {
    return `${this.name} [${this.code}]: ${this.message}`
  }
}

class ERR_INVALID_URL_SCHEME extends TypeError {
  constructor (expected) {
    super(`The URL must be of scheme ${expected}`)
    this.code = 'ERR_INVALID_URL_SCHEME'
  }

  toString () {
    return `${this.name} [${this.code}]: ${this.message}`
  }
}

const isURLInstance = (input) => {
  return input != null && input.href && input.origin
}

const getPathFromURLWin32 = (url) => {
  const hostname = url.hostname
  let pathname = url.pathname
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === '%') {
      const third = pathname.codePointAt(n + 2) | 0x20
      if ((pathname[n + 1] === '2' && third === 102) ||
        (pathname[n + 1] === '5' && third === 99)) {
        throw new ERR_INVALID_FILE_URL_PATH('must not include encoded \\ or / characters')
      }
    }
  }

  pathname = pathname.replace(/\//g, '\\')
  pathname = decodeURIComponent(pathname)
  if (hostname !== '') {
    return `\\\\${domainToUnicode(hostname)}${pathname}`
  }

  const letter = pathname.codePointAt(1) | 0x20
  const sep = pathname[2]
  if (letter < CHAR_LOWERCASE_A || letter > CHAR_LOWERCASE_Z ||
    (sep !== ':')) {
    throw new ERR_INVALID_FILE_URL_PATH('must be absolute')
  }

  return pathname.slice(1)
}

const getPathFromURLPosix = (url) => {
  if (url.hostname !== '') {
    throw new ERR_INVALID_FILE_URL_HOST(process.platform)
  }

  const pathname = url.pathname

  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === '%') {
      const third = pathname.codePointAt(n + 2) | 0x20
      if (pathname[n + 1] === '2' && third === 102) {
        throw new ERR_INVALID_FILE_URL_PATH('must not include encoded / characters')
      }
    }
  }

  return decodeURIComponent(pathname)
}

const fileURLToPath = (path) => {
  if (typeof path === 'string') {
    path = new URL(path)
  } else if (!isURLInstance(path)) {
    throw new ERR_INVALID_ARG_TYPE('path', ['string', 'URL'], path)
  }

  if (path.protocol !== 'file:') {
    throw new ERR_INVALID_URL_SCHEME('file')
  }

  return isWindows
    ? getPathFromURLWin32(path)
    : getPathFromURLPosix(path)
}

module.exports = fileURLToPath
