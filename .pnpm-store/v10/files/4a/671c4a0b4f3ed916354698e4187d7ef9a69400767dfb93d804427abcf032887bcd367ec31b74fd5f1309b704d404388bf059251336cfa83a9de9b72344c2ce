'use strict'

// In case of breaking changes, increase the version
// number to avoid conflicts.
const globalOrigin = Symbol.for('undici.globalOrigin.1')

function getGlobalOrigin () {
  return globalThis[globalOrigin]
}

function setGlobalOrigin (newOrigin) {
  if (newOrigin === undefined) {
    Object.defineProperty(globalThis, globalOrigin, {
      value: undefined,
      writable: true,
      enumerable: false,
      configurable: false
    })

    return
  }

  const parsedURL = new URL(newOrigin)

  if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
    throw new TypeError(`Only http & https urls are allowed, received ${parsedURL.protocol}`)
  }

  Object.defineProperty(globalThis, globalOrigin, {
    value: parsedURL,
    writable: true,
    enumerable: false,
    configurable: false
  })
}

module.exports = {
  getGlobalOrigin,
  setGlobalOrigin
}
