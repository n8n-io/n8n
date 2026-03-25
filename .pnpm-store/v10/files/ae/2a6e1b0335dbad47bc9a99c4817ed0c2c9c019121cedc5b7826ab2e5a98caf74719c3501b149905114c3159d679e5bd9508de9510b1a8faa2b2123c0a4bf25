/**
 * Internal Merkle-Damgard hash utils.
 * @module
 */
import { type Input, Hash, abytes, aexists, aoutput, clean, createView, toBytes } from './utils.ts';

/** Polyfill for Safari 14. https://caniuse.com/mdn-javascript_builtins_dataview_setbiguint64 */
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

/** Choice: a ? b : c */
export function Chi(a: number, b: number, c: number): number {
  return (a & b) ^ (~a & c);
}

/** Majority function, true if any two inputs is true. */
export function Maj(a: number, b: number, c: number): number {
  return (a & b) ^ (a & c) ^ (b & c);
}

/**
 * Merkle-Damgard hash construction base class.
 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
 */
export abstract class HashMD<T extends HashMD<T>> extends Hash<T> {
  protected abstract process(buf: DataView, offset: number): void;
  protected abstract get(): number[];
  protected abstract set(...args: number[]): void;
  abstract destroy(): void;
  protected abstract roundClean(): void;

  readonly blockLen: number;
  readonly outputLen: number;
  readonly padOffset: number;
  readonly isLE: boolean;

  // For partial updates less than block size
  protected buffer: Uint8Array;
  protected view: DataView;
  protected finished = false;
  protected length = 0;
  protected pos = 0;
  protected destroyed = false;

  constructor(blockLen: number, outputLen: number, padOffset: number, isLE: boolean) {
    super();
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data: Input): this {
    aexists(this);
    data = toBytes(data);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      // Fast path: we have at least one block in input, cast it to view and process
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out: Uint8Array): void {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    // Padding
    // We can avoid allocation of buffer for padding completely if it
    // was previously not allocated here. But it won't change performance.
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    // append the bit '1' to the message
    buffer[pos++] = 0b10000000;
    clean(this.buffer.subarray(pos));
    // we have less than padOffset left in buffer, so we cannot put length in
    // current block, need process it and pad again
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    // Pad until full block byte with zeros
    for (let i = pos; i < blockLen; i++) buffer[i] = 0;
    // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
    // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
    // So we just write lowest 64 bits of that value.
    setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
    if (len % 4) throw new Error('_sha2: outputLen should be aligned to 32bit');
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length) throw new Error('_sha2: outputLen bigger than state');
    for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
  }
  digest(): Uint8Array {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to?: T): T {
    to ||= new (this.constructor as any)() as T;
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (length % blockLen) to.buffer.set(buffer);
    return to;
  }
  clone(): T {
    return this._cloneInto();
  }
}

/**
 * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
 * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
 */

/** Initial SHA256 state. Bits 0..32 of frac part of sqrt of primes 2..19 */
export const SHA256_IV: Uint32Array = /* @__PURE__ */ Uint32Array.from([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

/** Initial SHA224 state. Bits 32..64 of frac part of sqrt of primes 23..53 */
export const SHA224_IV: Uint32Array = /* @__PURE__ */ Uint32Array.from([
  0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4,
]);

/** Initial SHA384 state. Bits 0..64 of frac part of sqrt of primes 23..53 */
export const SHA384_IV: Uint32Array = /* @__PURE__ */ Uint32Array.from([
  0xcbbb9d5d, 0xc1059ed8, 0x629a292a, 0x367cd507, 0x9159015a, 0x3070dd17, 0x152fecd8, 0xf70e5939,
  0x67332667, 0xffc00b31, 0x8eb44a87, 0x68581511, 0xdb0c2e0d, 0x64f98fa7, 0x47b5481d, 0xbefa4fa4,
]);

/** Initial SHA512 state. Bits 0..64 of frac part of sqrt of primes 2..19 */
export const SHA512_IV: Uint32Array = /* @__PURE__ */ Uint32Array.from([
  0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1,
  0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179,
]);
