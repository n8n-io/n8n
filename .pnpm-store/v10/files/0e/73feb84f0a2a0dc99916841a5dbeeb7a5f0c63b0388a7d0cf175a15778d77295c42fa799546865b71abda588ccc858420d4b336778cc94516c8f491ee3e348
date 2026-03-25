import * as encoding from '../encoding.js'
import * as rabin from '../hash/rabin.js'
import * as buffer from '../buffer.js'

export const FingerprintTraitSymbol = Symbol('Fingerprint')

/**
 * When implementing this trait, it is recommended to write some sort of "magic number" first to
 * ensure that different types of objects don't have the same fingerprint.
 *
 * The recommended pracice is to generate a random u32 number as your magic number. e.g. using
 * `console.log(random.uint32().toString(16))`
 *
 * @typedef {{ [FingerprintTraitSymbol]:()=>string } | import('../encoding.js').AnyEncodable} Fingerprintable
 */

/**
 * @param {Fingerprintable} a
 * @return {string}
 */
export const fingerprint = a => (a != null && /** @type {any} */ (a)[FingerprintTraitSymbol]?.()) || buffer.toBase64(rabin.fingerprint(rabin.StandardIrreducible128, encoding.encode(encoder => { encoding.writeUint32(encoder, 0x8de1c475); encoding.writeAny(encoder, a) })))
