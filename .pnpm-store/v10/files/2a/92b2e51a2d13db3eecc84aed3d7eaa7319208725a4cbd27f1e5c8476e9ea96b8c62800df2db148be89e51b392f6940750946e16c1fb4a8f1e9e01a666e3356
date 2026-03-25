/**
 * Internal helpers for u64. BigUint64Array is too slow as per 2025, so we implement it using Uint32Array.
 * @todo re-check https://issues.chromium.org/issues/42212588
 * @module
 */
const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
const _32n = /* @__PURE__ */ BigInt(32);

function fromBig(
  n: bigint,
  le = false
): {
  h: number;
  l: number;
} {
  if (le) return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
  return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}

function split(lst: bigint[], le = false): Uint32Array[] {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}

const toBig = (h: number, l: number): bigint => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
// for Shift in [0, 32)
const shrSH = (h: number, _l: number, s: number): number => h >>> s;
const shrSL = (h: number, l: number, s: number): number => (h << (32 - s)) | (l >>> s);
// Right rotate for Shift in [1, 32)
const rotrSH = (h: number, l: number, s: number): number => (h >>> s) | (l << (32 - s));
const rotrSL = (h: number, l: number, s: number): number => (h << (32 - s)) | (l >>> s);
// Right rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotrBH = (h: number, l: number, s: number): number => (h << (64 - s)) | (l >>> (s - 32));
const rotrBL = (h: number, l: number, s: number): number => (h >>> (s - 32)) | (l << (64 - s));
// Right rotate for shift===32 (just swaps l&h)
const rotr32H = (_h: number, l: number): number => l;
const rotr32L = (h: number, _l: number): number => h;
// Left rotate for Shift in [1, 32)
const rotlSH = (h: number, l: number, s: number): number => (h << s) | (l >>> (32 - s));
const rotlSL = (h: number, l: number, s: number): number => (l << s) | (h >>> (32 - s));
// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotlBH = (h: number, l: number, s: number): number => (l << (s - 32)) | (h >>> (64 - s));
const rotlBL = (h: number, l: number, s: number): number => (h << (s - 32)) | (l >>> (64 - s));

// JS uses 32-bit signed integers for bitwise operations which means we cannot
// simple take carry out of low bit sum by shift, we need to use division.
function add(
  Ah: number,
  Al: number,
  Bh: number,
  Bl: number
): {
  h: number;
  l: number;
} {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
}
// Addition with more than 2 elements
const add3L = (Al: number, Bl: number, Cl: number): number => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
const add3H = (low: number, Ah: number, Bh: number, Ch: number): number =>
  (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
const add4L = (Al: number, Bl: number, Cl: number, Dl: number): number =>
  (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
const add4H = (low: number, Ah: number, Bh: number, Ch: number, Dh: number): number =>
  (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
const add5L = (Al: number, Bl: number, Cl: number, Dl: number, El: number): number =>
  (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
const add5H = (low: number, Ah: number, Bh: number, Ch: number, Dh: number, Eh: number): number =>
  (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;

// prettier-ignore
export {
  add, add3H, add3L, add4H, add4L, add5H, add5L, fromBig, rotlBH, rotlBL, rotlSH, rotlSL, rotr32H, rotr32L, rotrBH, rotrBL, rotrSH, rotrSL, shrSH, shrSL, split, toBig
};
// prettier-ignore
const u64: { fromBig: typeof fromBig; split: typeof split; toBig: (h: number, l: number) => bigint; shrSH: (h: number, _l: number, s: number) => number; shrSL: (h: number, l: number, s: number) => number; rotrSH: (h: number, l: number, s: number) => number; rotrSL: (h: number, l: number, s: number) => number; rotrBH: (h: number, l: number, s: number) => number; rotrBL: (h: number, l: number, s: number) => number; rotr32H: (_h: number, l: number) => number; rotr32L: (h: number, _l: number) => number; rotlSH: (h: number, l: number, s: number) => number; rotlSL: (h: number, l: number, s: number) => number; rotlBH: (h: number, l: number, s: number) => number; rotlBL: (h: number, l: number, s: number) => number; add: typeof add; add3L: (Al: number, Bl: number, Cl: number) => number; add3H: (low: number, Ah: number, Bh: number, Ch: number) => number; add4L: (Al: number, Bl: number, Cl: number, Dl: number) => number; add4H: (low: number, Ah: number, Bh: number, Ch: number, Dh: number) => number; add5H: (low: number, Ah: number, Bh: number, Ch: number, Dh: number, Eh: number) => number; add5L: (Al: number, Bl: number, Cl: number, Dl: number, El: number) => number; } = {
  fromBig, split, toBig,
  shrSH, shrSL,
  rotrSH, rotrSL, rotrBH, rotrBL,
  rotr32H, rotr32L,
  rotlSH, rotlSL, rotlBH, rotlBL,
  add, add3L, add3H, add4L, add4H, add5H, add5L,
};
export default u64;
