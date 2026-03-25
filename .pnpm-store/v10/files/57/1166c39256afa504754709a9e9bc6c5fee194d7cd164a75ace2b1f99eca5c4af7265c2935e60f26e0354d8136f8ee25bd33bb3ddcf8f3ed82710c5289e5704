/**
 * @module YMap
 */

import {
  YEvent,
  AbstractType,
  typeMapDelete,
  typeMapSet,
  typeMapGet,
  typeMapHas,
  createMapIterator,
  YMapRefID,
  callTypeObservers,
  transact,
  warnPrematureAccess,
  UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Doc, Transaction, Item // eslint-disable-line
} from '../internals.js'

import * as iterator from 'lib0/iterator'

/**
 * @template T
 * @extends YEvent<YMap<T>>
 * Event that describes the changes on a YMap.
 */
export class YMapEvent extends YEvent {
  /**
   * @param {YMap<T>} ymap The YArray that changed.
   * @param {Transaction} transaction
   * @param {Set<any>} subs The keys that changed.
   */
  constructor (ymap, transaction, subs) {
    super(ymap, transaction)
    this.keysChanged = subs
  }
}

/**
 * @template MapType
 * A shared Map implementation.
 *
 * @extends AbstractType<YMapEvent<MapType>>
 * @implements {Iterable<[string, MapType]>}
 */
export class YMap extends AbstractType {
  /**
   *
   * @param {Iterable<readonly [string, any]>=} entries - an optional iterable to initialize the YMap
   */
  constructor (entries) {
    super()
    /**
     * @type {Map<string,any>?}
     * @private
     */
    this._prelimContent = null

    if (entries === undefined) {
      this._prelimContent = new Map()
    } else {
      this._prelimContent = new Map(entries)
    }
  }

  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Doc} y The Yjs instance
   * @param {Item} item
   */
  _integrate (y, item) {
    super._integrate(y, item)
    ;/** @type {Map<string, any>} */ (this._prelimContent).forEach((value, key) => {
      this.set(key, value)
    })
    this._prelimContent = null
  }

  /**
   * @return {YMap<MapType>}
   */
  _copy () {
    return new YMap()
  }

  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YMap<MapType>}
   */
  clone () {
    /**
     * @type {YMap<MapType>}
     */
    const map = new YMap()
    this.forEach((value, key) => {
      map.set(key, value instanceof AbstractType ? /** @type {typeof value} */ (value.clone()) : value)
    })
    return map
  }

  /**
   * Creates YMapEvent and calls observers.
   *
   * @param {Transaction} transaction
   * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
   */
  _callObserver (transaction, parentSubs) {
    callTypeObservers(this, transaction, new YMapEvent(this, transaction, parentSubs))
  }

  /**
   * Transforms this Shared Type to a JSON object.
   *
   * @return {Object<string,any>}
   */
  toJSON () {
    this.doc ?? warnPrematureAccess()
    /**
     * @type {Object<string,MapType>}
     */
    const map = {}
    this._map.forEach((item, key) => {
      if (!item.deleted) {
        const v = item.content.getContent()[item.length - 1]
        map[key] = v instanceof AbstractType ? v.toJSON() : v
      }
    })
    return map
  }

  /**
   * Returns the size of the YMap (count of key/value pairs)
   *
   * @return {number}
   */
  get size () {
    return [...createMapIterator(this)].length
  }

  /**
   * Returns the keys for each element in the YMap Type.
   *
   * @return {IterableIterator<string>}
   */
  keys () {
    return iterator.iteratorMap(createMapIterator(this), /** @param {any} v */ v => v[0])
  }

  /**
   * Returns the values for each element in the YMap Type.
   *
   * @return {IterableIterator<MapType>}
   */
  values () {
    return iterator.iteratorMap(createMapIterator(this), /** @param {any} v */ v => v[1].content.getContent()[v[1].length - 1])
  }

  /**
   * Returns an Iterator of [key, value] pairs
   *
   * @return {IterableIterator<[string, MapType]>}
   */
  entries () {
    return iterator.iteratorMap(createMapIterator(this), /** @param {any} v */ v => /** @type {any} */ ([v[0], v[1].content.getContent()[v[1].length - 1]]))
  }

  /**
   * Executes a provided function on once on every key-value pair.
   *
   * @param {function(MapType,string,YMap<MapType>):void} f A function to execute on every element of this YArray.
   */
  forEach (f) {
    this.doc ?? warnPrematureAccess()
    this._map.forEach((item, key) => {
      if (!item.deleted) {
        f(item.content.getContent()[item.length - 1], key, this)
      }
    })
  }

  /**
   * Returns an Iterator of [key, value] pairs
   *
   * @return {IterableIterator<[string, MapType]>}
   */
  [Symbol.iterator] () {
    return this.entries()
  }

  /**
   * Remove a specified element from this YMap.
   *
   * @param {string} key The key of the element to remove.
   */
  delete (key) {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        typeMapDelete(transaction, this, key)
      })
    } else {
      /** @type {Map<string, any>} */ (this._prelimContent).delete(key)
    }
  }

  /**
   * Adds or updates an element with a specified key and value.
   * @template {MapType} VAL
   *
   * @param {string} key The key of the element to add to this YMap
   * @param {VAL} value The value of the element to add
   * @return {VAL}
   */
  set (key, value) {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        typeMapSet(transaction, this, key, /** @type {any} */ (value))
      })
    } else {
      /** @type {Map<string, any>} */ (this._prelimContent).set(key, value)
    }
    return value
  }

  /**
   * Returns a specified element from this YMap.
   *
   * @param {string} key
   * @return {MapType|undefined}
   */
  get (key) {
    return /** @type {any} */ (typeMapGet(this, key))
  }

  /**
   * Returns a boolean indicating whether the specified key exists or not.
   *
   * @param {string} key The key to test.
   * @return {boolean}
   */
  has (key) {
    return typeMapHas(this, key)
  }

  /**
   * Removes all elements from this YMap.
   */
  clear () {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        this.forEach(function (_value, key, map) {
          typeMapDelete(transaction, map, key)
        })
      })
    } else {
      /** @type {Map<string, any>} */ (this._prelimContent).clear()
    }
  }

  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write (encoder) {
    encoder.writeTypeRef(YMapRefID)
  }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 *
 * @private
 * @function
 */
export const readYMap = _decoder => new YMap()
