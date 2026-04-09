'use strict'

/** @type {(value: string) => boolean} */
const isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu)

/** @type {(value: string) => boolean} */
const isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u)

/**
 * @param {Array<string>} input
 * @returns {string}
 */
function stringArrayToHexStripped (input) {
  let acc = ''
  let code = 0
  let i = 0

  for (i = 0; i < input.length; i++) {
    code = input[i].charCodeAt(0)
    if (code === 48) {
      continue
    }
    if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102))) {
      return ''
    }
    acc += input[i]
    break
  }

  for (i += 1; i < input.length; i++) {
    code = input[i].charCodeAt(0)
    if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102))) {
      return ''
    }
    acc += input[i]
  }
  return acc
}

/**
 * @typedef {Object} GetIPV6Result
 * @property {boolean} error - Indicates if there was an error parsing the IPv6 address.
 * @property {string} address - The parsed IPv6 address.
 * @property {string} [zone] - The zone identifier, if present.
 */

/**
 * @param {string} value
 * @returns {boolean}
 */
const nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u)

/**
 * @param {Array<string>} buffer
 * @returns {boolean}
 */
function consumeIsZone (buffer) {
  buffer.length = 0
  return true
}

/**
 * @param {Array<string>} buffer
 * @param {Array<string>} address
 * @param {GetIPV6Result} output
 * @returns {boolean}
 */
function consumeHextets (buffer, address, output) {
  if (buffer.length) {
    const hex = stringArrayToHexStripped(buffer)
    if (hex !== '') {
      address.push(hex)
    } else {
      output.error = true
      return false
    }
    buffer.length = 0
  }
  return true
}

/**
 * @param {string} input
 * @returns {GetIPV6Result}
 */
function getIPV6 (input) {
  let tokenCount = 0
  const output = { error: false, address: '', zone: '' }
  /** @type {Array<string>} */
  const address = []
  /** @type {Array<string>} */
  const buffer = []
  let endipv6Encountered = false
  let endIpv6 = false

  let consume = consumeHextets

  for (let i = 0; i < input.length; i++) {
    const cursor = input[i]
    if (cursor === '[' || cursor === ']') { continue }
    if (cursor === ':') {
      if (endipv6Encountered === true) {
        endIpv6 = true
      }
      if (!consume(buffer, address, output)) { break }
      if (++tokenCount > 7) {
        // not valid
        output.error = true
        break
      }
      if (i > 0 && input[i - 1] === ':') {
        endipv6Encountered = true
      }
      address.push(':')
      continue
    } else if (cursor === '%') {
      if (!consume(buffer, address, output)) { break }
      // switch to zone detection
      consume = consumeIsZone
    } else {
      buffer.push(cursor)
      continue
    }
  }
  if (buffer.length) {
    if (consume === consumeIsZone) {
      output.zone = buffer.join('')
    } else if (endIpv6) {
      address.push(buffer.join(''))
    } else {
      address.push(stringArrayToHexStripped(buffer))
    }
  }
  output.address = address.join('')
  return output
}

/**
 * @typedef {Object} NormalizeIPv6Result
 * @property {string} host - The normalized host.
 * @property {string} [escapedHost] - The escaped host.
 * @property {boolean} isIPV6 - Indicates if the host is an IPv6 address.
 */

/**
 * @param {string} host
 * @returns {NormalizeIPv6Result}
 */
function normalizeIPv6 (host) {
  if (findToken(host, ':') < 2) { return { host, isIPV6: false } }
  const ipv6 = getIPV6(host)

  if (!ipv6.error) {
    let newHost = ipv6.address
    let escapedHost = ipv6.address
    if (ipv6.zone) {
      newHost += '%' + ipv6.zone
      escapedHost += '%25' + ipv6.zone
    }
    return { host: newHost, isIPV6: true, escapedHost }
  } else {
    return { host, isIPV6: false }
  }
}

/**
 * @param {string} str
 * @param {string} token
 * @returns {number}
 */
function findToken (str, token) {
  let ind = 0
  for (let i = 0; i < str.length; i++) {
    if (str[i] === token) ind++
  }
  return ind
}

/**
 * @param {string} path
 * @returns {string}
 *
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
 */
function removeDotSegments (path) {
  let input = path
  const output = []
  let nextSlash = -1
  let len = 0

  // eslint-disable-next-line no-cond-assign
  while (len = input.length) {
    if (len === 1) {
      if (input === '.') {
        break
      } else if (input === '/') {
        output.push('/')
        break
      } else {
        output.push(input)
        break
      }
    } else if (len === 2) {
      if (input[0] === '.') {
        if (input[1] === '.') {
          break
        } else if (input[1] === '/') {
          input = input.slice(2)
          continue
        }
      } else if (input[0] === '/') {
        if (input[1] === '.' || input[1] === '/') {
          output.push('/')
          break
        }
      }
    } else if (len === 3) {
      if (input === '/..') {
        if (output.length !== 0) {
          output.pop()
        }
        output.push('/')
        break
      }
    }
    if (input[0] === '.') {
      if (input[1] === '.') {
        if (input[2] === '/') {
          input = input.slice(3)
          continue
        }
      } else if (input[1] === '/') {
        input = input.slice(2)
        continue
      }
    } else if (input[0] === '/') {
      if (input[1] === '.') {
        if (input[2] === '/') {
          input = input.slice(2)
          continue
        } else if (input[2] === '.') {
          if (input[3] === '/') {
            input = input.slice(3)
            if (output.length !== 0) {
              output.pop()
            }
            continue
          }
        }
      }
    }

    // Rule 2E: Move normal path segment to output
    if ((nextSlash = input.indexOf('/', 1)) === -1) {
      output.push(input)
      break
    } else {
      output.push(input.slice(0, nextSlash))
      input = input.slice(nextSlash)
    }
  }

  return output.join('')
}

/**
 * @param {import('../types/index').URIComponent} component
 * @param {boolean} esc
 * @returns {import('../types/index').URIComponent}
 */
function normalizeComponentEncoding (component, esc) {
  const func = esc !== true ? escape : unescape
  if (component.scheme !== undefined) {
    component.scheme = func(component.scheme)
  }
  if (component.userinfo !== undefined) {
    component.userinfo = func(component.userinfo)
  }
  if (component.host !== undefined) {
    component.host = func(component.host)
  }
  if (component.path !== undefined) {
    component.path = func(component.path)
  }
  if (component.query !== undefined) {
    component.query = func(component.query)
  }
  if (component.fragment !== undefined) {
    component.fragment = func(component.fragment)
  }
  return component
}

/**
 * @param {import('../types/index').URIComponent} component
 * @returns {string|undefined}
 */
function recomposeAuthority (component) {
  const uriTokens = []

  if (component.userinfo !== undefined) {
    uriTokens.push(component.userinfo)
    uriTokens.push('@')
  }

  if (component.host !== undefined) {
    let host = unescape(component.host)
    if (!isIPv4(host)) {
      const ipV6res = normalizeIPv6(host)
      if (ipV6res.isIPV6 === true) {
        host = `[${ipV6res.escapedHost}]`
      } else {
        host = component.host
      }
    }
    uriTokens.push(host)
  }

  if (typeof component.port === 'number' || typeof component.port === 'string') {
    uriTokens.push(':')
    uriTokens.push(String(component.port))
  }

  return uriTokens.length ? uriTokens.join('') : undefined
};

module.exports = {
  nonSimpleDomain,
  recomposeAuthority,
  normalizeComponentEncoding,
  removeDotSegments,
  isIPv4,
  isUUID,
  normalizeIPv6,
  stringArrayToHexStripped
}
