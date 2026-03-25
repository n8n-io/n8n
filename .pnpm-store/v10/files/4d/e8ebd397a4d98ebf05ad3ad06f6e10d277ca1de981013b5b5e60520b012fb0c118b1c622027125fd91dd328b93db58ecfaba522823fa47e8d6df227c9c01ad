
import * as Y from 'yjs' // eslint-disable-line
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

export const messagePermissionDenied = 0

/**
 * @param {encoding.Encoder} encoder
 * @param {string} reason
 */
export const writePermissionDenied = (encoder, reason) => {
  encoding.writeVarUint(encoder, messagePermissionDenied)
  encoding.writeVarString(encoder, reason)
}

/**
 * @callback PermissionDeniedHandler
 * @param {any} y
 * @param {string} reason
 */

/**
 *
 * @param {decoding.Decoder} decoder
 * @param {Y.Doc} y
 * @param {PermissionDeniedHandler} permissionDeniedHandler
 */
export const readAuthMessage = (decoder, y, permissionDeniedHandler) => {
  switch (decoding.readVarUint(decoder)) {
    case messagePermissionDenied: permissionDeniedHandler(y, decoding.readVarString(decoder))
  }
}
