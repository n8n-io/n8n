"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hash_to_ristretto255 = exports.hashToRistretto255 = exports.encodeToCurve = exports.hashToCurve = exports.RistrettoPoint = exports.edwardsToMontgomery = exports.ED25519_TORSION_SUBGROUP = exports.ristretto255_hasher = exports.ristretto255 = exports.ed25519_hasher = exports.x25519 = exports.ed25519ph = exports.ed25519ctx = exports.ed25519 = void 0;
exports.edwardsToMontgomeryPub = edwardsToMontgomeryPub;
exports.edwardsToMontgomeryPriv = edwardsToMontgomeryPriv;
/**
 * ed25519 Twisted Edwards curve with following addons:
 * - X25519 ECDH
 * - Ristretto cofactor elimination
 * - Elligator hash-to-group / point indistinguishability
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sha2_js_1 = require("@noble/hashes/sha2.js");
const utils_js_1 = require("@noble/hashes/utils.js");
const curve_ts_1 = require("./abstract/curve.js");
const edwards_ts_1 = require("./abstract/edwards.js");
const hash_to_curve_ts_1 = require("./abstract/hash-to-curve.js");
const modular_ts_1 = require("./abstract/modular.js");
const montgomery_ts_1 = require("./abstract/montgomery.js");
const utils_ts_1 = require("./utils.js");
// prettier-ignore
const _0n = /* @__PURE__ */ BigInt(0), _1n = BigInt(1), _2n = BigInt(2), _3n = BigInt(3);
// prettier-ignore
const _5n = BigInt(5), _8n = BigInt(8);
// P = 2n**255n-19n
const ed25519_CURVE_p = BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed');
// N = 2n**252n + 27742317777372353535851937790883648493n
// a = Fp.create(BigInt(-1))
// d = -121665/121666 a.k.a. Fp.neg(121665 * Fp.inv(121666))
const ed25519_CURVE = /* @__PURE__ */ (() => ({
    p: ed25519_CURVE_p,
    n: BigInt('0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed'),
    h: _8n,
    a: BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec'),
    d: BigInt('0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3'),
    Gx: BigInt('0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a'),
    Gy: BigInt('0x6666666666666666666666666666666666666666666666666666666666666658'),
}))();
function ed25519_pow_2_252_3(x) {
    // prettier-ignore
    const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
    const P = ed25519_CURVE_p;
    const x2 = (x * x) % P;
    const b2 = (x2 * x) % P; // x^3, 11
    const b4 = ((0, modular_ts_1.pow2)(b2, _2n, P) * b2) % P; // x^15, 1111
    const b5 = ((0, modular_ts_1.pow2)(b4, _1n, P) * x) % P; // x^31
    const b10 = ((0, modular_ts_1.pow2)(b5, _5n, P) * b5) % P;
    const b20 = ((0, modular_ts_1.pow2)(b10, _10n, P) * b10) % P;
    const b40 = ((0, modular_ts_1.pow2)(b20, _20n, P) * b20) % P;
    const b80 = ((0, modular_ts_1.pow2)(b40, _40n, P) * b40) % P;
    const b160 = ((0, modular_ts_1.pow2)(b80, _80n, P) * b80) % P;
    const b240 = ((0, modular_ts_1.pow2)(b160, _80n, P) * b80) % P;
    const b250 = ((0, modular_ts_1.pow2)(b240, _10n, P) * b10) % P;
    const pow_p_5_8 = ((0, modular_ts_1.pow2)(b250, _2n, P) * x) % P;
    // ^ To pow to (p+3)/8, multiply it by x.
    return { pow_p_5_8, b2 };
}
function adjustScalarBytes(bytes) {
    // Section 5: For X25519, in order to decode 32 random bytes as an integer scalar,
    // set the three least significant bits of the first byte
    bytes[0] &= 248; // 0b1111_1000
    // and the most significant bit of the last to zero,
    bytes[31] &= 127; // 0b0111_1111
    // set the second most significant bit of the last byte to 1
    bytes[31] |= 64; // 0b0100_0000
    return bytes;
}
// √(-1) aka √(a) aka 2^((p-1)/4)
// Fp.sqrt(Fp.neg(1))
const ED25519_SQRT_M1 = /* @__PURE__ */ BigInt('19681161376707505956807079304988542015446066515923890162744021073123829784752');
// sqrt(u/v)
function uvRatio(u, v) {
    const P = ed25519_CURVE_p;
    const v3 = (0, modular_ts_1.mod)(v * v * v, P); // v³
    const v7 = (0, modular_ts_1.mod)(v3 * v3 * v, P); // v⁷
    // (p+3)/8 and (p-5)/8
    const pow = ed25519_pow_2_252_3(u * v7).pow_p_5_8;
    let x = (0, modular_ts_1.mod)(u * v3 * pow, P); // (uv³)(uv⁷)^(p-5)/8
    const vx2 = (0, modular_ts_1.mod)(v * x * x, P); // vx²
    const root1 = x; // First root candidate
    const root2 = (0, modular_ts_1.mod)(x * ED25519_SQRT_M1, P); // Second root candidate
    const useRoot1 = vx2 === u; // If vx² = u (mod p), x is a square root
    const useRoot2 = vx2 === (0, modular_ts_1.mod)(-u, P); // If vx² = -u, set x <-- x * 2^((p-1)/4)
    const noRoot = vx2 === (0, modular_ts_1.mod)(-u * ED25519_SQRT_M1, P); // There is no valid root, vx² = -u√(-1)
    if (useRoot1)
        x = root1;
    if (useRoot2 || noRoot)
        x = root2; // We return root2 anyway, for const-time
    if ((0, modular_ts_1.isNegativeLE)(x, P))
        x = (0, modular_ts_1.mod)(-x, P);
    return { isValid: useRoot1 || useRoot2, value: x };
}
const Fp = /* @__PURE__ */ (() => (0, modular_ts_1.Field)(ed25519_CURVE.p, { isLE: true }))();
const Fn = /* @__PURE__ */ (() => (0, modular_ts_1.Field)(ed25519_CURVE.n, { isLE: true }))();
const ed25519Defaults = /* @__PURE__ */ (() => ({
    ...ed25519_CURVE,
    Fp,
    hash: sha2_js_1.sha512,
    adjustScalarBytes,
    // dom2
    // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
    // Constant-time, u/√v
    uvRatio,
}))();
/**
 * ed25519 curve with EdDSA signatures.
 * @example
 * import { ed25519 } from '@noble/curves/ed25519';
 * const { secretKey, publicKey } = ed25519.keygen();
 * const msg = new TextEncoder().encode('hello');
 * const sig = ed25519.sign(msg, priv);
 * ed25519.verify(sig, msg, pub); // Default mode: follows ZIP215
 * ed25519.verify(sig, msg, pub, { zip215: false }); // RFC8032 / FIPS 186-5
 */
exports.ed25519 = (() => (0, edwards_ts_1.twistedEdwards)(ed25519Defaults))();
function ed25519_domain(data, ctx, phflag) {
    if (ctx.length > 255)
        throw new Error('Context is too big');
    return (0, utils_js_1.concatBytes)((0, utils_js_1.utf8ToBytes)('SigEd25519 no Ed25519 collisions'), new Uint8Array([phflag ? 1 : 0, ctx.length]), ctx, data);
}
/** Context of ed25519. Uses context for domain separation. */
exports.ed25519ctx = (() => (0, edwards_ts_1.twistedEdwards)({
    ...ed25519Defaults,
    domain: ed25519_domain,
}))();
/** Prehashed version of ed25519. Accepts already-hashed messages in sign() and verify(). */
exports.ed25519ph = (() => (0, edwards_ts_1.twistedEdwards)(Object.assign({}, ed25519Defaults, {
    domain: ed25519_domain,
    prehash: sha2_js_1.sha512,
})))();
/**
 * ECDH using curve25519 aka x25519.
 * @example
 * import { x25519 } from '@noble/curves/ed25519';
 * const priv = 'a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4';
 * const pub = 'e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c';
 * x25519.getSharedSecret(priv, pub) === x25519.scalarMult(priv, pub); // aliases
 * x25519.getPublicKey(priv) === x25519.scalarMultBase(priv);
 * x25519.getPublicKey(x25519.utils.randomSecretKey());
 */
exports.x25519 = (() => {
    const P = Fp.ORDER;
    return (0, montgomery_ts_1.montgomery)({
        P,
        type: 'x25519',
        powPminus2: (x) => {
            // x^(p-2) aka x^(2^255-21)
            const { pow_p_5_8, b2 } = ed25519_pow_2_252_3(x);
            return (0, modular_ts_1.mod)((0, modular_ts_1.pow2)(pow_p_5_8, _3n, P) * b2, P);
        },
        adjustScalarBytes,
    });
})();
// Hash To Curve Elligator2 Map (NOTE: different from ristretto255 elligator)
// NOTE: very important part is usage of FpSqrtEven for ELL2_C1_EDWARDS, since
// SageMath returns different root first and everything falls apart
const ELL2_C1 = /* @__PURE__ */ (() => (ed25519_CURVE_p + _3n) / _8n)(); // 1. c1 = (q + 3) / 8       # Integer arithmetic
const ELL2_C2 = /* @__PURE__ */ (() => Fp.pow(_2n, ELL2_C1))(); // 2. c2 = 2^c1
const ELL2_C3 = /* @__PURE__ */ (() => Fp.sqrt(Fp.neg(Fp.ONE)))(); // 3. c3 = sqrt(-1)
// prettier-ignore
function map_to_curve_elligator2_curve25519(u) {
    const ELL2_C4 = (ed25519_CURVE_p - _5n) / _8n; // 4. c4 = (q - 5) / 8       # Integer arithmetic
    const ELL2_J = BigInt(486662);
    let tv1 = Fp.sqr(u); //  1.  tv1 = u^2
    tv1 = Fp.mul(tv1, _2n); //  2.  tv1 = 2 * tv1
    let xd = Fp.add(tv1, Fp.ONE); //  3.   xd = tv1 + 1         # Nonzero: -1 is square (mod p), tv1 is not
    let x1n = Fp.neg(ELL2_J); //  4.  x1n = -J              # x1 = x1n / xd = -J / (1 + 2 * u^2)
    let tv2 = Fp.sqr(xd); //  5.  tv2 = xd^2
    let gxd = Fp.mul(tv2, xd); //  6.  gxd = tv2 * xd        # gxd = xd^3
    let gx1 = Fp.mul(tv1, ELL2_J); //  7.  gx1 = J * tv1         # x1n + J * xd
    gx1 = Fp.mul(gx1, x1n); //  8.  gx1 = gx1 * x1n       # x1n^2 + J * x1n * xd
    gx1 = Fp.add(gx1, tv2); //  9.  gx1 = gx1 + tv2       # x1n^2 + J * x1n * xd + xd^2
    gx1 = Fp.mul(gx1, x1n); //  10. gx1 = gx1 * x1n       # x1n^3 + J * x1n^2 * xd + x1n * xd^2
    let tv3 = Fp.sqr(gxd); //  11. tv3 = gxd^2
    tv2 = Fp.sqr(tv3); //  12. tv2 = tv3^2           # gxd^4
    tv3 = Fp.mul(tv3, gxd); //  13. tv3 = tv3 * gxd       # gxd^3
    tv3 = Fp.mul(tv3, gx1); //  14. tv3 = tv3 * gx1       # gx1 * gxd^3
    tv2 = Fp.mul(tv2, tv3); //  15. tv2 = tv2 * tv3       # gx1 * gxd^7
    let y11 = Fp.pow(tv2, ELL2_C4); //  16. y11 = tv2^c4        # (gx1 * gxd^7)^((p - 5) / 8)
    y11 = Fp.mul(y11, tv3); //  17. y11 = y11 * tv3       # gx1*gxd^3*(gx1*gxd^7)^((p-5)/8)
    let y12 = Fp.mul(y11, ELL2_C3); //  18. y12 = y11 * c3
    tv2 = Fp.sqr(y11); //  19. tv2 = y11^2
    tv2 = Fp.mul(tv2, gxd); //  20. tv2 = tv2 * gxd
    let e1 = Fp.eql(tv2, gx1); //  21.  e1 = tv2 == gx1
    let y1 = Fp.cmov(y12, y11, e1); //  22.  y1 = CMOV(y12, y11, e1)  # If g(x1) is square, this is its sqrt
    let x2n = Fp.mul(x1n, tv1); //  23. x2n = x1n * tv1       # x2 = x2n / xd = 2 * u^2 * x1n / xd
    let y21 = Fp.mul(y11, u); //  24. y21 = y11 * u
    y21 = Fp.mul(y21, ELL2_C2); //  25. y21 = y21 * c2
    let y22 = Fp.mul(y21, ELL2_C3); //  26. y22 = y21 * c3
    let gx2 = Fp.mul(gx1, tv1); //  27. gx2 = gx1 * tv1       # g(x2) = gx2 / gxd = 2 * u^2 * g(x1)
    tv2 = Fp.sqr(y21); //  28. tv2 = y21^2
    tv2 = Fp.mul(tv2, gxd); //  29. tv2 = tv2 * gxd
    let e2 = Fp.eql(tv2, gx2); //  30.  e2 = tv2 == gx2
    let y2 = Fp.cmov(y22, y21, e2); //  31.  y2 = CMOV(y22, y21, e2)  # If g(x2) is square, this is its sqrt
    tv2 = Fp.sqr(y1); //  32. tv2 = y1^2
    tv2 = Fp.mul(tv2, gxd); //  33. tv2 = tv2 * gxd
    let e3 = Fp.eql(tv2, gx1); //  34.  e3 = tv2 == gx1
    let xn = Fp.cmov(x2n, x1n, e3); //  35.  xn = CMOV(x2n, x1n, e3)  # If e3, x = x1, else x = x2
    let y = Fp.cmov(y2, y1, e3); //  36.   y = CMOV(y2, y1, e3)    # If e3, y = y1, else y = y2
    let e4 = Fp.isOdd(y); //  37.  e4 = sgn0(y) == 1        # Fix sign of y
    y = Fp.cmov(y, Fp.neg(y), e3 !== e4); //  38.   y = CMOV(y, -y, e3 XOR e4)
    return { xMn: xn, xMd: xd, yMn: y, yMd: _1n }; //  39. return (xn, xd, y, 1)
}
const ELL2_C1_EDWARDS = /* @__PURE__ */ (() => (0, modular_ts_1.FpSqrtEven)(Fp, Fp.neg(BigInt(486664))))(); // sgn0(c1) MUST equal 0
function map_to_curve_elligator2_edwards25519(u) {
    const { xMn, xMd, yMn, yMd } = map_to_curve_elligator2_curve25519(u); //  1.  (xMn, xMd, yMn, yMd) =
    // map_to_curve_elligator2_curve25519(u)
    let xn = Fp.mul(xMn, yMd); //  2.  xn = xMn * yMd
    xn = Fp.mul(xn, ELL2_C1_EDWARDS); //  3.  xn = xn * c1
    let xd = Fp.mul(xMd, yMn); //  4.  xd = xMd * yMn    # xn / xd = c1 * xM / yM
    let yn = Fp.sub(xMn, xMd); //  5.  yn = xMn - xMd
    let yd = Fp.add(xMn, xMd); //  6.  yd = xMn + xMd    # (n / d - 1) / (n / d + 1) = (n - d) / (n + d)
    let tv1 = Fp.mul(xd, yd); //  7. tv1 = xd * yd
    let e = Fp.eql(tv1, Fp.ZERO); //  8.   e = tv1 == 0
    xn = Fp.cmov(xn, Fp.ZERO, e); //  9.  xn = CMOV(xn, 0, e)
    xd = Fp.cmov(xd, Fp.ONE, e); //  10. xd = CMOV(xd, 1, e)
    yn = Fp.cmov(yn, Fp.ONE, e); //  11. yn = CMOV(yn, 1, e)
    yd = Fp.cmov(yd, Fp.ONE, e); //  12. yd = CMOV(yd, 1, e)
    const [xd_inv, yd_inv] = (0, modular_ts_1.FpInvertBatch)(Fp, [xd, yd], true); // batch division
    return { x: Fp.mul(xn, xd_inv), y: Fp.mul(yn, yd_inv) }; //  13. return (xn, xd, yn, yd)
}
/** Hashing to ed25519 points / field. RFC 9380 methods. */
exports.ed25519_hasher = (() => (0, hash_to_curve_ts_1.createHasher)(exports.ed25519.Point, (scalars) => map_to_curve_elligator2_edwards25519(scalars[0]), {
    DST: 'edwards25519_XMD:SHA-512_ELL2_RO_',
    encodeDST: 'edwards25519_XMD:SHA-512_ELL2_NU_',
    p: ed25519_CURVE_p,
    m: 1,
    k: 128,
    expand: 'xmd',
    hash: sha2_js_1.sha512,
}))();
// √(-1) aka √(a) aka 2^((p-1)/4)
const SQRT_M1 = ED25519_SQRT_M1;
// √(ad - 1)
const SQRT_AD_MINUS_ONE = /* @__PURE__ */ BigInt('25063068953384623474111414158702152701244531502492656460079210482610430750235');
// 1 / √(a-d)
const INVSQRT_A_MINUS_D = /* @__PURE__ */ BigInt('54469307008909316920995813868745141605393597292927456921205312896311721017578');
// 1-d²
const ONE_MINUS_D_SQ = /* @__PURE__ */ BigInt('1159843021668779879193775521855586647937357759715417654439879720876111806838');
// (d-1)²
const D_MINUS_ONE_SQ = /* @__PURE__ */ BigInt('40440834346308536858101042469323190826248399146238708352240133220865137265952');
// Calculates 1/√(number)
const invertSqrt = (number) => uvRatio(_1n, number);
const MAX_255B = /* @__PURE__ */ BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
const bytes255ToNumberLE = (bytes) => exports.ed25519.Point.Fp.create((0, utils_ts_1.bytesToNumberLE)(bytes) & MAX_255B);
/**
 * Computes Elligator map for Ristretto255.
 * Described in [RFC9380](https://www.rfc-editor.org/rfc/rfc9380#appendix-B) and on
 * the [website](https://ristretto.group/formulas/elligator.html).
 */
function calcElligatorRistrettoMap(r0) {
    const { d } = ed25519_CURVE;
    const P = ed25519_CURVE_p;
    const mod = (n) => Fp.create(n);
    const r = mod(SQRT_M1 * r0 * r0); // 1
    const Ns = mod((r + _1n) * ONE_MINUS_D_SQ); // 2
    let c = BigInt(-1); // 3
    const D = mod((c - d * r) * mod(r + d)); // 4
    let { isValid: Ns_D_is_sq, value: s } = uvRatio(Ns, D); // 5
    let s_ = mod(s * r0); // 6
    if (!(0, modular_ts_1.isNegativeLE)(s_, P))
        s_ = mod(-s_);
    if (!Ns_D_is_sq)
        s = s_; // 7
    if (!Ns_D_is_sq)
        c = r; // 8
    const Nt = mod(c * (r - _1n) * D_MINUS_ONE_SQ - D); // 9
    const s2 = s * s;
    const W0 = mod((s + s) * D); // 10
    const W1 = mod(Nt * SQRT_AD_MINUS_ONE); // 11
    const W2 = mod(_1n - s2); // 12
    const W3 = mod(_1n + s2); // 13
    return new exports.ed25519.Point(mod(W0 * W3), mod(W2 * W1), mod(W1 * W3), mod(W0 * W2));
}
function ristretto255_map(bytes) {
    (0, utils_js_1.abytes)(bytes, 64);
    const r1 = bytes255ToNumberLE(bytes.subarray(0, 32));
    const R1 = calcElligatorRistrettoMap(r1);
    const r2 = bytes255ToNumberLE(bytes.subarray(32, 64));
    const R2 = calcElligatorRistrettoMap(r2);
    return new _RistrettoPoint(R1.add(R2));
}
/**
 * Wrapper over Edwards Point for ristretto255.
 *
 * Each ed25519/ExtendedPoint has 8 different equivalent points. This can be
 * a source of bugs for protocols like ring signatures. Ristretto was created to solve this.
 * Ristretto point operates in X:Y:Z:T extended coordinates like ExtendedPoint,
 * but it should work in its own namespace: do not combine those two.
 * See [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
 */
class _RistrettoPoint extends edwards_ts_1.PrimeEdwardsPoint {
    constructor(ep) {
        super(ep);
    }
    static fromAffine(ap) {
        return new _RistrettoPoint(exports.ed25519.Point.fromAffine(ap));
    }
    assertSame(other) {
        if (!(other instanceof _RistrettoPoint))
            throw new Error('RistrettoPoint expected');
    }
    init(ep) {
        return new _RistrettoPoint(ep);
    }
    /** @deprecated use `import { ristretto255_hasher } from '@noble/curves/ed25519.js';` */
    static hashToCurve(hex) {
        return ristretto255_map((0, utils_ts_1.ensureBytes)('ristrettoHash', hex, 64));
    }
    static fromBytes(bytes) {
        (0, utils_js_1.abytes)(bytes, 32);
        const { a, d } = ed25519_CURVE;
        const P = ed25519_CURVE_p;
        const mod = (n) => Fp.create(n);
        const s = bytes255ToNumberLE(bytes);
        // 1. Check that s_bytes is the canonical encoding of a field element, or else abort.
        // 3. Check that s is non-negative, or else abort
        if (!(0, utils_ts_1.equalBytes)(Fp.toBytes(s), bytes) || (0, modular_ts_1.isNegativeLE)(s, P))
            throw new Error('invalid ristretto255 encoding 1');
        const s2 = mod(s * s);
        const u1 = mod(_1n + a * s2); // 4 (a is -1)
        const u2 = mod(_1n - a * s2); // 5
        const u1_2 = mod(u1 * u1);
        const u2_2 = mod(u2 * u2);
        const v = mod(a * d * u1_2 - u2_2); // 6
        const { isValid, value: I } = invertSqrt(mod(v * u2_2)); // 7
        const Dx = mod(I * u2); // 8
        const Dy = mod(I * Dx * v); // 9
        let x = mod((s + s) * Dx); // 10
        if ((0, modular_ts_1.isNegativeLE)(x, P))
            x = mod(-x); // 10
        const y = mod(u1 * Dy); // 11
        const t = mod(x * y); // 12
        if (!isValid || (0, modular_ts_1.isNegativeLE)(t, P) || y === _0n)
            throw new Error('invalid ristretto255 encoding 2');
        return new _RistrettoPoint(new exports.ed25519.Point(x, y, _1n, t));
    }
    /**
     * Converts ristretto-encoded string to ristretto point.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode).
     * @param hex Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
     */
    static fromHex(hex) {
        return _RistrettoPoint.fromBytes((0, utils_ts_1.ensureBytes)('ristrettoHex', hex, 32));
    }
    static msm(points, scalars) {
        return (0, curve_ts_1.pippenger)(_RistrettoPoint, exports.ed25519.Point.Fn, points, scalars);
    }
    /**
     * Encodes ristretto point to Uint8Array.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode).
     */
    toBytes() {
        let { X, Y, Z, T } = this.ep;
        const P = ed25519_CURVE_p;
        const mod = (n) => Fp.create(n);
        const u1 = mod(mod(Z + Y) * mod(Z - Y)); // 1
        const u2 = mod(X * Y); // 2
        // Square root always exists
        const u2sq = mod(u2 * u2);
        const { value: invsqrt } = invertSqrt(mod(u1 * u2sq)); // 3
        const D1 = mod(invsqrt * u1); // 4
        const D2 = mod(invsqrt * u2); // 5
        const zInv = mod(D1 * D2 * T); // 6
        let D; // 7
        if ((0, modular_ts_1.isNegativeLE)(T * zInv, P)) {
            let _x = mod(Y * SQRT_M1);
            let _y = mod(X * SQRT_M1);
            X = _x;
            Y = _y;
            D = mod(D1 * INVSQRT_A_MINUS_D);
        }
        else {
            D = D2; // 8
        }
        if ((0, modular_ts_1.isNegativeLE)(X * zInv, P))
            Y = mod(-Y); // 9
        let s = mod((Z - Y) * D); // 10 (check footer's note, no sqrt(-a))
        if ((0, modular_ts_1.isNegativeLE)(s, P))
            s = mod(-s);
        return Fp.toBytes(s); // 11
    }
    /**
     * Compares two Ristretto points.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals).
     */
    equals(other) {
        this.assertSame(other);
        const { X: X1, Y: Y1 } = this.ep;
        const { X: X2, Y: Y2 } = other.ep;
        const mod = (n) => Fp.create(n);
        // (x1 * y2 == y1 * x2) | (y1 * y2 == x1 * x2)
        const one = mod(X1 * Y2) === mod(Y1 * X2);
        const two = mod(Y1 * Y2) === mod(X1 * X2);
        return one || two;
    }
    is0() {
        return this.equals(_RistrettoPoint.ZERO);
    }
}
// Do NOT change syntax: the following gymnastics is done,
// because typescript strips comments, which makes bundlers disable tree-shaking.
// prettier-ignore
_RistrettoPoint.BASE = 
/* @__PURE__ */ (() => new _RistrettoPoint(exports.ed25519.Point.BASE))();
// prettier-ignore
_RistrettoPoint.ZERO = 
/* @__PURE__ */ (() => new _RistrettoPoint(exports.ed25519.Point.ZERO))();
// prettier-ignore
_RistrettoPoint.Fp = 
/* @__PURE__ */ (() => Fp)();
// prettier-ignore
_RistrettoPoint.Fn = 
/* @__PURE__ */ (() => Fn)();
exports.ristretto255 = { Point: _RistrettoPoint };
/** Hashing to ristretto255 points / field. RFC 9380 methods. */
exports.ristretto255_hasher = {
    hashToCurve(msg, options) {
        const DST = options?.DST || 'ristretto255_XMD:SHA-512_R255MAP_RO_';
        const xmd = (0, hash_to_curve_ts_1.expand_message_xmd)(msg, DST, 64, sha2_js_1.sha512);
        return ristretto255_map(xmd);
    },
    hashToScalar(msg, options = { DST: hash_to_curve_ts_1._DST_scalar }) {
        const xmd = (0, hash_to_curve_ts_1.expand_message_xmd)(msg, options.DST, 64, sha2_js_1.sha512);
        return Fn.create((0, utils_ts_1.bytesToNumberLE)(xmd));
    },
};
// export const ristretto255_oprf: OPRF = createORPF({
//   name: 'ristretto255-SHA512',
//   Point: RistrettoPoint,
//   hash: sha512,
//   hashToGroup: ristretto255_hasher.hashToCurve,
//   hashToScalar: ristretto255_hasher.hashToScalar,
// });
/**
 * Weird / bogus points, useful for debugging.
 * All 8 ed25519 points of 8-torsion subgroup can be generated from the point
 * T = `26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05`.
 * ⟨T⟩ = { O, T, 2T, 3T, 4T, 5T, 6T, 7T }
 */
exports.ED25519_TORSION_SUBGROUP = [
    '0100000000000000000000000000000000000000000000000000000000000000',
    'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a',
    '0000000000000000000000000000000000000000000000000000000000000080',
    '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05',
    'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
    '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85',
    '0000000000000000000000000000000000000000000000000000000000000000',
    'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa',
];
/** @deprecated use `ed25519.utils.toMontgomery` */
function edwardsToMontgomeryPub(edwardsPub) {
    return exports.ed25519.utils.toMontgomery((0, utils_ts_1.ensureBytes)('pub', edwardsPub));
}
/** @deprecated use `ed25519.utils.toMontgomery` */
exports.edwardsToMontgomery = edwardsToMontgomeryPub;
/** @deprecated use `ed25519.utils.toMontgomerySecret` */
function edwardsToMontgomeryPriv(edwardsPriv) {
    return exports.ed25519.utils.toMontgomerySecret((0, utils_ts_1.ensureBytes)('pub', edwardsPriv));
}
/** @deprecated use `ristretto255.Point` */
exports.RistrettoPoint = _RistrettoPoint;
/** @deprecated use `import { ed25519_hasher } from '@noble/curves/ed25519.js';` */
exports.hashToCurve = (() => exports.ed25519_hasher.hashToCurve)();
/** @deprecated use `import { ed25519_hasher } from '@noble/curves/ed25519.js';` */
exports.encodeToCurve = (() => exports.ed25519_hasher.encodeToCurve)();
/** @deprecated use `import { ristretto255_hasher } from '@noble/curves/ed25519.js';` */
exports.hashToRistretto255 = (() => exports.ristretto255_hasher.hashToCurve)();
/** @deprecated use `import { ristretto255_hasher } from '@noble/curves/ed25519.js';` */
exports.hash_to_ristretto255 = (() => exports.ristretto255_hasher.hashToCurve)();
//# sourceMappingURL=ed25519.js.map