/**
 * PBKDF (RFC 2898). Can be used to create a key from password and salt.
 * @module
 */
import { hmac } from './hmac.ts';
// prettier-ignore
import {
  ahash, anumber,
  asyncLoop, checkOpts, clean, createView, Hash, kdfInputToBytes,
  type CHash,
  type KDFInput
} from './utils.ts';

export type Pbkdf2Opt = {
  c: number; // Iterations
  dkLen?: number; // Desired key length in bytes (Intended output length in octets of the derived key
  asyncTick?: number; // Maximum time in ms for which async function can block execution
};
// Common prologue and epilogue for sync/async functions
function pbkdf2Init(hash: CHash, _password: KDFInput, _salt: KDFInput, _opts: Pbkdf2Opt) {
  ahash(hash);
  const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
  const { c, dkLen, asyncTick } = opts;
  anumber(c);
  anumber(dkLen);
  anumber(asyncTick);
  if (c < 1) throw new Error('iterations (c) should be >= 1');
  const password = kdfInputToBytes(_password);
  const salt = kdfInputToBytes(_salt);
  // DK = PBKDF2(PRF, Password, Salt, c, dkLen);
  const DK = new Uint8Array(dkLen);
  // U1 = PRF(Password, Salt + INT_32_BE(i))
  const PRF = hmac.create(hash, password);
  const PRFSalt = PRF._cloneInto().update(salt);
  return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
}

function pbkdf2Output<T extends Hash<T>>(
  PRF: Hash<T>,
  PRFSalt: Hash<T>,
  DK: Uint8Array,
  prfW: Hash<T>,
  u: Uint8Array
) {
  PRF.destroy();
  PRFSalt.destroy();
  if (prfW) prfW.destroy();
  clean(u);
  return DK;
}

/**
 * PBKDF2-HMAC: RFC 2898 key derivation function
 * @param hash - hash function that would be used e.g. sha256
 * @param password - password from which a derived key is generated
 * @param salt - cryptographic salt
 * @param opts - {c, dkLen} where c is work factor and dkLen is output message size
 * @example
 * const key = pbkdf2(sha256, 'password', 'salt', { dkLen: 32, c: Math.pow(2, 18) });
 */
export function pbkdf2(
  hash: CHash,
  password: KDFInput,
  salt: KDFInput,
  opts: Pbkdf2Opt
): Uint8Array {
  const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
  let prfW: any; // Working copy
  const arr = new Uint8Array(4);
  const view = createView(arr);
  const u = new Uint8Array(PRF.outputLen);
  // DK = T1 + T2 + ⋯ + Tdklen/hlen
  for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
    // Ti = F(Password, Salt, c, i)
    const Ti = DK.subarray(pos, pos + PRF.outputLen);
    view.setInt32(0, ti, false);
    // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
    // U1 = PRF(Password, Salt + INT_32_BE(i))
    (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
    Ti.set(u.subarray(0, Ti.length));
    for (let ui = 1; ui < c; ui++) {
      // Uc = PRF(Password, Uc−1)
      PRF._cloneInto(prfW).update(u).digestInto(u);
      for (let i = 0; i < Ti.length; i++) Ti[i] ^= u[i];
    }
  }
  return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}

/**
 * PBKDF2-HMAC: RFC 2898 key derivation function. Async version.
 * @example
 * await pbkdf2Async(sha256, 'password', 'salt', { dkLen: 32, c: 500_000 });
 */
export async function pbkdf2Async(
  hash: CHash,
  password: KDFInput,
  salt: KDFInput,
  opts: Pbkdf2Opt
): Promise<Uint8Array> {
  const { c, dkLen, asyncTick, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
  let prfW: any; // Working copy
  const arr = new Uint8Array(4);
  const view = createView(arr);
  const u = new Uint8Array(PRF.outputLen);
  // DK = T1 + T2 + ⋯ + Tdklen/hlen
  for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
    // Ti = F(Password, Salt, c, i)
    const Ti = DK.subarray(pos, pos + PRF.outputLen);
    view.setInt32(0, ti, false);
    // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
    // U1 = PRF(Password, Salt + INT_32_BE(i))
    (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
    Ti.set(u.subarray(0, Ti.length));
    await asyncLoop(c - 1, asyncTick, () => {
      // Uc = PRF(Password, Uc−1)
      PRF._cloneInto(prfW).update(u).digestInto(u);
      for (let i = 0; i < Ti.length; i++) Ti[i] ^= u[i];
    });
  }
  return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}
