'use strict'

/**
 * This module offers an optimized timer implementation designed for scenarios
 * where high precision is not critical.
 *
 * The timer achieves faster performance by using a low-resolution approach,
 * with an accuracy target of within 500ms. This makes it particularly useful
 * for timers with delays of 1 second or more, where exact timing is less
 * crucial.
 *
 * It's important to note that Node.js timers are inherently imprecise, as
 * delays can occur due to the event loop being blocked by other operations.
 * Consequently, timers may trigger later than their scheduled time.
 */

/**
 * The fastNow variable contains the internal fast timer clock value.
 *
 * @type {number}
 */
let fastNow = 0

/**
 * RESOLUTION_MS represents the target resolution time in milliseconds.
 *
 * @type {number}
 * @default 1000
 */
const RESOLUTION_MS = 1e3

/**
 * TICK_MS defines the desired interval in milliseconds between each tick.
 * The target value is set to half the resolution time, minus 1 ms, to account
 * for potential event loop overhead.
 *
 * @type {number}
 * @default 499
 */
const TICK_MS = (RESOLUTION_MS >> 1) - 1

/**
 * fastNowTimeout is a Node.js timer used to manage and process
 * the FastTimers stored in the `fastTimers` array.
 *
 * @type {NodeJS.Timeout}
 */
let fastNowTimeout

/**
 * The kFastTimer symbol is used to identify FastTimer instances.
 *
 * @type {Symbol}
 */
const kFastTimer = Symbol('kFastTimer')

/**
 * The fastTimers array contains all active FastTimers.
 *
 * @type {FastTimer[]}
 */
const fastTimers = []

/**
 * These constants represent the various states of a FastTimer.
 */

/**
 * The `NOT_IN_LIST` constant indicates that the FastTimer is not included
 * in the `fastTimers` array. Timers with this status will not be processed
 * during the next tick by the `onTick` function.
 *
 * A FastTimer can be re-added to the `fastTimers` array by invoking the
 * `refresh` method on the FastTimer instance.
 *
 * @type {-2}
 */
const NOT_IN_LIST = -2

/**
 * The `TO_BE_CLEARED` constant indicates that the FastTimer is scheduled
 * for removal from the `fastTimers` array. A FastTimer in this state will
 * be removed in the next tick by the `onTick` function and will no longer
 * be processed.
 *
 * This status is also set when the `clear` method is called on the FastTimer instance.
 *
 * @type {-1}
 */
const TO_BE_CLEARED = -1

/**
 * The `PENDING` constant signifies that the FastTimer is awaiting processing
 * in the next tick by the `onTick` function. Timers with this status will have
 * their `_idleStart` value set and their status updated to `ACTIVE` in the next tick.
 *
 * @type {0}
 */
const PENDING = 0

/**
 * The `ACTIVE` constant indicates that the FastTimer is active and waiting
 * for its timer to expire. During the next tick, the `onTick` function will
 * check if the timer has expired, and if so, it will execute the associated callback.
 *
 * @type {1}
 */
const ACTIVE = 1

/**
 * The onTick function processes the fastTimers array.
 *
 * @returns {void}
 */
function onTick () {
  /**
   * Increment the fastNow value by the TICK_MS value, despite the actual time
   * that has passed since the last tick. This approach ensures independence
   * from the system clock and delays caused by a blocked event loop.
   *
   * @type {number}
   */
  fastNow += TICK_MS

  /**
   * The `idx` variable is used to iterate over the `fastTimers` array.
   * Expired timers are removed by replacing them with the last element in the array.
   * Consequently, `idx` is only incremented when the current element is not removed.
   *
   * @type {number}
   */
  let idx = 0

  /**
   * The len variable will contain the length of the fastTimers array
   * and will be decremented when a FastTimer should be removed from the
   * fastTimers array.
   *
   * @type {number}
   */
  let len = fastTimers.length

  while (idx < len) {
    /**
     * @type {FastTimer}
     */
    const timer = fastTimers[idx]

    // If the timer is in the ACTIVE state and the timer has expired, it will
    // be processed in the next tick.
    if (timer._state === PENDING) {
      // Set the _idleStart value to the fastNow value minus the TICK_MS value
      // to account for the time the timer was in the PENDING state.
      timer._idleStart = fastNow - TICK_MS
      timer._state = ACTIVE
    } else if (
      timer._state === ACTIVE &&
      fastNow >= timer._idleStart + timer._idleTimeout
    ) {
      timer._state = TO_BE_CLEARED
      timer._idleStart = -1
      timer._onTimeout(timer._timerArg)
    }

    if (timer._state === TO_BE_CLEARED) {
      timer._state = NOT_IN_LIST

      // Move the last element to the current index and decrement len if it is
      // not the only element in the array.
      if (--len !== 0) {
        fastTimers[idx] = fastTimers[len]
      }
    } else {
      ++idx
    }
  }

  // Set the length of the fastTimers array to the new length and thus
  // removing the excess FastTimers elements from the array.
  fastTimers.length = len

  // If there are still active FastTimers in the array, refresh the Timer.
  // If there are no active FastTimers, the timer will be refreshed again
  // when a new FastTimer is instantiated.
  if (fastTimers.length !== 0) {
    refreshTimeout()
  }
}

function refreshTimeout () {
  // If the fastNowTimeout is already set and the Timer has the refresh()-
  // method available, call it to refresh the timer.
  // Some timer objects returned by setTimeout may not have a .refresh()
  // method (e.g. mocked timers in tests).
  if (fastNowTimeout?.refresh) {
    fastNowTimeout.refresh()
    // fastNowTimeout is not instantiated yet or refresh is not availabe,
    // create a new Timer.
  } else {
    clearTimeout(fastNowTimeout)
    fastNowTimeout = setTimeout(onTick, TICK_MS)
    // If the Timer has an unref method, call it to allow the process to exit,
    // if there are no other active handles. When using fake timers or mocked
    // environments (like Jest), .unref() may not be defined,
    fastNowTimeout?.unref()
  }
}

/**
 * The `FastTimer` class is a data structure designed to store and manage
 * timer information.
 */
class FastTimer {
  [kFastTimer] = true

  /**
   * The state of the timer, which can be one of the following:
   * - NOT_IN_LIST (-2)
   * - TO_BE_CLEARED (-1)
   * - PENDING (0)
   * - ACTIVE (1)
   *
   * @type {-2|-1|0|1}
   * @private
   */
  _state = NOT_IN_LIST

  /**
   * The number of milliseconds to wait before calling the callback.
   *
   * @type {number}
   * @private
   */
  _idleTimeout = -1

  /**
   * The time in milliseconds when the timer was started. This value is used to
   * calculate when the timer should expire.
   *
   * @type {number}
   * @default -1
   * @private
   */
  _idleStart = -1

  /**
   * The function to be executed when the timer expires.
   * @type {Function}
   * @private
   */
  _onTimeout

  /**
   * The argument to be passed to the callback when the timer expires.
   *
   * @type {*}
   * @private
   */
  _timerArg

  /**
   * @constructor
   * @param {Function} callback A function to be executed after the timer
   * expires.
   * @param {number} delay The time, in milliseconds that the timer should wait
   * before the specified function or code is executed.
   * @param {*} arg
   */
  constructor (callback, delay, arg) {
    this._onTimeout = callback
    this._idleTimeout = delay
    this._timerArg = arg

    this.refresh()
  }

  /**
   * Sets the timer's start time to the current time, and reschedules the timer
   * to call its callback at the previously specified duration adjusted to the
   * current time.
   * Using this on a timer that has already called its callback will reactivate
   * the timer.
   *
   * @returns {void}
   */
  refresh () {
    // In the special case that the timer is not in the list of active timers,
    // add it back to the array to be processed in the next tick by the onTick
    // function.
    if (this._state === NOT_IN_LIST) {
      fastTimers.push(this)
    }

    // If the timer is the only active timer, refresh the fastNowTimeout for
    // better resolution.
    if (!fastNowTimeout || fastTimers.length === 1) {
      refreshTimeout()
    }

    // Setting the state to PENDING will cause the timer to be reset in the
    // next tick by the onTick function.
    this._state = PENDING
  }

  /**
   * The `clear` method cancels the timer, preventing it from executing.
   *
   * @returns {void}
   * @private
   */
  clear () {
    // Set the state to TO_BE_CLEARED to mark the timer for removal in the next
    // tick by the onTick function.
    this._state = TO_BE_CLEARED

    // Reset the _idleStart value to -1 to indicate that the timer is no longer
    // active.
    this._idleStart = -1
  }
}

/**
 * This module exports a setTimeout and clearTimeout function that can be
 * used as a drop-in replacement for the native functions.
 */
module.exports = {
  /**
   * The setTimeout() method sets a timer which executes a function once the
   * timer expires.
   * @param {Function} callback A function to be executed after the timer
   * expires.
   * @param {number} delay The time, in milliseconds that the timer should
   * wait before the specified function or code is executed.
   * @param {*} [arg] An optional argument to be passed to the callback function
   * when the timer expires.
   * @returns {NodeJS.Timeout|FastTimer}
   */
  setTimeout (callback, delay, arg) {
    // If the delay is less than or equal to the RESOLUTION_MS value return a
    // native Node.js Timer instance.
    return delay <= RESOLUTION_MS
      ? setTimeout(callback, delay, arg)
      : new FastTimer(callback, delay, arg)
  },
  /**
   * The clearTimeout method cancels an instantiated Timer previously created
   * by calling setTimeout.
   *
   * @param {NodeJS.Timeout|FastTimer} timeout
   */
  clearTimeout (timeout) {
    // If the timeout is a FastTimer, call its own clear method.
    if (timeout[kFastTimer]) {
      /**
       * @type {FastTimer}
       */
      timeout.clear()
      // Otherwise it is an instance of a native NodeJS.Timeout, so call the
      // Node.js native clearTimeout function.
    } else {
      clearTimeout(timeout)
    }
  },
  /**
   * The setFastTimeout() method sets a fastTimer which executes a function once
   * the timer expires.
   * @param {Function} callback A function to be executed after the timer
   * expires.
   * @param {number} delay The time, in milliseconds that the timer should
   * wait before the specified function or code is executed.
   * @param {*} [arg] An optional argument to be passed to the callback function
   * when the timer expires.
   * @returns {FastTimer}
   */
  setFastTimeout (callback, delay, arg) {
    return new FastTimer(callback, delay, arg)
  },
  /**
   * The clearTimeout method cancels an instantiated FastTimer previously
   * created by calling setFastTimeout.
   *
   * @param {FastTimer} timeout
   */
  clearFastTimeout (timeout) {
    timeout.clear()
  },
  /**
   * The now method returns the value of the internal fast timer clock.
   *
   * @returns {number}
   */
  now () {
    return fastNow
  },
  /**
   * Trigger the onTick function to process the fastTimers array.
   * Exported for testing purposes only.
   * Marking as deprecated to discourage any use outside of testing.
   * @deprecated
   * @param {number} [delay=0] The delay in milliseconds to add to the now value.
   */
  tick (delay = 0) {
    fastNow += delay - RESOLUTION_MS + 1
    onTick()
    onTick()
  },
  /**
   * Reset FastTimers.
   * Exported for testing purposes only.
   * Marking as deprecated to discourage any use outside of testing.
   * @deprecated
   */
  reset () {
    fastNow = 0
    fastTimers.length = 0
    clearTimeout(fastNowTimeout)
    fastNowTimeout = null
  },
  /**
   * Exporting for testing purposes only.
   * Marking as deprecated to discourage any use outside of testing.
   * @deprecated
   */
  kFastTimer
}
