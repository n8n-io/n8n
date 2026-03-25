'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var math = require('./math-96d5e8c4.cjs');

/**
 * Utility module to convert metric values.
 *
 * @module metric
 */

const yotta = 1e24;
const zetta = 1e21;
const exa = 1e18;
const peta = 1e15;
const tera = 1e12;
const giga = 1e9;
const mega = 1e6;
const kilo = 1e3;
const hecto = 1e2;
const deca = 10;
const deci = 0.1;
const centi = 0.01;
const milli = 1e-3;
const micro = 1e-6;
const nano = 1e-9;
const pico = 1e-12;
const femto = 1e-15;
const atto = 1e-18;
const zepto = 1e-21;
const yocto = 1e-24;

const prefixUp = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
const prefixDown = ['', 'm', 'μ', 'n', 'p', 'f', 'a', 'z', 'y'];

/**
 * Calculate the metric prefix for a number. Assumes E.g. `prefix(1000) = { n: 1, prefix: 'k' }`
 *
 * @param {number} n
 * @param {number} [baseMultiplier] Multiplier of the base (10^(3*baseMultiplier)). E.g. `convert(time, -3)` if time is already in milli seconds
 * @return {{n:number,prefix:string}}
 */
const prefix = (n, baseMultiplier = 0) => {
  const nPow = n === 0 ? 0 : math.log10(n);
  let mult = 0;
  while (nPow < mult * 3 && baseMultiplier > -8) {
    baseMultiplier--;
    mult--;
  }
  while (nPow >= 3 + mult * 3 && baseMultiplier < 8) {
    baseMultiplier++;
    mult++;
  }
  const prefix = baseMultiplier < 0 ? prefixDown[-baseMultiplier] : prefixUp[baseMultiplier];
  return {
    n: math.round((mult > 0 ? n / math.exp10(mult * 3) : n * math.exp10(mult * -3)) * 1e12) / 1e12,
    prefix
  }
};

exports.atto = atto;
exports.centi = centi;
exports.deca = deca;
exports.deci = deci;
exports.exa = exa;
exports.femto = femto;
exports.giga = giga;
exports.hecto = hecto;
exports.kilo = kilo;
exports.mega = mega;
exports.micro = micro;
exports.milli = milli;
exports.nano = nano;
exports.peta = peta;
exports.pico = pico;
exports.prefix = prefix;
exports.tera = tera;
exports.yocto = yocto;
exports.yotta = yotta;
exports.zepto = zepto;
exports.zetta = zetta;
//# sourceMappingURL=metric.cjs.map
