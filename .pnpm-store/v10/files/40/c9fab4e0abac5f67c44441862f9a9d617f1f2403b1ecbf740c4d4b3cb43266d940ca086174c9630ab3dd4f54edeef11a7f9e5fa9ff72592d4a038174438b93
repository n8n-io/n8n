/**
 * HKDF (RFC 5869): extract + expand in one step.
 * See https://soatok.blog/2021/11/17/understanding-hkdf/.
 * @module
 */
import { hmac } from './hmac.ts';
import { ahash, anumber, type CHash, clean, type Input, toBytes } from './utils.ts';

/**
 * HKDF-extract from spec. Less important part. `HKDF-Extract(IKM, salt) -> PRK`
 * Arguments position differs from spec (IKM is first one, since it is not optional)
 * @param hash - hash function that would be used (e.g. sha256)
 * @param ikm - input keying material, the initial key
 * @param salt - optional salt value (a non-secret random value)
 */
export function extract(hash: CHash, ikm: Input, salt?: Input): Uint8Array {
  ahash(hash);
  // NOTE: some libraries treat zero-length array as 'not provided';
  // we don't, since we have undefined as 'not provided'
  // https://github.com/RustCrypto/KDFs/issues/15
  if (salt === undefined) salt = new Uint8Array(hash.outputLen);
  return hmac(hash, toBytes(salt), toBytes(ikm));
}

const HKDF_COUNTER = /* @__PURE__ */ Uint8Array.from([0]);
const EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();

/**
 * HKDF-expand from the spec. The most important part. `HKDF-Expand(PRK, info, L) -> OKM`
 * @param hash - hash function that would be used (e.g. sha256)
 * @param prk - a pseudorandom key of at least HashLen octets (usually, the output from the extract step)
 * @param info - optional context and application specific information (can be a zero-length string)
 * @param length - length of output keying material in bytes
 */
export function expand(hash: CHash, prk: Input, info?: Input, length: number = 32): Uint8Array {
  ahash(hash);
  anumber(length);
  const olen = hash.outputLen;
  if (length > 255 * olen) throw new Error('Length should be <= 255*HashLen');
  const blocks = Math.ceil(length / olen);
  if (info === undefined) info = EMPTY_BUFFER;
  // first L(ength) octets of T
  const okm = new Uint8Array(blocks * olen);
  // Re-use HMAC instance between blocks
  const HMAC = hmac.create(hash, prk);
  const HMACTmp = HMAC._cloneInto();
  const T = new Uint8Array(HMAC.outputLen);
  for (let counter = 0; counter < blocks; counter++) {
    HKDF_COUNTER[0] = counter + 1;
    // T(0) = empty string (zero length)
    // T(N) = HMAC-Hash(PRK, T(N-1) | info | N)
    HMACTmp.update(counter === 0 ? EMPTY_BUFFER : T)
      .update(info)
      .update(HKDF_COUNTER)
      .digestInto(T);
    okm.set(T, olen * counter);
    HMAC._cloneInto(HMACTmp);
  }
  HMAC.destroy();
  HMACTmp.destroy();
  clean(T, HKDF_COUNTER);
  return okm.slice(0, length);
}

/**
 * HKDF (RFC 5869): derive keys from an initial input.
 * Combines hkdf_extract + hkdf_expand in one step
 * @param hash - hash function that would be used (e.g. sha256)
 * @param ikm - input keying material, the initial key
 * @param salt - optional salt value (a non-secret random value)
 * @param info - optional context and application specific information (can be a zero-length string)
 * @param length - length of output keying material in bytes
 * @example
 * import { hkdf } from '@noble/hashes/hkdf';
 * import { sha256 } from '@noble/hashes/sha2';
 * import { randomBytes } from '@noble/hashes/utils';
 * const inputKey = randomBytes(32);
 * const salt = randomBytes(32);
 * const info = 'application-key';
 * const hk1 = hkdf(sha256, inputKey, salt, info, 32);
 */
export const hkdf = (
  hash: CHash,
  ikm: Input,
  salt: Input | undefined,
  info: Input | undefined,
  length: number
): Uint8Array => expand(hash, extract(hash, ikm, salt), info, length);
