import {
  EPSILON,
  MathAbs,
  NativeArrayBuffer,
  NativeFloat32Array,
  NativeUint16Array,
  NativeUint32Array,
  NativeUint8Array,
  NumberIsFinite,
  NumberIsNaN,
} from "./primordials.mjs";

const INVERSE_OF_EPSILON = 1 / EPSILON;

/**
 * rounds to the nearest value;
 * if the number falls midway, it is rounded to the nearest value with an even least significant digit
 * @param {number} num
 * @returns {number}
 */
function roundTiesToEven(num) {
  return (num + INVERSE_OF_EPSILON) - INVERSE_OF_EPSILON;
}

const FLOAT16_MIN_VALUE = 6.103515625e-05;
const FLOAT16_MAX_VALUE = 65504;
const FLOAT16_EPSILON = 0.0009765625;

const FLOAT16_EPSILON_MULTIPLIED_BY_FLOAT16_MIN_VALUE = FLOAT16_EPSILON * FLOAT16_MIN_VALUE;
const FLOAT16_EPSILON_DEVIDED_BY_EPSILON = FLOAT16_EPSILON * INVERSE_OF_EPSILON;

/**
 * round a number to a half float number
 * @param {unknown} num - double float
 * @returns {number} half float number
 */
export function roundToFloat16(num) {
  const number = +num;

  // NaN, Infinity, -Infinity, 0, -0
  if (!NumberIsFinite(number) || number === 0) {
    return number;
  }

  // finite except 0, -0
  const sign = number > 0 ? 1 : -1;
  const absolute = MathAbs(number);

  // small number
  if (absolute < FLOAT16_MIN_VALUE) {
    return sign * roundTiesToEven(absolute / FLOAT16_EPSILON_MULTIPLIED_BY_FLOAT16_MIN_VALUE) * FLOAT16_EPSILON_MULTIPLIED_BY_FLOAT16_MIN_VALUE;
  }

  const temp = (1 + FLOAT16_EPSILON_DEVIDED_BY_EPSILON) * absolute;
  const result = temp - (temp - absolute);

  // large number
  if (result > FLOAT16_MAX_VALUE || NumberIsNaN(result)) {
    return sign * Infinity;
  }

  return sign * result;
}

// base algorithm: http://fox-toolkit.org/ftp/fasthalffloatconversion.pdf

const buffer = new NativeArrayBuffer(4);
const floatView = new NativeFloat32Array(buffer);
const uint32View = new NativeUint32Array(buffer);

const baseTable = new NativeUint16Array(512);
const shiftTable = new NativeUint8Array(512);

for (let i = 0; i < 256; ++i) {
  const e = i - 127;

  // very small number (0, -0)
  if (e < -24) {
    baseTable[i]         = 0x0000;
    baseTable[i | 0x100] = 0x8000;
    shiftTable[i]         = 24;
    shiftTable[i | 0x100] = 24;

  // small number (denorm)
  } else if (e < -14) {
    baseTable[i]         =  0x0400 >> (-e - 14);
    baseTable[i | 0x100] = (0x0400 >> (-e - 14)) | 0x8000;
    shiftTable[i]         = -e - 1;
    shiftTable[i | 0x100] = -e - 1;

  // normal number
  } else if (e <= 15) {
    baseTable[i]         =  (e + 15) << 10;
    baseTable[i | 0x100] = ((e + 15) << 10) | 0x8000;
    shiftTable[i]         = 13;
    shiftTable[i | 0x100] = 13;

  // large number (Infinity, -Infinity)
  } else if (e < 128) {
    baseTable[i]         = 0x7c00;
    baseTable[i | 0x100] = 0xfc00;
    shiftTable[i]         = 24;
    shiftTable[i | 0x100] = 24;

  // stay (NaN, Infinity, -Infinity)
  } else {
    baseTable[i]         = 0x7c00;
    baseTable[i | 0x100] = 0xfc00;
    shiftTable[i]         = 13;
    shiftTable[i | 0x100] = 13;
  }
}

/**
 * round a number to a half float number bits
 * @param {unknown} num - double float
 * @returns {number} half float number bits
 */
export function roundToFloat16Bits(num) {
  floatView[0] = roundToFloat16(num);
  const f = uint32View[0];
  const e = (f >> 23) & 0x1ff;
  return baseTable[e] + ((f & 0x007fffff) >> shiftTable[e]);
}

const mantissaTable = new NativeUint32Array(2048);
for (let i = 1; i < 1024; ++i) {
  let m = i << 13; // zero pad mantissa bits
  let e = 0; // zero exponent

  // normalized
  while ((m & 0x00800000) === 0) {
    m <<= 1;
    e -= 0x00800000; // decrement exponent
  }

  m &= ~0x00800000; // clear leading 1 bit
  e += 0x38800000; // adjust bias

  mantissaTable[i] = m | e;
}
for (let i = 1024; i < 2048; ++i) {
  mantissaTable[i] = 0x38000000 + ((i - 1024) << 13);
}

const exponentTable = new NativeUint32Array(64);
for (let i = 1; i < 31; ++i) {
  exponentTable[i] = i << 23;
}
exponentTable[31] = 0x47800000;
exponentTable[32] = 0x80000000;
for (let i = 33; i < 63; ++i) {
  exponentTable[i] = 0x80000000 + ((i - 32) << 23);
}
exponentTable[63] = 0xc7800000;

const offsetTable = new NativeUint16Array(64);
for (let i = 1; i < 64; ++i) {
  if (i !== 32) {
    offsetTable[i] = 1024;
  }
}

/**
 * convert a half float number bits to a number
 * @param {number} float16bits - half float number bits
 * @returns {number} double float
 */
export function convertToNumber(float16bits) {
  const i = float16bits >> 10;
  uint32View[0] = mantissaTable[offsetTable[i] + (float16bits & 0x3ff)] + exponentTable[i];
  return floatView[0];
}
