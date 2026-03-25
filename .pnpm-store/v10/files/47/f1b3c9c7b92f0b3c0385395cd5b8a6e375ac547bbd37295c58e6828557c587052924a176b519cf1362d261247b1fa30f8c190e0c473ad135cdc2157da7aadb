import type { Primitive, NestedParam, Hash, NestedParamArray } from '../types'

let _process: NodeJS.Process,
  getNanoSeconds: (() => number) | undefined,
  loadTime: number | undefined

try {
  // eslint-disable-next-line no-eval
  _process = eval(
    'typeof __TEST_WEB__ === "undefined" && typeof process === "object" ? process : undefined'
  )
} catch (e) {} // eslint-disable-line no-empty

const hasProcessHrtime = () => {
  return typeof _process !== 'undefined' && _process !== null && _process.hrtime
}

if (hasProcessHrtime()) {
  getNanoSeconds = () => {
    const hr = _process.hrtime()
    return hr[0] * 1e9 + hr[1]
  }
  loadTime = getNanoSeconds()
}

const R20 = /%20/g

const isNeitherNullNorUndefined = <T>(x: T | undefined | null): x is T =>
  x !== null && x !== undefined

export const validKeys = (entry: Record<string, unknown>) =>
  Object.keys(entry).filter((key) => isNeitherNullNorUndefined(entry[key]))

export const buildRecursive = (
  key: string,
  value: Primitive | NestedParam | NestedParamArray,
  suffix = '',
  encoderFn = encodeURIComponent
): string => {
  if (Array.isArray(value)) {
    return value.map((v) => buildRecursive(key, v, suffix + '[]', encoderFn)).join('&')
  }

  if (typeof value !== 'object') {
    return `${encoderFn(key + suffix)}=${encoderFn(value)}`
  }

  return Object.keys(value)
    .map((nestedKey) => {
      const nestedValue = value[nestedKey]
      if (isNeitherNullNorUndefined(nestedValue)) {
        return buildRecursive(key, nestedValue, suffix + '[' + nestedKey + ']', encoderFn)
      }
      return null
    })
    .filter(isNeitherNullNorUndefined)
    .join('&')
}

export const toQueryString = (
  entry: undefined | null | Primitive | NestedParam,
  encoderFn = encodeURIComponent
) => {
  if (!isPlainObject(entry)) {
    return entry
  }

  return Object.keys(entry)
    .map((key) => {
      const value = entry[key]
      if (isNeitherNullNorUndefined(value)) {
        return buildRecursive(key, value, '', encoderFn)
      }
      return null
    })
    .filter(isNeitherNullNorUndefined)
    .join('&')
    .replace(R20, '+')
}

/**
 * Gives time in milliseconds, but with sub-millisecond precision for Browser
 * and Nodejs
 */
export const performanceNow = () => {
  if (hasProcessHrtime() && getNanoSeconds !== undefined) {
    const now = getNanoSeconds()
    if (now !== undefined && loadTime !== undefined) {
      return (now - loadTime) / 1e6
    }
  }

  return Date.now()
}

/**
 * borrowed from: {@link https://gist.github.com/monsur/706839}
 * XmlHttpRequest's getAllResponseHeaders() method returns a string of response
 * headers according to the format described here:
 * {@link http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders-method}
 * This method parses that string into a user-friendly key/value pair object.
 */
export const parseResponseHeaders = (headerStr: string) => {
  const headers: Hash = {}
  if (!headerStr) {
    return headers
  }

  const headerPairs = headerStr.split('\u000d\u000a')
  for (let i = 0; i < headerPairs.length; i++) {
    const headerPair = headerPairs[i]
    // Can't use split() here because it does the wrong thing
    // if the header value has the string ": " in it.
    const index = headerPair.indexOf('\u003a\u0020')
    if (index > 0) {
      const key = headerPair.substring(0, index).toLowerCase().trim()
      const val = headerPair.substring(index + 2).trim()
      headers[key] = val
    }
  }
  return headers
}

export const lowerCaseObjectKeys = (obj: Hash) => {
  return Object.keys(obj).reduce((target, key) => {
    target[key.toLowerCase()] = obj[key]
    return target
  }, {} as Hash)
}

const hasOwnProperty = Object.prototype.hasOwnProperty
export const assign =
  Object.assign ||
  function (target: Hash) {
    for (let i = 1; i < arguments.length; i++) {
      // eslint-disable-next-line prefer-rest-params
      const source = arguments[i]
      for (const key in source) {
        if (hasOwnProperty.call(source, key)) {
          target[key] = source[key]
        }
      }
    }
    return target
  }

const toString = Object.prototype.toString
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    toString.call(value) === '[object Object]' &&
    Object.getPrototypeOf(value) === Object.getPrototypeOf({})
  )
}

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * borrowed from: {@link https://github.com/davidchambers/Base64.js}
 */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
export const btoa = (input: object | Primitive | null) => {
  let output = ''
  let map = CHARS
  const str = String(input)
  for (
    // initialize result and counter
    let block = 0, charCode: number, idx = 0;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || ((map = '='), idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & (block >> (8 - (idx % 1) * 8)))
  ) {
    charCode = str.charCodeAt((idx += 3 / 4))
    if (charCode > 0xff) {
      throw new Error(
        "[Mappersmith] 'btoa' failed: The string to be encoded contains characters outside of the Latin1 range."
      )
    }
    block = (block << 8) | charCode
  }
  return output
}
