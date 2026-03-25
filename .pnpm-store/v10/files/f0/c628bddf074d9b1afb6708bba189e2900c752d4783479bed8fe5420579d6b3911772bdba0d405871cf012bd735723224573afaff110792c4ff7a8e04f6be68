'use strict'

const Dispatcher = require('./dispatcher')
const {
  ClientDestroyedError,
  ClientClosedError,
  InvalidArgumentError
} = require('../core/errors')
const { kDestroy, kClose, kClosed, kDestroyed, kDispatch, kInterceptors } = require('../core/symbols')

const kOnDestroyed = Symbol('onDestroyed')
const kOnClosed = Symbol('onClosed')
const kInterceptedDispatch = Symbol('Intercepted Dispatch')

class DispatcherBase extends Dispatcher {
  constructor () {
    super()

    this[kDestroyed] = false
    this[kOnDestroyed] = null
    this[kClosed] = false
    this[kOnClosed] = []
  }

  get destroyed () {
    return this[kDestroyed]
  }

  get closed () {
    return this[kClosed]
  }

  get interceptors () {
    return this[kInterceptors]
  }

  set interceptors (newInterceptors) {
    if (newInterceptors) {
      for (let i = newInterceptors.length - 1; i >= 0; i--) {
        const interceptor = this[kInterceptors][i]
        if (typeof interceptor !== 'function') {
          throw new InvalidArgumentError('interceptor must be an function')
        }
      }
    }

    this[kInterceptors] = newInterceptors
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
      queueMicrotask(() => callback(new ClientDestroyedError(), null))
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
      .then(() => {
        queueMicrotask(onClosed)
      })
  }

  destroy (err, callback) {
    if (typeof err === 'function') {
      callback = err
      err = null
    }

    if (callback === undefined) {
      return new Promise((resolve, reject) => {
        this.destroy(err, (err, data) => {
          return err ? /* istanbul ignore next: should never error */ reject(err) : resolve(data)
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
    this[kOnDestroyed] = this[kOnDestroyed] || []
    this[kOnDestroyed].push(callback)

    const onDestroyed = () => {
      const callbacks = this[kOnDestroyed]
      this[kOnDestroyed] = null
      for (let i = 0; i < callbacks.length; i++) {
        callbacks[i](null, null)
      }
    }

    // Should not error.
    this[kDestroy](err).then(() => {
      queueMicrotask(onDestroyed)
    })
  }

  [kInterceptedDispatch] (opts, handler) {
    if (!this[kInterceptors] || this[kInterceptors].length === 0) {
      this[kInterceptedDispatch] = this[kDispatch]
      return this[kDispatch](opts, handler)
    }

    let dispatch = this[kDispatch].bind(this)
    for (let i = this[kInterceptors].length - 1; i >= 0; i--) {
      dispatch = this[kInterceptors][i](dispatch)
    }
    this[kInterceptedDispatch] = dispatch
    return dispatch(opts, handler)
  }

  dispatch (opts, handler) {
    if (!handler || typeof handler !== 'object') {
      throw new InvalidArgumentError('handler must be an object')
    }

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

      return this[kInterceptedDispatch](opts, handler)
    } catch (err) {
      if (typeof handler.onError !== 'function') {
        throw new InvalidArgumentError('invalid onError method')
      }

      handler.onError(err)

      return false
    }
  }
}

module.exports = DispatcherBase
