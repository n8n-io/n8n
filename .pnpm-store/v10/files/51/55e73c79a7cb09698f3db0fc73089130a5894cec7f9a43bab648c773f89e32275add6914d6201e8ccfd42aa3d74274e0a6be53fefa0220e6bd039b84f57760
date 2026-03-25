/* eslint-env browser */

/**
 * Helpers for cross-tab communication using broadcastchannel with LocalStorage fallback.
 *
 * ```js
 * // In browser window A:
 * broadcastchannel.subscribe('my events', data => console.log(data))
 * broadcastchannel.publish('my events', 'Hello world!') // => A: 'Hello world!' fires synchronously in same tab
 *
 * // In browser window B:
 * broadcastchannel.publish('my events', 'hello from tab B') // => A: 'hello from tab B'
 * ```
 *
 * @module broadcastchannel
 */

// @todo before next major: use Uint8Array instead as buffer object

import * as map from './map.js'
import * as set from './set.js'
import * as buffer from './buffer.js'
import * as storage from './storage.js'

/**
 * @typedef {Object} Channel
 * @property {Set<function(any, any):any>} Channel.subs
 * @property {any} Channel.bc
 */

/**
 * @type {Map<string, Channel>}
 */
const channels = new Map()

/* c8 ignore start */
class LocalStoragePolyfill {
  /**
   * @param {string} room
   */
  constructor (room) {
    this.room = room
    /**
     * @type {null|function({data:Uint8Array}):void}
     */
    this.onmessage = null
    /**
     * @param {any} e
     */
    this._onChange = e => e.key === room && this.onmessage !== null && this.onmessage({ data: buffer.fromBase64(e.newValue || '') })
    storage.onChange(this._onChange)
  }

  /**
   * @param {ArrayBuffer} buf
   */
  postMessage (buf) {
    storage.varStorage.setItem(this.room, buffer.toBase64(buffer.createUint8ArrayFromArrayBuffer(buf)))
  }

  close () {
    storage.offChange(this._onChange)
  }
}
/* c8 ignore stop */

// Use BroadcastChannel or Polyfill
/* c8 ignore next */
const BC = typeof BroadcastChannel === 'undefined' ? LocalStoragePolyfill : BroadcastChannel

/**
 * @param {string} room
 * @return {Channel}
 */
const getChannel = room =>
  map.setIfUndefined(channels, room, () => {
    const subs = set.create()
    const bc = new BC(room)
    /**
     * @param {{data:ArrayBuffer}} e
     */
    /* c8 ignore next */
    bc.onmessage = e => subs.forEach(sub => sub(e.data, 'broadcastchannel'))
    return {
      bc, subs
    }
  })

/**
 * Subscribe to global `publish` events.
 *
 * @function
 * @param {string} room
 * @param {function(any, any):any} f
 */
export const subscribe = (room, f) => {
  getChannel(room).subs.add(f)
  return f
}

/**
 * Unsubscribe from `publish` global events.
 *
 * @function
 * @param {string} room
 * @param {function(any, any):any} f
 */
export const unsubscribe = (room, f) => {
  const channel = getChannel(room)
  const unsubscribed = channel.subs.delete(f)
  if (unsubscribed && channel.subs.size === 0) {
    channel.bc.close()
    channels.delete(room)
  }
  return unsubscribed
}

/**
 * Publish data to all subscribers (including subscribers on this tab)
 *
 * @function
 * @param {string} room
 * @param {any} data
 * @param {any} [origin]
 */
export const publish = (room, data, origin = null) => {
  const c = getChannel(room)
  c.bc.postMessage(data)
  c.subs.forEach(sub => sub(data, origin))
}
