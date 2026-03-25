import {
  Doc, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, StructStore, Transaction, Item // eslint-disable-line
} from '../internals.js'

import * as error from 'lib0/error'

/**
 * @param {string} guid
 * @param {Object<string, any>} opts
 */
const createDocFromOpts = (guid, opts) => new Doc({ guid, ...opts, shouldLoad: opts.shouldLoad || opts.autoLoad || false })

/**
 * @private
 */
export class ContentDoc {
  /**
   * @param {Doc} doc
   */
  constructor (doc) {
    if (doc._item) {
      console.error('This document was already integrated as a sub-document. You should create a second instance instead with the same guid.')
    }
    /**
     * @type {Doc}
     */
    this.doc = doc
    /**
     * @type {any}
     */
    const opts = {}
    this.opts = opts
    if (!doc.gc) {
      opts.gc = false
    }
    if (doc.autoLoad) {
      opts.autoLoad = true
    }
    if (doc.meta !== null) {
      opts.meta = doc.meta
    }
  }

  /**
   * @return {number}
   */
  getLength () {
    return 1
  }

  /**
   * @return {Array<any>}
   */
  getContent () {
    return [this.doc]
  }

  /**
   * @return {boolean}
   */
  isCountable () {
    return true
  }

  /**
   * @return {ContentDoc}
   */
  copy () {
    return new ContentDoc(createDocFromOpts(this.doc.guid, this.opts))
  }

  /**
   * @param {number} offset
   * @return {ContentDoc}
   */
  splice (offset) {
    throw error.methodUnimplemented()
  }

  /**
   * @param {ContentDoc} right
   * @return {boolean}
   */
  mergeWith (right) {
    return false
  }

  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate (transaction, item) {
    // this needs to be reflected in doc.destroy as well
    this.doc._item = item
    transaction.subdocsAdded.add(this.doc)
    if (this.doc.shouldLoad) {
      transaction.subdocsLoaded.add(this.doc)
    }
  }

  /**
   * @param {Transaction} transaction
   */
  delete (transaction) {
    if (transaction.subdocsAdded.has(this.doc)) {
      transaction.subdocsAdded.delete(this.doc)
    } else {
      transaction.subdocsRemoved.add(this.doc)
    }
  }

  /**
   * @param {StructStore} store
   */
  gc (store) { }

  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write (encoder, offset) {
    encoder.writeString(this.doc.guid)
    encoder.writeAny(this.opts)
  }

  /**
   * @return {number}
   */
  getRef () {
    return 9
  }
}

/**
 * @private
 *
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {ContentDoc}
 */
export const readContentDoc = decoder => new ContentDoc(createDocFromOpts(decoder.readString(), decoder.readAny()))
