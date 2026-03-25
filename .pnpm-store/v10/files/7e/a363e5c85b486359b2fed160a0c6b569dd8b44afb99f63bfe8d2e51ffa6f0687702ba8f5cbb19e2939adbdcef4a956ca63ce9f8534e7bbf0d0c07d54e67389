/**
 * Utilities for hex, bytes, CSPRNG.
 * @module
 */
/*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */

/** Checks if something is Uint8Array. Be careful: nodejs Buffer will return true. */
export function isBytes(a: unknown): a is Uint8Array {
  return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
}

/** Asserts something is boolean. */
export function abool(b: boolean): void {
  if (typeof b !== 'boolean') throw new Error(`boolean expected, not ${b}`);
}

/** Asserts something is positive integer. */
export function anumber(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('positive integer expected, got ' + n);
}

/** Asserts something is Uint8Array. */
export function abytes(b: Uint8Array | undefined, ...lengths: number[]): void {
  if (!isBytes(b)) throw new Error('Uint8Array expected');
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
}

/**
 * Asserts something is hash
 * TODO: remove
 * @deprecated
 */
export function ahash(h: IHash): void {
  if (typeof h !== 'function' || typeof h.create !== 'function')
    throw new Error('Hash should be wrapped by utils.createHasher');
  anumber(h.outputLen);
  anumber(h.blockLen);
}

/** Asserts a hash instance has not been destroyed / finished */
export function aexists(instance: any, checkFinished = true): void {
  if (instance.destroyed) throw new Error('Hash instance has been destroyed');
  if (checkFinished && instance.finished) throw new Error('Hash#digest() has already been called');
}

/** Asserts output is properly-sized byte array */
export function aoutput(out: any, instance: any): void {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error('digestInto() expects output buffer of length at least ' + min);
  }
}

export type IHash = {
  (data: string | Uint8Array): Uint8Array;
  blockLen: number;
  outputLen: number;
  create: any;
};

/** Generic type encompassing 8/16/32-byte arrays - but not 64-byte. */
// prettier-ignore
export type TypedArray = Int8Array | Uint8ClampedArray | Uint8Array |
  Uint16Array | Int16Array | Uint32Array | Int32Array;

/** Cast u8 / u16 / u32 to u8. */
export function u8(arr: TypedArray): Uint8Array {
  return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
}

/** Cast u8 / u16 / u32 to u32. */
export function u32(arr: TypedArray): Uint32Array {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}

/** Zeroize a byte array. Warning: JS provides no guarantees. */
export function clean(...arrays: TypedArray[]): void {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}

/** Create DataView of an array for easy byte-level manipulation. */
export function createView(arr: TypedArray): DataView {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}

/** Is current platform little-endian? Most are. Big-Endian platform: IBM */
export const isLE: boolean = /* @__PURE__ */ (() =>
  new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44)();

// Built-in hex conversion https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex
const hasHexBuiltin: boolean = /* @__PURE__ */ (() =>
  // @ts-ignore
  typeof Uint8Array.from([]).toHex === 'function' && typeof Uint8Array.fromHex === 'function')();

// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, '0')
);

/**
 * Convert byte array to hex string. Uses built-in function, when available.
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
export function bytesToHex(bytes: Uint8Array): string {
  abytes(bytes);
  // @ts-ignore
  if (hasHexBuiltin) return bytes.toHex();
  // pre-caching improves the speed 6x
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}

// We use optimized technique to convert hex string to byte array
const asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 } as const;
function asciiToBase16(ch: number): number | undefined {
  if (ch >= asciis._0 && ch <= asciis._9) return ch - asciis._0; // '2' => 50-48
  if (ch >= asciis.A && ch <= asciis.F) return ch - (asciis.A - 10); // 'B' => 66-(65-10)
  if (ch >= asciis.a && ch <= asciis.f) return ch - (asciis.a - 10); // 'b' => 98-(97-10)
  return;
}

/**
 * Convert hex string to byte array. Uses built-in function, when available.
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
  // @ts-ignore
  if (hasHexBuiltin) return Uint8Array.fromHex(hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2) throw new Error('hex string expected, got unpadded hex of length ' + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === undefined || n2 === undefined) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2; // multiply first octet, e.g. 'a3' => 10*16+3 => 160 + 3 => 163
  }
  return array;
}

// Used in micro
export function hexToNumber(hex: string): bigint {
  if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
  return BigInt(hex === '' ? '0' : '0x' + hex); // Big Endian
}

// Used in ff1
// BE: Big Endian, LE: Little Endian
export function bytesToNumberBE(bytes: Uint8Array): bigint {
  return hexToNumber(bytesToHex(bytes));
}

// Used in micro, ff1
export function numberToBytesBE(n: number | bigint, len: number): Uint8Array {
  return hexToBytes(n.toString(16).padStart(len * 2, '0'));
}

// TODO: remove
// There is no setImmediate in browser and setTimeout is slow.
// call of async fn will return Promise, which will be fullfiled only on
// next scheduler queue processing step and this is exactly what we need.
export const nextTick = async (): Promise<void> => {};

// Global symbols, but ts doesn't see them: https://github.com/microsoft/TypeScript/issues/31535
declare const TextEncoder: any;
declare const TextDecoder: any;

/**
 * Converts string to bytes using UTF8 encoding.
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
export function utf8ToBytes(str: string): Uint8Array {
  if (typeof str !== 'string') throw new Error('string expected');
  return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}

/**
 * Converts bytes to string using UTF8 encoding.
 * @example bytesToUtf8(new Uint8Array([97, 98, 99])) // 'abc'
 */
export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// TODO: remove
export type Input = Uint8Array | string;
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
export function toBytes(data: string | Uint8Array): Uint8Array {
  if (typeof data === 'string') data = utf8ToBytes(data);
  else if (isBytes(data)) data = copyBytes(data);
  else throw new Error('Uint8Array expected, got ' + typeof data);
  return data;
}

/**
 * Checks if two U8A use same underlying buffer and overlaps.
 * This is invalid and can corrupt data.
 */
export function overlapBytes(a: Uint8Array, b: Uint8Array): boolean {
  return (
    a.buffer === b.buffer && // best we can do, may fail with an obscure Proxy
    a.byteOffset < b.byteOffset + b.byteLength && // a starts before b end
    b.byteOffset < a.byteOffset + a.byteLength // b starts before a end
  );
}

/**
 * If input and output overlap and input starts before output, we will overwrite end of input before
 * we start processing it, so this is not supported for most ciphers (except chacha/salse, which designed with this)
 */
export function complexOverlapBytes(input: Uint8Array, output: Uint8Array): void {
  // This is very cursed. It works somehow, but I'm completely unsure,
  // reasoning about overlapping aligned windows is very hard.
  if (overlapBytes(input, output) && input.byteOffset < output.byteOffset)
    throw new Error('complex overlap of input and output is not supported');
}

/**
 * Copies several Uint8Arrays into one.
 */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}

// Used in ARX only
type EmptyObj = {};
export function checkOpts<T1 extends EmptyObj, T2 extends EmptyObj>(
  defaults: T1,
  opts: T2
): T1 & T2 {
  if (opts == null || typeof opts !== 'object') throw new Error('options must be defined');
  const merged = Object.assign(defaults, opts);
  return merged as T1 & T2;
}

/** Compares 2 uint8array-s in kinda constant time. */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// TODO: remove
/** For runtime check if class implements interface. */
export abstract class Hash<T extends Hash<T>> {
  abstract blockLen: number; // Bytes per block
  abstract outputLen: number; // Bytes in output
  abstract update(buf: string | Uint8Array): this;
  // Writes digest into buf
  abstract digestInto(buf: Uint8Array): void;
  abstract digest(): Uint8Array;
  /**
   * Resets internal state. Makes Hash instance unusable.
   * Reset is impossible for keyed hashes if key is consumed into state. If digest is not consumed
   * by user, they will need to manually call `destroy()` when zeroing is necessary.
   */
  abstract destroy(): void;
}

// This will allow to re-use with composable things like packed & base encoders
// Also, we probably can make tags composable

/** Sync cipher: takes byte array and returns byte array. */
export type Cipher = {
  encrypt(plaintext: Uint8Array): Uint8Array;
  decrypt(ciphertext: Uint8Array): Uint8Array;
};

/** Async cipher e.g. from built-in WebCrypto. */
export type AsyncCipher = {
  encrypt(plaintext: Uint8Array): Promise<Uint8Array>;
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;
};

/** Cipher with `output` argument which can optimize by doing 1 less allocation. */
export type CipherWithOutput = Cipher & {
  encrypt(plaintext: Uint8Array, output?: Uint8Array): Uint8Array;
  decrypt(ciphertext: Uint8Array, output?: Uint8Array): Uint8Array;
};

/**
 * Params are outside of return type, so it is accessible before calling constructor.
 * If function support multiple nonceLength's, we return the best one.
 */
export type CipherParams = {
  blockSize: number;
  nonceLength?: number;
  tagLength?: number;
  varSizeNonce?: boolean;
};
/** ARX cipher, like salsa or chacha. */
export type ARXCipher = ((
  key: Uint8Array,
  nonce: Uint8Array,
  AAD?: Uint8Array
) => CipherWithOutput) & {
  blockSize: number;
  nonceLength: number;
  tagLength: number;
};
export type CipherCons<T extends any[]> = (key: Uint8Array, ...args: T) => Cipher;
/**
 * Wraps a cipher: validates args, ensures encrypt() can only be called once.
 * @__NO_SIDE_EFFECTS__
 */
export const wrapCipher = <C extends CipherCons<any>, P extends CipherParams>(
  params: P,
  constructor: C
): C & P => {
  function wrappedCipher(key: Uint8Array, ...args: any[]): CipherWithOutput {
    // Validate key
    abytes(key);

    // Big-Endian hardware is rare. Just in case someone still decides to run ciphers:
    if (!isLE) throw new Error('Non little-endian hardware is not yet supported');

    // Validate nonce if nonceLength is present
    if (params.nonceLength !== undefined) {
      const nonce = args[0];
      if (!nonce) throw new Error('nonce / iv required');
      if (params.varSizeNonce) abytes(nonce);
      else abytes(nonce, params.nonceLength);
    }

    // Validate AAD if tagLength present
    const tagl = params.tagLength;
    if (tagl && args[1] !== undefined) {
      abytes(args[1]);
    }

    const cipher = constructor(key, ...args);
    const checkOutput = (fnLength: number, output?: Uint8Array) => {
      if (output !== undefined) {
        if (fnLength !== 2) throw new Error('cipher output not supported');
        abytes(output);
      }
    };
    // Create wrapped cipher with validation and single-use encryption
    let called = false;
    const wrCipher = {
      encrypt(data: Uint8Array, output?: Uint8Array) {
        if (called) throw new Error('cannot encrypt() twice with same key + nonce');
        called = true;
        abytes(data);
        checkOutput(cipher.encrypt.length, output);
        return (cipher as CipherWithOutput).encrypt(data, output);
      },
      decrypt(data: Uint8Array, output?: Uint8Array) {
        abytes(data);
        if (tagl && data.length < tagl)
          throw new Error('invalid ciphertext length: smaller than tagLength=' + tagl);
        checkOutput(cipher.decrypt.length, output);
        return (cipher as CipherWithOutput).decrypt(data, output);
      },
    };

    return wrCipher;
  }

  Object.assign(wrappedCipher, params);
  return wrappedCipher as C & P;
};

/** Represents salsa / chacha stream. */
export type XorStream = (
  key: Uint8Array,
  nonce: Uint8Array,
  data: Uint8Array,
  output?: Uint8Array,
  counter?: number
) => Uint8Array;

/**
 * By default, returns u8a of length.
 * When out is available, it checks it for validity and uses it.
 */
export function getOutput(
  expectedLength: number,
  out?: Uint8Array,
  onlyAligned = true
): Uint8Array {
  if (out === undefined) return new Uint8Array(expectedLength);
  if (out.length !== expectedLength)
    throw new Error('invalid output length, expected ' + expectedLength + ', got: ' + out.length);
  if (onlyAligned && !isAligned32(out)) throw new Error('invalid output, must be aligned');
  return out;
}

/** Polyfill for Safari 14. */
export function setBigUint64(
  view: DataView,
  byteOffset: number,
  value: bigint,
  isLE: boolean
): void {
  if (typeof view.setBigUint64 === 'function') return view.setBigUint64(byteOffset, value, isLE);
  const _32n = BigInt(32);
  const _u32_max = BigInt(0xffffffff);
  const wh = Number((value >> _32n) & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE ? 4 : 0;
  const l = isLE ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE);
  view.setUint32(byteOffset + l, wl, isLE);
}

export function u64Lengths(dataLength: number, aadLength: number, isLE: boolean): Uint8Array {
  abool(isLE);
  const num = new Uint8Array(16);
  const view = createView(num);
  setBigUint64(view, 0, BigInt(aadLength), isLE);
  setBigUint64(view, 8, BigInt(dataLength), isLE);
  return num;
}

// Is byte array aligned to 4 byte offset (u32)?
export function isAligned32(bytes: Uint8Array): boolean {
  return bytes.byteOffset % 4 === 0;
}

// copy bytes to new u8a (aligned). Because Buffer.slice is broken.
export function copyBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes);
}
