/**
 * @module YText
 */

import {
  YEvent,
  AbstractType,
  getItemCleanStart,
  getState,
  isVisible,
  createID,
  YTextRefID,
  callTypeObservers,
  transact,
  ContentEmbed,
  GC,
  ContentFormat,
  ContentString,
  splitSnapshotAffectedStructs,
  iterateDeletedStructs,
  iterateStructs,
  findMarker,
  typeMapDelete,
  typeMapSet,
  typeMapGet,
  typeMapGetAll,
  updateMarkerChanges,
  ContentType,
  warnPrematureAccess,
  ArraySearchMarker, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, ID, Doc, Item, Snapshot, Transaction // eslint-disable-line
} from '../internals.js'

import * as object from 'lib0/object'
import * as map from 'lib0/map'
import * as error from 'lib0/error'

/**
 * @param {any} a
 * @param {any} b
 * @return {boolean}
 */
const equalAttrs = (a, b) => a === b || (typeof a === 'object' && typeof b === 'object' && a && b && object.equalFlat(a, b))

export class ItemTextListPosition {
  /**
   * @param {Item|null} left
   * @param {Item|null} right
   * @param {number} index
   * @param {Map<string,any>} currentAttributes
   */
  constructor (left, right, index, currentAttributes) {
    this.left = left
    this.right = right
    this.index = index
    this.currentAttributes = currentAttributes
  }

  /**
   * Only call this if you know that this.right is defined
   */
  forward () {
    if (this.right === null) {
      error.unexpectedCase()
    }
    switch (this.right.content.constructor) {
      case ContentFormat:
        if (!this.right.deleted) {
          updateCurrentAttributes(this.currentAttributes, /** @type {ContentFormat} */ (this.right.content))
        }
        break
      default:
        if (!this.right.deleted) {
          this.index += this.right.length
        }
        break
    }
    this.left = this.right
    this.right = this.right.right
  }
}

/**
 * @param {Transaction} transaction
 * @param {ItemTextListPosition} pos
 * @param {number} count steps to move forward
 * @return {ItemTextListPosition}
 *
 * @private
 * @function
 */
const findNextPosition = (transaction, pos, count) => {
  while (pos.right !== null && count > 0) {
    switch (pos.right.content.constructor) {
      case ContentFormat:
        if (!pos.right.deleted) {
          updateCurrentAttributes(pos.currentAttributes, /** @type {ContentFormat} */ (pos.right.content))
        }
        break
      default:
        if (!pos.right.deleted) {
          if (count < pos.right.length) {
            // split right
            getItemCleanStart(transaction, createID(pos.right.id.client, pos.right.id.clock + count))
          }
          pos.index += pos.right.length
          count -= pos.right.length
        }
        break
    }
    pos.left = pos.right
    pos.right = pos.right.right
    // pos.forward() - we don't forward because that would halve the performance because we already do the checks above
  }
  return pos
}

/**
 * @param {Transaction} transaction
 * @param {AbstractType<any>} parent
 * @param {number} index
 * @param {boolean} useSearchMarker
 * @return {ItemTextListPosition}
 *
 * @private
 * @function
 */
const findPosition = (transaction, parent, index, useSearchMarker) => {
  const currentAttributes = new Map()
  const marker = useSearchMarker ? findMarker(parent, index) : null
  if (marker) {
    const pos = new ItemTextListPosition(marker.p.left, marker.p, marker.index, currentAttributes)
    return findNextPosition(transaction, pos, index - marker.index)
  } else {
    const pos = new ItemTextListPosition(null, parent._start, 0, currentAttributes)
    return findNextPosition(transaction, pos, index)
  }
}

/**
 * Negate applied formats
 *
 * @param {Transaction} transaction
 * @param {AbstractType<any>} parent
 * @param {ItemTextListPosition} currPos
 * @param {Map<string,any>} negatedAttributes
 *
 * @private
 * @function
 */
const insertNegatedAttributes = (transaction, parent, currPos, negatedAttributes) => {
  // check if we really need to remove attributes
  while (
    currPos.right !== null && (
      currPos.right.deleted === true || (
        currPos.right.content.constructor === ContentFormat &&
        equalAttrs(negatedAttributes.get(/** @type {ContentFormat} */ (currPos.right.content).key), /** @type {ContentFormat} */ (currPos.right.content).value)
      )
    )
  ) {
    if (!currPos.right.deleted) {
      negatedAttributes.delete(/** @type {ContentFormat} */ (currPos.right.content).key)
    }
    currPos.forward()
  }
  const doc = transaction.doc
  const ownClientId = doc.clientID
  negatedAttributes.forEach((val, key) => {
    const left = currPos.left
    const right = currPos.right
    const nextFormat = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentFormat(key, val))
    nextFormat.integrate(transaction, 0)
    currPos.right = nextFormat
    currPos.forward()
  })
}

/**
 * @param {Map<string,any>} currentAttributes
 * @param {ContentFormat} format
 *
 * @private
 * @function
 */
const updateCurrentAttributes = (currentAttributes, format) => {
  const { key, value } = format
  if (value === null) {
    currentAttributes.delete(key)
  } else {
    currentAttributes.set(key, value)
  }
}

/**
 * @param {ItemTextListPosition} currPos
 * @param {Object<string,any>} attributes
 *
 * @private
 * @function
 */
const minimizeAttributeChanges = (currPos, attributes) => {
  // go right while attributes[right.key] === right.value (or right is deleted)
  while (true) {
    if (currPos.right === null) {
      break
    } else if (currPos.right.deleted || (currPos.right.content.constructor === ContentFormat && equalAttrs(attributes[(/** @type {ContentFormat} */ (currPos.right.content)).key] ?? null, /** @type {ContentFormat} */ (currPos.right.content).value))) {
      //
    } else {
      break
    }
    currPos.forward()
  }
}

/**
 * @param {Transaction} transaction
 * @param {AbstractType<any>} parent
 * @param {ItemTextListPosition} currPos
 * @param {Object<string,any>} attributes
 * @return {Map<string,any>}
 *
 * @private
 * @function
 **/
const insertAttributes = (transaction, parent, currPos, attributes) => {
  const doc = transaction.doc
  const ownClientId = doc.clientID
  const negatedAttributes = new Map()
  // insert format-start items
  for (const key in attributes) {
    const val = attributes[key]
    const currentVal = currPos.currentAttributes.get(key) ?? null
    if (!equalAttrs(currentVal, val)) {
      // save negated attribute (set null if currentVal undefined)
      negatedAttributes.set(key, currentVal)
      const { left, right } = currPos
      currPos.right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentFormat(key, val))
      currPos.right.integrate(transaction, 0)
      currPos.forward()
    }
  }
  return negatedAttributes
}

/**
 * @param {Transaction} transaction
 * @param {AbstractType<any>} parent
 * @param {ItemTextListPosition} currPos
 * @param {string|object|AbstractType<any>} text
 * @param {Object<string,any>} attributes
 *
 * @private
 * @function
 **/
const insertText = (transaction, parent, currPos, text, attributes) => {
  currPos.currentAttributes.forEach((_val, key) => {
    if (attributes[key] === undefined) {
      attributes[key] = null
    }
  })
  const doc = transaction.doc
  const ownClientId = doc.clientID
  minimizeAttributeChanges(currPos, attributes)
  const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes)
  // insert content
  const content = text.constructor === String ? new ContentString(/** @type {string} */ (text)) : (text instanceof AbstractType ? new ContentType(text) : new ContentEmbed(text))
  let { left, right, index } = currPos
  if (parent._searchMarker) {
    updateMarkerChanges(parent._searchMarker, currPos.index, content.getLength())
  }
  right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, content)
  right.integrate(transaction, 0)
  currPos.right = right
  currPos.index = index
  currPos.forward()
  insertNegatedAttributes(transaction, parent, currPos, negatedAttributes)
}

/**
 * @param {Transaction} transaction
 * @param {AbstractType<any>} parent
 * @param {ItemTextListPosition} currPos
 * @param {number} length
 * @param {Object<string,any>} attributes
 *
 * @private
 * @function
 */
const formatText = (transaction, parent, currPos, length, attributes) => {
  const doc = transaction.doc
  const ownClientId = doc.clientID
  minimizeAttributeChanges(currPos, attributes)
  const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes)
  // iterate until first non-format or null is found
  // delete all formats with attributes[format.key] != null
  // also check the attributes after the first non-format as we do not want to insert redundant negated attributes there
  // eslint-disable-next-line no-labels
  iterationLoop: while (
    currPos.right !== null &&
    (length > 0 ||
      (
        negatedAttributes.size > 0 &&
        (currPos.right.deleted || currPos.right.content.constructor === ContentFormat)
      )
    )
  ) {
    if (!currPos.right.deleted) {
      switch (currPos.right.content.constructor) {
        case ContentFormat: {
          const { key, value } = /** @type {ContentFormat} */ (currPos.right.content)
          const attr = attributes[key]
          if (attr !== undefined) {
            if (equalAttrs(attr, value)) {
              negatedAttributes.delete(key)
            } else {
              if (length === 0) {
                // no need to further extend negatedAttributes
                // eslint-disable-next-line no-labels
                break iterationLoop
              }
              negatedAttributes.set(key, value)
            }
            currPos.right.delete(transaction)
          } else {
            currPos.currentAttributes.set(key, value)
          }
          break
        }
        default:
          if (length < currPos.right.length) {
            getItemCleanStart(transaction, createID(currPos.right.id.client, currPos.right.id.clock + length))
          }
          length -= currPos.right.length
          break
      }
    }
    currPos.forward()
  }
  // Quill just assumes that the editor starts with a newline and that it always
  // ends with a newline. We only insert that newline when a new newline is
  // inserted - i.e when length is bigger than type.length
  if (length > 0) {
    let newlines = ''
    for (; length > 0; length--) {
      newlines += '\n'
    }
    currPos.right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), currPos.left, currPos.left && currPos.left.lastId, currPos.right, currPos.right && currPos.right.id, parent, null, new ContentString(newlines))
    currPos.right.integrate(transaction, 0)
    currPos.forward()
  }
  insertNegatedAttributes(transaction, parent, currPos, negatedAttributes)
}

/**
 * Call this function after string content has been deleted in order to
 * clean up formatting Items.
 *
 * @param {Transaction} transaction
 * @param {Item} start
 * @param {Item|null} curr exclusive end, automatically iterates to the next Content Item
 * @param {Map<string,any>} startAttributes
 * @param {Map<string,any>} currAttributes
 * @return {number} The amount of formatting Items deleted.
 *
 * @function
 */
const cleanupFormattingGap = (transaction, start, curr, startAttributes, currAttributes) => {
  /**
   * @type {Item|null}
   */
  let end = start
  /**
   * @type {Map<string,ContentFormat>}
   */
  const endFormats = map.create()
  while (end && (!end.countable || end.deleted)) {
    if (!end.deleted && end.content.constructor === ContentFormat) {
      const cf = /** @type {ContentFormat} */ (end.content)
      endFormats.set(cf.key, cf)
    }
    end = end.right
  }
  let cleanups = 0
  let reachedCurr = false
  while (start !== end) {
    if (curr === start) {
      reachedCurr = true
    }
    if (!start.deleted) {
      const content = start.content
      switch (content.constructor) {
        case ContentFormat: {
          const { key, value } = /** @type {ContentFormat} */ (content)
          const startAttrValue = startAttributes.get(key) ?? null
          if (endFormats.get(key) !== content || startAttrValue === value) {
            // Either this format is overwritten or it is not necessary because the attribute already existed.
            start.delete(transaction)
            cleanups++
            if (!reachedCurr && (currAttributes.get(key) ?? null) === value && startAttrValue !== value) {
              if (startAttrValue === null) {
                currAttributes.delete(key)
              } else {
                currAttributes.set(key, startAttrValue)
              }
            }
          }
          if (!reachedCurr && !start.deleted) {
            updateCurrentAttributes(currAttributes, /** @type {ContentFormat} */ (content))
          }
          break
        }
      }
    }
    start = /** @type {Item} */ (start.right)
  }
  return cleanups
}

/**
 * @param {Transaction} transaction
 * @param {Item | null} item
 */
const cleanupContextlessFormattingGap = (transaction, item) => {
  // iterate until item.right is null or content
  while (item && item.right && (item.right.deleted || !item.right.countable)) {
    item = item.right
  }
  const attrs = new Set()
  // iterate back until a content item is found
  while (item && (item.deleted || !item.countable)) {
    if (!item.deleted && item.content.constructor === ContentFormat) {
      const key = /** @type {ContentFormat} */ (item.content).key
      if (attrs.has(key)) {
        item.delete(transaction)
      } else {
        attrs.add(key)
      }
    }
    item = item.left
  }
}

/**
 * This function is experimental and subject to change / be removed.
 *
 * Ideally, we don't need this function at all. Formatting attributes should be cleaned up
 * automatically after each change. This function iterates twice over the complete YText type
 * and removes unnecessary formatting attributes. This is also helpful for testing.
 *
 * This function won't be exported anymore as soon as there is confidence that the YText type works as intended.
 *
 * @param {YText} type
 * @return {number} How many formatting attributes have been cleaned up.
 */
export const cleanupYTextFormatting = type => {
  let res = 0
  transact(/** @type {Doc} */ (type.doc), transaction => {
    let start = /** @type {Item} */ (type._start)
    let end = type._start
    let startAttributes = map.create()
    const currentAttributes = map.copy(startAttributes)
    while (end) {
      if (end.deleted === false) {
        switch (end.content.constructor) {
          case ContentFormat:
            updateCurrentAttributes(currentAttributes, /** @type {ContentFormat} */ (end.content))
            break
          default:
            res += cleanupFormattingGap(transaction, start, end, startAttributes, currentAttributes)
            startAttributes = map.copy(currentAttributes)
            start = end
            break
        }
      }
      end = end.right
    }
  })
  return res
}

/**
 * This will be called by the transaction once the event handlers are called to potentially cleanup
 * formatting attributes.
 *
 * @param {Transaction} transaction
 */
export const cleanupYTextAfterTransaction = transaction => {
  /**
   * @type {Set<YText>}
   */
  const needFullCleanup = new Set()
  // check if another formatting item was inserted
  const doc = transaction.doc
  for (const [client, afterClock] of transaction.afterState.entries()) {
    const clock = transaction.beforeState.get(client) || 0
    if (afterClock === clock) {
      continue
    }
    iterateStructs(transaction, /** @type {Array<Item|GC>} */ (doc.store.clients.get(client)), clock, afterClock, item => {
      if (
        !item.deleted && /** @type {Item} */ (item).content.constructor === ContentFormat && item.constructor !== GC
      ) {
        needFullCleanup.add(/** @type {any} */ (item).parent)
      }
    })
  }
  // cleanup in a new transaction
  transact(doc, (t) => {
    iterateDeletedStructs(transaction, transaction.deleteSet, item => {
      if (item instanceof GC || !(/** @type {YText} */ (item.parent)._hasFormatting) || needFullCleanup.has(/** @type {YText} */ (item.parent))) {
        return
      }
      const parent = /** @type {YText} */ (item.parent)
      if (item.content.constructor === ContentFormat) {
        needFullCleanup.add(parent)
      } else {
        // If no formatting attribute was inserted or deleted, we can make due with contextless
        // formatting cleanups.
        // Contextless: it is not necessary to compute currentAttributes for the affected position.
        cleanupContextlessFormattingGap(t, item)
      }
    })
    // If a formatting item was inserted, we simply clean the whole type.
    // We need to compute currentAttributes for the current position anyway.
    for (const yText of needFullCleanup) {
      cleanupYTextFormatting(yText)
    }
  })
}

/**
 * @param {Transaction} transaction
 * @param {ItemTextListPosition} currPos
 * @param {number} length
 * @return {ItemTextListPosition}
 *
 * @private
 * @function
 */
const deleteText = (transaction, currPos, length) => {
  const startLength = length
  const startAttrs = map.copy(currPos.currentAttributes)
  const start = currPos.right
  while (length > 0 && currPos.right !== null) {
    if (currPos.right.deleted === false) {
      switch (currPos.right.content.constructor) {
        case ContentType:
        case ContentEmbed:
        case ContentString:
          if (length < currPos.right.length) {
            getItemCleanStart(transaction, createID(currPos.right.id.client, currPos.right.id.clock + length))
          }
          length -= currPos.right.length
          currPos.right.delete(transaction)
          break
      }
    }
    currPos.forward()
  }
  if (start) {
    cleanupFormattingGap(transaction, start, currPos.right, startAttrs, currPos.currentAttributes)
  }
  const parent = /** @type {AbstractType<any>} */ (/** @type {Item} */ (currPos.left || currPos.right).parent)
  if (parent._searchMarker) {
    updateMarkerChanges(parent._searchMarker, currPos.index, -startLength + length)
  }
  return currPos
}

/**
 * The Quill Delta format represents changes on a text document with
 * formatting information. For more information visit {@link https://quilljs.com/docs/delta/|Quill Delta}
 *
 * @example
 *   {
 *     ops: [
 *       { insert: 'Gandalf', attributes: { bold: true } },
 *       { insert: ' the ' },
 *       { insert: 'Grey', attributes: { color: '#cccccc' } }
 *     ]
 *   }
 *
 */

/**
  * Attributes that can be assigned to a selection of text.
  *
  * @example
  *   {
  *     bold: true,
  *     font-size: '40px'
  *   }
  *
  * @typedef {Object} TextAttributes
  */

/**
 * @extends YEvent<YText>
 * Event that describes the changes on a YText type.
 */
export class YTextEvent extends YEvent {
  /**
   * @param {YText} ytext
   * @param {Transaction} transaction
   * @param {Set<any>} subs The keys that changed
   */
  constructor (ytext, transaction, subs) {
    super(ytext, transaction)
    /**
     * Whether the children changed.
     * @type {Boolean}
     * @private
     */
    this.childListChanged = false
    /**
     * Set of all changed attributes.
     * @type {Set<string>}
     */
    this.keysChanged = new Set()
    subs.forEach((sub) => {
      if (sub === null) {
        this.childListChanged = true
      } else {
        this.keysChanged.add(sub)
      }
    })
  }

  /**
   * @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>}}
   */
  get changes () {
    if (this._changes === null) {
      /**
       * @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string|AbstractType<any>|object, delete?:number, retain?:number}>}}
       */
      const changes = {
        keys: this.keys,
        delta: this.delta,
        added: new Set(),
        deleted: new Set()
      }
      this._changes = changes
    }
    return /** @type {any} */ (this._changes)
  }

  /**
   * Compute the changes in the delta format.
   * A {@link https://quilljs.com/docs/delta/|Quill Delta}) that represents the changes on the document.
   *
   * @type {Array<{insert?:string|object|AbstractType<any>, delete?:number, retain?:number, attributes?: Object<string,any>}>}
   *
   * @public
   */
  get delta () {
    if (this._delta === null) {
      const y = /** @type {Doc} */ (this.target.doc)
      /**
       * @type {Array<{insert?:string|object|AbstractType<any>, delete?:number, retain?:number, attributes?: Object<string,any>}>}
       */
      const delta = []
      transact(y, transaction => {
        const currentAttributes = new Map() // saves all current attributes for insert
        const oldAttributes = new Map()
        let item = this.target._start
        /**
         * @type {string?}
         */
        let action = null
        /**
         * @type {Object<string,any>}
         */
        const attributes = {} // counts added or removed new attributes for retain
        /**
         * @type {string|object}
         */
        let insert = ''
        let retain = 0
        let deleteLen = 0
        const addOp = () => {
          if (action !== null) {
            /**
             * @type {any}
             */
            let op = null
            switch (action) {
              case 'delete':
                if (deleteLen > 0) {
                  op = { delete: deleteLen }
                }
                deleteLen = 0
                break
              case 'insert':
                if (typeof insert === 'object' || insert.length > 0) {
                  op = { insert }
                  if (currentAttributes.size > 0) {
                    op.attributes = {}
                    currentAttributes.forEach((value, key) => {
                      if (value !== null) {
                        op.attributes[key] = value
                      }
                    })
                  }
                }
                insert = ''
                break
              case 'retain':
                if (retain > 0) {
                  op = { retain }
                  if (!object.isEmpty(attributes)) {
                    op.attributes = object.assign({}, attributes)
                  }
                }
                retain = 0
                break
            }
            if (op) delta.push(op)
            action = null
          }
        }
        while (item !== null) {
          switch (item.content.constructor) {
            case ContentType:
            case ContentEmbed:
              if (this.adds(item)) {
                if (!this.deletes(item)) {
                  addOp()
                  action = 'insert'
                  insert = item.content.getContent()[0]
                  addOp()
                }
              } else if (this.deletes(item)) {
                if (action !== 'delete') {
                  addOp()
                  action = 'delete'
                }
                deleteLen += 1
              } else if (!item.deleted) {
                if (action !== 'retain') {
                  addOp()
                  action = 'retain'
                }
                retain += 1
              }
              break
            case ContentString:
              if (this.adds(item)) {
                if (!this.deletes(item)) {
                  if (action !== 'insert') {
                    addOp()
                    action = 'insert'
                  }
                  insert += /** @type {ContentString} */ (item.content).str
                }
              } else if (this.deletes(item)) {
                if (action !== 'delete') {
                  addOp()
                  action = 'delete'
                }
                deleteLen += item.length
              } else if (!item.deleted) {
                if (action !== 'retain') {
                  addOp()
                  action = 'retain'
                }
                retain += item.length
              }
              break
            case ContentFormat: {
              const { key, value } = /** @type {ContentFormat} */ (item.content)
              if (this.adds(item)) {
                if (!this.deletes(item)) {
                  const curVal = currentAttributes.get(key) ?? null
                  if (!equalAttrs(curVal, value)) {
                    if (action === 'retain') {
                      addOp()
                    }
                    if (equalAttrs(value, (oldAttributes.get(key) ?? null))) {
                      delete attributes[key]
                    } else {
                      attributes[key] = value
                    }
                  } else if (value !== null) {
                    item.delete(transaction)
                  }
                }
              } else if (this.deletes(item)) {
                oldAttributes.set(key, value)
                const curVal = currentAttributes.get(key) ?? null
                if (!equalAttrs(curVal, value)) {
                  if (action === 'retain') {
                    addOp()
                  }
                  attributes[key] = curVal
                }
              } else if (!item.deleted) {
                oldAttributes.set(key, value)
                const attr = attributes[key]
                if (attr !== undefined) {
                  if (!equalAttrs(attr, value)) {
                    if (action === 'retain') {
                      addOp()
                    }
                    if (value === null) {
                      delete attributes[key]
                    } else {
                      attributes[key] = value
                    }
                  } else if (attr !== null) { // this will be cleaned up automatically by the contextless cleanup function
                    item.delete(transaction)
                  }
                }
              }
              if (!item.deleted) {
                if (action === 'insert') {
                  addOp()
                }
                updateCurrentAttributes(currentAttributes, /** @type {ContentFormat} */ (item.content))
              }
              break
            }
          }
          item = item.right
        }
        addOp()
        while (delta.length > 0) {
          const lastOp = delta[delta.length - 1]
          if (lastOp.retain !== undefined && lastOp.attributes === undefined) {
            // retain delta's if they don't assign attributes
            delta.pop()
          } else {
            break
          }
        }
      })
      this._delta = delta
    }
    return /** @type {any} */ (this._delta)
  }
}

/**
 * Type that represents text with formatting information.
 *
 * This type replaces y-richtext as this implementation is able to handle
 * block formats (format information on a paragraph), embeds (complex elements
 * like pictures and videos), and text formats (**bold**, *italic*).
 *
 * @extends AbstractType<YTextEvent>
 */
export class YText extends AbstractType {
  /**
   * @param {String} [string] The initial value of the YText.
   */
  constructor (string) {
    super()
    /**
     * Array of pending operations on this type
     * @type {Array<function():void>?}
     */
    this._pending = string !== undefined ? [() => this.insert(0, string)] : []
    /**
     * @type {Array<ArraySearchMarker>|null}
     */
    this._searchMarker = []
    /**
     * Whether this YText contains formatting attributes.
     * This flag is updated when a formatting item is integrated (see ContentFormat.integrate)
     */
    this._hasFormatting = false
  }

  /**
   * Number of characters of this text type.
   *
   * @type {number}
   */
  get length () {
    this.doc ?? warnPrematureAccess()
    return this._length
  }

  /**
   * @param {Doc} y
   * @param {Item} item
   */
  _integrate (y, item) {
    super._integrate(y, item)
    try {
      /** @type {Array<function>} */ (this._pending).forEach(f => f())
    } catch (e) {
      console.error(e)
    }
    this._pending = null
  }

  _copy () {
    return new YText()
  }

  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YText}
   */
  clone () {
    const text = new YText()
    text.applyDelta(this.toDelta())
    return text
  }

  /**
   * Creates YTextEvent and calls observers.
   *
   * @param {Transaction} transaction
   * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
   */
  _callObserver (transaction, parentSubs) {
    super._callObserver(transaction, parentSubs)
    const event = new YTextEvent(this, transaction, parentSubs)
    callTypeObservers(this, transaction, event)
    // If a remote change happened, we try to cleanup potential formatting duplicates.
    if (!transaction.local && this._hasFormatting) {
      transaction._needFormattingCleanup = true
    }
  }

  /**
   * Returns the unformatted string representation of this YText type.
   *
   * @public
   */
  toString () {
    this.doc ?? warnPrematureAccess()
    let str = ''
    /**
     * @type {Item|null}
     */
    let n = this._start
    while (n !== null) {
      if (!n.deleted && n.countable && n.content.constructor === ContentString) {
        str += /** @type {ContentString} */ (n.content).str
      }
      n = n.right
    }
    return str
  }

  /**
   * Returns the unformatted string representation of this YText type.
   *
   * @return {string}
   * @public
   */
  toJSON () {
    return this.toString()
  }

  /**
   * Apply a {@link Delta} on this shared YText type.
   *
   * @param {Array<any>} delta The changes to apply on this element.
   * @param {object}  opts
   * @param {boolean} [opts.sanitize] Sanitize input delta. Removes ending newlines if set to true.
   *
   *
   * @public
   */
  applyDelta (delta, { sanitize = true } = {}) {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        const currPos = new ItemTextListPosition(null, this._start, 0, new Map())
        for (let i = 0; i < delta.length; i++) {
          const op = delta[i]
          if (op.insert !== undefined) {
            // Quill assumes that the content starts with an empty paragraph.
            // Yjs/Y.Text assumes that it starts empty. We always hide that
            // there is a newline at the end of the content.
            // If we omit this step, clients will see a different number of
            // paragraphs, but nothing bad will happen.
            const ins = (!sanitize && typeof op.insert === 'string' && i === delta.length - 1 && currPos.right === null && op.insert.slice(-1) === '\n') ? op.insert.slice(0, -1) : op.insert
            if (typeof ins !== 'string' || ins.length > 0) {
              insertText(transaction, this, currPos, ins, op.attributes || {})
            }
          } else if (op.retain !== undefined) {
            formatText(transaction, this, currPos, op.retain, op.attributes || {})
          } else if (op.delete !== undefined) {
            deleteText(transaction, currPos, op.delete)
          }
        }
      })
    } else {
      /** @type {Array<function>} */ (this._pending).push(() => this.applyDelta(delta))
    }
  }

  /**
   * Returns the Delta representation of this YText type.
   *
   * @param {Snapshot} [snapshot]
   * @param {Snapshot} [prevSnapshot]
   * @param {function('removed' | 'added', ID):any} [computeYChange]
   * @return {any} The Delta representation of this type.
   *
   * @public
   */
  toDelta (snapshot, prevSnapshot, computeYChange) {
    this.doc ?? warnPrematureAccess()
    /**
     * @type{Array<any>}
     */
    const ops = []
    const currentAttributes = new Map()
    const doc = /** @type {Doc} */ (this.doc)
    let str = ''
    let n = this._start
    function packStr () {
      if (str.length > 0) {
        // pack str with attributes to ops
        /**
         * @type {Object<string,any>}
         */
        const attributes = {}
        let addAttributes = false
        currentAttributes.forEach((value, key) => {
          addAttributes = true
          attributes[key] = value
        })
        /**
         * @type {Object<string,any>}
         */
        const op = { insert: str }
        if (addAttributes) {
          op.attributes = attributes
        }
        ops.push(op)
        str = ''
      }
    }
    const computeDelta = () => {
      while (n !== null) {
        if (isVisible(n, snapshot) || (prevSnapshot !== undefined && isVisible(n, prevSnapshot))) {
          switch (n.content.constructor) {
            case ContentString: {
              const cur = currentAttributes.get('ychange')
              if (snapshot !== undefined && !isVisible(n, snapshot)) {
                if (cur === undefined || cur.user !== n.id.client || cur.type !== 'removed') {
                  packStr()
                  currentAttributes.set('ychange', computeYChange ? computeYChange('removed', n.id) : { type: 'removed' })
                }
              } else if (prevSnapshot !== undefined && !isVisible(n, prevSnapshot)) {
                if (cur === undefined || cur.user !== n.id.client || cur.type !== 'added') {
                  packStr()
                  currentAttributes.set('ychange', computeYChange ? computeYChange('added', n.id) : { type: 'added' })
                }
              } else if (cur !== undefined) {
                packStr()
                currentAttributes.delete('ychange')
              }
              str += /** @type {ContentString} */ (n.content).str
              break
            }
            case ContentType:
            case ContentEmbed: {
              packStr()
              /**
               * @type {Object<string,any>}
               */
              const op = {
                insert: n.content.getContent()[0]
              }
              if (currentAttributes.size > 0) {
                const attrs = /** @type {Object<string,any>} */ ({})
                op.attributes = attrs
                currentAttributes.forEach((value, key) => {
                  attrs[key] = value
                })
              }
              ops.push(op)
              break
            }
            case ContentFormat:
              if (isVisible(n, snapshot)) {
                packStr()
                updateCurrentAttributes(currentAttributes, /** @type {ContentFormat} */ (n.content))
              }
              break
          }
        }
        n = n.right
      }
      packStr()
    }
    if (snapshot || prevSnapshot) {
      // snapshots are merged again after the transaction, so we need to keep the
      // transaction alive until we are done
      transact(doc, transaction => {
        if (snapshot) {
          splitSnapshotAffectedStructs(transaction, snapshot)
        }
        if (prevSnapshot) {
          splitSnapshotAffectedStructs(transaction, prevSnapshot)
        }
        computeDelta()
      }, 'cleanup')
    } else {
      computeDelta()
    }
    return ops
  }

  /**
   * Insert text at a given index.
   *
   * @param {number} index The index at which to start inserting.
   * @param {String} text The text to insert at the specified position.
   * @param {TextAttributes} [attributes] Optionally define some formatting
   *                                    information to apply on the inserted
   *                                    Text.
   * @public
   */
  insert (index, text, attributes) {
    if (text.length <= 0) {
      return
    }
    const y = this.doc
    if (y !== null) {
      transact(y, transaction => {
        const pos = findPosition(transaction, this, index, !attributes)
        if (!attributes) {
          attributes = {}
          // @ts-ignore
          pos.currentAttributes.forEach((v, k) => { attributes[k] = v })
        }
        insertText(transaction, this, pos, text, attributes)
      })
    } else {
      /** @type {Array<function>} */ (this._pending).push(() => this.insert(index, text, attributes))
    }
  }

  /**
   * Inserts an embed at a index.
   *
   * @param {number} index The index to insert the embed at.
   * @param {Object | AbstractType<any>} embed The Object that represents the embed.
   * @param {TextAttributes} [attributes] Attribute information to apply on the
   *                                    embed
   *
   * @public
   */
  insertEmbed (index, embed, attributes) {
    const y = this.doc
    if (y !== null) {
      transact(y, transaction => {
        const pos = findPosition(transaction, this, index, !attributes)
        insertText(transaction, this, pos, embed, attributes || {})
      })
    } else {
      /** @type {Array<function>} */ (this._pending).push(() => this.insertEmbed(index, embed, attributes || {}))
    }
  }

  /**
   * Deletes text starting from an index.
   *
   * @param {number} index Index at which to start deleting.
   * @param {number} length The number of characters to remove. Defaults to 1.
   *
   * @public
   */
  delete (index, length) {
    if (length === 0) {
      return
    }
    const y = this.doc
    if (y !== null) {
      transact(y, transaction => {
        deleteText(transaction, findPosition(transaction, this, index, true), length)
      })
    } else {
      /** @type {Array<function>} */ (this._pending).push(() => this.delete(index, length))
    }
  }

  /**
   * Assigns properties to a range of text.
   *
   * @param {number} index The position where to start formatting.
   * @param {number} length The amount of characters to assign properties to.
   * @param {TextAttributes} attributes Attribute information to apply on the
   *                                    text.
   *
   * @public
   */
  format (index, length, attributes) {
    if (length === 0) {
      return
    }
    const y = this.doc
    if (y !== null) {
      transact(y, transaction => {
        const pos = findPosition(transaction, this, index, false)
        if (pos.right === null) {
          return
        }
        formatText(transaction, this, pos, length, attributes)
      })
    } else {
      /** @type {Array<function>} */ (this._pending).push(() => this.format(index, length, attributes))
    }
  }

  /**
   * Removes an attribute.
   *
   * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
   *
   * @param {String} attributeName The attribute name that is to be removed.
   *
   * @public
   */
  removeAttribute (attributeName) {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        typeMapDelete(transaction, this, attributeName)
      })
    } else {
      /** @type {Array<function>} */ (this._pending).push(() => this.removeAttribute(attributeName))
    }
  }

  /**
   * Sets or updates an attribute.
   *
   * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
   *
   * @param {String} attributeName The attribute name that is to be set.
   * @param {any} attributeValue The attribute value that is to be set.
   *
   * @public
   */
  setAttribute (attributeName, attributeValue) {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        typeMapSet(transaction, this, attributeName, attributeValue)
      })
    } else {
      /** @type {Array<function>} */ (this._pending).push(() => this.setAttribute(attributeName, attributeValue))
    }
  }

  /**
   * Returns an attribute value that belongs to the attribute name.
   *
   * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
   *
   * @param {String} attributeName The attribute name that identifies the
   *                               queried value.
   * @return {any} The queried attribute value.
   *
   * @public
   */
  getAttribute (attributeName) {
    return /** @type {any} */ (typeMapGet(this, attributeName))
  }

  /**
   * Returns all attribute name/value pairs in a JSON Object.
   *
   * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
   *
   * @return {Object<string, any>} A JSON Object that describes the attributes.
   *
   * @public
   */
  getAttributes () {
    return typeMapGetAll(this)
  }

  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write (encoder) {
    encoder.writeTypeRef(YTextRefID)
  }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 * @return {YText}
 *
 * @private
 * @function
 */
export const readYText = _decoder => new YText()
