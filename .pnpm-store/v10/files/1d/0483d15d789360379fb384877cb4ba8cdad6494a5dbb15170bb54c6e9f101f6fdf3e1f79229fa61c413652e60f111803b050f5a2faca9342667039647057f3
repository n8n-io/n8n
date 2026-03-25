/* eslint-env browser */

/**
 * Isomorphic variable storage.
 *
 * Uses LocalStorage in the browser and falls back to in-memory storage.
 *
 * @module storage
 */

/* c8 ignore start */
class VarStoragePolyfill {
  constructor () {
    this.map = new Map()
  }

  /**
   * @param {string} key
   * @param {any} newValue
   */
  setItem (key, newValue) {
    this.map.set(key, newValue)
  }

  /**
   * @param {string} key
   */
  getItem (key) {
    return this.map.get(key)
  }
}
/* c8 ignore stop */

/**
 * @type {any}
 */
let _localStorage = new VarStoragePolyfill()
let usePolyfill = true

/* c8 ignore start */
try {
  // if the same-origin rule is violated, accessing localStorage might thrown an error
  if (typeof localStorage !== 'undefined' && localStorage) {
    _localStorage = localStorage
    usePolyfill = false
  }
} catch (e) { }
/* c8 ignore stop */

/**
 * This is basically localStorage in browser, or a polyfill in nodejs
 */
/* c8 ignore next */
export const varStorage = _localStorage

/**
 * A polyfill for `addEventListener('storage', event => {..})` that does nothing if the polyfill is being used.
 *
 * @param {function({ key: string, newValue: string, oldValue: string }): void} eventHandler
 * @function
 */
/* c8 ignore next */
export const onChange = eventHandler => usePolyfill || addEventListener('storage', /** @type {any} */ (eventHandler))

/**
 * A polyfill for `removeEventListener('storage', event => {..})` that does nothing if the polyfill is being used.
 *
 * @param {function({ key: string, newValue: string, oldValue: string }): void} eventHandler
 * @function
 */
/* c8 ignore next */
export const offChange = eventHandler => usePolyfill || removeEventListener('storage', /** @type {any} */ (eventHandler))
