'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var encoding = require('./encoding-1a745c43.cjs');
var rabin = require('./rabin.cjs');
var buffer = require('./buffer-3e750729.cjs');
require('./math-96d5e8c4.cjs');
require('./number-1fb57bba.cjs');
require('./binary-ac8e39e2.cjs');
require('./string-fddc5f8b.cjs');
require('./array-78849c95.cjs');
require('./set-5b47859e.cjs');
require('./map-24d263c0.cjs');
require('./environment-1c97264d.cjs');
require('./conditions-f5c0c102.cjs');
require('./storage.cjs');
require('./function-314580f7.cjs');
require('./object-c0c9435b.cjs');
require('./equality.cjs');
require('./decoding-76e75827.cjs');
require('./error-0c1f634f.cjs');

const FingerprintTraitSymbol = Symbol('Fingerprint');

/**
 * When implementing this trait, it is recommended to write some sort of "magic number" first to
 * ensure that different types of objects don't have the same fingerprint.
 *
 * The recommended pracice is to generate a random u32 number as your magic number. e.g. using
 * `console.log(random.uint32().toString(16))`
 *
 * @typedef {{ [FingerprintTraitSymbol]:()=>string } | import('../encoding.js').AnyEncodable} Fingerprintable
 */

/**
 * @param {Fingerprintable} a
 * @return {string}
 */
const fingerprint = a => (a != null && /** @type {any} */ (a)[FingerprintTraitSymbol]?.()) || buffer.toBase64(rabin.fingerprint(rabin.StandardIrreducible128, encoding.encode(encoder => { encoding.writeUint32(encoder, 0x8de1c475); encoding.writeAny(encoder, a); })));

exports.FingerprintTraitSymbol = FingerprintTraitSymbol;
exports.fingerprint = fingerprint;
//# sourceMappingURL=fingerprint.cjs.map
