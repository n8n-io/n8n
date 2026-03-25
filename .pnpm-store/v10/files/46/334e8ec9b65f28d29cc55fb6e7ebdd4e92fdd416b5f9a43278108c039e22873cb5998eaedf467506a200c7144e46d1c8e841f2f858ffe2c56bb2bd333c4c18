// Copyright 2023 ChatGPT May 24 Version
/* eslint-disable new-cap */ // to fix new Buffer.from
'use strict'
const ECMA_SIZES = require('./byte_size')
const Buffer =
  typeof window !== 'undefined' ? require('buffer/').Buffer : global.Buffer

/**
 * Precisely calculate size of string in node
 * Based on https://stackoverflow.com/questions/68789144/how-much-memory-do-v8-take-to-store-a-string/68791382#68791382
 * @param {} str
 */
function preciseStringSizeNode (str) {
  return 12 + 4 * Math.ceil(str.length / 4)
}

/**
 * In the browser environment, window and document are defined as global objects
 * @returns true if its a Node.js env, false if it is a browser
 */
function isNodeEnvironment () {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return false
  }
  return true
}

function getSizeOfTypedArray (typedArray) {
  if (typedArray.BYTES_PER_ELEMENT) {
    return typedArray.length * typedArray.BYTES_PER_ELEMENT
  }
  return -1 // error indication
}

/**
 * Size in bytes for complex objects
 * @param {*} obj
 * @returns size in bytes, or -1 if JSON.stringify threw an exception
 */
function objectSizeComplex (obj) {
  let totalSize = 0
  const errorIndication = -1

  try {
    // convert Map and Set to an object representation
    let convertedObj = obj
    if (obj instanceof Map) {
      convertedObj = Object.fromEntries(obj)
    } else if (obj instanceof Set) {
      convertedObj = Array.from(obj)
    }

    // handle typed arrays
    if (ArrayBuffer.isView(obj)) {
      return getSizeOfTypedArray(obj)
    }

    const serializedObj = JSON.stringify(convertedObj, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      } else if (typeof value === 'function') {
        return value.toString()
      } else if (typeof value === 'undefined') {
        return 'undefined'
      } else if (typeof value === 'symbol') {
        return value.toString()
      } else if (value instanceof RegExp) {
        return value.toString()
      } else {
        return value
      }
    })

    totalSize = Buffer.byteLength(serializedObj, 'utf8')
  } catch (ex) {
    // do not log anyting to console.error
    return new Error(errorIndication)
  }

  return totalSize
}

/**
 * Size in bytes for primitive types
 * @param {*} obj
 * @returns size in bytes
 */
function objectSizeSimple (obj) {
  const objectList = []
  const stack = [obj]
  let bytes = 0

  while (stack.length) {
    const value = stack.pop()

    if (typeof value === 'boolean') {
      bytes += ECMA_SIZES.BYTES
    } else if (typeof value === 'string') {
      if (isNodeEnvironment()) {
        bytes += preciseStringSizeNode(value)
      } else {
        bytes += value.length * ECMA_SIZES.STRING
      }
    } else if (typeof value === 'number') {
      bytes += ECMA_SIZES.NUMBER
    } else if (typeof value === 'symbol') {
      const isGlobalSymbol = Symbol.keyFor && Symbol.keyFor(obj)
      if (isGlobalSymbol) {
        bytes += Symbol.keyFor(obj).length * ECMA_SIZES.STRING
      } else {
        bytes += (obj.toString().length - 8) * ECMA_SIZES.STRING
      }
    } else if (typeof value === 'bigint') {
      bytes += Buffer.from(value.toString()).byteLength
    } else if (typeof value === 'function') {
      bytes += value.toString().length
    } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
      objectList.push(value)

      for (const i in value) {
        stack.push(value[i])
      }
    }
  }
  return bytes
}

module.exports = function (obj) {
  let totalSize = 0

  if (obj !== null && typeof obj === 'object') {
    totalSize = objectSizeComplex(obj)
  } else {
    totalSize = objectSizeSimple(obj)
  }

  return totalSize
}
