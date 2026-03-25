'use strict'

const Dispatcher = require('./dispatcher')
const UnwrapHandler = require('../handler/unwrap-handler')
const {
  ClientDestroyedError,
  ClientClosedError,
  InvalidArgumentError
} = require('../core/errors')
const { kDestroy, kClose, kClosed, kDestroyed, kDispatch } = require('../core/symbols')

const kOnDestroyed = Symbol('onDestroyed')
const kOnClosed = Symbol('onClosed')

class DispatcherBase extends Dispatcher {
  /** @type {boolean} */
  [kDestroyed] = false;

  /** @type {Array<Function|null} */
  [kOnDestroyed] = null;

  /** @type {boolean} */
  [kClosed] = false;

  /** @type {Array<Function>|null} */
  [kOnClosed] = null

  /** @returns {boolean} */
  get destroyed () {
    return this[kDestroyed]
  }

  /** @returns {boolean} */
  get closed () {
    return this[kClosed]
  }

  close (callback) {
    if (callback === undefined) {
      return new Promise((resolve, reject) => {
        this.close((err, data) => {
          return err ? reject(err) : resolve(data)
        })
      })
    }

    if (typeof callback !== 'function') {
      throw new InvalidArgumentError('invalid callback')
    }

    if (this[kDestroyed]) {
      const err = new ClientDestroyedError()
      queueMicrotask(() => callback(err, null))
      return
    }

    if (this[kClosed]) {
      if (this[kOnClosed]) {
        this[kOnClosed].push(callback)
      } else {
        queueMicrotask(() => callback(null, null))
      }
      return
    }

    this[kClosed] = true
    this[kOnClosed] ??= []
    this[kOnClosed].push(callback)

    const onClosed = () => {
      const callbacks = this[kOnClosed]
      this[kOnClosed] = null
      for (let i = 0; i < callbacks.length; i++) {
        callbacks[i](null, null)
      }
    }

    // Should not error.
    this[kClose]()
      .then(() => this.destroy())
      .then(() => queueMicrotask(onClosed))
  }

  destroy (err, callback) {
    if (typeof err === 'function') {
      callback = err
      err = null
    }

    if (callback === undefined) {
      return new Promise((resolve, reject) => {
        this.destroy(err, (err, data) => {
          return err ? reject(err) : resolve(data)
        })
      })
    }

    if (typeof callback !== 'function') {
      throw new InvalidArgumentError('invalid callback')
    }

    if (this[kDestroyed]) {
      if (this[kOnDestroyed]) {
        this[kOnDestroyed].push(callback)
      } else {
        queueMicrotask(() => callback(null, null))
      }
      return
    }

    if (!err) {
      err = new ClientDestroyedError()
    }

    this[kDestroyed] = true
    this[kOnDestroyed] ??= []
    this[kOnDestroyed].push(callback)

    const onDestroyed = () => {
      const callbacks = this[kOnDestroyed]
      this[kOnDestroyed] = null
      for (let i = 0; i < callbacks.length; i++) {
        callbacks[i](null, null)
      }
    }

    // Should not error.
    this[kDestroy](err)
      .then(() => queueMicrotask(onDestroyed))
  }

  dispatch (opts, handler) {
    if (!handler || typeof handler !== 'object') {
      throw new InvalidArgumentError('handler must be an object')
    }

    handler = UnwrapHandler.unwrap(handler)

    try {
      if (!opts || typeof opts !== 'object') {
        throw new InvalidArgumentError('opts must be an object.')
      }

      if (this[kDestroyed] || this[kOnDestroyed]) {
        throw new ClientDestroyedError()
      }

      if (this[kClosed]) {
        throw new ClientClosedError()
      }

      return this[kDispatch](opts, handler)
    } catch (err) {
      if (typeof handler.onError !== 'function') {
        throw err
      }

      handler.onError(err)

      return false
    }
  }
}

module.exports = DispatcherBase
