// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * @fileoverview Defines a handful of utility functions to simplify working
 * with promises.
 */

'use strict'

const { isObject, isPromise } = require('./util')

/**
 * Creates a promise that will be resolved at a set time in the future.
 * @param {number} ms The amount of time, in milliseconds, to wait before
 *     resolving the promise.
 * @return {!Promise<void>} The promise.
 */
function delayed(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wraps a function that expects a node-style callback as its final
 * argument. This callback expects two arguments: an error value (which will be
 * null if the call succeeded), and the success value as the second argument.
 * The callback will the resolve or reject the returned promise, based on its
 * arguments.
 * @param {!Function} fn The function to wrap.
 * @param {...?} args The arguments to apply to the function, excluding the
 *     final callback.
 * @return {!Thenable} A promise that will be resolved with the
 *     result of the provided function's callback.
 */
function checkedNodeCall(fn, ...args) {
  return new Promise(function (fulfill, reject) {
    try {
      fn(...args, function (error, value) {
        error ? reject(error) : fulfill(value)
      })
    } catch (ex) {
      reject(ex)
    }
  })
}

/**
 * Registers a listener to invoke when a promise is resolved, regardless
 * of whether the promise's value was successfully computed. This function
 * is synonymous with the {@code finally} clause in a synchronous API:
 *
 *     // Synchronous API:
 *     try {
 *       doSynchronousWork();
 *     } finally {
 *       cleanUp();
 *     }
 *
 *     // Asynchronous promise API:
 *     doAsynchronousWork().finally(cleanUp);
 *
 * __Note:__ similar to the {@code finally} clause, if the registered
 * callback returns a rejected promise or throws an error, it will silently
 * replace the rejection error (if any) from this promise:
 *
 *     try {
 *       throw Error('one');
 *     } finally {
 *       throw Error('two');  // Hides Error: one
 *     }
 *
 *     let p = Promise.reject(Error('one'));
 *     promise.finally(p, function() {
 *       throw Error('two');  // Hides Error: one
 *     });
 *
 * @param {!IThenable<?>} promise The promise to add the listener to.
 * @param {function(): (R|IThenable<R>)} callback The function to call when
 *     the promise is resolved.
 * @return {!Promise<R>} A promise that will be resolved with the callback
 *     result.
 * @template R
 */
async function thenFinally(promise, callback) {
  try {
    await Promise.resolve(promise)
    return callback()
  } catch (e) {
    await callback()
    throw e
  }
}

/**
 * Calls a function for each element in an array and inserts the result into a
 * new array, which is used as the fulfillment value of the promise returned
 * by this function.
 *
 * If the return value of the mapping function is a promise, this function
 * will wait for it to be fulfilled before inserting it into the new array.
 *
 * If the mapping function throws or returns a rejected promise, the
 * promise returned by this function will be rejected with the same reason.
 * Only the first failure will be reported; all subsequent errors will be
 * silently ignored.
 *
 * @param {!(Array<TYPE>|IThenable<!Array<TYPE>>)} array The array to iterate
 *     over, or a promise that will resolve to said array.
 * @param {function(this: SELF, TYPE, number, !Array<TYPE>): ?} fn The
 *     function to call for each element in the array. This function should
 *     expect three arguments (the element, the index, and the array itself.
 * @param {SELF=} self The object to be used as the value of 'this' within `fn`.
 * @template TYPE, SELF
 */
async function map(array, fn, self = undefined) {
  const v = await Promise.resolve(array)
  if (!Array.isArray(v)) {
    throw TypeError('not an array')
  }

  const arr = /** @type {!Array} */ (v)
  const values = []

  for (const [index, item] of arr.entries()) {
    values.push(await Promise.resolve(fn.call(self, item, index, arr)))
  }

  return values
}

/**
 * Calls a function for each element in an array, and if the function returns
 * true adds the element to a new array.
 *
 * If the return value of the filter function is a promise, this function
 * will wait for it to be fulfilled before determining whether to insert the
 * element into the new array.
 *
 * If the filter function throws or returns a rejected promise, the promise
 * returned by this function will be rejected with the same reason. Only the
 * first failure will be reported; all subsequent errors will be silently
 * ignored.
 *
 * @param {!(Array<TYPE>|IThenable<!Array<TYPE>>)} array The array to iterate
 *     over, or a promise that will resolve to said array.
 * @param {function(this: SELF, TYPE, number, !Array<TYPE>): (
 *             boolean|IThenable<boolean>)} fn The function
 *     to call for each element in the array.
 * @param {SELF=} self The object to be used as the value of 'this' within `fn`.
 * @template TYPE, SELF
 */
async function filter(array, fn, self = undefined) {
  const v = await Promise.resolve(array)
  if (!Array.isArray(v)) {
    throw TypeError('not an array')
  }

  const arr = /** @type {!Array} */ (v)
  const values = []

  for (const [index, item] of arr.entries()) {
    const isConditionTrue = await Promise.resolve(fn.call(self, item, index, arr))
    if (isConditionTrue) {
      values.push(item)
    }
  }

  return values
}

/**
 * Returns a promise that will be resolved with the input value in a
 * fully-resolved state. If the value is an array, each element will be fully
 * resolved. Likewise, if the value is an object, all keys will be fully
 * resolved. In both cases, all nested arrays and objects will also be
 * fully resolved.  All fields are resolved in place; the returned promise will
 * resolve on {@code value} and not a copy.
 *
 * Warning: This function makes no checks against objects that contain
 * cyclical references:
 *
 *     var value = {};
 *     value['self'] = value;
 *     promise.fullyResolved(value);  // Stack overflow.
 *
 * @param {*} value The value to fully resolve.
 * @return {!Thenable} A promise for a fully resolved version
 *     of the input value.
 */
async function fullyResolved(value) {
  value = await Promise.resolve(value)
  if (Array.isArray(value)) {
    return fullyResolveKeys(/** @type {!Array} */ (value))
  }

  if (isObject(value)) {
    return fullyResolveKeys(/** @type {!Object} */ (value))
  }

  if (typeof value === 'function') {
    return fullyResolveKeys(/** @type {!Object} */ (value))
  }

  return value
}

/**
 * @param {!(Array|Object)} obj the object to resolve.
 * @return {!Thenable} A promise that will be resolved with the
 *     input object once all of its values have been fully resolved.
 */
async function fullyResolveKeys(obj) {
  const isArray = Array.isArray(obj)
  const numKeys = isArray ? obj.length : Object.keys(obj).length

  if (!numKeys) {
    return obj
  }

  async function forEachProperty(obj, fn) {
    for (let key in obj) {
      await fn(obj[key], key)
    }
  }

  async function forEachElement(arr, fn) {
    for (let i = 0; i < arr.length; i++) {
      await fn(arr[i], i)
    }
  }

  const forEachKey = isArray ? forEachElement : forEachProperty
  await forEachKey(obj, async function (partialValue, key) {
    if (!Array.isArray(partialValue) && (!partialValue || typeof partialValue !== 'object')) {
      return
    }
    obj[key] = await fullyResolved(partialValue)
  })
  return obj
}

// PUBLIC API

module.exports = {
  checkedNodeCall,
  delayed,
  filter,
  finally: thenFinally,
  fullyResolved,
  isPromise,
  map,
}
