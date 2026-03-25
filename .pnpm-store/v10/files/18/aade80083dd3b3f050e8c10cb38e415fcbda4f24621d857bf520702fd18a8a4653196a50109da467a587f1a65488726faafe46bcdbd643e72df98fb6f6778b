'use strict'

/**
 * @template {*} T
 * @typedef {Object} DeferredPromise
 * @property {Promise<T>} promise
 * @property {(value?: T) => void} resolve
 * @property {(reason?: any) => void} reject
 */

/**
 * @template {*} T
 * @returns {DeferredPromise<T>} An object containing a promise and its resolve/reject methods.
 */
function createDeferredPromise () {
  let res
  let rej
  const promise = new Promise((resolve, reject) => {
    res = resolve
    rej = reject
  })

  return { promise, resolve: res, reject: rej }
}

module.exports = {
  createDeferredPromise
}
