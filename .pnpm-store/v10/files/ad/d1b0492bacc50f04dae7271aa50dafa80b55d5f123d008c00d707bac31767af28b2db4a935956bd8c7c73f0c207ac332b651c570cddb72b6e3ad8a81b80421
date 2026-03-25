import * as error from 'lib0/error'
import * as encoding from 'lib0/encoding'

import {
  ID // eslint-disable-line
} from '../internals.js'

export class DSEncoderV1 {
  constructor () {
    this.restEncoder = encoding.createEncoder()
  }

  toUint8Array () {
    return encoding.toUint8Array(this.restEncoder)
  }

  resetDsCurVal () {
    // nop
  }

  /**
   * @param {number} clock
   */
  writeDsClock (clock) {
    encoding.writeVarUint(this.restEncoder, clock)
  }

  /**
   * @param {number} len
   */
  writeDsLen (len) {
    encoding.writeVarUint(this.restEncoder, len)
  }
}

export class UpdateEncoderV1 extends DSEncoderV1 {
  /**
   * @param {ID} id
   */
  writeLeftID (id) {
    encoding.writeVarUint(this.restEncoder, id.client)
    encoding.writeVarUint(this.restEncoder, id.clock)
  }

  /**
   * @param {ID} id
   */
  writeRightID (id) {
    encoding.writeVarUint(this.restEncoder, id.client)
    encoding.writeVarUint(this.restEncoder, id.clock)
  }

  /**
   * Use writeClient and writeClock instead of writeID if possible.
   * @param {number} client
   */
  writeClient (client) {
    encoding.writeVarUint(this.restEncoder, client)
  }

  /**
   * @param {number} info An unsigned 8-bit integer
   */
  writeInfo (info) {
    encoding.writeUint8(this.restEncoder, info)
  }

  /**
   * @param {string} s
   */
  writeString (s) {
    encoding.writeVarString(this.restEncoder, s)
  }

  /**
   * @param {boolean} isYKey
   */
  writeParentInfo (isYKey) {
    encoding.writeVarUint(this.restEncoder, isYKey ? 1 : 0)
  }

  /**
   * @param {number} info An unsigned 8-bit integer
   */
  writeTypeRef (info) {
    encoding.writeVarUint(this.restEncoder, info)
  }

  /**
   * Write len of a struct - well suited for Opt RLE encoder.
   *
   * @param {number} len
   */
  writeLen (len) {
    encoding.writeVarUint(this.restEncoder, len)
  }

  /**
   * @param {any} any
   */
  writeAny (any) {
    encoding.writeAny(this.restEncoder, any)
  }

  /**
   * @param {Uint8Array} buf
   */
  writeBuf (buf) {
    encoding.writeVarUint8Array(this.restEncoder, buf)
  }

  /**
   * @param {any} embed
   */
  writeJSON (embed) {
    encoding.writeVarString(this.restEncoder, JSON.stringify(embed))
  }

  /**
   * @param {string} key
   */
  writeKey (key) {
    encoding.writeVarString(this.restEncoder, key)
  }
}

export class DSEncoderV2 {
  constructor () {
    this.restEncoder = encoding.createEncoder() // encodes all the rest / non-optimized
    this.dsCurrVal = 0
  }

  toUint8Array () {
    return encoding.toUint8Array(this.restEncoder)
  }

  resetDsCurVal () {
    this.dsCurrVal = 0
  }

  /**
   * @param {number} clock
   */
  writeDsClock (clock) {
    const diff = clock - this.dsCurrVal
    this.dsCurrVal = clock
    encoding.writeVarUint(this.restEncoder, diff)
  }

  /**
   * @param {number} len
   */
  writeDsLen (len) {
    if (len === 0) {
      error.unexpectedCase()
    }
    encoding.writeVarUint(this.restEncoder, len - 1)
    this.dsCurrVal += len
  }
}

export class UpdateEncoderV2 extends DSEncoderV2 {
  constructor () {
    super()
    /**
     * @type {Map<string,number>}
     */
    this.keyMap = new Map()
    /**
     * Refers to the next unique key-identifier to me used.
     * See writeKey method for more information.
     *
     * @type {number}
     */
    this.keyClock = 0
    this.keyClockEncoder = new encoding.IntDiffOptRleEncoder()
    this.clientEncoder = new encoding.UintOptRleEncoder()
    this.leftClockEncoder = new encoding.IntDiffOptRleEncoder()
    this.rightClockEncoder = new encoding.IntDiffOptRleEncoder()
    this.infoEncoder = new encoding.RleEncoder(encoding.writeUint8)
    this.stringEncoder = new encoding.StringEncoder()
    this.parentInfoEncoder = new encoding.RleEncoder(encoding.writeUint8)
    this.typeRefEncoder = new encoding.UintOptRleEncoder()
    this.lenEncoder = new encoding.UintOptRleEncoder()
  }

  toUint8Array () {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, 0) // this is a feature flag that we might use in the future
    encoding.writeVarUint8Array(encoder, this.keyClockEncoder.toUint8Array())
    encoding.writeVarUint8Array(encoder, this.clientEncoder.toUint8Array())
    encoding.writeVarUint8Array(encoder, this.leftClockEncoder.toUint8Array())
    encoding.writeVarUint8Array(encoder, this.rightClockEncoder.toUint8Array())
    encoding.writeVarUint8Array(encoder, encoding.toUint8Array(this.infoEncoder))
    encoding.writeVarUint8Array(encoder, this.stringEncoder.toUint8Array())
    encoding.writeVarUint8Array(encoder, encoding.toUint8Array(this.parentInfoEncoder))
    encoding.writeVarUint8Array(encoder, this.typeRefEncoder.toUint8Array())
    encoding.writeVarUint8Array(encoder, this.lenEncoder.toUint8Array())
    // @note The rest encoder is appended! (note the missing var)
    encoding.writeUint8Array(encoder, encoding.toUint8Array(this.restEncoder))
    return encoding.toUint8Array(encoder)
  }

  /**
   * @param {ID} id
   */
  writeLeftID (id) {
    this.clientEncoder.write(id.client)
    this.leftClockEncoder.write(id.clock)
  }

  /**
   * @param {ID} id
   */
  writeRightID (id) {
    this.clientEncoder.write(id.client)
    this.rightClockEncoder.write(id.clock)
  }

  /**
   * @param {number} client
   */
  writeClient (client) {
    this.clientEncoder.write(client)
  }

  /**
   * @param {number} info An unsigned 8-bit integer
   */
  writeInfo (info) {
    this.infoEncoder.write(info)
  }

  /**
   * @param {string} s
   */
  writeString (s) {
    this.stringEncoder.write(s)
  }

  /**
   * @param {boolean} isYKey
   */
  writeParentInfo (isYKey) {
    this.parentInfoEncoder.write(isYKey ? 1 : 0)
  }

  /**
   * @param {number} info An unsigned 8-bit integer
   */
  writeTypeRef (info) {
    this.typeRefEncoder.write(info)
  }

  /**
   * Write len of a struct - well suited for Opt RLE encoder.
   *
   * @param {number} len
   */
  writeLen (len) {
    this.lenEncoder.write(len)
  }

  /**
   * @param {any} any
   */
  writeAny (any) {
    encoding.writeAny(this.restEncoder, any)
  }

  /**
   * @param {Uint8Array} buf
   */
  writeBuf (buf) {
    encoding.writeVarUint8Array(this.restEncoder, buf)
  }

  /**
   * This is mainly here for legacy purposes.
   *
   * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
   *
   * @param {any} embed
   */
  writeJSON (embed) {
    encoding.writeAny(this.restEncoder, embed)
  }

  /**
   * Property keys are often reused. For example, in y-prosemirror the key `bold` might
   * occur very often. For a 3d application, the key `position` might occur very often.
   *
   * We cache these keys in a Map and refer to them via a unique number.
   *
   * @param {string} key
   */
  writeKey (key) {
    const clock = this.keyMap.get(key)
    if (clock === undefined) {
      /**
       * @todo uncomment to introduce this feature finally
       *
       * Background. The ContentFormat object was always encoded using writeKey, but the decoder used to use readString.
       * Furthermore, I forgot to set the keyclock. So everything was working fine.
       *
       * However, this feature here is basically useless as it is not being used (it actually only consumes extra memory).
       *
       * I don't know yet how to reintroduce this feature..
       *
       * Older clients won't be able to read updates when we reintroduce this feature. So this should probably be done using a flag.
       *
       */
      // this.keyMap.set(key, this.keyClock)
      this.keyClockEncoder.write(this.keyClock++)
      this.stringEncoder.write(key)
    } else {
      this.keyClockEncoder.write(clock)
    }
  }
}
