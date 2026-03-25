"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.montgomery = montgomery;
/**
 * Montgomery curve methods. It's not really whole montgomery curve,
 * just bunch of very specific methods for X25519 / X448 from
 * [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748)
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const utils_ts_1 = require("../utils.js");
const modular_ts_1 = require("./modular.js");
const _0n = BigInt(0);
const _1n = BigInt(1);
const _2n = BigInt(2);
function validateOpts(curve) {
    (0, utils_ts_1._validateObject)(curve, {
        adjustScalarBytes: 'function',
        powPminus2: 'function',
    });
    return Object.freeze({ ...curve });
}
function montgomery(curveDef) {
    const CURVE = validateOpts(curveDef);
    const { P, type, adjustScalarBytes, powPminus2, randomBytes: rand } = CURVE;
    const is25519 = type === 'x25519';
    if (!is25519 && type !== 'x448')
        throw new Error('invalid type');
    const randomBytes_ = rand || utils_ts_1.randomBytes;
    const montgomeryBits = is25519 ? 255 : 448;
    const fieldLen = is25519 ? 32 : 56;
    const Gu = is25519 ? BigInt(9) : BigInt(5);
    // RFC 7748 #5:
    // The constant a24 is (486662 - 2) / 4 = 121665 for curve25519/X25519 and
    // (156326 - 2) / 4 = 39081 for curve448/X448
    // const a = is25519 ? 156326n : 486662n;
    const a24 = is25519 ? BigInt(121665) : BigInt(39081);
    // RFC: x25519 "the resulting integer is of the form 2^254 plus
    // eight times a value between 0 and 2^251 - 1 (inclusive)"
    // x448: "2^447 plus four times a value between 0 and 2^445 - 1 (inclusive)"
    const minScalar = is25519 ? _2n ** BigInt(254) : _2n ** BigInt(447);
    const maxAdded = is25519
        ? BigInt(8) * _2n ** BigInt(251) - _1n
        : BigInt(4) * _2n ** BigInt(445) - _1n;
    const maxScalar = minScalar + maxAdded + _1n; // (inclusive)
    const modP = (n) => (0, modular_ts_1.mod)(n, P);
    const GuBytes = encodeU(Gu);
    function encodeU(u) {
        return (0, utils_ts_1.numberToBytesLE)(modP(u), fieldLen);
    }
    function decodeU(u) {
        const _u = (0, utils_ts_1.ensureBytes)('u coordinate', u, fieldLen);
        // RFC: When receiving such an array, implementations of X25519
        // (but not X448) MUST mask the most significant bit in the final byte.
        if (is25519)
            _u[31] &= 127; // 0b0111_1111
        // RFC: Implementations MUST accept non-canonical values and process them as
        // if they had been reduced modulo the field prime.  The non-canonical
        // values are 2^255 - 19 through 2^255 - 1 for X25519 and 2^448 - 2^224
        // - 1 through 2^448 - 1 for X448.
        return modP((0, utils_ts_1.bytesToNumberLE)(_u));
    }
    function decodeScalar(scalar) {
        return (0, utils_ts_1.bytesToNumberLE)(adjustScalarBytes((0, utils_ts_1.ensureBytes)('scalar', scalar, fieldLen)));
    }
    function scalarMult(scalar, u) {
        const pu = montgomeryLadder(decodeU(u), decodeScalar(scalar));
        // Some public keys are useless, of low-order. Curve author doesn't think
        // it needs to be validated, but we do it nonetheless.
        // https://cr.yp.to/ecdh.html#validate
        if (pu === _0n)
            throw new Error('invalid private or public key received');
        return encodeU(pu);
    }
    // Computes public key from private. By doing scalar multiplication of base point.
    function scalarMultBase(scalar) {
        return scalarMult(scalar, GuBytes);
    }
    // cswap from RFC7748 "example code"
    function cswap(swap, x_2, x_3) {
        // dummy = mask(swap) AND (x_2 XOR x_3)
        // Where mask(swap) is the all-1 or all-0 word of the same length as x_2
        // and x_3, computed, e.g., as mask(swap) = 0 - swap.
        const dummy = modP(swap * (x_2 - x_3));
        x_2 = modP(x_2 - dummy); // x_2 = x_2 XOR dummy
        x_3 = modP(x_3 + dummy); // x_3 = x_3 XOR dummy
        return { x_2, x_3 };
    }
    /**
     * Montgomery x-only multiplication ladder.
     * @param pointU u coordinate (x) on Montgomery Curve 25519
     * @param scalar by which the point would be multiplied
     * @returns new Point on Montgomery curve
     */
    function montgomeryLadder(u, scalar) {
        (0, utils_ts_1.aInRange)('u', u, _0n, P);
        (0, utils_ts_1.aInRange)('scalar', scalar, minScalar, maxScalar);
        const k = scalar;
        const x_1 = u;
        let x_2 = _1n;
        let z_2 = _0n;
        let x_3 = u;
        let z_3 = _1n;
        let swap = _0n;
        for (let t = BigInt(montgomeryBits - 1); t >= _0n; t--) {
            const k_t = (k >> t) & _1n;
            swap ^= k_t;
            ({ x_2, x_3 } = cswap(swap, x_2, x_3));
            ({ x_2: z_2, x_3: z_3 } = cswap(swap, z_2, z_3));
            swap = k_t;
            const A = x_2 + z_2;
            const AA = modP(A * A);
            const B = x_2 - z_2;
            const BB = modP(B * B);
            const E = AA - BB;
            const C = x_3 + z_3;
            const D = x_3 - z_3;
            const DA = modP(D * A);
            const CB = modP(C * B);
            const dacb = DA + CB;
            const da_cb = DA - CB;
            x_3 = modP(dacb * dacb);
            z_3 = modP(x_1 * modP(da_cb * da_cb));
            x_2 = modP(AA * BB);
            z_2 = modP(E * (AA + modP(a24 * E)));
        }
        ({ x_2, x_3 } = cswap(swap, x_2, x_3));
        ({ x_2: z_2, x_3: z_3 } = cswap(swap, z_2, z_3));
        const z2 = powPminus2(z_2); // `Fp.pow(x, P - _2n)` is much slower equivalent
        return modP(x_2 * z2); // Return x_2 * (z_2^(p - 2))
    }
    const lengths = {
        secretKey: fieldLen,
        publicKey: fieldLen,
        seed: fieldLen,
    };
    const randomSecretKey = (seed = randomBytes_(fieldLen)) => {
        (0, utils_ts_1.abytes)(seed, lengths.seed);
        return seed;
    };
    function keygen(seed) {
        const secretKey = randomSecretKey(seed);
        return { secretKey, publicKey: scalarMultBase(secretKey) };
    }
    const utils = {
        randomSecretKey,
        randomPrivateKey: randomSecretKey,
    };
    return {
        keygen,
        getSharedSecret: (secretKey, publicKey) => scalarMult(secretKey, publicKey),
        getPublicKey: (secretKey) => scalarMultBase(secretKey),
        scalarMult,
        scalarMultBase,
        utils,
        GuBytes: GuBytes.slice(),
        lengths,
    };
}
//# sourceMappingURL=montgomery.js.map