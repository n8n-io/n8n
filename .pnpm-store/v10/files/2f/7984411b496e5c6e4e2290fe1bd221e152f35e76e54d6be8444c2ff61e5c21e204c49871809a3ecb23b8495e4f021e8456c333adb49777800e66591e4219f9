/**
 * Utility module to convert metric values.
 *
 * @module metric
 */

import * as math from './math.js'

export const yotta = 1e24
export const zetta = 1e21
export const exa = 1e18
export const peta = 1e15
export const tera = 1e12
export const giga = 1e9
export const mega = 1e6
export const kilo = 1e3
export const hecto = 1e2
export const deca = 10
export const deci = 0.1
export const centi = 0.01
export const milli = 1e-3
export const micro = 1e-6
export const nano = 1e-9
export const pico = 1e-12
export const femto = 1e-15
export const atto = 1e-18
export const zepto = 1e-21
export const yocto = 1e-24

const prefixUp = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
const prefixDown = ['', 'm', 'μ', 'n', 'p', 'f', 'a', 'z', 'y']

/**
 * Calculate the metric prefix for a number. Assumes E.g. `prefix(1000) = { n: 1, prefix: 'k' }`
 *
 * @param {number} n
 * @param {number} [baseMultiplier] Multiplier of the base (10^(3*baseMultiplier)). E.g. `convert(time, -3)` if time is already in milli seconds
 * @return {{n:number,prefix:string}}
 */
export const prefix = (n, baseMultiplier = 0) => {
  const nPow = n === 0 ? 0 : math.log10(n)
  let mult = 0
  while (nPow < mult * 3 && baseMultiplier > -8) {
    baseMultiplier--
    mult--
  }
  while (nPow >= 3 + mult * 3 && baseMultiplier < 8) {
    baseMultiplier++
    mult++
  }
  const prefix = baseMultiplier < 0 ? prefixDown[-baseMultiplier] : prefixUp[baseMultiplier]
  return {
    n: math.round((mult > 0 ? n / math.exp10(mult * 3) : n * math.exp10(mult * -3)) * 1e12) / 1e12,
    prefix
  }
}
