/**
 * Experimental KDF for AES.
 */
import { hkdf } from './hkdf.ts';
import { pbkdf2 as _pbkdf2 } from './pbkdf2.ts';
import { scrypt as _scrypt } from './scrypt.ts';
import { sha256 } from './sha256.ts';
import { abytes, bytesToHex, clean, createView, hexToBytes, kdfInputToBytes } from './utils.ts';

// A tiny KDF for various applications like AES key-gen.
// Uses HKDF in a non-standard way, so it's not "KDF-secure", only "PRF-secure".
// Which is good enough: assume sha2-256 retained preimage resistance.

const SCRYPT_FACTOR = 2 ** 19;
const PBKDF2_FACTOR = 2 ** 17;

// Scrypt KDF
export function scrypt(password: string, salt: string): Uint8Array {
  return _scrypt(password, salt, { N: SCRYPT_FACTOR, r: 8, p: 1, dkLen: 32 });
}

// PBKDF2-HMAC-SHA256
export function pbkdf2(password: string, salt: string): Uint8Array {
  return _pbkdf2(sha256, password, salt, { c: PBKDF2_FACTOR, dkLen: 32 });
}

// Combines two 32-byte byte arrays
function xor32(a: Uint8Array, b: Uint8Array): Uint8Array {
  abytes(a, 32);
  abytes(b, 32);
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    arr[i] = a[i] ^ b[i];
  }
  return arr;
}

function strHasLength(str: string, min: number, max: number): boolean {
  return typeof str === 'string' && str.length >= min && str.length <= max;
}

/**
 * Derives main seed. Takes a lot of time. Prefer `eskdf` method instead.
 */
export function deriveMainSeed(username: string, password: string): Uint8Array {
  if (!strHasLength(username, 8, 255)) throw new Error('invalid username');
  if (!strHasLength(password, 8, 255)) throw new Error('invalid password');
  // Declared like this to throw off minifiers which auto-convert .fromCharCode(1) to actual string.
  // String with non-ascii may be problematic in some envs
  const codes = { _1: 1, _2: 2 };
  const sep = { s: String.fromCharCode(codes._1), p: String.fromCharCode(codes._2) };
  const scr = scrypt(password + sep.s, username + sep.s);
  const pbk = pbkdf2(password + sep.p, username + sep.p);
  const res = xor32(scr, pbk);
  clean(scr, pbk);
  return res;
}

type AccountID = number | string;

/**
 * Converts protocol & accountId pair to HKDF salt & info params.
 */
function getSaltInfo(protocol: string, accountId: AccountID = 0) {
  // Note that length here also repeats two lines below
  // We do an additional length check here to reduce the scope of DoS attacks
  if (!(strHasLength(protocol, 3, 15) && /^[a-z0-9]{3,15}$/.test(protocol))) {
    throw new Error('invalid protocol');
  }

  // Allow string account ids for some protocols
  const allowsStr = /^password\d{0,3}|ssh|tor|file$/.test(protocol);
  let salt: Uint8Array; // Extract salt. Default is undefined.
  if (typeof accountId === 'string') {
    if (!allowsStr) throw new Error('accountId must be a number');
    if (!strHasLength(accountId, 1, 255))
      throw new Error('accountId must be string of length 1..255');
    salt = kdfInputToBytes(accountId);
  } else if (Number.isSafeInteger(accountId)) {
    if (accountId < 0 || accountId > Math.pow(2, 32) - 1) throw new Error('invalid accountId');
    // Convert to Big Endian Uint32
    salt = new Uint8Array(4);
    createView(salt).setUint32(0, accountId, false);
  } else {
    throw new Error('accountId must be a number' + (allowsStr ? ' or string' : ''));
  }
  const info = kdfInputToBytes(protocol);
  return { salt, info };
}

type OptsLength = { keyLength: number };
type OptsMod = { modulus: bigint };
type KeyOpts = undefined | OptsLength | OptsMod;

function countBytes(num: bigint): number {
  if (typeof num !== 'bigint' || num <= BigInt(128)) throw new Error('invalid number');
  return Math.ceil(num.toString(2).length / 8);
}

/**
 * Parses keyLength and modulus options to extract length of result key.
 * If modulus is used, adds 64 bits to it as per FIPS 186 B.4.1 to combat modulo bias.
 */
function getKeyLength(options: KeyOpts): number {
  if (!options || typeof options !== 'object') return 32;
  const hasLen = 'keyLength' in options;
  const hasMod = 'modulus' in options;
  if (hasLen && hasMod) throw new Error('cannot combine keyLength and modulus options');
  if (!hasLen && !hasMod) throw new Error('must have either keyLength or modulus option');
  // FIPS 186 B.4.1 requires at least 64 more bits
  const l = hasMod ? countBytes(options.modulus) + 8 : options.keyLength;
  if (!(typeof l === 'number' && l >= 16 && l <= 8192)) throw new Error('invalid keyLength');
  return l;
}

/**
 * Converts key to bigint and divides it by modulus. Big Endian.
 * Implements FIPS 186 B.4.1, which removes 0 and modulo bias from output.
 */
function modReduceKey(key: Uint8Array, modulus: bigint): Uint8Array {
  const _1 = BigInt(1);
  const num = BigInt('0x' + bytesToHex(key)); // check for ui8a, then bytesToNumber()
  const res = (num % (modulus - _1)) + _1; // Remove 0 from output
  if (res < _1) throw new Error('expected positive number'); // Guard against bad values
  const len = key.length - 8; // FIPS requires 64 more bits = 8 bytes
  const hex = res.toString(16).padStart(len * 2, '0'); // numberToHex()
  const bytes = hexToBytes(hex);
  if (bytes.length !== len) throw new Error('invalid length of result key');
  return bytes;
}

// We are not using classes because constructor cannot be async
export interface ESKDF {
  /**
   * Derives a child key. Child key will not be associated with any
   * other child key because of properties of underlying KDF.
   *
   * @param protocol - 3-15 character protocol name
   * @param accountId - numeric identifier of account
   * @param options - `keyLength: 64` or `modulus: 41920438n`
   * @example deriveChildKey('aes', 0)
   */
  deriveChildKey: (protocol: string, accountId: AccountID, options?: KeyOpts) => Uint8Array;
  /**
   * Deletes the main seed from eskdf instance
   */
  expire: () => void;
  /**
   * Account fingerprint
   */
  fingerprint: string;
}

/**
 * ESKDF
 * @param username - username, email, or identifier, min: 8 characters, should have enough entropy
 * @param password - password, min: 8 characters, should have enough entropy
 * @example
 * const kdf = await eskdf('example-university', 'beginning-new-example');
 * const key = kdf.deriveChildKey('aes', 0);
 * console.log(kdf.fingerprint);
 * kdf.expire();
 */
export async function eskdf(username: string, password: string): Promise<ESKDF> {
  // We are using closure + object instead of class because
  // we want to make `seed` non-accessible for any external function.
  let seed: Uint8Array | undefined = deriveMainSeed(username, password);

  function deriveCK(protocol: string, accountId: AccountID = 0, options?: KeyOpts): Uint8Array {
    abytes(seed, 32);
    const { salt, info } = getSaltInfo(protocol, accountId); // validate protocol & accountId
    const keyLength = getKeyLength(options); // validate options
    const key = hkdf(sha256, seed!, salt, info, keyLength);
    // Modulus has already been validated
    return options && 'modulus' in options ? modReduceKey(key, options.modulus) : key;
  }
  function expire() {
    if (seed) seed.fill(1);
    seed = undefined;
  }
  // prettier-ignore
  const fingerprint = Array.from(deriveCK('fingerprint', 0))
    .slice(0, 6)
    .map((char) => char.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
  return Object.freeze({ deriveChildKey: deriveCK, expire, fingerprint });
}
