'use strict'

const _global =
  typeof self !== 'undefined'
    ? self
    : typeof window !== 'undefined'
    ? window
    : /* otherwise */ undefined

if (!_global) {
  throw new Error(
    `Unable to find global scope. Are you sure this is running in the browser?`
  )
}

if (!_global.AbortController) {
  throw new Error(
    `Could not find "AbortController" in the global scope. You need to polyfill it first`
  )
}

module.exports.AbortController = _global.AbortController