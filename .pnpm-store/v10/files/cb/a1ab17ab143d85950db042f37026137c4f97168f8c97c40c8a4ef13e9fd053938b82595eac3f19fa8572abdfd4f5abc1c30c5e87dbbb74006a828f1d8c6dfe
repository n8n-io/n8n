/**
 * Hex, bytes and number utilities.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import {
  abytes as abytes_,
  bytesToHex as bytesToHex_,
  concatBytes as concatBytes_,
  hexToBytes as hexToBytes_,
  isBytes as isBytes_,
} from '@noble/hashes/utils.js';
export {
  abytes,
  anumber,
  bytesToHex,
  bytesToUtf8,
  concatBytes,
  hexToBytes,
  isBytes,
  randomBytes,
  utf8ToBytes,
} from '@noble/hashes/utils.js';
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
export type Hex = Uint8Array | string; // hex strings are accepted for simplicity
export type PrivKey = Hex | bigint; // bigints are accepted to ease learning curve
export type CHash = {
  (message: Uint8Array | string): Uint8Array;
  blockLen: number;
  outputLen: number;
  create(opts?: { dkLen?: number }): any; // For shake
};
export type FHash = (message: Uint8Array | string) => Uint8Array;

export function abool(title: string, value: boolean): void {
  if (typeof value !== 'boolean') throw new Error(title + ' boolean expected, got ' + value);
}

// tmp name until v2
export function _abool2(value: boolean, title: string = ''): boolean {
  if (typeof value !== 'boolean') {
    const prefix = title && `"${title}"`;
    throw new Error(prefix + 'expected boolean, got type=' + typeof value);
  }
  return value;
}

// tmp name until v2
/** Asserts something is Uint8Array. */
export function _abytes2(value: Uint8Array, length?: number, title: string = ''): Uint8Array {
  const bytes = isBytes_(value);
  const len = value?.length;
  const needsLen = length !== undefined;
  if (!bytes || (needsLen && len !== length)) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : '';
    const got = bytes ? `length=${len}` : `type=${typeof value}`;
    throw new Error(prefix + 'expected Uint8Array' + ofLen + ', got ' + got);
  }
  return value;
}

// Used in weierstrass, der
export function numberToHexUnpadded(num: number | bigint): string {
  const hex = num.toString(16);
  return hex.length & 1 ? '0' + hex : hex;
}

export function hexToNumber(hex: string): bigint {
  if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
  return hex === '' ? _0n : BigInt('0x' + hex); // Big Endian
}

// BE: Big Endian, LE: Little Endian
export function bytesToNumberBE(bytes: Uint8Array): bigint {
  return hexToNumber(bytesToHex_(bytes));
}
export function bytesToNumberLE(bytes: Uint8Array): bigint {
  abytes_(bytes);
  return hexToNumber(bytesToHex_(Uint8Array.from(bytes).reverse()));
}

export function numberToBytesBE(n: number | bigint, len: number): Uint8Array {
  return hexToBytes_(n.toString(16).padStart(len * 2, '0'));
}
export function numberToBytesLE(n: number | bigint, len: number): Uint8Array {
  return numberToBytesBE(n, len).reverse();
}
// Unpadded, rarely used
export function numberToVarBytesBE(n: number | bigint): Uint8Array {
  return hexToBytes_(numberToHexUnpadded(n));
}

/**
 * Takes hex string or Uint8Array, converts to Uint8Array.
 * Validates output length.
 * Will throw error for other types.
 * @param title descriptive title for an error e.g. 'secret key'
 * @param hex hex string or Uint8Array
 * @param expectedLength optional, will compare to result array's length
 * @returns
 */
export function ensureBytes(title: string, hex: Hex, expectedLength?: number): Uint8Array {
  let res: Uint8Array;
  if (typeof hex === 'string') {
    try {
      res = hexToBytes_(hex);
    } catch (e) {
      throw new Error(title + ' must be hex string or Uint8Array, cause: ' + e);
    }
  } else if (isBytes_(hex)) {
    // Uint8Array.from() instead of hash.slice() because node.js Buffer
    // is instance of Uint8Array, and its slice() creates **mutable** copy
    res = Uint8Array.from(hex);
  } else {
    throw new Error(title + ' must be hex string or Uint8Array');
  }
  const len = res.length;
  if (typeof expectedLength === 'number' && len !== expectedLength)
    throw new Error(title + ' of length ' + expectedLength + ' expected, got ' + len);
  return res;
}

// Compares 2 u8a-s in kinda constant time
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
/**
 * Copies Uint8Array. We can't use u8a.slice(), because u8a can be Buffer,
 * and Buffer#slice creates mutable copy. Never use Buffers!
 */
export function copyBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes);
}

/**
 * Decodes 7-bit ASCII string to Uint8Array, throws on non-ascii symbols
 * Should be safe to use for things expected to be ASCII.
 * Returns exact same result as utf8ToBytes for ASCII or throws.
 */
export function asciiToBytes(ascii: string): Uint8Array {
  return Uint8Array.from(ascii, (c, i) => {
    const charCode = c.charCodeAt(0);
    if (c.length !== 1 || charCode > 127) {
      throw new Error(
        `string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`
      );
    }
    return charCode;
  });
}

/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
// export const utf8ToBytes: typeof utf8ToBytes_ = utf8ToBytes_;
/**
 * Converts bytes to string using UTF8 encoding.
 * @example bytesToUtf8(Uint8Array.from([97, 98, 99])) // 'abc'
 */
// export const bytesToUtf8: typeof bytesToUtf8_ = bytesToUtf8_;

// Is positive bigint
const isPosBig = (n: bigint) => typeof n === 'bigint' && _0n <= n;

export function inRange(n: bigint, min: bigint, max: bigint): boolean {
  return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}

/**
 * Asserts min <= n < max. NOTE: It's < max and not <= max.
 * @example
 * aInRange('x', x, 1n, 256n); // would assume x is in (1n..255n)
 */
export function aInRange(title: string, n: bigint, min: bigint, max: bigint): void {
  // Why min <= n < max and not a (min < n < max) OR b (min <= n <= max)?
  // consider P=256n, min=0n, max=P
  // - a for min=0 would require -1:          `inRange('x', x, -1n, P)`
  // - b would commonly require subtraction:  `inRange('x', x, 0n, P - 1n)`
  // - our way is the cleanest:               `inRange('x', x, 0n, P)
  if (!inRange(n, min, max))
    throw new Error('expected valid ' + title + ': ' + min + ' <= n < ' + max + ', got ' + n);
}

// Bit operations

/**
 * Calculates amount of bits in a bigint.
 * Same as `n.toString(2).length`
 * TODO: merge with nLength in modular
 */
export function bitLen(n: bigint): number {
  let len;
  for (len = 0; n > _0n; n >>= _1n, len += 1);
  return len;
}

/**
 * Gets single bit at position.
 * NOTE: first bit position is 0 (same as arrays)
 * Same as `!!+Array.from(n.toString(2)).reverse()[pos]`
 */
export function bitGet(n: bigint, pos: number): bigint {
  return (n >> BigInt(pos)) & _1n;
}

/**
 * Sets single bit at position.
 */
export function bitSet(n: bigint, pos: number, value: boolean): bigint {
  return n | ((value ? _1n : _0n) << BigInt(pos));
}

/**
 * Calculate mask for N bits. Not using ** operator with bigints because of old engines.
 * Same as BigInt(`0b${Array(i).fill('1').join('')}`)
 */
export const bitMask = (n: number): bigint => (_1n << BigInt(n)) - _1n;

// DRBG

type Pred<T> = (v: Uint8Array) => T | undefined;
/**
 * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
 * @returns function that will call DRBG until 2nd arg returns something meaningful
 * @example
 *   const drbg = createHmacDRBG<Key>(32, 32, hmac);
 *   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
 */
export function createHmacDrbg<T>(
  hashLen: number,
  qByteLen: number,
  hmacFn: (key: Uint8Array, ...messages: Uint8Array[]) => Uint8Array
): (seed: Uint8Array, predicate: Pred<T>) => T {
  if (typeof hashLen !== 'number' || hashLen < 2) throw new Error('hashLen must be a number');
  if (typeof qByteLen !== 'number' || qByteLen < 2) throw new Error('qByteLen must be a number');
  if (typeof hmacFn !== 'function') throw new Error('hmacFn must be a function');
  // Step B, Step C: set hashLen to 8*ceil(hlen/8)
  const u8n = (len: number) => new Uint8Array(len); // creates Uint8Array
  const u8of = (byte: number) => Uint8Array.of(byte); // another shortcut
  let v = u8n(hashLen); // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
  let k = u8n(hashLen); // Steps B and C of RFC6979 3.2: set hashLen, in our case always same
  let i = 0; // Iterations counter, will throw when over 1000
  const reset = () => {
    v.fill(1);
    k.fill(0);
    i = 0;
  };
  const h = (...b: Uint8Array[]) => hmacFn(k, v, ...b); // hmac(k)(v, ...values)
  const reseed = (seed = u8n(0)) => {
    // HMAC-DRBG reseed() function. Steps D-G
    k = h(u8of(0x00), seed); // k = hmac(k || v || 0x00 || seed)
    v = h(); // v = hmac(k || v)
    if (seed.length === 0) return;
    k = h(u8of(0x01), seed); // k = hmac(k || v || 0x01 || seed)
    v = h(); // v = hmac(k || v)
  };
  const gen = () => {
    // HMAC-DRBG generate() function
    if (i++ >= 1000) throw new Error('drbg: tried 1000 values');
    let len = 0;
    const out: Uint8Array[] = [];
    while (len < qByteLen) {
      v = h();
      const sl = v.slice();
      out.push(sl);
      len += v.length;
    }
    return concatBytes_(...out);
  };
  const genUntil = (seed: Uint8Array, pred: Pred<T>): T => {
    reset();
    reseed(seed); // Steps D-G
    let res: T | undefined = undefined; // Step H: grind until k is in [1..n-1]
    while (!(res = pred(gen()))) reseed();
    reset();
    return res;
  };
  return genUntil;
}

// Validating curves and fields

const validatorFns = {
  bigint: (val: any): boolean => typeof val === 'bigint',
  function: (val: any): boolean => typeof val === 'function',
  boolean: (val: any): boolean => typeof val === 'boolean',
  string: (val: any): boolean => typeof val === 'string',
  stringOrUint8Array: (val: any): boolean => typeof val === 'string' || isBytes_(val),
  isSafeInteger: (val: any): boolean => Number.isSafeInteger(val),
  array: (val: any): boolean => Array.isArray(val),
  field: (val: any, object: any): any => (object as any).Fp.isValid(val),
  hash: (val: any): boolean => typeof val === 'function' && Number.isSafeInteger(val.outputLen),
} as const;
type Validator = keyof typeof validatorFns;
type ValMap<T extends Record<string, any>> = { [K in keyof T]?: Validator };
// type Record<K extends string | number | symbol, T> = { [P in K]: T; }

export function validateObject<T extends Record<string, any>>(
  object: T,
  validators: ValMap<T>,
  optValidators: ValMap<T> = {}
): T {
  const checkField = (fieldName: keyof T, type: Validator, isOptional: boolean) => {
    const checkVal = validatorFns[type];
    if (typeof checkVal !== 'function') throw new Error('invalid validator function');

    const val = object[fieldName as keyof typeof object];
    if (isOptional && val === undefined) return;
    if (!checkVal(val, object)) {
      throw new Error(
        'param ' + String(fieldName) + ' is invalid. Expected ' + type + ', got ' + val
      );
    }
  };
  for (const [fieldName, type] of Object.entries(validators)) checkField(fieldName, type!, false);
  for (const [fieldName, type] of Object.entries(optValidators)) checkField(fieldName, type!, true);
  return object;
}
// validate type tests
// const o: { a: number; b: number; c: number } = { a: 1, b: 5, c: 6 };
// const z0 = validateObject(o, { a: 'isSafeInteger' }, { c: 'bigint' }); // Ok!
// // Should fail type-check
// const z1 = validateObject(o, { a: 'tmp' }, { c: 'zz' });
// const z2 = validateObject(o, { a: 'isSafeInteger' }, { c: 'zz' });
// const z3 = validateObject(o, { test: 'boolean', z: 'bug' });
// const z4 = validateObject(o, { a: 'boolean', z: 'bug' });

export function isHash(val: CHash): boolean {
  return typeof val === 'function' && Number.isSafeInteger(val.outputLen);
}
export function _validateObject(
  object: Record<string, any>,
  fields: Record<string, string>,
  optFields: Record<string, string> = {}
): void {
  if (!object || typeof object !== 'object') throw new Error('expected valid options object');
  type Item = keyof typeof object;
  function checkField(fieldName: Item, expectedType: string, isOpt: boolean) {
    const val = object[fieldName];
    if (isOpt && val === undefined) return;
    const current = typeof val;
    if (current !== expectedType || val === null)
      throw new Error(`param "${fieldName}" is invalid: expected ${expectedType}, got ${current}`);
  }
  Object.entries(fields).forEach(([k, v]) => checkField(k, v, false));
  Object.entries(optFields).forEach(([k, v]) => checkField(k, v, true));
}

/**
 * throws not implemented error
 */
export const notImplemented = (): never => {
  throw new Error('not implemented');
};

/**
 * Memoizes (caches) computation result.
 * Uses WeakMap: the value is going auto-cleaned by GC after last reference is removed.
 */
export function memoized<T extends object, R, O extends any[]>(
  fn: (arg: T, ...args: O) => R
): (arg: T, ...args: O) => R {
  const map = new WeakMap<T, R>();
  return (arg: T, ...args: O): R => {
    const val = map.get(arg);
    if (val !== undefined) return val;
    const computed = fn(arg, ...args);
    map.set(arg, computed);
    return computed;
  };
}
