/*
 * Note 1: All the functions in this file guarantee only that the bottom 32-bits of the return value are correct.
 * JavaScript is flakey when it comes to bit operations and a '1' in the highest order bit of a 32-bit number causes
 * it to be interpreted as a negative number per two's complement.
 *
 * Note 2: Per the ECMAScript spec, all JavaScript operations mask the shift amount by 0x1F.  This results in weird
 * cases like 1 << 32 == 1 and 1 << 33 === 1 << 1 === 2
 */

/**
 * The 32-bit implementation of circular rotate left.
 *
 * @param x The 32-bit integer argument.
 * @param n The number of bits to shift.
 * @returns `x` shifted left circularly by `n` bits
 */
export function rotl_32(x: number, n: number): number {
  return (x << n) | (x >>> (32 - n));
}

/**
 * The 32-bit implementation of circular rotate right.
 *
 * @param x The 32-bit integer argument.
 * @param n The number of bits to shift.
 * @returns `x` shifted right circularly by `n` bits
 */
function rotr_32(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/**
 * The 32-bit implementation of shift right.
 *
 * @param x The 32-bit integer argument.
 * @param n The number of bits to shift.
 * @returns `x` shifted by `n` bits.
 */
function shr_32(x: number, n: number): number {
  return x >>> n;
}

/**
 * The 32-bit implementation of the NIST specified Parity function.
 *
 * @param x The first 32-bit integer argument.
 * @param y The second 32-bit integer argument.
 * @param z The third 32-bit integer argument.
 * @returns The NIST specified output of the function.
 */
export function parity_32(x: number, y: number, z: number): number {
  return x ^ y ^ z;
}

/**
 * The 32-bit implementation of the NIST specified Ch function.
 *
 * @param x The first 32-bit integer argument.
 * @param y The second 32-bit integer argument.
 * @param z The third 32-bit integer argument.
 * @returns The NIST specified output of the function.
 */
export function ch_32(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}

/**
 * The 32-bit implementation of the NIST specified Maj function.
 *
 * @param x The first 32-bit integer argument.
 * @param y The second 32-bit integer argument.
 * @param z The third 32-bit integer argument.
 * @returns The NIST specified output of the function.
 */
export function maj_32(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}

/**
 * The 32-bit implementation of the NIST specified Sigma0 function.
 *
 * @param x The 32-bit integer argument.
 * @returns The NIST specified output of the function.
 */
export function sigma0_32(x: number): number {
  return rotr_32(x, 2) ^ rotr_32(x, 13) ^ rotr_32(x, 22);
}

/**
 * Add two 32-bit integers.
 *
 * This uses 16-bit operations internally to work around sign problems due to JavaScript's lack of uint32 support.
 *
 * @param a The first 32-bit integer argument to be added.
 * @param b The second 32-bit integer argument to be added.
 * @returns The sum of `a` + `b`.
 */
export function safeAdd_32_2(a: number, b: number): number {
  const lsw = (a & 0xffff) + (b & 0xffff),
    msw = (a >>> 16) + (b >>> 16) + (lsw >>> 16);

  return ((msw & 0xffff) << 16) | (lsw & 0xffff);
}

/**
 * Add four 32-bit integers.
 *
 * This uses 16-bit operations internally to work around sign problems due to JavaScript's lack of uint32 support.
 *
 * @param a The first 32-bit integer argument to be added.
 * @param b The second 32-bit integer argument to be added.
 * @param c The third 32-bit integer argument to be added.
 * @param d The fourth 32-bit integer argument to be added.
 * @returns The sum of `a` + `b` + `c` + `d`.
 */
export function safeAdd_32_4(a: number, b: number, c: number, d: number): number {
  const lsw = (a & 0xffff) + (b & 0xffff) + (c & 0xffff) + (d & 0xffff),
    msw = (a >>> 16) + (b >>> 16) + (c >>> 16) + (d >>> 16) + (lsw >>> 16);

  return ((msw & 0xffff) << 16) | (lsw & 0xffff);
}

/**
 * Add five 32-bit integers.
 *
 * This uses 16-bit operations internally to work around sign problems due to JavaScript's lack of uint32 support.
 *
 * @param a The first 32-bit integer argument to be added.
 * @param b The second 32-bit integer argument to be added.
 * @param c The third 32-bit integer argument to be added.
 * @param d The fourth 32-bit integer argument to be added.
 * @param e The fifth 32-bit integer argument to be added.
 * @returns The sum of `a` + `b` + `c` + `d` + `e`.
 */
export function safeAdd_32_5(a: number, b: number, c: number, d: number, e: number): number {
  const lsw = (a & 0xffff) + (b & 0xffff) + (c & 0xffff) + (d & 0xffff) + (e & 0xffff),
    msw = (a >>> 16) + (b >>> 16) + (c >>> 16) + (d >>> 16) + (e >>> 16) + (lsw >>> 16);

  return ((msw & 0xffff) << 16) | (lsw & 0xffff);
}

/**
 * The 32-bit implementation of the NIST specified Gamma1 function.
 *
 * @param x The 32-bit integer argument.
 * @returns The NIST specified output of the function.
 */
export function gamma1_32(x: number): number {
  return rotr_32(x, 17) ^ rotr_32(x, 19) ^ shr_32(x, 10);
}

/**
 * The 32-bit implementation of the NIST specified Gamma0 function.
 *
 * @param x The 32-bit integer argument.
 * @returns The NIST specified output of the function.
 */
export function gamma0_32(x: number): number {
  return rotr_32(x, 7) ^ rotr_32(x, 18) ^ shr_32(x, 3);
}

/**
 * The 32-bit implementation of the NIST specified Sigma1 function.
 *
 * @param x The 32-bit integer argument.
 * @returns The NIST specified output of the function.
 */
export function sigma1_32(x: number): number {
  return rotr_32(x, 6) ^ rotr_32(x, 11) ^ rotr_32(x, 25);
}
