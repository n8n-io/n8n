import {
  UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Transaction, Item, StructStore // eslint-disable-line
} from '../internals.js'

/**
 * @private
 */
export class ContentJSON {
  /**
   * @param {Array<any>} arr
   */
  constructor (arr) {
    /**
     * @type {Array<any>}
     */
    this.arr = arr
  }

  /**
   * @return {number}
   */
  getLength () {
    return this.arr.length
  }

  /**
   * @return {Array<any>}
   */
  getContent () {
    return this.arr
  }

  /**
   * @return {boolean}
   */
  isCountable () {
    return true
  }

  /**
   * @return {ContentJSON}
   */
  copy () {
    return new ContentJSON(this.arr)
  }

  /**
   * @param {number} offset
   * @return {ContentJSON}
   */
  splice (offset) {
    const right = new ContentJSON(this.arr.slice(offset))
    this.arr = this.arr.slice(0, offset)
    return right
  }

  /**
   * @param {ContentJSON} right
   * @return {boolean}
   */
  mergeWith (right) {
    this.arr = this.arr.concat(right.arr)
    return true
  }

  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate (transaction, item) {}
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
    const len = this.arr.length
    encoder.writeLen(len - offset)
    for (let i = offset; i < len; i++) {
      const c = this.arr[i]
      encoder.writeString(c === undefined ? 'undefined' : JSON.stringify(c))
    }
  }

  /**
   * @return {number}
   */
  getRef () {
    return 2
  }
}

/**
 * @private
 *
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {ContentJSON}
 */
export const readContentJSON = decoder => {
  const len = decoder.readLen()
  const cs = []
  for (let i = 0; i < len; i++) {
    const c = decoder.readString()
    if (c === 'undefined') {
      cs.push(undefined)
    } else {
      cs.push(JSON.parse(c))
    }
  }
  return new ContentJSON(cs)
}
