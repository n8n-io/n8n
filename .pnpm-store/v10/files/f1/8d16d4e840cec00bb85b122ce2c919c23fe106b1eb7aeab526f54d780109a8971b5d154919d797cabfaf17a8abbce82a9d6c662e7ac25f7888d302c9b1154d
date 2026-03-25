"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edwardsToMontgomery = exports.hash_to_decaf448 = exports.hashToDecaf448 = exports.encodeToCurve = exports.hashToCurve = exports.DecafPoint = exports.ED448_TORSION_SUBGROUP = exports.decaf448_hasher = exports.decaf448 = exports.ed448_hasher = exports.x448 = exports.E448 = exports.ed448ph = exports.ed448 = void 0;
exports.edwardsToMontgomeryPub = edwardsToMontgomeryPub;
/**
 * Edwards448 (not Ed448-Goldilocks) curve with following addons:
 * - X448 ECDH
 * - Decaf cofactor elimination
 * - Elligator hash-to-group / point indistinguishability
 * Conforms to RFC 8032 https://www.rfc-editor.org/rfc/rfc8032.html#section-5.2
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sha3_js_1 = require("@noble/hashes/sha3.js");
const utils_js_1 = require("@noble/hashes/utils.js");
const curve_ts_1 = require("./abstract/curve.js");
const edwards_ts_1 = require("./abstract/edwards.js");
const hash_to_curve_ts_1 = require("./abstract/hash-to-curve.js");
const modular_ts_1 = require("./abstract/modular.js");
const montgomery_ts_1 = require("./abstract/montgomery.js");
const utils_ts_1 = require("./utils.js");
// edwards448 curve
// a = 1n
// d = Fp.neg(39081n)
// Finite field 2n**448n - 2n**224n - 1n
// Subgroup order
// 2n**446n - 13818066809895115352007386748515426880336692474882178609894547503885n
const ed448_CURVE = {
    p: BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    n: BigInt('0x3fffffffffffffffffffffffffffffffffffffffffffffffffffffff7cca23e9c44edb49aed63690216cc2728dc58f552378c292ab5844f3'),
    h: BigInt(4),
    a: BigInt(1),
    d: BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffffffffffffffffffffffffffffffffffffffffffffffff6756'),
    Gx: BigInt('0x4f1970c66bed0ded221d15a622bf36da9e146570470f1767ea6de324a3d3a46412ae1af72ab66511433b80e18b00938e2626a82bc70cc05e'),
    Gy: BigInt('0x693f46716eb6bc248876203756c9c7624bea73736ca3984087789c1e05a0c2d73ad3ff1ce67c39c4fdbd132c4ed7c8ad9808795bf230fa14'),
};
// E448 NIST curve is identical to edwards448, except for:
// d = 39082/39081
// Gx = 3/2
const E448_CURVE = Object.assign({}, ed448_CURVE, {
    d: BigInt('0xd78b4bdc7f0daf19f24f38c29373a2ccad46157242a50f37809b1da3412a12e79ccc9c81264cfe9ad080997058fb61c4243cc32dbaa156b9'),
    Gx: BigInt('0x79a70b2b70400553ae7c9df416c792c61128751ac92969240c25a07d728bdc93e21f7787ed6972249de732f38496cd11698713093e9c04fc'),
    Gy: BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffff80000000000000000000000000000000000000000000000000000001'),
});
const shake256_114 = /* @__PURE__ */ (0, utils_js_1.createHasher)(() => sha3_js_1.shake256.create({ dkLen: 114 }));
const shake256_64 = /* @__PURE__ */ (0, utils_js_1.createHasher)(() => sha3_js_1.shake256.create({ dkLen: 64 }));
// prettier-ignore
const _1n = BigInt(1), _2n = BigInt(2), _3n = BigInt(3), _4n = BigInt(4), _11n = BigInt(11);
// prettier-ignore
const _22n = BigInt(22), _44n = BigInt(44), _88n = BigInt(88), _223n = BigInt(223);
// powPminus3div4 calculates z = x^k mod p, where k = (p-3)/4.
// Used for efficient square root calculation.
// ((P-3)/4).toString(2) would produce bits [223x 1, 0, 222x 1]
function ed448_pow_Pminus3div4(x) {
    const P = ed448_CURVE.p;
    const b2 = (x * x * x) % P;
    const b3 = (b2 * b2 * x) % P;
    const b6 = ((0, modular_ts_1.pow2)(b3, _3n, P) * b3) % P;
    const b9 = ((0, modular_ts_1.pow2)(b6, _3n, P) * b3) % P;
    const b11 = ((0, modular_ts_1.pow2)(b9, _2n, P) * b2) % P;
    const b22 = ((0, modular_ts_1.pow2)(b11, _11n, P) * b11) % P;
    const b44 = ((0, modular_ts_1.pow2)(b22, _22n, P) * b22) % P;
    const b88 = ((0, modular_ts_1.pow2)(b44, _44n, P) * b44) % P;
    const b176 = ((0, modular_ts_1.pow2)(b88, _88n, P) * b88) % P;
    const b220 = ((0, modular_ts_1.pow2)(b176, _44n, P) * b44) % P;
    const b222 = ((0, modular_ts_1.pow2)(b220, _2n, P) * b2) % P;
    const b223 = ((0, modular_ts_1.pow2)(b222, _1n, P) * x) % P;
    return ((0, modular_ts_1.pow2)(b223, _223n, P) * b222) % P;
}
function adjustScalarBytes(bytes) {
    // Section 5: Likewise, for X448, set the two least significant bits of the first byte to 0,
    bytes[0] &= 252; // 0b11111100
    // and the most significant bit of the last byte to 1.
    bytes[55] |= 128; // 0b10000000
    // NOTE: is NOOP for 56 bytes scalars (X25519/X448)
    bytes[56] = 0; // Byte outside of group (456 buts vs 448 bits)
    return bytes;
}
// Constant-time ratio of u to v. Allows to combine inversion and square root u/√v.
// Uses algo from RFC8032 5.1.3.
function uvRatio(u, v) {
    const P = ed448_CURVE.p;
    // https://www.rfc-editor.org/rfc/rfc8032#section-5.2.3
    // To compute the square root of (u/v), the first step is to compute the
    //   candidate root x = (u/v)^((p+1)/4).  This can be done using the
    // following trick, to use a single modular powering for both the
    // inversion of v and the square root:
    // x = (u/v)^((p+1)/4)   = u³v(u⁵v³)^((p-3)/4)   (mod p)
    const u2v = (0, modular_ts_1.mod)(u * u * v, P); // u²v
    const u3v = (0, modular_ts_1.mod)(u2v * u, P); // u³v
    const u5v3 = (0, modular_ts_1.mod)(u3v * u2v * v, P); // u⁵v³
    const root = ed448_pow_Pminus3div4(u5v3);
    const x = (0, modular_ts_1.mod)(u3v * root, P);
    // Verify that root is exists
    const x2 = (0, modular_ts_1.mod)(x * x, P); // x²
    // If vx² = u, the recovered x-coordinate is x.  Otherwise, no
    // square root exists, and the decoding fails.
    return { isValid: (0, modular_ts_1.mod)(x2 * v, P) === u, value: x };
}
// Finite field 2n**448n - 2n**224n - 1n
// The value fits in 448 bits, but we use 456-bit (57-byte) elements because of bitflags.
// - ed25519 fits in 255 bits, allowing using last 1 byte for specifying bit flag of point negation.
// - ed448 fits in 448 bits. We can't use last 1 byte: we can only use a bit 224 in the middle.
const Fp = /* @__PURE__ */ (() => (0, modular_ts_1.Field)(ed448_CURVE.p, { BITS: 456, isLE: true }))();
const Fn = /* @__PURE__ */ (() => (0, modular_ts_1.Field)(ed448_CURVE.n, { BITS: 456, isLE: true }))();
// decaf448 uses 448-bit (56-byte) keys
const Fp448 = /* @__PURE__ */ (() => (0, modular_ts_1.Field)(ed448_CURVE.p, { BITS: 448, isLE: true }))();
const Fn448 = /* @__PURE__ */ (() => (0, modular_ts_1.Field)(ed448_CURVE.n, { BITS: 448, isLE: true }))();
// SHAKE256(dom4(phflag,context)||x, 114)
function dom4(data, ctx, phflag) {
    if (ctx.length > 255)
        throw new Error('context must be smaller than 255, got: ' + ctx.length);
    return (0, utils_js_1.concatBytes)((0, utils_ts_1.asciiToBytes)('SigEd448'), new Uint8Array([phflag ? 1 : 0, ctx.length]), ctx, data);
}
// const ed448_eddsa_opts = { adjustScalarBytes, domain: dom4 };
// const ed448_Point = edwards(ed448_CURVE, { Fp, Fn, uvRatio });
const ED448_DEF = /* @__PURE__ */ (() => ({
    ...ed448_CURVE,
    Fp,
    Fn,
    nBitLength: Fn.BITS,
    hash: shake256_114,
    adjustScalarBytes,
    domain: dom4,
    uvRatio,
}))();
/**
 * ed448 EdDSA curve and methods.
 * @example
 * import { ed448 } from '@noble/curves/ed448';
 * const { secretKey, publicKey } = ed448.keygen();
 * const msg = new TextEncoder().encode('hello');
 * const sig = ed448.sign(msg, secretKey);
 * const isValid = ed448.verify(sig, msg, publicKey);
 */
exports.ed448 = (0, edwards_ts_1.twistedEdwards)(ED448_DEF);
// There is no ed448ctx, since ed448 supports ctx by default
/** Prehashed version of ed448. Accepts already-hashed messages in sign() and verify(). */
exports.ed448ph = (() => (0, edwards_ts_1.twistedEdwards)({
    ...ED448_DEF,
    prehash: shake256_64,
}))();
/**
 * E448 curve, defined by NIST.
 * E448 != edwards448 used in ed448.
 * E448 is birationally equivalent to edwards448.
 */
exports.E448 = (0, edwards_ts_1.edwards)(E448_CURVE);
/**
 * ECDH using curve448 aka x448.
 * x448 has 56-byte keys as per RFC 7748, while
 * ed448 has 57-byte keys as per RFC 8032.
 */
exports.x448 = (() => {
    const P = ed448_CURVE.p;
    return (0, montgomery_ts_1.montgomery)({
        P,
        type: 'x448',
        powPminus2: (x) => {
            const Pminus3div4 = ed448_pow_Pminus3div4(x);
            const Pminus3 = (0, modular_ts_1.pow2)(Pminus3div4, _2n, P);
            return (0, modular_ts_1.mod)(Pminus3 * x, P); // Pminus3 * x = Pminus2
        },
        adjustScalarBytes,
    });
})();
// Hash To Curve Elligator2 Map
const ELL2_C1 = /* @__PURE__ */ (() => (Fp.ORDER - BigInt(3)) / BigInt(4))(); // 1. c1 = (q - 3) / 4         # Integer arithmetic
const ELL2_J = /* @__PURE__ */ BigInt(156326);
function map_to_curve_elligator2_curve448(u) {
    let tv1 = Fp.sqr(u); // 1.  tv1 = u^2
    let e1 = Fp.eql(tv1, Fp.ONE); // 2.   e1 = tv1 == 1
    tv1 = Fp.cmov(tv1, Fp.ZERO, e1); // 3.  tv1 = CMOV(tv1, 0, e1)  # If Z * u^2 == -1, set tv1 = 0
    let xd = Fp.sub(Fp.ONE, tv1); // 4.   xd = 1 - tv1
    let x1n = Fp.neg(ELL2_J); // 5.  x1n = -J
    let tv2 = Fp.sqr(xd); // 6.  tv2 = xd^2
    let gxd = Fp.mul(tv2, xd); // 7.  gxd = tv2 * xd          # gxd = xd^3
    let gx1 = Fp.mul(tv1, Fp.neg(ELL2_J)); // 8.  gx1 = -J * tv1          # x1n + J * xd
    gx1 = Fp.mul(gx1, x1n); // 9.  gx1 = gx1 * x1n         # x1n^2 + J * x1n * xd
    gx1 = Fp.add(gx1, tv2); // 10. gx1 = gx1 + tv2         # x1n^2 + J * x1n * xd + xd^2
    gx1 = Fp.mul(gx1, x1n); // 11. gx1 = gx1 * x1n         # x1n^3 + J * x1n^2 * xd + x1n * xd^2
    let tv3 = Fp.sqr(gxd); // 12. tv3 = gxd^2
    tv2 = Fp.mul(gx1, gxd); // 13. tv2 = gx1 * gxd         # gx1 * gxd
    tv3 = Fp.mul(tv3, tv2); // 14. tv3 = tv3 * tv2         # gx1 * gxd^3
    let y1 = Fp.pow(tv3, ELL2_C1); // 15.  y1 = tv3^c1            # (gx1 * gxd^3)^((p - 3) / 4)
    y1 = Fp.mul(y1, tv2); // 16.  y1 = y1 * tv2          # gx1 * gxd * (gx1 * gxd^3)^((p - 3) / 4)
    let x2n = Fp.mul(x1n, Fp.neg(tv1)); // 17. x2n = -tv1 * x1n        # x2 = x2n / xd = -1 * u^2 * x1n / xd
    let y2 = Fp.mul(y1, u); // 18.  y2 = y1 * u
    y2 = Fp.cmov(y2, Fp.ZERO, e1); // 19.  y2 = CMOV(y2, 0, e1)
    tv2 = Fp.sqr(y1); // 20. tv2 = y1^2
    tv2 = Fp.mul(tv2, gxd); // 21. tv2 = tv2 * gxd
    let e2 = Fp.eql(tv2, gx1); // 22.  e2 = tv2 == gx1
    let xn = Fp.cmov(x2n, x1n, e2); // 23.  xn = CMOV(x2n, x1n, e2)  # If e2, x = x1, else x = x2
    let y = Fp.cmov(y2, y1, e2); // 24.   y = CMOV(y2, y1, e2)    # If e2, y = y1, else y = y2
    let e3 = Fp.isOdd(y); // 25.  e3 = sgn0(y) == 1        # Fix sign of y
    y = Fp.cmov(y, Fp.neg(y), e2 !== e3); // 26.   y = CMOV(y, -y, e2 XOR e3)
    return { xn, xd, yn: y, yd: Fp.ONE }; // 27. return (xn, xd, y, 1)
}
function map_to_curve_elligator2_edwards448(u) {
    let { xn, xd, yn, yd } = map_to_curve_elligator2_curve448(u); // 1. (xn, xd, yn, yd) = map_to_curve_elligator2_curve448(u)
    let xn2 = Fp.sqr(xn); // 2.  xn2 = xn^2
    let xd2 = Fp.sqr(xd); // 3.  xd2 = xd^2
    let xd4 = Fp.sqr(xd2); // 4.  xd4 = xd2^2
    let yn2 = Fp.sqr(yn); // 5.  yn2 = yn^2
    let yd2 = Fp.sqr(yd); // 6.  yd2 = yd^2
    let xEn = Fp.sub(xn2, xd2); // 7.  xEn = xn2 - xd2
    let tv2 = Fp.sub(xEn, xd2); // 8.  tv2 = xEn - xd2
    xEn = Fp.mul(xEn, xd2); // 9.  xEn = xEn * xd2
    xEn = Fp.mul(xEn, yd); // 10. xEn = xEn * yd
    xEn = Fp.mul(xEn, yn); // 11. xEn = xEn * yn
    xEn = Fp.mul(xEn, _4n); // 12. xEn = xEn * 4
    tv2 = Fp.mul(tv2, xn2); // 13. tv2 = tv2 * xn2
    tv2 = Fp.mul(tv2, yd2); // 14. tv2 = tv2 * yd2
    let tv3 = Fp.mul(yn2, _4n); // 15. tv3 = 4 * yn2
    let tv1 = Fp.add(tv3, yd2); // 16. tv1 = tv3 + yd2
    tv1 = Fp.mul(tv1, xd4); // 17. tv1 = tv1 * xd4
    let xEd = Fp.add(tv1, tv2); // 18. xEd = tv1 + tv2
    tv2 = Fp.mul(tv2, xn); // 19. tv2 = tv2 * xn
    let tv4 = Fp.mul(xn, xd4); // 20. tv4 = xn * xd4
    let yEn = Fp.sub(tv3, yd2); // 21. yEn = tv3 - yd2
    yEn = Fp.mul(yEn, tv4); // 22. yEn = yEn * tv4
    yEn = Fp.sub(yEn, tv2); // 23. yEn = yEn - tv2
    tv1 = Fp.add(xn2, xd2); // 24. tv1 = xn2 + xd2
    tv1 = Fp.mul(tv1, xd2); // 25. tv1 = tv1 * xd2
    tv1 = Fp.mul(tv1, xd); // 26. tv1 = tv1 * xd
    tv1 = Fp.mul(tv1, yn2); // 27. tv1 = tv1 * yn2
    tv1 = Fp.mul(tv1, BigInt(-2)); // 28. tv1 = -2 * tv1
    let yEd = Fp.add(tv2, tv1); // 29. yEd = tv2 + tv1
    tv4 = Fp.mul(tv4, yd2); // 30. tv4 = tv4 * yd2
    yEd = Fp.add(yEd, tv4); // 31. yEd = yEd + tv4
    tv1 = Fp.mul(xEd, yEd); // 32. tv1 = xEd * yEd
    let e = Fp.eql(tv1, Fp.ZERO); // 33.   e = tv1 == 0
    xEn = Fp.cmov(xEn, Fp.ZERO, e); // 34. xEn = CMOV(xEn, 0, e)
    xEd = Fp.cmov(xEd, Fp.ONE, e); // 35. xEd = CMOV(xEd, 1, e)
    yEn = Fp.cmov(yEn, Fp.ONE, e); // 36. yEn = CMOV(yEn, 1, e)
    yEd = Fp.cmov(yEd, Fp.ONE, e); // 37. yEd = CMOV(yEd, 1, e)
    const inv = (0, modular_ts_1.FpInvertBatch)(Fp, [xEd, yEd], true); // batch division
    return { x: Fp.mul(xEn, inv[0]), y: Fp.mul(yEn, inv[1]) }; // 38. return (xEn, xEd, yEn, yEd)
}
/** Hashing / encoding to ed448 points / field. RFC 9380 methods. */
exports.ed448_hasher = (() => (0, hash_to_curve_ts_1.createHasher)(exports.ed448.Point, (scalars) => map_to_curve_elligator2_edwards448(scalars[0]), {
    DST: 'edwards448_XOF:SHAKE256_ELL2_RO_',
    encodeDST: 'edwards448_XOF:SHAKE256_ELL2_NU_',
    p: Fp.ORDER,
    m: 1,
    k: 224,
    expand: 'xof',
    hash: sha3_js_1.shake256,
}))();
// 1-d
const ONE_MINUS_D = /* @__PURE__ */ BigInt('39082');
// 1-2d
const ONE_MINUS_TWO_D = /* @__PURE__ */ BigInt('78163');
// √(-d)
const SQRT_MINUS_D = /* @__PURE__ */ BigInt('98944233647732219769177004876929019128417576295529901074099889598043702116001257856802131563896515373927712232092845883226922417596214');
// 1 / √(-d)
const INVSQRT_MINUS_D = /* @__PURE__ */ BigInt('315019913931389607337177038330951043522456072897266928557328499619017160722351061360252776265186336876723201881398623946864393857820716');
// Calculates 1/√(number)
const invertSqrt = (number) => uvRatio(_1n, number);
/**
 * Elligator map for hash-to-curve of decaf448.
 * Described in [RFC9380](https://www.rfc-editor.org/rfc/rfc9380#appendix-C)
 * and [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-element-derivation-2).
 */
function calcElligatorDecafMap(r0) {
    const { d } = ed448_CURVE;
    const P = Fp.ORDER;
    const mod = (n) => Fp.create(n);
    const r = mod(-(r0 * r0)); // 1
    const u0 = mod(d * (r - _1n)); // 2
    const u1 = mod((u0 + _1n) * (u0 - r)); // 3
    const { isValid: was_square, value: v } = uvRatio(ONE_MINUS_TWO_D, mod((r + _1n) * u1)); // 4
    let v_prime = v; // 5
    if (!was_square)
        v_prime = mod(r0 * v);
    let sgn = _1n; // 6
    if (!was_square)
        sgn = mod(-_1n);
    const s = mod(v_prime * (r + _1n)); // 7
    let s_abs = s;
    if ((0, modular_ts_1.isNegativeLE)(s, P))
        s_abs = mod(-s);
    const s2 = s * s;
    const W0 = mod(s_abs * _2n); // 8
    const W1 = mod(s2 + _1n); // 9
    const W2 = mod(s2 - _1n); // 10
    const W3 = mod(v_prime * s * (r - _1n) * ONE_MINUS_TWO_D + sgn); // 11
    return new exports.ed448.Point(mod(W0 * W3), mod(W2 * W1), mod(W1 * W3), mod(W0 * W2));
}
function decaf448_map(bytes) {
    (0, utils_js_1.abytes)(bytes, 112);
    const skipValidation = true;
    // Note: Similar to the field element decoding described in
    // [RFC7748], and unlike the field element decoding described in
    // Section 5.3.1, non-canonical values are accepted.
    const r1 = Fp448.create(Fp448.fromBytes(bytes.subarray(0, 56), skipValidation));
    const R1 = calcElligatorDecafMap(r1);
    const r2 = Fp448.create(Fp448.fromBytes(bytes.subarray(56, 112), skipValidation));
    const R2 = calcElligatorDecafMap(r2);
    return new _DecafPoint(R1.add(R2));
}
/**
 * Each ed448/EdwardsPoint has 4 different equivalent points. This can be
 * a source of bugs for protocols like ring signatures. Decaf was created to solve this.
 * Decaf point operates in X:Y:Z:T extended coordinates like EdwardsPoint,
 * but it should work in its own namespace: do not combine those two.
 * See [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
 */
class _DecafPoint extends edwards_ts_1.PrimeEdwardsPoint {
    constructor(ep) {
        super(ep);
    }
    static fromAffine(ap) {
        return new _DecafPoint(exports.ed448.Point.fromAffine(ap));
    }
    assertSame(other) {
        if (!(other instanceof _DecafPoint))
            throw new Error('DecafPoint expected');
    }
    init(ep) {
        return new _DecafPoint(ep);
    }
    /** @deprecated use `import { decaf448_hasher } from '@noble/curves/ed448.js';` */
    static hashToCurve(hex) {
        return decaf448_map((0, utils_ts_1.ensureBytes)('decafHash', hex, 112));
    }
    static fromBytes(bytes) {
        (0, utils_js_1.abytes)(bytes, 56);
        const { d } = ed448_CURVE;
        const P = Fp.ORDER;
        const mod = (n) => Fp448.create(n);
        const s = Fp448.fromBytes(bytes);
        // 1. Check that s_bytes is the canonical encoding of a field element, or else abort.
        // 2. Check that s is non-negative, or else abort
        if (!(0, utils_ts_1.equalBytes)(Fn448.toBytes(s), bytes) || (0, modular_ts_1.isNegativeLE)(s, P))
            throw new Error('invalid decaf448 encoding 1');
        const s2 = mod(s * s); // 1
        const u1 = mod(_1n + s2); // 2
        const u1sq = mod(u1 * u1);
        const u2 = mod(u1sq - _4n * d * s2); // 3
        const { isValid, value: invsqrt } = invertSqrt(mod(u2 * u1sq)); // 4
        let u3 = mod((s + s) * invsqrt * u1 * SQRT_MINUS_D); // 5
        if ((0, modular_ts_1.isNegativeLE)(u3, P))
            u3 = mod(-u3);
        const x = mod(u3 * invsqrt * u2 * INVSQRT_MINUS_D); // 6
        const y = mod((_1n - s2) * invsqrt * u1); // 7
        const t = mod(x * y); // 8
        if (!isValid)
            throw new Error('invalid decaf448 encoding 2');
        return new _DecafPoint(new exports.ed448.Point(x, y, _1n, t));
    }
    /**
     * Converts decaf-encoded string to decaf point.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode-2).
     * @param hex Decaf-encoded 56 bytes. Not every 56-byte string is valid decaf encoding
     */
    static fromHex(hex) {
        return _DecafPoint.fromBytes((0, utils_ts_1.ensureBytes)('decafHex', hex, 56));
    }
    /** @deprecated use `import { pippenger } from '@noble/curves/abstract/curve.js';` */
    static msm(points, scalars) {
        return (0, curve_ts_1.pippenger)(_DecafPoint, Fn, points, scalars);
    }
    /**
     * Encodes decaf point to Uint8Array.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode-2).
     */
    toBytes() {
        const { X, Z, T } = this.ep;
        const P = Fp.ORDER;
        const mod = (n) => Fp.create(n);
        const u1 = mod(mod(X + T) * mod(X - T)); // 1
        const x2 = mod(X * X);
        const { value: invsqrt } = invertSqrt(mod(u1 * ONE_MINUS_D * x2)); // 2
        let ratio = mod(invsqrt * u1 * SQRT_MINUS_D); // 3
        if ((0, modular_ts_1.isNegativeLE)(ratio, P))
            ratio = mod(-ratio);
        const u2 = mod(INVSQRT_MINUS_D * ratio * Z - T); // 4
        let s = mod(ONE_MINUS_D * invsqrt * X * u2); // 5
        if ((0, modular_ts_1.isNegativeLE)(s, P))
            s = mod(-s);
        return Fn448.toBytes(s);
    }
    /**
     * Compare one point to another.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals-2).
     */
    equals(other) {
        this.assertSame(other);
        const { X: X1, Y: Y1 } = this.ep;
        const { X: X2, Y: Y2 } = other.ep;
        // (x1 * y2 == y1 * x2)
        return Fp.create(X1 * Y2) === Fp.create(Y1 * X2);
    }
    is0() {
        return this.equals(_DecafPoint.ZERO);
    }
}
// The following gymnastics is done because typescript strips comments otherwise
// prettier-ignore
_DecafPoint.BASE = 
/* @__PURE__ */ (() => new _DecafPoint(exports.ed448.Point.BASE).multiplyUnsafe(_2n))();
// prettier-ignore
_DecafPoint.ZERO = 
/* @__PURE__ */ (() => new _DecafPoint(exports.ed448.Point.ZERO))();
// prettier-ignore
_DecafPoint.Fp = 
/* @__PURE__ */ (() => Fp448)();
// prettier-ignore
_DecafPoint.Fn = 
/* @__PURE__ */ (() => Fn448)();
exports.decaf448 = { Point: _DecafPoint };
/** Hashing to decaf448 points / field. RFC 9380 methods. */
exports.decaf448_hasher = {
    hashToCurve(msg, options) {
        const DST = options?.DST || 'decaf448_XOF:SHAKE256_D448MAP_RO_';
        return decaf448_map((0, hash_to_curve_ts_1.expand_message_xof)(msg, DST, 112, 224, sha3_js_1.shake256));
    },
    // Warning: has big modulo bias of 2^-64.
    // RFC is invalid. RFC says "use 64-byte xof", while for 2^-112 bias
    // it must use 84-byte xof (56+56/2), not 64.
    hashToScalar(msg, options = { DST: hash_to_curve_ts_1._DST_scalar }) {
        // Can't use `Fn448.fromBytes()`. 64-byte input => 56-byte field element
        const xof = (0, hash_to_curve_ts_1.expand_message_xof)(msg, options.DST, 64, 256, sha3_js_1.shake256);
        return Fn448.create((0, utils_ts_1.bytesToNumberLE)(xof));
    },
};
// export const decaf448_oprf: OPRF = createORPF({
//   name: 'decaf448-SHAKE256',
//   Point: DecafPoint,
//   hash: (msg: Uint8Array) => shake256(msg, { dkLen: 64 }),
//   hashToGroup: decaf448_hasher.hashToCurve,
//   hashToScalar: decaf448_hasher.hashToScalar,
// });
/**
 * Weird / bogus points, useful for debugging.
 * Unlike ed25519, there is no ed448 generator point which can produce full T subgroup.
 * Instead, there is a Klein four-group, which spans over 2 independent 2-torsion points:
 * (0, 1), (0, -1), (-1, 0), (1, 0).
 */
exports.ED448_TORSION_SUBGROUP = [
    '010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    'fefffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffffffffffffffffffffffffffffffffffffffffffffffffff00',
    '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080',
];
/** @deprecated use `decaf448.Point` */
exports.DecafPoint = _DecafPoint;
/** @deprecated use `import { ed448_hasher } from '@noble/curves/ed448.js';` */
exports.hashToCurve = (() => exports.ed448_hasher.hashToCurve)();
/** @deprecated use `import { ed448_hasher } from '@noble/curves/ed448.js';` */
exports.encodeToCurve = (() => exports.ed448_hasher.encodeToCurve)();
/** @deprecated use `import { decaf448_hasher } from '@noble/curves/ed448.js';` */
exports.hashToDecaf448 = (() => exports.decaf448_hasher.hashToCurve)();
/** @deprecated use `import { decaf448_hasher } from '@noble/curves/ed448.js';` */
exports.hash_to_decaf448 = (() => exports.decaf448_hasher.hashToCurve)();
/** @deprecated use `ed448.utils.toMontgomery` */
function edwardsToMontgomeryPub(edwardsPub) {
    return exports.ed448.utils.toMontgomery((0, utils_ts_1.ensureBytes)('pub', edwardsPub));
}
/** @deprecated use `ed448.utils.toMontgomery` */
exports.edwardsToMontgomery = edwardsToMontgomeryPub;
//# sourceMappingURL=ed448.js.map