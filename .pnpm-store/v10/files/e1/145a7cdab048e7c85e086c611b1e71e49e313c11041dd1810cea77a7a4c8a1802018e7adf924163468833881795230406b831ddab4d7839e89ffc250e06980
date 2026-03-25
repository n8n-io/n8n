/**
 * Poly1305 ([PDF](https://cr.yp.to/mac/poly1305-20050329.pdf),
 * [wiki](https://en.wikipedia.org/wiki/Poly1305))
 * is a fast and parallel secret-key message-authentication code suitable for
 * a wide variety of applications. It was standardized in
 * [RFC 8439](https://datatracker.ietf.org/doc/html/rfc8439) and is now used in TLS 1.3.
 *
 * Polynomial MACs are not perfect for every situation:
 * they lack Random Key Robustness: the MAC can be forged, and can't be used in PAKE schemes.
 * See [invisible salamanders attack](https://keymaterial.net/2020/09/07/invisible-salamanders-in-aes-gcm-siv/).
 * To combat invisible salamanders, `hash(key)` can be included in ciphertext,
 * however, this would violate ciphertext indistinguishability:
 * an attacker would know which key was used - so `HKDF(key, i)`
 * could be used instead.
 *
 * Check out [original website](https://cr.yp.to/mac.html).
 * @module
 */
import { Hash, type Input, abytes, aexists, aoutput, clean, toBytes } from './utils.ts';

// Based on Public Domain poly1305-donna https://github.com/floodyberry/poly1305-donna
const u8to16 = (a: Uint8Array, i: number) => (a[i++] & 0xff) | ((a[i++] & 0xff) << 8);
class Poly1305 implements Hash<Poly1305> {
  readonly blockLen = 16;
  readonly outputLen = 16;
  private buffer = new Uint8Array(16);
  private r = new Uint16Array(10);
  private h = new Uint16Array(10);
  private pad = new Uint16Array(8);
  private pos = 0;
  protected finished = false;

  constructor(key: Input) {
    key = toBytes(key);
    abytes(key, 32);
    const t0 = u8to16(key, 0);
    const t1 = u8to16(key, 2);
    const t2 = u8to16(key, 4);
    const t3 = u8to16(key, 6);
    const t4 = u8to16(key, 8);
    const t5 = u8to16(key, 10);
    const t6 = u8to16(key, 12);
    const t7 = u8to16(key, 14);

    // https://github.com/floodyberry/poly1305-donna/blob/e6ad6e091d30d7f4ec2d4f978be1fcfcbce72781/poly1305-donna-16.h#L47
    this.r[0] = t0 & 0x1fff;
    this.r[1] = ((t0 >>> 13) | (t1 << 3)) & 0x1fff;
    this.r[2] = ((t1 >>> 10) | (t2 << 6)) & 0x1f03;
    this.r[3] = ((t2 >>> 7) | (t3 << 9)) & 0x1fff;
    this.r[4] = ((t3 >>> 4) | (t4 << 12)) & 0x00ff;
    this.r[5] = (t4 >>> 1) & 0x1ffe;
    this.r[6] = ((t4 >>> 14) | (t5 << 2)) & 0x1fff;
    this.r[7] = ((t5 >>> 11) | (t6 << 5)) & 0x1f81;
    this.r[8] = ((t6 >>> 8) | (t7 << 8)) & 0x1fff;
    this.r[9] = (t7 >>> 5) & 0x007f;
    for (let i = 0; i < 8; i++) this.pad[i] = u8to16(key, 16 + 2 * i);
  }

  private process(data: Uint8Array, offset: number, isLast = false) {
    const hibit = isLast ? 0 : 1 << 11;
    const { h, r } = this;
    const r0 = r[0];
    const r1 = r[1];
    const r2 = r[2];
    const r3 = r[3];
    const r4 = r[4];
    const r5 = r[5];
    const r6 = r[6];
    const r7 = r[7];
    const r8 = r[8];
    const r9 = r[9];

    const t0 = u8to16(data, offset + 0);
    const t1 = u8to16(data, offset + 2);
    const t2 = u8to16(data, offset + 4);
    const t3 = u8to16(data, offset + 6);
    const t4 = u8to16(data, offset + 8);
    const t5 = u8to16(data, offset + 10);
    const t6 = u8to16(data, offset + 12);
    const t7 = u8to16(data, offset + 14);

    let h0 = h[0] + (t0 & 0x1fff);
    let h1 = h[1] + (((t0 >>> 13) | (t1 << 3)) & 0x1fff);
    let h2 = h[2] + (((t1 >>> 10) | (t2 << 6)) & 0x1fff);
    let h3 = h[3] + (((t2 >>> 7) | (t3 << 9)) & 0x1fff);
    let h4 = h[4] + (((t3 >>> 4) | (t4 << 12)) & 0x1fff);
    let h5 = h[5] + ((t4 >>> 1) & 0x1fff);
    let h6 = h[6] + (((t4 >>> 14) | (t5 << 2)) & 0x1fff);
    let h7 = h[7] + (((t5 >>> 11) | (t6 << 5)) & 0x1fff);
    let h8 = h[8] + (((t6 >>> 8) | (t7 << 8)) & 0x1fff);
    let h9 = h[9] + ((t7 >>> 5) | hibit);

    let c = 0;

    let d0 = c + h0 * r0 + h1 * (5 * r9) + h2 * (5 * r8) + h3 * (5 * r7) + h4 * (5 * r6);
    c = d0 >>> 13;
    d0 &= 0x1fff;
    d0 += h5 * (5 * r5) + h6 * (5 * r4) + h7 * (5 * r3) + h8 * (5 * r2) + h9 * (5 * r1);
    c += d0 >>> 13;
    d0 &= 0x1fff;

    let d1 = c + h0 * r1 + h1 * r0 + h2 * (5 * r9) + h3 * (5 * r8) + h4 * (5 * r7);
    c = d1 >>> 13;
    d1 &= 0x1fff;
    d1 += h5 * (5 * r6) + h6 * (5 * r5) + h7 * (5 * r4) + h8 * (5 * r3) + h9 * (5 * r2);
    c += d1 >>> 13;
    d1 &= 0x1fff;

    let d2 = c + h0 * r2 + h1 * r1 + h2 * r0 + h3 * (5 * r9) + h4 * (5 * r8);
    c = d2 >>> 13;
    d2 &= 0x1fff;
    d2 += h5 * (5 * r7) + h6 * (5 * r6) + h7 * (5 * r5) + h8 * (5 * r4) + h9 * (5 * r3);
    c += d2 >>> 13;
    d2 &= 0x1fff;

    let d3 = c + h0 * r3 + h1 * r2 + h2 * r1 + h3 * r0 + h4 * (5 * r9);
    c = d3 >>> 13;
    d3 &= 0x1fff;
    d3 += h5 * (5 * r8) + h6 * (5 * r7) + h7 * (5 * r6) + h8 * (5 * r5) + h9 * (5 * r4);
    c += d3 >>> 13;
    d3 &= 0x1fff;

    let d4 = c + h0 * r4 + h1 * r3 + h2 * r2 + h3 * r1 + h4 * r0;
    c = d4 >>> 13;
    d4 &= 0x1fff;
    d4 += h5 * (5 * r9) + h6 * (5 * r8) + h7 * (5 * r7) + h8 * (5 * r6) + h9 * (5 * r5);
    c += d4 >>> 13;
    d4 &= 0x1fff;

    let d5 = c + h0 * r5 + h1 * r4 + h2 * r3 + h3 * r2 + h4 * r1;
    c = d5 >>> 13;
    d5 &= 0x1fff;
    d5 += h5 * r0 + h6 * (5 * r9) + h7 * (5 * r8) + h8 * (5 * r7) + h9 * (5 * r6);
    c += d5 >>> 13;
    d5 &= 0x1fff;

    let d6 = c + h0 * r6 + h1 * r5 + h2 * r4 + h3 * r3 + h4 * r2;
    c = d6 >>> 13;
    d6 &= 0x1fff;
    d6 += h5 * r1 + h6 * r0 + h7 * (5 * r9) + h8 * (5 * r8) + h9 * (5 * r7);
    c += d6 >>> 13;
    d6 &= 0x1fff;

    let d7 = c + h0 * r7 + h1 * r6 + h2 * r5 + h3 * r4 + h4 * r3;
    c = d7 >>> 13;
    d7 &= 0x1fff;
    d7 += h5 * r2 + h6 * r1 + h7 * r0 + h8 * (5 * r9) + h9 * (5 * r8);
    c += d7 >>> 13;
    d7 &= 0x1fff;

    let d8 = c + h0 * r8 + h1 * r7 + h2 * r6 + h3 * r5 + h4 * r4;
    c = d8 >>> 13;
    d8 &= 0x1fff;
    d8 += h5 * r3 + h6 * r2 + h7 * r1 + h8 * r0 + h9 * (5 * r9);
    c += d8 >>> 13;
    d8 &= 0x1fff;

    let d9 = c + h0 * r9 + h1 * r8 + h2 * r7 + h3 * r6 + h4 * r5;
    c = d9 >>> 13;
    d9 &= 0x1fff;
    d9 += h5 * r4 + h6 * r3 + h7 * r2 + h8 * r1 + h9 * r0;
    c += d9 >>> 13;
    d9 &= 0x1fff;

    c = ((c << 2) + c) | 0;
    c = (c + d0) | 0;
    d0 = c & 0x1fff;
    c = c >>> 13;
    d1 += c;

    h[0] = d0;
    h[1] = d1;
    h[2] = d2;
    h[3] = d3;
    h[4] = d4;
    h[5] = d5;
    h[6] = d6;
    h[7] = d7;
    h[8] = d8;
    h[9] = d9;
  }

  private finalize() {
    const { h, pad } = this;
    const g = new Uint16Array(10);
    let c = h[1] >>> 13;
    h[1] &= 0x1fff;
    for (let i = 2; i < 10; i++) {
      h[i] += c;
      c = h[i] >>> 13;
      h[i] &= 0x1fff;
    }
    h[0] += c * 5;
    c = h[0] >>> 13;
    h[0] &= 0x1fff;
    h[1] += c;
    c = h[1] >>> 13;
    h[1] &= 0x1fff;
    h[2] += c;

    g[0] = h[0] + 5;
    c = g[0] >>> 13;
    g[0] &= 0x1fff;
    for (let i = 1; i < 10; i++) {
      g[i] = h[i] + c;
      c = g[i] >>> 13;
      g[i] &= 0x1fff;
    }
    g[9] -= 1 << 13;

    let mask = (c ^ 1) - 1;
    for (let i = 0; i < 10; i++) g[i] &= mask;
    mask = ~mask;
    for (let i = 0; i < 10; i++) h[i] = (h[i] & mask) | g[i];
    h[0] = (h[0] | (h[1] << 13)) & 0xffff;
    h[1] = ((h[1] >>> 3) | (h[2] << 10)) & 0xffff;
    h[2] = ((h[2] >>> 6) | (h[3] << 7)) & 0xffff;
    h[3] = ((h[3] >>> 9) | (h[4] << 4)) & 0xffff;
    h[4] = ((h[4] >>> 12) | (h[5] << 1) | (h[6] << 14)) & 0xffff;
    h[5] = ((h[6] >>> 2) | (h[7] << 11)) & 0xffff;
    h[6] = ((h[7] >>> 5) | (h[8] << 8)) & 0xffff;
    h[7] = ((h[8] >>> 8) | (h[9] << 5)) & 0xffff;

    let f = h[0] + pad[0];
    h[0] = f & 0xffff;
    for (let i = 1; i < 8; i++) {
      f = (((h[i] + pad[i]) | 0) + (f >>> 16)) | 0;
      h[i] = f & 0xffff;
    }
    clean(g);
  }
  update(data: Input): this {
    aexists(this);
    data = toBytes(data);
    abytes(data);
    const { buffer, blockLen } = this;
    const len = data.length;

    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      // Fast path: we have at least one block in input
      if (take === blockLen) {
        for (; blockLen <= len - pos; pos += blockLen) this.process(data, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(buffer, 0, false);
        this.pos = 0;
      }
    }
    return this;
  }
  destroy() {
    clean(this.h, this.r, this.buffer, this.pad);
  }
  digestInto(out: Uint8Array) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, h } = this;
    let { pos } = this;
    if (pos) {
      buffer[pos++] = 1;
      for (; pos < 16; pos++) buffer[pos] = 0;
      this.process(buffer, 0, true);
    }
    this.finalize();
    let opos = 0;
    for (let i = 0; i < 8; i++) {
      out[opos++] = h[i] >>> 0;
      out[opos++] = h[i] >>> 8;
    }
    return out;
  }
  digest(): Uint8Array {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
}

export type CHash = ReturnType<typeof wrapConstructorWithKey>;
export function wrapConstructorWithKey<H extends Hash<H>>(
  hashCons: (key: Input) => Hash<H>
): {
  (msg: Input, key: Input): Uint8Array;
  outputLen: number;
  blockLen: number;
  create(key: Input): Hash<H>;
} {
  const hashC = (msg: Input, key: Input): Uint8Array => hashCons(key).update(toBytes(msg)).digest();
  const tmp = hashCons(new Uint8Array(32));
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (key: Input) => hashCons(key);
  return hashC;
}

/** Poly1305 MAC from RFC 8439. */
export const poly1305: CHash = wrapConstructorWithKey((key) => new Poly1305(key));
