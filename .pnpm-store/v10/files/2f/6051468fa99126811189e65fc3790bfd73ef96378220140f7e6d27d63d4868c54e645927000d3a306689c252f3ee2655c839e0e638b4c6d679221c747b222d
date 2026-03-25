import {
  mergeDeleteSets,
  iterateDeletedStructs,
  keepItem,
  transact,
  createID,
  redoItem,
  isParentOf,
  followRedone,
  getItemCleanStart,
  isDeleted,
  addToDeleteSet,
  YEvent, Transaction, Doc, Item, GC, DeleteSet, AbstractType // eslint-disable-line
} from '../internals.js'

import * as time from 'lib0/time'
import * as array from 'lib0/array'
import * as logging from 'lib0/logging'
import { ObservableV2 } from 'lib0/observable'

export class StackItem {
  /**
   * @param {DeleteSet} deletions
   * @param {DeleteSet} insertions
   */
  constructor (deletions, insertions) {
    this.insertions = insertions
    this.deletions = deletions
    /**
     * Use this to save and restore metadata like selection range
     */
    this.meta = new Map()
  }
}
/**
 * @param {Transaction} tr
 * @param {UndoManager} um
 * @param {StackItem} stackItem
 */
const clearUndoManagerStackItem = (tr, um, stackItem) => {
  iterateDeletedStructs(tr, stackItem.deletions, item => {
    if (item instanceof Item && um.scope.some(type => type === tr.doc || isParentOf(/** @type {AbstractType<any>} */ (type), item))) {
      keepItem(item, false)
    }
  })
}

/**
 * @param {UndoManager} undoManager
 * @param {Array<StackItem>} stack
 * @param {'undo'|'redo'} eventType
 * @return {StackItem?}
 */
const popStackItem = (undoManager, stack, eventType) => {
  /**
   * Keep a reference to the transaction so we can fire the event with the changedParentTypes
   * @type {any}
   */
  let _tr = null
  const doc = undoManager.doc
  const scope = undoManager.scope
  transact(doc, transaction => {
    while (stack.length > 0 && undoManager.currStackItem === null) {
      const store = doc.store
      const stackItem = /** @type {StackItem} */ (stack.pop())
      /**
       * @type {Set<Item>}
       */
      const itemsToRedo = new Set()
      /**
       * @type {Array<Item>}
       */
      const itemsToDelete = []
      let performedChange = false
      iterateDeletedStructs(transaction, stackItem.insertions, struct => {
        if (struct instanceof Item) {
          if (struct.redone !== null) {
            let { item, diff } = followRedone(store, struct.id)
            if (diff > 0) {
              item = getItemCleanStart(transaction, createID(item.id.client, item.id.clock + diff))
            }
            struct = item
          }
          if (!struct.deleted && scope.some(type => type === transaction.doc || isParentOf(/** @type {AbstractType<any>} */ (type), /** @type {Item} */ (struct)))) {
            itemsToDelete.push(struct)
          }
        }
      })
      iterateDeletedStructs(transaction, stackItem.deletions, struct => {
        if (
          struct instanceof Item &&
          scope.some(type => type === transaction.doc || isParentOf(/** @type {AbstractType<any>} */ (type), struct)) &&
          // Never redo structs in stackItem.insertions because they were created and deleted in the same capture interval.
          !isDeleted(stackItem.insertions, struct.id)
        ) {
          itemsToRedo.add(struct)
        }
      })
      itemsToRedo.forEach(struct => {
        performedChange = redoItem(transaction, struct, itemsToRedo, stackItem.insertions, undoManager.ignoreRemoteMapChanges, undoManager) !== null || performedChange
      })
      // We want to delete in reverse order so that children are deleted before
      // parents, so we have more information available when items are filtered.
      for (let i = itemsToDelete.length - 1; i >= 0; i--) {
        const item = itemsToDelete[i]
        if (undoManager.deleteFilter(item)) {
          item.delete(transaction)
          performedChange = true
        }
      }
      undoManager.currStackItem = performedChange ? stackItem : null
    }
    transaction.changed.forEach((subProps, type) => {
      // destroy search marker if necessary
      if (subProps.has(null) && type._searchMarker) {
        type._searchMarker.length = 0
      }
    })
    _tr = transaction
  }, undoManager)
  const res = undoManager.currStackItem
  if (res != null) {
    const changedParentTypes = _tr.changedParentTypes
    undoManager.emit('stack-item-popped', [{ stackItem: res, type: eventType, changedParentTypes, origin: undoManager }, undoManager])
    undoManager.currStackItem = null
  }
  return res
}

/**
 * @typedef {Object} UndoManagerOptions
 * @property {number} [UndoManagerOptions.captureTimeout=500]
 * @property {function(Transaction):boolean} [UndoManagerOptions.captureTransaction] Do not capture changes of a Transaction if result false.
 * @property {function(Item):boolean} [UndoManagerOptions.deleteFilter=()=>true] Sometimes
 * it is necessary to filter what an Undo/Redo operation can delete. If this
 * filter returns false, the type/item won't be deleted even it is in the
 * undo/redo scope.
 * @property {Set<any>} [UndoManagerOptions.trackedOrigins=new Set([null])]
 * @property {boolean} [ignoreRemoteMapChanges] Experimental. By default, the UndoManager will never overwrite remote changes. Enable this property to enable overwriting remote changes on key-value changes (Y.Map, properties on Y.Xml, etc..).
 * @property {Doc} [doc] The document that this UndoManager operates on. Only needed if typeScope is empty.
 */

/**
 * @typedef {Object} StackItemEvent
 * @property {StackItem} StackItemEvent.stackItem
 * @property {any} StackItemEvent.origin
 * @property {'undo'|'redo'} StackItemEvent.type
 * @property {Map<AbstractType<YEvent<any>>,Array<YEvent<any>>>} StackItemEvent.changedParentTypes
 */

/**
 * Fires 'stack-item-added' event when a stack item was added to either the undo- or
 * the redo-stack. You may store additional stack information via the
 * metadata property on `event.stackItem.meta` (it is a `Map` of metadata properties).
 * Fires 'stack-item-popped' event when a stack item was popped from either the
 * undo- or the redo-stack. You may restore the saved stack information from `event.stackItem.meta`.
 *
 * @extends {ObservableV2<{'stack-item-added':function(StackItemEvent, UndoManager):void, 'stack-item-popped': function(StackItemEvent, UndoManager):void, 'stack-cleared': function({ undoStackCleared: boolean, redoStackCleared: boolean }):void, 'stack-item-updated': function(StackItemEvent, UndoManager):void }>}
 */
export class UndoManager extends ObservableV2 {
  /**
   * @param {Doc|AbstractType<any>|Array<AbstractType<any>>} typeScope Limits the scope of the UndoManager. If this is set to a ydoc instance, all changes on that ydoc will be undone. If set to a specific type, only changes on that type or its children will be undone. Also accepts an array of types.
   * @param {UndoManagerOptions} options
   */
  constructor (typeScope, {
    captureTimeout = 500,
    captureTransaction = _tr => true,
    deleteFilter = () => true,
    trackedOrigins = new Set([null]),
    ignoreRemoteMapChanges = false,
    doc = /** @type {Doc} */ (array.isArray(typeScope) ? typeScope[0].doc : typeScope instanceof Doc ? typeScope : typeScope.doc)
  } = {}) {
    super()
    /**
     * @type {Array<AbstractType<any> | Doc>}
     */
    this.scope = []
    this.doc = doc
    this.addToScope(typeScope)
    this.deleteFilter = deleteFilter
    trackedOrigins.add(this)
    this.trackedOrigins = trackedOrigins
    this.captureTransaction = captureTransaction
    /**
     * @type {Array<StackItem>}
     */
    this.undoStack = []
    /**
     * @type {Array<StackItem>}
     */
    this.redoStack = []
    /**
     * Whether the client is currently undoing (calling UndoManager.undo)
     *
     * @type {boolean}
     */
    this.undoing = false
    this.redoing = false
    /**
     * The currently popped stack item if UndoManager.undoing or UndoManager.redoing
     *
     * @type {StackItem|null}
     */
    this.currStackItem = null
    this.lastChange = 0
    this.ignoreRemoteMapChanges = ignoreRemoteMapChanges
    this.captureTimeout = captureTimeout
    /**
     * @param {Transaction} transaction
     */
    this.afterTransactionHandler = transaction => {
      // Only track certain transactions
      if (
        !this.captureTransaction(transaction) ||
        !this.scope.some(type => transaction.changedParentTypes.has(/** @type {AbstractType<any>} */ (type)) || type === this.doc) ||
        (!this.trackedOrigins.has(transaction.origin) && (!transaction.origin || !this.trackedOrigins.has(transaction.origin.constructor)))
      ) {
        return
      }
      const undoing = this.undoing
      const redoing = this.redoing
      const stack = undoing ? this.redoStack : this.undoStack
      if (undoing) {
        this.stopCapturing() // next undo should not be appended to last stack item
      } else if (!redoing) {
        // neither undoing nor redoing: delete redoStack
        this.clear(false, true)
      }
      const insertions = new DeleteSet()
      transaction.afterState.forEach((endClock, client) => {
        const startClock = transaction.beforeState.get(client) || 0
        const len = endClock - startClock
        if (len > 0) {
          addToDeleteSet(insertions, client, startClock, len)
        }
      })
      const now = time.getUnixTime()
      let didAdd = false
      if (this.lastChange > 0 && now - this.lastChange < this.captureTimeout && stack.length > 0 && !undoing && !redoing) {
        // append change to last stack op
        const lastOp = stack[stack.length - 1]
        lastOp.deletions = mergeDeleteSets([lastOp.deletions, transaction.deleteSet])
        lastOp.insertions = mergeDeleteSets([lastOp.insertions, insertions])
      } else {
        // create a new stack op
        stack.push(new StackItem(transaction.deleteSet, insertions))
        didAdd = true
      }
      if (!undoing && !redoing) {
        this.lastChange = now
      }
      // make sure that deleted structs are not gc'd
      iterateDeletedStructs(transaction, transaction.deleteSet, /** @param {Item|GC} item */ item => {
        if (item instanceof Item && this.scope.some(type => type === transaction.doc || isParentOf(/** @type {AbstractType<any>} */ (type), item))) {
          keepItem(item, true)
        }
      })
      /**
       * @type {[StackItemEvent, UndoManager]}
       */
      const changeEvent = [{ stackItem: stack[stack.length - 1], origin: transaction.origin, type: undoing ? 'redo' : 'undo', changedParentTypes: transaction.changedParentTypes }, this]
      if (didAdd) {
        this.emit('stack-item-added', changeEvent)
      } else {
        this.emit('stack-item-updated', changeEvent)
      }
    }
    this.doc.on('afterTransaction', this.afterTransactionHandler)
    this.doc.on('destroy', () => {
      this.destroy()
    })
  }

  /**
   * Extend the scope.
   *
   * @param {Array<AbstractType<any> | Doc> | AbstractType<any> | Doc} ytypes
   */
  addToScope (ytypes) {
    const tmpSet = new Set(this.scope)
    ytypes = array.isArray(ytypes) ? ytypes : [ytypes]
    ytypes.forEach(ytype => {
      if (!tmpSet.has(ytype)) {
        tmpSet.add(ytype)
        if (ytype instanceof AbstractType ? ytype.doc !== this.doc : ytype !== this.doc) logging.warn('[yjs#509] Not same Y.Doc') // use MultiDocUndoManager instead. also see https://github.com/yjs/yjs/issues/509
        this.scope.push(ytype)
      }
    })
  }

  /**
   * @param {any} origin
   */
  addTrackedOrigin (origin) {
    this.trackedOrigins.add(origin)
  }

  /**
   * @param {any} origin
   */
  removeTrackedOrigin (origin) {
    this.trackedOrigins.delete(origin)
  }

  clear (clearUndoStack = true, clearRedoStack = true) {
    if ((clearUndoStack && this.canUndo()) || (clearRedoStack && this.canRedo())) {
      this.doc.transact(tr => {
        if (clearUndoStack) {
          this.undoStack.forEach(item => clearUndoManagerStackItem(tr, this, item))
          this.undoStack = []
        }
        if (clearRedoStack) {
          this.redoStack.forEach(item => clearUndoManagerStackItem(tr, this, item))
          this.redoStack = []
        }
        this.emit('stack-cleared', [{ undoStackCleared: clearUndoStack, redoStackCleared: clearRedoStack }])
      })
    }
  }

  /**
   * UndoManager merges Undo-StackItem if they are created within time-gap
   * smaller than `options.captureTimeout`. Call `um.stopCapturing()` so that the next
   * StackItem won't be merged.
   *
   *
   * @example
   *     // without stopCapturing
   *     ytext.insert(0, 'a')
   *     ytext.insert(1, 'b')
   *     um.undo()
   *     ytext.toString() // => '' (note that 'ab' was removed)
   *     // with stopCapturing
   *     ytext.insert(0, 'a')
   *     um.stopCapturing()
   *     ytext.insert(0, 'b')
   *     um.undo()
   *     ytext.toString() // => 'a' (note that only 'b' was removed)
   *
   */
  stopCapturing () {
    this.lastChange = 0
  }

  /**
   * Undo last changes on type.
   *
   * @return {StackItem?} Returns StackItem if a change was applied
   */
  undo () {
    this.undoing = true
    let res
    try {
      res = popStackItem(this, this.undoStack, 'undo')
    } finally {
      this.undoing = false
    }
    return res
  }

  /**
   * Redo last undo operation.
   *
   * @return {StackItem?} Returns StackItem if a change was applied
   */
  redo () {
    this.redoing = true
    let res
    try {
      res = popStackItem(this, this.redoStack, 'redo')
    } finally {
      this.redoing = false
    }
    return res
  }

  /**
   * Are undo steps available?
   *
   * @return {boolean} `true` if undo is possible
   */
  canUndo () {
    return this.undoStack.length > 0
  }

  /**
   * Are redo steps available?
   *
   * @return {boolean} `true` if redo is possible
   */
  canRedo () {
    return this.redoStack.length > 0
  }

  destroy () {
    this.trackedOrigins.delete(this)
    this.doc.off('afterTransaction', this.afterTransactionHandler)
    super.destroy()
  }
}
