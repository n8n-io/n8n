/**
 * Argon2 KDF from RFC 9106. Can be used to create a key from password and salt.
 * We suggest to use Scrypt. JS Argon is 2-10x slower than native code because of 64-bitness:
 * * argon uses uint64, but JS doesn't have fast uint64array
 * * uint64 multiplication is 1/3 of time
 * * `P` function would be very nice with u64, because most of value will be in registers,
 *   hovewer with u32 it will require 32 registers, which is too much.
 * * JS arrays do slow bound checks, so reading from `A2_BUF` slows it down
 * @module
 */
import { add3H, add3L, rotr32H, rotr32L, rotrBH, rotrBL, rotrSH, rotrSL } from './_u64.ts';
import { blake2b } from './blake2.ts';
import { abytes, clean, kdfInputToBytes, nextTick, u32, u8, type KDFInput } from './utils.ts';

const AT = { Argond2d: 0, Argon2i: 1, Argon2id: 2 } as const;
type Types = (typeof AT)[keyof typeof AT];

const ARGON2_SYNC_POINTS = 4;
const abytesOrZero = (buf?: KDFInput) => {
  if (buf === undefined) return Uint8Array.of();
  return kdfInputToBytes(buf);
};

// u32 * u32 = u64
function mul(a: number, b: number) {
  const aL = a & 0xffff;
  const aH = a >>> 16;
  const bL = b & 0xffff;
  const bH = b >>> 16;
  const ll = Math.imul(aL, bL);
  const hl = Math.imul(aH, bL);
  const lh = Math.imul(aL, bH);
  const hh = Math.imul(aH, bH);
  const carry = (ll >>> 16) + (hl & 0xffff) + lh;
  const high = (hh + (hl >>> 16) + (carry >>> 16)) | 0;
  const low = (carry << 16) | (ll & 0xffff);
  return { h: high, l: low };
}

function mul2(a: number, b: number) {
  // 2 * a * b (via shifts)
  const { h, l } = mul(a, b);
  return { h: ((h << 1) | (l >>> 31)) & 0xffff_ffff, l: (l << 1) & 0xffff_ffff };
}

// BlaMka permutation for Argon2
// A + B + (2 * u32(A) * u32(B))
function blamka(Ah: number, Al: number, Bh: number, Bl: number) {
  const { h: Ch, l: Cl } = mul2(Al, Bl);
  // A + B + (2 * A * B)
  const Rll = add3L(Al, Bl, Cl);
  return { h: add3H(Rll, Ah, Bh, Ch), l: Rll | 0 };
}

// Temporary block buffer
const A2_BUF = new Uint32Array(256); // 1024 bytes (matrix 16x16)

function G(a: number, b: number, c: number, d: number) {
  let Al = A2_BUF[2*a], Ah = A2_BUF[2*a + 1]; // prettier-ignore
  let Bl = A2_BUF[2*b], Bh = A2_BUF[2*b + 1]; // prettier-ignore
  let Cl = A2_BUF[2*c], Ch = A2_BUF[2*c + 1]; // prettier-ignore
  let Dl = A2_BUF[2*d], Dh = A2_BUF[2*d + 1]; // prettier-ignore

  ({ h: Ah, l: Al } = blamka(Ah, Al, Bh, Bl));
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: rotr32H(Dh, Dl), Dl: rotr32L(Dh, Dl) });

  ({ h: Ch, l: Cl } = blamka(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: rotrSH(Bh, Bl, 24), Bl: rotrSL(Bh, Bl, 24) });

  ({ h: Ah, l: Al } = blamka(Ah, Al, Bh, Bl));
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: rotrSH(Dh, Dl, 16), Dl: rotrSL(Dh, Dl, 16) });

  ({ h: Ch, l: Cl } = blamka(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: rotrBH(Bh, Bl, 63), Bl: rotrBL(Bh, Bl, 63) });

  (A2_BUF[2 * a] = Al), (A2_BUF[2 * a + 1] = Ah);
  (A2_BUF[2 * b] = Bl), (A2_BUF[2 * b + 1] = Bh);
  (A2_BUF[2 * c] = Cl), (A2_BUF[2 * c + 1] = Ch);
  (A2_BUF[2 * d] = Dl), (A2_BUF[2 * d + 1] = Dh);
}

// prettier-ignore
function P(
  v00: number, v01: number, v02: number, v03: number, v04: number, v05: number, v06: number, v07: number,
  v08: number, v09: number, v10: number, v11: number, v12: number, v13: number, v14: number, v15: number,
) {
  G(v00, v04, v08, v12);
  G(v01, v05, v09, v13);
  G(v02, v06, v10, v14);
  G(v03, v07, v11, v15);
  G(v00, v05, v10, v15);
  G(v01, v06, v11, v12);
  G(v02, v07, v08, v13);
  G(v03, v04, v09, v14);
}

function block(x: Uint32Array, xPos: number, yPos: number, outPos: number, needXor: boolean) {
  for (let i = 0; i < 256; i++) A2_BUF[i] = x[xPos + i] ^ x[yPos + i];
  // columns (8)
  for (let i = 0; i < 128; i += 16) {
    // prettier-ignore
    P(
      i, i + 1, i + 2, i + 3, i + 4, i + 5, i + 6, i + 7,
      i + 8, i + 9, i + 10, i + 11, i + 12, i + 13, i + 14, i + 15
    );
  }
  // rows (8)
  for (let i = 0; i < 16; i += 2) {
    // prettier-ignore
    P(
      i, i + 1, i + 16, i + 17, i + 32, i + 33, i + 48, i + 49,
      i + 64, i + 65, i + 80, i + 81, i + 96, i + 97, i + 112, i + 113
    );
  }

  if (needXor) for (let i = 0; i < 256; i++) x[outPos + i] ^= A2_BUF[i] ^ x[xPos + i] ^ x[yPos + i];
  else for (let i = 0; i < 256; i++) x[outPos + i] = A2_BUF[i] ^ x[xPos + i] ^ x[yPos + i];
  clean(A2_BUF);
}

// Variable-Length Hash Function H'
function Hp(A: Uint32Array, dkLen: number) {
  const A8 = u8(A);
  const T = new Uint32Array(1);
  const T8 = u8(T);
  T[0] = dkLen;
  // Fast path
  if (dkLen <= 64) return blake2b.create({ dkLen }).update(T8).update(A8).digest();
  const out = new Uint8Array(dkLen);
  let V = blake2b.create({}).update(T8).update(A8).digest();
  let pos = 0;
  // First block
  out.set(V.subarray(0, 32));
  pos += 32;
  // Rest blocks
  for (; dkLen - pos > 64; pos += 32) {
    const Vh = blake2b.create({}).update(V);
    Vh.digestInto(V);
    Vh.destroy();
    out.set(V.subarray(0, 32), pos);
  }
  // Last block
  out.set(blake2b(V, { dkLen: dkLen - pos }), pos);
  clean(V, T);
  return u32(out);
}

// Used only inside process block!
function indexAlpha(
  r: number,
  s: number,
  laneLen: number,
  segmentLen: number,
  index: number,
  randL: number,
  sameLane: boolean = false
) {
  // This is ugly, but close enough to reference implementation.
  let area: number;
  if (r === 0) {
    if (s === 0) area = index - 1;
    else if (sameLane) area = s * segmentLen + index - 1;
    else area = s * segmentLen + (index == 0 ? -1 : 0);
  } else if (sameLane) area = laneLen - segmentLen + index - 1;
  else area = laneLen - segmentLen + (index == 0 ? -1 : 0);
  const startPos = r !== 0 && s !== ARGON2_SYNC_POINTS - 1 ? (s + 1) * segmentLen : 0;
  const rel = area - 1 - mul(area, mul(randL, randL).h).h;
  return (startPos + rel) % laneLen;
}

/**
 * Argon2 options.
 * * t: time cost, m: mem cost in kb, p: parallelization.
 * * key: optional key. personalization: arbitrary extra data.
 * * dkLen: desired number of output bytes.
 */
export type ArgonOpts = {
  t: number; // Time cost, iterations count
  m: number; // Memory cost (in KB)
  p: number; // Parallelization parameter
  version?: number; // Default: 0x13 (19)
  key?: KDFInput; // Optional key
  personalization?: KDFInput; // Optional arbitrary extra data
  dkLen?: number; // Desired number of returned bytes
  asyncTick?: number; // Maximum time in ms for which async function can block execution
  maxmem?: number;
  onProgress?: (progress: number) => void;
};

const maxUint32 = Math.pow(2, 32);
function isU32(num: number) {
  return Number.isSafeInteger(num) && num >= 0 && num < maxUint32;
}

function argon2Opts(opts: ArgonOpts) {
  const merged: any = {
    version: 0x13,
    dkLen: 32,
    maxmem: maxUint32 - 1,
    asyncTick: 10,
  };
  for (let [k, v] of Object.entries(opts)) if (v != null) merged[k] = v;

  const { dkLen, p, m, t, version, onProgress } = merged;
  if (!isU32(dkLen) || dkLen < 4) throw new Error('dkLen should be at least 4 bytes');
  if (!isU32(p) || p < 1 || p >= Math.pow(2, 24)) throw new Error('p should be 1 <= p < 2^24');
  if (!isU32(m)) throw new Error('m should be 0 <= m < 2^32');
  if (!isU32(t) || t < 1) throw new Error('t (iterations) should be 1 <= t < 2^32');
  if (onProgress !== undefined && typeof onProgress !== 'function')
    throw new Error('progressCb should be function');
  /*
  Memory size m MUST be an integer number of kibibytes from 8*p to 2^(32)-1. The actual number of blocks is m', which is m rounded down to the nearest multiple of 4*p.
  */
  if (!isU32(m) || m < 8 * p) throw new Error('memory should be at least 8*p bytes');
  if (version !== 0x10 && version !== 0x13) throw new Error('unknown version=' + version);
  return merged;
}

function argon2Init(password: KDFInput, salt: KDFInput, type: Types, opts: ArgonOpts) {
  password = kdfInputToBytes(password);
  salt = kdfInputToBytes(salt);
  abytes(password);
  abytes(salt);
  if (!isU32(password.length)) throw new Error('password should be less than 4 GB');
  if (!isU32(salt.length) || salt.length < 8)
    throw new Error('salt should be at least 8 bytes and less than 4 GB');
  if (!Object.values(AT).includes(type)) throw new Error('invalid type');
  let { p, dkLen, m, t, version, key, personalization, maxmem, onProgress, asyncTick } =
    argon2Opts(opts);

  // Validation
  key = abytesOrZero(key);
  personalization = abytesOrZero(personalization);
  // H_0 = H^(64)(LE32(p) || LE32(T) || LE32(m) || LE32(t) ||
  //       LE32(v) || LE32(y) || LE32(length(P)) || P ||
  //       LE32(length(S)) || S ||  LE32(length(K)) || K ||
  //       LE32(length(X)) || X)
  const h = blake2b.create({});
  const BUF = new Uint32Array(1);
  const BUF8 = u8(BUF);
  for (let item of [p, dkLen, m, t, version, type]) {
    BUF[0] = item;
    h.update(BUF8);
  }
  for (let i of [password, salt, key, personalization]) {
    BUF[0] = i.length; // BUF is u32 array, this is valid
    h.update(BUF8).update(i);
  }
  const H0 = new Uint32Array(18);
  const H0_8 = u8(H0);
  h.digestInto(H0_8);
  // 256 u32 = 1024 (BLOCK_SIZE), fills A2_BUF on processing

  // Params
  const lanes = p;
  // m' = 4 * p * floor (m / 4p)
  const mP = 4 * p * Math.floor(m / (ARGON2_SYNC_POINTS * p));
  //q = m' / p columns
  const laneLen = Math.floor(mP / p);
  const segmentLen = Math.floor(laneLen / ARGON2_SYNC_POINTS);
  const memUsed = mP * 256;
  if (!isU32(maxmem) || memUsed > maxmem)
    throw new Error(
      'mem should be less than 2**32, got: maxmem=' + maxmem + ', memused=' + memUsed
    );
  const B = new Uint32Array(memUsed);
  // Fill first blocks
  for (let l = 0; l < p; l++) {
    const i = 256 * laneLen * l;
    // B[i][0] = H'^(1024)(H_0 || LE32(0) || LE32(i))
    H0[17] = l;
    H0[16] = 0;
    B.set(Hp(H0, 1024), i);
    // B[i][1] = H'^(1024)(H_0 || LE32(1) || LE32(i))
    H0[16] = 1;
    B.set(Hp(H0, 1024), i + 256);
  }
  let perBlock = () => {};
  if (onProgress) {
    const totalBlock = t * ARGON2_SYNC_POINTS * p * segmentLen;
    // Invoke callback if progress changes from 10.01 to 10.02
    // Allows to draw smooth progress bar on up to 8K screen
    const callbackPer = Math.max(Math.floor(totalBlock / 10000), 1);
    let blockCnt = 0;
    perBlock = () => {
      blockCnt++;
      if (onProgress && (!(blockCnt % callbackPer) || blockCnt === totalBlock))
        onProgress(blockCnt / totalBlock);
    };
  }
  clean(BUF, H0);
  return { type, mP, p, t, version, B, laneLen, lanes, segmentLen, dkLen, perBlock, asyncTick };
}

function argon2Output(B: Uint32Array, p: number, laneLen: number, dkLen: number) {
  const B_final = new Uint32Array(256);
  for (let l = 0; l < p; l++)
    for (let j = 0; j < 256; j++) B_final[j] ^= B[256 * (laneLen * l + laneLen - 1) + j];
  const res = u8(Hp(B_final, dkLen));
  clean(B_final);
  return res;
}

function processBlock(
  B: Uint32Array,
  address: Uint32Array,
  l: number,
  r: number,
  s: number,
  index: number,
  laneLen: number,
  segmentLen: number,
  lanes: number,
  offset: number,
  prev: number,
  dataIndependent: boolean,
  needXor: boolean
) {
  if (offset % laneLen) prev = offset - 1;
  let randL, randH;
  if (dataIndependent) {
    let i128 = index % 128;
    if (i128 === 0) {
      address[256 + 12]++;
      block(address, 256, 2 * 256, 0, false);
      block(address, 0, 2 * 256, 0, false);
    }
    randL = address[2 * i128];
    randH = address[2 * i128 + 1];
  } else {
    const T = 256 * prev;
    randL = B[T];
    randH = B[T + 1];
  }
  // address block
  const refLane = r === 0 && s === 0 ? l : randH % lanes;
  const refPos = indexAlpha(r, s, laneLen, segmentLen, index, randL, refLane == l);
  const refBlock = laneLen * refLane + refPos;
  // B[i][j] = G(B[i][j-1], B[l][z])
  block(B, 256 * prev, 256 * refBlock, offset * 256, needXor);
}

function argon2(type: Types, password: KDFInput, salt: KDFInput, opts: ArgonOpts) {
  const { mP, p, t, version, B, laneLen, lanes, segmentLen, dkLen, perBlock } = argon2Init(
    password,
    salt,
    type,
    opts
  );
  // Pre-loop setup
  // [address, input, zero_block] format so we can pass single U32 to block function
  const address = new Uint32Array(3 * 256);
  address[256 + 6] = mP;
  address[256 + 8] = t;
  address[256 + 10] = type;
  for (let r = 0; r < t; r++) {
    const needXor = r !== 0 && version === 0x13;
    address[256 + 0] = r;
    for (let s = 0; s < ARGON2_SYNC_POINTS; s++) {
      address[256 + 4] = s;
      const dataIndependent = type == AT.Argon2i || (type == AT.Argon2id && r === 0 && s < 2);
      for (let l = 0; l < p; l++) {
        address[256 + 2] = l;
        address[256 + 12] = 0;
        let startPos = 0;
        if (r === 0 && s === 0) {
          startPos = 2;
          if (dataIndependent) {
            address[256 + 12]++;
            block(address, 256, 2 * 256, 0, false);
            block(address, 0, 2 * 256, 0, false);
          }
        }
        // current block postion
        let offset = l * laneLen + s * segmentLen + startPos;
        // previous block position
        let prev = offset % laneLen ? offset - 1 : offset + laneLen - 1;
        for (let index = startPos; index < segmentLen; index++, offset++, prev++) {
          perBlock();
          processBlock(
            B,
            address,
            l,
            r,
            s,
            index,
            laneLen,
            segmentLen,
            lanes,
            offset,
            prev,
            dataIndependent,
            needXor
          );
        }
      }
    }
  }
  clean(address);
  return argon2Output(B, p, laneLen, dkLen);
}

/** argon2d GPU-resistant version. */
export const argon2d = (password: KDFInput, salt: KDFInput, opts: ArgonOpts): Uint8Array =>
  argon2(AT.Argond2d, password, salt, opts);
/** argon2i side-channel-resistant version. */
export const argon2i = (password: KDFInput, salt: KDFInput, opts: ArgonOpts): Uint8Array =>
  argon2(AT.Argon2i, password, salt, opts);
/** argon2id, combining i+d, the most popular version from RFC 9106 */
export const argon2id = (password: KDFInput, salt: KDFInput, opts: ArgonOpts): Uint8Array =>
  argon2(AT.Argon2id, password, salt, opts);

async function argon2Async(type: Types, password: KDFInput, salt: KDFInput, opts: ArgonOpts) {
  const { mP, p, t, version, B, laneLen, lanes, segmentLen, dkLen, perBlock, asyncTick } =
    argon2Init(password, salt, type, opts);
  // Pre-loop setup
  // [address, input, zero_block] format so we can pass single U32 to block function
  const address = new Uint32Array(3 * 256);
  address[256 + 6] = mP;
  address[256 + 8] = t;
  address[256 + 10] = type;
  let ts = Date.now();
  for (let r = 0; r < t; r++) {
    const needXor = r !== 0 && version === 0x13;
    address[256 + 0] = r;
    for (let s = 0; s < ARGON2_SYNC_POINTS; s++) {
      address[256 + 4] = s;
      const dataIndependent = type == AT.Argon2i || (type == AT.Argon2id && r === 0 && s < 2);
      for (let l = 0; l < p; l++) {
        address[256 + 2] = l;
        address[256 + 12] = 0;
        let startPos = 0;
        if (r === 0 && s === 0) {
          startPos = 2;
          if (dataIndependent) {
            address[256 + 12]++;
            block(address, 256, 2 * 256, 0, false);
            block(address, 0, 2 * 256, 0, false);
          }
        }
        // current block postion
        let offset = l * laneLen + s * segmentLen + startPos;
        // previous block position
        let prev = offset % laneLen ? offset - 1 : offset + laneLen - 1;
        for (let index = startPos; index < segmentLen; index++, offset++, prev++) {
          perBlock();
          processBlock(
            B,
            address,
            l,
            r,
            s,
            index,
            laneLen,
            segmentLen,
            lanes,
            offset,
            prev,
            dataIndependent,
            needXor
          );
          // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
          const diff = Date.now() - ts;
          if (!(diff >= 0 && diff < asyncTick)) {
            await nextTick();
            ts += diff;
          }
        }
      }
    }
  }
  clean(address);
  return argon2Output(B, p, laneLen, dkLen);
}

/** argon2d async GPU-resistant version. */
export const argon2dAsync = (
  password: KDFInput,
  salt: KDFInput,
  opts: ArgonOpts
): Promise<Uint8Array> => argon2Async(AT.Argond2d, password, salt, opts);
/** argon2i async side-channel-resistant version. */
export const argon2iAsync = (
  password: KDFInput,
  salt: KDFInput,
  opts: ArgonOpts
): Promise<Uint8Array> => argon2Async(AT.Argon2i, password, salt, opts);
/** argon2id async, combining i+d, the most popular version from RFC 9106 */
export const argon2idAsync = (
  password: KDFInput,
  salt: KDFInput,
  opts: ArgonOpts
): Promise<Uint8Array> => argon2Async(AT.Argon2id, password, salt, opts);
