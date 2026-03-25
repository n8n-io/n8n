import * as error from '../error.js'
import * as buffer from '../buffer.js'
import * as string from '../string.js'
import * as json from '../json.js'
import * as ecdsa from '../crypto/ecdsa.js'
import * as time from '../time.js'

/**
 * @param {Object} data
 */
const _stringify = data => buffer.toBase64UrlEncoded(string.encodeUtf8(json.stringify(data)))

/**
 * @param {string} base64url
 */
const _parse = base64url => json.parse(string.decodeUtf8(buffer.fromBase64UrlEncoded(base64url)))

/**
 * @param {CryptoKey} privateKey
 * @param {Object} payload
 */
export const encodeJwt = (privateKey, payload) => {
  const { name: algName, namedCurve: algCurve } = /** @type {any} */ (privateKey.algorithm)
  /* c8 ignore next 3 */
  if (algName !== 'ECDSA' || algCurve !== 'P-384') {
    error.unexpectedCase()
  }
  const header = {
    alg: 'ES384',
    typ: 'JWT'
  }
  const jwt = _stringify(header) + '.' + _stringify(payload)
  return ecdsa.sign(privateKey, string.encodeUtf8(jwt)).then(signature =>
    jwt + '.' + buffer.toBase64UrlEncoded(signature)
  )
}

/**
 * @param {CryptoKey} publicKey
 * @param {string} jwt
 */
export const verifyJwt = async (publicKey, jwt) => {
  const [headerBase64, payloadBase64, signatureBase64] = jwt.split('.')
  const verified = await ecdsa.verify(publicKey, buffer.fromBase64UrlEncoded(signatureBase64), string.encodeUtf8(headerBase64 + '.' + payloadBase64))
  /* c8 ignore next 3 */
  if (!verified) {
    throw new Error('Invalid JWT')
  }
  const payload = _parse(payloadBase64)
  if (payload.exp != null && time.getUnixTime() > payload.exp) {
    throw new Error('Expired JWT')
  }
  return {
    header: _parse(headerBase64),
    payload
  }
}

/**
 * Decode a jwt without verifying it. Probably a bad idea to use this. Only use if you know the jwt was already verified!
 *
 * @param {string} jwt
 */
export const unsafeDecode = jwt => {
  const [headerBase64, payloadBase64] = jwt.split('.')
  return {
    header: _parse(headerBase64),
    payload: _parse(payloadBase64)
  }
}
