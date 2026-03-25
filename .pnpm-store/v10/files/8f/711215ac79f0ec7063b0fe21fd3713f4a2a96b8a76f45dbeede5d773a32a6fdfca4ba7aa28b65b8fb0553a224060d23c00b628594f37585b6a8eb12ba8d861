/**
 * Internal module for NIST P256, P384, P521 curves.
 * Do not use for now.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js';
import { createCurve } from "./_shortw_utils.js";
import { createHasher } from "./abstract/hash-to-curve.js";
import { Field } from "./abstract/modular.js";
import { mapToCurveSimpleSWU, } from "./abstract/weierstrass.js";
// p = 2n**224n * (2n**32n-1n) + 2n**192n + 2n**96n - 1n
// a = Fp256.create(BigInt('-3'));
const p256_CURVE = {
    p: BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff'),
    n: BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'),
    h: BigInt(1),
    a: BigInt('0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc'),
    b: BigInt('0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b'),
    Gx: BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'),
    Gy: BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5'),
};
// p = 2n**384n - 2n**128n - 2n**96n + 2n**32n - 1n
const p384_CURVE = {
    p: BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff'),
    n: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973'),
    h: BigInt(1),
    a: BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000fffffffc'),
    b: BigInt('0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef'),
    Gx: BigInt('0xaa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7'),
    Gy: BigInt('0x3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f'),
};
// p = 2n**521n - 1n
const p521_CURVE = {
    p: BigInt('0x1ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    n: BigInt('0x01fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa51868783bf2f966b7fcc0148f709a5d03bb5c9b8899c47aebb6fb71e91386409'),
    h: BigInt(1),
    a: BigInt('0x1fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc'),
    b: BigInt('0x0051953eb9618e1c9a1f929a21a0b68540eea2da725b99b315f3b8b489918ef109e156193951ec7e937b1652c0bd3bb1bf073573df883d2c34f1ef451fd46b503f00'),
    Gx: BigInt('0x00c6858e06b70404e9cd9e3ecb662395b4429c648139053fb521f828af606b4d3dbaa14b5e77efe75928fe1dc127a2ffa8de3348b3c1856a429bf97e7e31c2e5bd66'),
    Gy: BigInt('0x011839296a789a3bc0045c8a5fb42c7d1bd998f54449579b446817afbd17273e662c97ee72995ef42640c550b9013fad0761353c7086a272c24088be94769fd16650'),
};
const Fp256 = Field(p256_CURVE.p);
const Fp384 = Field(p384_CURVE.p);
const Fp521 = Field(p521_CURVE.p);
function createSWU(Point, opts) {
    const map = mapToCurveSimpleSWU(Point.Fp, opts);
    return (scalars) => map(scalars[0]);
}
/** NIST P256 (aka secp256r1, prime256v1) curve, ECDSA and ECDH methods. */
export const p256 = createCurve({ ...p256_CURVE, Fp: Fp256, lowS: false }, sha256);
/** Hashing / encoding to p256 points / field. RFC 9380 methods. */
export const p256_hasher = /* @__PURE__ */ (() => {
    return createHasher(p256.Point, createSWU(p256.Point, {
        A: p256_CURVE.a,
        B: p256_CURVE.b,
        Z: p256.Point.Fp.create(BigInt('-10')),
    }), {
        DST: 'P256_XMD:SHA-256_SSWU_RO_',
        encodeDST: 'P256_XMD:SHA-256_SSWU_NU_',
        p: p256_CURVE.p,
        m: 1,
        k: 128,
        expand: 'xmd',
        hash: sha256,
    });
})();
// export const p256_oprf: OPRF = createORPF({
//   name: 'P256-SHA256',
//   Point: p256.Point,
//   hash: sha256,
//   hashToGroup: p256_hasher.hashToCurve,
//   hashToScalar: p256_hasher.hashToScalar,
// });
/** NIST P384 (aka secp384r1) curve, ECDSA and ECDH methods. */
export const p384 = createCurve({ ...p384_CURVE, Fp: Fp384, lowS: false }, sha384);
/** Hashing / encoding to p384 points / field. RFC 9380 methods. */
export const p384_hasher = /* @__PURE__ */ (() => {
    return createHasher(p384.Point, createSWU(p384.Point, {
        A: p384_CURVE.a,
        B: p384_CURVE.b,
        Z: p384.Point.Fp.create(BigInt('-12')),
    }), {
        DST: 'P384_XMD:SHA-384_SSWU_RO_',
        encodeDST: 'P384_XMD:SHA-384_SSWU_NU_',
        p: p384_CURVE.p,
        m: 1,
        k: 192,
        expand: 'xmd',
        hash: sha384,
    });
})();
// export const p384_oprf: OPRF = createORPF({
//   name: 'P384-SHA384',
//   Point: p384.Point,
//   hash: sha384,
//   hashToGroup: p384_hasher.hashToCurve,
//   hashToScalar: p384_hasher.hashToScalar,
// });
// const Fn521 = Field(p521_CURVE.n, { allowedScalarLengths: [65, 66] });
/** NIST P521 (aka secp521r1) curve, ECDSA and ECDH methods. */
export const p521 = createCurve({ ...p521_CURVE, Fp: Fp521, lowS: false, allowedPrivateKeyLengths: [130, 131, 132] }, sha512);
/** @deprecated use `p256` for consistency with `p256_hasher` */
export const secp256r1 = p256;
/** @deprecated use `p384` for consistency with `p384_hasher` */
export const secp384r1 = p384;
/** @deprecated use `p521` for consistency with `p521_hasher` */
export const secp521r1 = p521;
/** Hashing / encoding to p521 points / field. RFC 9380 methods. */
export const p521_hasher = /* @__PURE__ */ (() => {
    return createHasher(p521.Point, createSWU(p521.Point, {
        A: p521_CURVE.a,
        B: p521_CURVE.b,
        Z: p521.Point.Fp.create(BigInt('-4')),
    }), {
        DST: 'P521_XMD:SHA-512_SSWU_RO_',
        encodeDST: 'P521_XMD:SHA-512_SSWU_NU_',
        p: p521_CURVE.p,
        m: 1,
        k: 256,
        expand: 'xmd',
        hash: sha512,
    });
})();
// export const p521_oprf: OPRF = createORPF({
//   name: 'P521-SHA512',
//   Point: p521.Point,
//   hash: sha512,
//   hashToGroup: p521_hasher.hashToCurve,
//   hashToScalar: p521_hasher.hashToScalar, // produces L=98 just like in RFC
// });
//# sourceMappingURL=nist.js.map