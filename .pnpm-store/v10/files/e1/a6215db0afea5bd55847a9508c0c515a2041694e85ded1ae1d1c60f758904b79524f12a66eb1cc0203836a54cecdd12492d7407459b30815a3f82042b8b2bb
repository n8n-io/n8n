'use strict'

const getTime = require('./time')

class Retimer {
  constructor (callback, timeout, args) {
    const that = this

    this._started = getTime()
    this._rescheduled = 0
    this._scheduled = timeout
    this._args = args
    this._triggered = false

    this._timerWrapper = () => {
      if (that._rescheduled > 0) {
        that._scheduled = that._rescheduled - (getTime() - that._started)
        that._schedule(that._scheduled)
      } else {
        that._triggered = true
        callback.apply(null, that._args)
      }
    }

    this._timer = setTimeout(this._timerWrapper, timeout)
  }

  reschedule (timeout) {
    if (!timeout) {
      timeout = this._scheduled
    }
    const now = getTime()
    if ((now + timeout) - (this._started + this._scheduled) < 0) {
      clearTimeout(this._timer)
      this._schedule(timeout)
    } else if (!this._triggered) {
      this._started = now
      this._rescheduled = timeout
    } else {
      this._schedule(timeout)
    }
  }

  _schedule (timeout) {
    this._triggered = false
    this._started = getTime()
    this._rescheduled = 0
    this._scheduled = timeout
    this._timer = setTimeout(this._timerWrapper, timeout)
  }

  clear () {
    clearTimeout(this._timer)
  }
}

function retimer () {
  if (typeof arguments[0] !== 'function') {
    throw new Error('callback needed')
  }

  if (typeof arguments[1] !== 'number') {
    throw new Error('timeout needed')
  }

  let args

  if (arguments.length > 0) {
    args = new Array(arguments.length - 2)

    /* eslint-disable no-var */
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i + 2]
    }
  }

  return new Retimer(arguments[0], arguments[1], args)
}

module.exports = retimer
