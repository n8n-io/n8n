'use strict'

let fastNow = Date.now()
let fastNowTimeout

const fastTimers = []

function onTimeout () {
  fastNow = Date.now()

  let len = fastTimers.length
  let idx = 0
  while (idx < len) {
    const timer = fastTimers[idx]

    if (timer.state === 0) {
      timer.state = fastNow + timer.delay
    } else if (timer.state > 0 && fastNow >= timer.state) {
      timer.state = -1
      timer.callback(timer.opaque)
    }

    if (timer.state === -1) {
      timer.state = -2
      if (idx !== len - 1) {
        fastTimers[idx] = fastTimers.pop()
      } else {
        fastTimers.pop()
      }
      len -= 1
    } else {
      idx += 1
    }
  }

  if (fastTimers.length > 0) {
    refreshTimeout()
  }
}

function refreshTimeout () {
  if (fastNowTimeout && fastNowTimeout.refresh) {
    fastNowTimeout.refresh()
  } else {
    clearTimeout(fastNowTimeout)
    fastNowTimeout = setTimeout(onTimeout, 1e3)
    if (fastNowTimeout.unref) {
      fastNowTimeout.unref()
    }
  }
}

class Timeout {
  constructor (callback, delay, opaque) {
    this.callback = callback
    this.delay = delay
    this.opaque = opaque

    //  -2 not in timer list
    //  -1 in timer list but inactive
    //   0 in timer list waiting for time
    // > 0 in timer list waiting for time to expire
    this.state = -2

    this.refresh()
  }

  refresh () {
    if (this.state === -2) {
      fastTimers.push(this)
      if (!fastNowTimeout || fastTimers.length === 1) {
        refreshTimeout()
      }
    }

    this.state = 0
  }

  clear () {
    this.state = -1
  }
}

module.exports = {
  setTimeout (callback, delay, opaque) {
    return delay < 1e3
      ? setTimeout(callback, delay, opaque)
      : new Timeout(callback, delay, opaque)
  },
  clearTimeout (timeout) {
    if (timeout instanceof Timeout) {
      timeout.clear()
    } else {
      clearTimeout(timeout)
    }
  }
}
