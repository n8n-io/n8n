const { format } = require('util')
const { KafkaJSLockTimeout } = require('../errors')

const PRIVATE = {
  LOCKED: Symbol('private:Lock:locked'),
  TIMEOUT: Symbol('private:Lock:timeout'),
  WAITING: Symbol('private:Lock:waiting'),
  TIMEOUT_ERROR_MESSAGE: Symbol('private:Lock:timeoutErrorMessage'),
}

const TIMEOUT_MESSAGE = 'Timeout while acquiring lock (%d waiting locks)'

module.exports = class Lock {
  constructor({ timeout, description = null } = {}) {
    if (typeof timeout !== 'number') {
      throw new TypeError(`'timeout' is not a number, received '${typeof timeout}'`)
    }

    this[PRIVATE.LOCKED] = false
    this[PRIVATE.TIMEOUT] = timeout
    this[PRIVATE.WAITING] = new Set()
    this[PRIVATE.TIMEOUT_ERROR_MESSAGE] = () => {
      const timeoutMessage = format(TIMEOUT_MESSAGE, this[PRIVATE.WAITING].size)
      return description ? `${timeoutMessage}: "${description}"` : timeoutMessage
    }
  }

  async acquire() {
    return new Promise((resolve, reject) => {
      if (!this[PRIVATE.LOCKED]) {
        this[PRIVATE.LOCKED] = true
        return resolve()
      }

      let timeoutId = null
      const tryToAcquire = async () => {
        if (!this[PRIVATE.LOCKED]) {
          this[PRIVATE.LOCKED] = true
          clearTimeout(timeoutId)
          this[PRIVATE.WAITING].delete(tryToAcquire)
          return resolve()
        }
      }

      this[PRIVATE.WAITING].add(tryToAcquire)
      timeoutId = setTimeout(() => {
        // The message should contain the number of waiters _including_ this one
        const error = new KafkaJSLockTimeout(this[PRIVATE.TIMEOUT_ERROR_MESSAGE]())
        this[PRIVATE.WAITING].delete(tryToAcquire)
        reject(error)
      }, this[PRIVATE.TIMEOUT])
    })
  }

  async release() {
    this[PRIVATE.LOCKED] = false
    const waitingLock = this[PRIVATE.WAITING].values().next().value

    if (waitingLock) {
      return waitingLock()
    }
  }
}
