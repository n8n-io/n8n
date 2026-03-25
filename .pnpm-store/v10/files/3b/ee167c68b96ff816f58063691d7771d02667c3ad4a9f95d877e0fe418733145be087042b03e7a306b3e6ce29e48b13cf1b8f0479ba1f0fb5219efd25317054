'use strict'

const { parseSetCookie } = require('./parse')
const { stringify } = require('./util')
const { webidl } = require('../fetch/webidl')
const { Headers } = require('../fetch/headers')

/**
 * @typedef {Object} Cookie
 * @property {string} name
 * @property {string} value
 * @property {Date|number|undefined} expires
 * @property {number|undefined} maxAge
 * @property {string|undefined} domain
 * @property {string|undefined} path
 * @property {boolean|undefined} secure
 * @property {boolean|undefined} httpOnly
 * @property {'Strict'|'Lax'|'None'} sameSite
 * @property {string[]} unparsed
 */

/**
 * @param {Headers} headers
 * @returns {Record<string, string>}
 */
function getCookies (headers) {
  webidl.argumentLengthCheck(arguments, 1, 'getCookies')

  webidl.brandCheck(headers, Headers, { strict: false })

  const cookie = headers.get('cookie')
  const out = {}

  if (!cookie) {
    return out
  }

  for (const piece of cookie.split(';')) {
    const [name, ...value] = piece.split('=')

    out[name.trim()] = value.join('=')
  }

  return out
}

/**
 * @param {Headers} headers
 * @param {string} name
 * @param {{ path?: string, domain?: string }|undefined} attributes
 * @returns {void}
 */
function deleteCookie (headers, name, attributes) {
  webidl.brandCheck(headers, Headers, { strict: false })

  const prefix = 'deleteCookie'
  webidl.argumentLengthCheck(arguments, 2, prefix)

  name = webidl.converters.DOMString(name, prefix, 'name')
  attributes = webidl.converters.DeleteCookieAttributes(attributes)

  // Matches behavior of
  // https://github.com/denoland/deno_std/blob/63827b16330b82489a04614027c33b7904e08be5/http/cookie.ts#L278
  setCookie(headers, {
    name,
    value: '',
    expires: new Date(0),
    ...attributes
  })
}

/**
 * @param {Headers} headers
 * @returns {Cookie[]}
 */
function getSetCookies (headers) {
  webidl.argumentLengthCheck(arguments, 1, 'getSetCookies')

  webidl.brandCheck(headers, Headers, { strict: false })

  const cookies = headers.getSetCookie()

  if (!cookies) {
    return []
  }

  return cookies.map((pair) => parseSetCookie(pair))
}

/**
 * @param {Headers} headers
 * @param {Cookie} cookie
 * @returns {void}
 */
function setCookie (headers, cookie) {
  webidl.argumentLengthCheck(arguments, 2, 'setCookie')

  webidl.brandCheck(headers, Headers, { strict: false })

  cookie = webidl.converters.Cookie(cookie)

  const str = stringify(cookie)

  if (str) {
    headers.append('Set-Cookie', str)
  }
}

webidl.converters.DeleteCookieAttributes = webidl.dictionaryConverter([
  {
    converter: webidl.nullableConverter(webidl.converters.DOMString),
    key: 'path',
    defaultValue: () => null
  },
  {
    converter: webidl.nullableConverter(webidl.converters.DOMString),
    key: 'domain',
    defaultValue: () => null
  }
])

webidl.converters.Cookie = webidl.dictionaryConverter([
  {
    converter: webidl.converters.DOMString,
    key: 'name'
  },
  {
    converter: webidl.converters.DOMString,
    key: 'value'
  },
  {
    converter: webidl.nullableConverter((value) => {
      if (typeof value === 'number') {
        return webidl.converters['unsigned long long'](value)
      }

      return new Date(value)
    }),
    key: 'expires',
    defaultValue: () => null
  },
  {
    converter: webidl.nullableConverter(webidl.converters['long long']),
    key: 'maxAge',
    defaultValue: () => null
  },
  {
    converter: webidl.nullableConverter(webidl.converters.DOMString),
    key: 'domain',
    defaultValue: () => null
  },
  {
    converter: webidl.nullableConverter(webidl.converters.DOMString),
    key: 'path',
    defaultValue: () => null
  },
  {
    converter: webidl.nullableConverter(webidl.converters.boolean),
    key: 'secure',
    defaultValue: () => null
  },
  {
    converter: webidl.nullableConverter(webidl.converters.boolean),
    key: 'httpOnly',
    defaultValue: () => null
  },
  {
    converter: webidl.converters.USVString,
    key: 'sameSite',
    allowedValues: ['Strict', 'Lax', 'None']
  },
  {
    converter: webidl.sequenceConverter(webidl.converters.DOMString),
    key: 'unparsed',
    defaultValue: () => new Array(0)
  }
])

module.exports = {
  getCookies,
  deleteCookie,
  getSetCookies,
  setCookie
}
