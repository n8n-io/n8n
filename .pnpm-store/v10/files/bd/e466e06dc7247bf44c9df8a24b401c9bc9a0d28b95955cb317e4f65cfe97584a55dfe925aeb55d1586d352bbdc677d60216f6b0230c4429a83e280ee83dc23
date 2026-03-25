import * as buffer from 'lib0/buffer'
import * as decoding from 'lib0/decoding'
import {
  ID, createID
} from '../internals.js'

export class DSDecoderV1 {
  /**
   * @param {decoding.Decoder} decoder
   */
  constructor (decoder) {
    this.restDecoder = decoder
  }

  resetDsCurVal () {
    // nop
  }

  /**
   * @return {number}
   */
  readDsClock () {
    return decoding.readVarUint(this.restDecoder)
  }

  /**
   * @return {number}
   */
  readDsLen () {
    return decoding.readVarUint(this.restDecoder)
  }
}

export class UpdateDecoderV1 extends DSDecoderV1 {
  /**
   * @return {ID}
   */
  readLeftID () {
    return createID(decoding.readVarUint(this.restDecoder), decoding.readVarUint(this.restDecoder))
  }

  /**
   * @return {ID}
   */
  readRightID () {
    return createID(decoding.readVarUint(this.restDecoder), decoding.readVarUint(this.restDecoder))
  }

  /**
   * Read the next client id.
   * Use this in favor of readID whenever possible to reduce the number of objects created.
   */
  readClient () {
    return decoding.readVarUint(this.restDecoder)
  }

  /**
   * @return {number} info An unsigned 8-bit integer
   */
  readInfo () {
    return decoding.readUint8(this.restDecoder)
  }

  /**
   * @return {string}
   */
  readString () {
    return decoding.readVarString(this.restDecoder)
  }

  /**
   * @return {boolean} isKey
   */
  readParentInfo () {
    return decoding.readVarUint(this.restDecoder) === 1
  }

  /**
   * @return {number} info An unsigned 8-bit integer
   */
  readTypeRef () {
    return decoding.readVarUint(this.restDecoder)
  }

  /**
   * Write len of a struct - well suited for Opt RLE encoder.
   *
   * @return {number} len
   */
  readLen () {
    return decoding.readVarUint(this.restDecoder)
  }

  /**
   * @return {any}
   */
  readAny () {
    return decoding.readAny(this.restDecoder)
  }

  /**
   * @return {Uint8Array}
   */
  readBuf () {
    return buffer.copyUint8Array(decoding.readVarUint8Array(this.restDecoder))
  }

  /**
   * Legacy implementation uses JSON parse. We use any-decoding in v2.
   *
   * @return {any}
   */
  readJSON () {
    return JSON.parse(decoding.readVarString(this.restDecoder))
  }

  /**
   * @return {string}
   */
  readKey () {
    return decoding.readVarString(this.restDecoder)
  }
}

export class DSDecoderV2 {
  /**
   * @param {decoding.Decoder} decoder
   */
  constructor (decoder) {
    /**
     * @private
     */
    this.dsCurrVal = 0
    this.restDecoder = decoder
  }

  resetDsCurVal () {
    this.dsCurrVal = 0
  }

  /**
   * @return {number}
   */
  readDsClock () {
    this.dsCurrVal += decoding.readVarUint(this.restDecoder)
    return this.dsCurrVal
  }

  /**
   * @return {number}
   */
  readDsLen () {
    const diff = decoding.readVarUint(this.restDecoder) + 1
    this.dsCurrVal += diff
    return diff
  }
}

export class UpdateDecoderV2 extends DSDecoderV2 {
  /**
   * @param {decoding.Decoder} decoder
   */
  constructor (decoder) {
    super(decoder)
    /**
     * List of cached keys. If the keys[id] does not exist, we read a new key
     * from stringEncoder and push it to keys.
     *
     * @type {Array<string>}
     */
    this.keys = []
    decoding.readVarUint(decoder) // read feature flag - currently unused
    this.keyClockDecoder = new decoding.IntDiffOptRleDecoder(decoding.readVarUint8Array(decoder))
    this.clientDecoder = new decoding.UintOptRleDecoder(decoding.readVarUint8Array(decoder))
    this.leftClockDecoder = new decoding.IntDiffOptRleDecoder(decoding.readVarUint8Array(decoder))
    this.rightClockDecoder = new decoding.IntDiffOptRleDecoder(decoding.readVarUint8Array(decoder))
    this.infoDecoder = new decoding.RleDecoder(decoding.readVarUint8Array(decoder), decoding.readUint8)
    this.stringDecoder = new decoding.StringDecoder(decoding.readVarUint8Array(decoder))
    this.parentInfoDecoder = new decoding.RleDecoder(decoding.readVarUint8Array(decoder), decoding.readUint8)
    this.typeRefDecoder = new decoding.UintOptRleDecoder(decoding.readVarUint8Array(decoder))
    this.lenDecoder = new decoding.UintOptRleDecoder(decoding.readVarUint8Array(decoder))
  }

  /**
   * @return {ID}
   */
  readLeftID () {
    return new ID(this.clientDecoder.read(), this.leftClockDecoder.read())
  }

  /**
   * @return {ID}
   */
  readRightID () {
    return new ID(this.clientDecoder.read(), this.rightClockDecoder.read())
  }

  /**
   * Read the next client id.
   * Use this in favor of readID whenever possible to reduce the number of objects created.
   */
  readClient () {
    return this.clientDecoder.read()
  }

  /**
   * @return {number} info An unsigned 8-bit integer
   */
  readInfo () {
    return /** @type {number} */ (this.infoDecoder.read())
  }

  /**
   * @return {string}
   */
  readString () {
    return this.stringDecoder.read()
  }

  /**
   * @return {boolean}
   */
  readParentInfo () {
    return this.parentInfoDecoder.read() === 1
  }

  /**
   * @return {number} An unsigned 8-bit integer
   */
  readTypeRef () {
    return this.typeRefDecoder.read()
  }

  /**
   * Write len of a struct - well suited for Opt RLE encoder.
   *
   * @return {number}
   */
  readLen () {
    return this.lenDecoder.read()
  }

  /**
   * @return {any}
   */
  readAny () {
    return decoding.readAny(this.restDecoder)
  }

  /**
   * @return {Uint8Array}
   */
  readBuf () {
    return decoding.readVarUint8Array(this.restDecoder)
  }

  /**
   * This is mainly here for legacy purposes.
   *
   * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
   *
   * @return {any}
   */
  readJSON () {
    return decoding.readAny(this.restDecoder)
  }

  /**
   * @return {string}
   */
  readKey () {
    const keyClock = this.keyClockDecoder.read()
    if (keyClock < this.keys.length) {
      return this.keys[keyClock]
    } else {
      const key = this.stringDecoder.read()
      this.keys.push(key)
      return key
    }
  }
}
