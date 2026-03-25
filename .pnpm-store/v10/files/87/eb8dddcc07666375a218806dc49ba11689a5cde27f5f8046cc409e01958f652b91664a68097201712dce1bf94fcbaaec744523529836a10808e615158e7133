import {
  AbstractStruct,
  UpdateEncoderV1, UpdateEncoderV2, StructStore, Transaction, ID // eslint-disable-line
} from '../internals.js'
import * as error from 'lib0/error'
import * as encoding from 'lib0/encoding'

export const structSkipRefNumber = 10

/**
 * @private
 */
export class Skip extends AbstractStruct {
  get deleted () {
    return true
  }

  delete () {}

  /**
   * @param {Skip} right
   * @return {boolean}
   */
  mergeWith (right) {
    if (this.constructor !== right.constructor) {
      return false
    }
    this.length += right.length
    return true
  }

  /**
   * @param {Transaction} transaction
   * @param {number} offset
   */
  integrate (transaction, offset) {
    // skip structs cannot be integrated
    error.unexpectedCase()
  }

  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write (encoder, offset) {
    encoder.writeInfo(structSkipRefNumber)
    // write as VarUint because Skips can't make use of predictable length-encoding
    encoding.writeVarUint(encoder.restEncoder, this.length - offset)
  }

  /**
   * @param {Transaction} transaction
   * @param {StructStore} store
   * @return {null | number}
   */
  getMissing (transaction, store) {
    return null
  }
}
