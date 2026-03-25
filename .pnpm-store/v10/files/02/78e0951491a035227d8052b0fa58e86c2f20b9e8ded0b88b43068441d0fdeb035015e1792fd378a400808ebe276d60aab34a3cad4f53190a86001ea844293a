import {
  isDeleted,
  Item, AbstractType, Transaction, AbstractStruct // eslint-disable-line
} from '../internals.js'

import * as set from 'lib0/set'
import * as array from 'lib0/array'
import * as error from 'lib0/error'

const errorComputeChanges = 'You must not compute changes after the event-handler fired.'

/**
 * @template {AbstractType<any>} T
 * YEvent describes the changes on a YType.
 */
export class YEvent {
  /**
   * @param {T} target The changed type.
   * @param {Transaction} transaction
   */
  constructor (target, transaction) {
    /**
     * The type on which this event was created on.
     * @type {T}
     */
    this.target = target
    /**
     * The current target on which the observe callback is called.
     * @type {AbstractType<any>}
     */
    this.currentTarget = target
    /**
     * The transaction that triggered this event.
     * @type {Transaction}
     */
    this.transaction = transaction
    /**
     * @type {Object|null}
     */
    this._changes = null
    /**
     * @type {null | Map<string, { action: 'add' | 'update' | 'delete', oldValue: any }>}
     */
    this._keys = null
    /**
     * @type {null | Array<{ insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any> }>}
     */
    this._delta = null
    /**
     * @type {Array<string|number>|null}
     */
    this._path = null
  }

  /**
   * Computes the path from `y` to the changed type.
   *
   * @todo v14 should standardize on path: Array<{parent, index}> because that is easier to work with.
   *
   * The following property holds:
   * @example
   *   let type = y
   *   event.path.forEach(dir => {
   *     type = type.get(dir)
   *   })
   *   type === event.target // => true
   */
  get path () {
    return this._path || (this._path = getPathTo(this.currentTarget, this.target))
  }

  /**
   * Check if a struct is deleted by this event.
   *
   * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
   *
   * @param {AbstractStruct} struct
   * @return {boolean}
   */
  deletes (struct) {
    return isDeleted(this.transaction.deleteSet, struct.id)
  }

  /**
   * @type {Map<string, { action: 'add' | 'update' | 'delete', oldValue: any }>}
   */
  get keys () {
    if (this._keys === null) {
      if (this.transaction.doc._transactionCleanups.length === 0) {
        throw error.create(errorComputeChanges)
      }
      const keys = new Map()
      const target = this.target
      const changed = /** @type Set<string|null> */ (this.transaction.changed.get(target))
      changed.forEach(key => {
        if (key !== null) {
          const item = /** @type {Item} */ (target._map.get(key))
          /**
           * @type {'delete' | 'add' | 'update'}
           */
          let action
          let oldValue
          if (this.adds(item)) {
            let prev = item.left
            while (prev !== null && this.adds(prev)) {
              prev = prev.left
            }
            if (this.deletes(item)) {
              if (prev !== null && this.deletes(prev)) {
                action = 'delete'
                oldValue = array.last(prev.content.getContent())
              } else {
                return
              }
            } else {
              if (prev !== null && this.deletes(prev)) {
                action = 'update'
                oldValue = array.last(prev.content.getContent())
              } else {
                action = 'add'
                oldValue = undefined
              }
            }
          } else {
            if (this.deletes(item)) {
              action = 'delete'
              oldValue = array.last(/** @type {Item} */ item.content.getContent())
            } else {
              return // nop
            }
          }
          keys.set(key, { action, oldValue })
        }
      })
      this._keys = keys
    }
    return this._keys
  }

  /**
   * This is a computed property. Note that this can only be safely computed during the
   * event call. Computing this property after other changes happened might result in
   * unexpected behavior (incorrect computation of deltas). A safe way to collect changes
   * is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
   *
   * @type {Array<{insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any>}>}
   */
  get delta () {
    return this.changes.delta
  }

  /**
   * Check if a struct is added by this event.
   *
   * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
   *
   * @param {AbstractStruct} struct
   * @return {boolean}
   */
  adds (struct) {
    return struct.id.clock >= (this.transaction.beforeState.get(struct.id.client) || 0)
  }

  /**
   * This is a computed property. Note that this can only be safely computed during the
   * event call. Computing this property after other changes happened might result in
   * unexpected behavior (incorrect computation of deltas). A safe way to collect changes
   * is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
   *
   * @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>}}
   */
  get changes () {
    let changes = this._changes
    if (changes === null) {
      if (this.transaction.doc._transactionCleanups.length === 0) {
        throw error.create(errorComputeChanges)
      }
      const target = this.target
      const added = set.create()
      const deleted = set.create()
      /**
       * @type {Array<{insert:Array<any>}|{delete:number}|{retain:number}>}
       */
      const delta = []
      changes = {
        added,
        deleted,
        delta,
        keys: this.keys
      }
      const changed = /** @type Set<string|null> */ (this.transaction.changed.get(target))
      if (changed.has(null)) {
        /**
         * @type {any}
         */
        let lastOp = null
        const packOp = () => {
          if (lastOp) {
            delta.push(lastOp)
          }
        }
        for (let item = target._start; item !== null; item = item.right) {
          if (item.deleted) {
            if (this.deletes(item) && !this.adds(item)) {
              if (lastOp === null || lastOp.delete === undefined) {
                packOp()
                lastOp = { delete: 0 }
              }
              lastOp.delete += item.length
              deleted.add(item)
            } // else nop
          } else {
            if (this.adds(item)) {
              if (lastOp === null || lastOp.insert === undefined) {
                packOp()
                lastOp = { insert: [] }
              }
              lastOp.insert = lastOp.insert.concat(item.content.getContent())
              added.add(item)
            } else {
              if (lastOp === null || lastOp.retain === undefined) {
                packOp()
                lastOp = { retain: 0 }
              }
              lastOp.retain += item.length
            }
          }
        }
        if (lastOp !== null && lastOp.retain === undefined) {
          packOp()
        }
      }
      this._changes = changes
    }
    return /** @type {any} */ (changes)
  }
}

/**
 * Compute the path from this type to the specified target.
 *
 * @example
 *   // `child` should be accessible via `type.get(path[0]).get(path[1])..`
 *   const path = type.getPathTo(child)
 *   // assuming `type instanceof YArray`
 *   console.log(path) // might look like => [2, 'key1']
 *   child === type.get(path[0]).get(path[1])
 *
 * @param {AbstractType<any>} parent
 * @param {AbstractType<any>} child target
 * @return {Array<string|number>} Path to the target
 *
 * @private
 * @function
 */
const getPathTo = (parent, child) => {
  const path = []
  while (child._item !== null && child !== parent) {
    if (child._item.parentSub !== null) {
      // parent is map-ish
      path.unshift(child._item.parentSub)
    } else {
      // parent is array-ish
      let i = 0
      let c = /** @type {AbstractType<any>} */ (child._item.parent)._start
      while (c !== child._item && c !== null) {
        if (!c.deleted && c.countable) {
          i += c.length
        }
        c = c.right
      }
      path.unshift(i)
    }
    child = /** @type {AbstractType<any>} */ (child._item.parent)
  }
  return path
}
