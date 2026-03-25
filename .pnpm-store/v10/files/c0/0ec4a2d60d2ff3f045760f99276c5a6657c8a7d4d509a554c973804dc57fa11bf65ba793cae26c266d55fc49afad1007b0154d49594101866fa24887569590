import {
  UpdateEncoderV1, UpdateEncoderV2, ID, Transaction // eslint-disable-line
} from '../internals.js'

import * as error from 'lib0/error'

export class AbstractStruct {
  /**
   * @param {ID} id
   * @param {number} length
   */
  constructor (id, length) {
    this.id = id
    this.length = length
  }

  /**
   * @type {boolean}
   */
  get deleted () {
    throw error.methodUnimplemented()
  }

  /**
   * Merge this struct with the item to the right.
   * This method is already assuming that `this.id.clock + this.length === this.id.clock`.
   * Also this method does *not* remove right from StructStore!
   * @param {AbstractStruct} right
   * @return {boolean} whether this merged with right
   */
  mergeWith (right) {
    return false
  }

  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
   * @param {number} offset
   * @param {number} encodingRef
   */
  write (encoder, offset, encodingRef) {
    throw error.methodUnimplemented()
  }

  /**
   * @param {Transaction} transaction
   * @param {number} offset
   */
  integrate (transaction, offset) {
    throw error.methodUnimplemented()
  }
}
