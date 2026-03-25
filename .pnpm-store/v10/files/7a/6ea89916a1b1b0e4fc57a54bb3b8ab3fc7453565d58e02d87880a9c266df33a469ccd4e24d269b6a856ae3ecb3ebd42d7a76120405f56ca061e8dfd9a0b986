"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vesta = exports.pallas = exports.pasta_q = exports.pasta_p = exports.babyjubjub = exports.jubjub = void 0;
exports.jubjub_groupHash = jubjub_groupHash;
exports.jubjub_findGroupHash = jubjub_findGroupHash;
/**
 * Miscellaneous, rarely used curves.
 * jubjub, babyjubjub, pallas, vesta.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const blake1_js_1 = require("@noble/hashes/blake1.js");
const blake2_js_1 = require("@noble/hashes/blake2.js");
const sha2_js_1 = require("@noble/hashes/sha2.js");
const utils_js_1 = require("@noble/hashes/utils.js");
const edwards_ts_1 = require("./abstract/edwards.js");
const modular_ts_1 = require("./abstract/modular.js");
const weierstrass_ts_1 = require("./abstract/weierstrass.js");
const bls12_381_ts_1 = require("./bls12-381.js");
const bn254_ts_1 = require("./bn254.js");
// Jubjub curves have 𝔽p over scalar fields of other curves. They are friendly to ZK proofs.
// jubjub Fp = bls n. babyjubjub Fp = bn254 n.
// verify manually, check bls12-381.ts and bn254.ts.
const jubjub_CURVE = {
    p: bls12_381_ts_1.bls12_381_Fr.ORDER,
    n: BigInt('0xe7db4ea6533afa906673b0101343b00a6682093ccc81082d0970e5ed6f72cb7'),
    h: BigInt(8),
    a: BigInt('0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000000'),
    d: BigInt('0x2a9318e74bfa2b48f5fd9207e6bd7fd4292d7f6d37579d2601065fd6d6343eb1'),
    Gx: BigInt('0x11dafe5d23e1218086a365b99fbf3d3be72f6afd7d1f72623e6b071492d1122b'),
    Gy: BigInt('0x1d523cf1ddab1a1793132e78c866c0c33e26ba5cc220fed7cc3f870e59d292aa'),
};
/** Curve over scalar field of bls12-381. jubjub Fp = bls n */
exports.jubjub = (0, edwards_ts_1.twistedEdwards)({
    ...jubjub_CURVE,
    Fp: bls12_381_ts_1.bls12_381_Fr,
    hash: sha2_js_1.sha512,
});
const babyjubjub_CURVE = {
    p: bn254_ts_1.bn254_Fr.ORDER,
    n: BigInt('0x30644e72e131a029b85045b68181585d59f76dc1c90770533b94bee1c9093788'),
    h: BigInt(8),
    a: BigInt('168700'),
    d: BigInt('168696'),
    Gx: BigInt('0x23343e3445b673d38bcba38f25645adb494b1255b1162bb40f41a59f4d4b45e'),
    Gy: BigInt('0xc19139cb84c680a6e14116da06056174a0cfa121e6e5c2450f87d64fc000001'),
};
/** Curve over scalar field of bn254. babyjubjub Fp = bn254 n */
exports.babyjubjub = (0, edwards_ts_1.twistedEdwards)({
    ...babyjubjub_CURVE,
    Fp: bn254_ts_1.bn254_Fr,
    hash: blake1_js_1.blake256,
});
const jubjub_gh_first_block = (0, utils_js_1.utf8ToBytes)('096b36a5804bfacef1691e173c366a47ff5ba84a44f26ddd7e8d9f79d5b42df0');
// Returns point at JubJub curve which is prime order and not zero
function jubjub_groupHash(tag, personalization) {
    const h = blake2_js_1.blake2s.create({ personalization, dkLen: 32 });
    h.update(jubjub_gh_first_block);
    h.update(tag);
    // NOTE: returns ExtendedPoint, in case it will be multiplied later
    let p = exports.jubjub.Point.fromBytes(h.digest());
    // NOTE: cannot replace with isSmallOrder, returns Point*8
    p = p.multiply(jubjub_CURVE.h);
    if (p.equals(exports.jubjub.Point.ZERO))
        throw new Error('Point has small order');
    return p;
}
// No secret data is leaked here at all.
// It operates over public data:
// const G_SPEND = jubjub.findGroupHash(Uint8Array.of(), utf8ToBytes('Item_G_'));
function jubjub_findGroupHash(m, personalization) {
    const tag = (0, utils_js_1.concatBytes)(m, Uint8Array.of(0));
    const hashes = [];
    for (let i = 0; i < 256; i++) {
        tag[tag.length - 1] = i;
        try {
            hashes.push(jubjub_groupHash(tag, personalization));
        }
        catch (e) { }
    }
    if (!hashes.length)
        throw new Error('findGroupHash tag overflow');
    return hashes[0];
}
// Pasta curves. See [Spec](https://o1-labs.github.io/proof-systems/specs/pasta.html).
exports.pasta_p = BigInt('0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001');
exports.pasta_q = BigInt('0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001');
/**
 * @deprecated
 */
exports.pallas = (0, weierstrass_ts_1.weierstrass)({
    a: BigInt(0),
    b: BigInt(5),
    Fp: (0, modular_ts_1.Field)(exports.pasta_p),
    n: exports.pasta_q,
    Gx: (0, modular_ts_1.mod)(BigInt(-1), exports.pasta_p),
    Gy: BigInt(2),
    h: BigInt(1),
    hash: sha2_js_1.sha256,
});
/**
 * @deprecated
 */
exports.vesta = (0, weierstrass_ts_1.weierstrass)({
    a: BigInt(0),
    b: BigInt(5),
    Fp: (0, modular_ts_1.Field)(exports.pasta_q),
    n: exports.pasta_p,
    Gx: (0, modular_ts_1.mod)(BigInt(-1), exports.pasta_q),
    Gy: BigInt(2),
    h: BigInt(1),
    hash: sha2_js_1.sha256,
});
//# sourceMappingURL=misc.js.map