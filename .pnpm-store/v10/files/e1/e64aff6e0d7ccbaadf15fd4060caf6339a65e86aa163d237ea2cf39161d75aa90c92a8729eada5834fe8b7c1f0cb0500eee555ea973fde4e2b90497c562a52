import { AbstractType } from '../internals.js' // eslint-disable-line

import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as error from 'lib0/error'

export class ID {
  /**
   * @param {number} client client id
   * @param {number} clock unique per client id, continuous number
   */
  constructor (client, clock) {
    /**
     * Client id
     * @type {number}
     */
    this.client = client
    /**
     * unique per client id, continuous number
     * @type {number}
     */
    this.clock = clock
  }
}

/**
 * @param {ID | null} a
 * @param {ID | null} b
 * @return {boolean}
 *
 * @function
 */
export const compareIDs = (a, b) => a === b || (a !== null && b !== null && a.client === b.client && a.clock === b.clock)

/**
 * @param {number} client
 * @param {number} clock
 *
 * @private
 * @function
 */
export const createID = (client, clock) => new ID(client, clock)

/**
 * @param {encoding.Encoder} encoder
 * @param {ID} id
 *
 * @private
 * @function
 */
export const writeID = (encoder, id) => {
  encoding.writeVarUint(encoder, id.client)
  encoding.writeVarUint(encoder, id.clock)
}

/**
 * Read ID.
 * * If first varUint read is 0xFFFFFF a RootID is returned.
 * * Otherwise an ID is returned
 *
 * @param {decoding.Decoder} decoder
 * @return {ID}
 *
 * @private
 * @function
 */
export const readID = decoder =>
  createID(decoding.readVarUint(decoder), decoding.readVarUint(decoder))

/**
 * The top types are mapped from y.share.get(keyname) => type.
 * `type` does not store any information about the `keyname`.
 * This function finds the correct `keyname` for `type` and throws otherwise.
 *
 * @param {AbstractType<any>} type
 * @return {string}
 *
 * @private
 * @function
 */
export const findRootTypeKey = type => {
  // @ts-ignore _y must be defined, otherwise unexpected case
  for (const [key, value] of type.doc.share.entries()) {
    if (value === type) {
      return key
    }
  }
  throw error.unexpectedCase()
}
