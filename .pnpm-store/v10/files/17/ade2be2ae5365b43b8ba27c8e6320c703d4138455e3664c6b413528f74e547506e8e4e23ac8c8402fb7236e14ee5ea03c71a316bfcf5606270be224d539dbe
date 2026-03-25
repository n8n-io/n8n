import {
  YText, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Item, StructStore, Transaction // eslint-disable-line
} from '../internals.js'

import * as error from 'lib0/error'

/**
 * @private
 */
export class ContentFormat {
  /**
   * @param {string} key
   * @param {Object} value
   */
  constructor (key, value) {
    this.key = key
    this.value = value
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
    return []
  }

  /**
   * @return {boolean}
   */
  isCountable () {
    return false
  }

  /**
   * @return {ContentFormat}
   */
  copy () {
    return new ContentFormat(this.key, this.value)
  }

  /**
   * @param {number} _offset
   * @return {ContentFormat}
   */
  splice (_offset) {
    throw error.methodUnimplemented()
  }

  /**
   * @param {ContentFormat} _right
   * @return {boolean}
   */
  mergeWith (_right) {
    return false
  }

  /**
   * @param {Transaction} _transaction
   * @param {Item} item
   */
  integrate (_transaction, item) {
    // @todo searchmarker are currently unsupported for rich text documents
    const p = /** @type {YText} */ (item.parent)
    p._searchMarker = null
    p._hasFormatting = true
  }

  /**
   * @param {Transaction} transaction
   */
  delete (transaction) {}
  /**
   * @param {StructStore} store
   */
  gc (store) {}
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write (encoder, offset) {
    encoder.writeKey(this.key)
    encoder.writeJSON(this.value)
  }

  /**
   * @return {number}
   */
  getRef () {
    return 6
  }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {ContentFormat}
 */
export const readContentFormat = decoder => new ContentFormat(decoder.readKey(), decoder.readJSON())
