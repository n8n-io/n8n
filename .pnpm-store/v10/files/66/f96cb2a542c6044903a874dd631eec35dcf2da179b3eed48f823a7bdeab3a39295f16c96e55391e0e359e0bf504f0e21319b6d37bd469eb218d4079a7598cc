/**
 * Observable class prototype.
 *
 * @module observable
 */

import * as map from './map.js'
import * as set from './set.js'
import * as array from './array.js'

/**
 * Handles named events.
 * @experimental
 *
 * This is basically a (better typed) duplicate of Observable, which will replace Observable in the
 * next release.
 *
 * @template {{[key in keyof EVENTS]: function(...any):void}} EVENTS
 */
export class ObservableV2 {
  constructor () {
    /**
     * Some desc.
     * @type {Map<string, Set<any>>}
     */
    this._observers = map.create()
  }

  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  on (name, f) {
    map.setIfUndefined(this._observers, /** @type {string} */ (name), set.create).add(f)
    return f
  }

  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  once (name, f) {
    /**
     * @param  {...any} args
     */
    const _f = (...args) => {
      this.off(name, /** @type {any} */ (_f))
      f(...args)
    }
    this.on(name, /** @type {any} */ (_f))
  }

  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  off (name, f) {
    const observers = this._observers.get(name)
    if (observers !== undefined) {
      observers.delete(f)
      if (observers.size === 0) {
        this._observers.delete(name)
      }
    }
  }

  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name The event name.
   * @param {Parameters<EVENTS[NAME]>} args The arguments that are applied to the event listener.
   */
  emit (name, args) {
    // copy all listeners to an array first to make sure that no event is emitted to listeners that are subscribed while the event handler is called.
    return array.from((this._observers.get(name) || map.create()).values()).forEach(f => f(...args))
  }

  destroy () {
    this._observers = map.create()
  }
}

/* c8 ignore start */
/**
 * Handles named events.
 *
 * @deprecated
 * @template N
 */
export class Observable {
  constructor () {
    /**
     * Some desc.
     * @type {Map<N, any>}
     */
    this._observers = map.create()
  }

  /**
   * @param {N} name
   * @param {function} f
   */
  on (name, f) {
    map.setIfUndefined(this._observers, name, set.create).add(f)
  }

  /**
   * @param {N} name
   * @param {function} f
   */
  once (name, f) {
    /**
     * @param  {...any} args
     */
    const _f = (...args) => {
      this.off(name, _f)
      f(...args)
    }
    this.on(name, _f)
  }

  /**
   * @param {N} name
   * @param {function} f
   */
  off (name, f) {
    const observers = this._observers.get(name)
    if (observers !== undefined) {
      observers.delete(f)
      if (observers.size === 0) {
        this._observers.delete(name)
      }
    }
  }

  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @param {N} name The event name.
   * @param {Array<any>} args The arguments that are applied to the event listener.
   */
  emit (name, args) {
    // copy all listeners to an array first to make sure that no event is emitted to listeners that are subscribed while the event handler is called.
    return array.from((this._observers.get(name) || map.create()).values()).forEach(f => f(...args))
  }

  destroy () {
    this._observers = map.create()
  }
}
/* c8 ignore end */
