"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bls = bls;
/**
 * BLS != BLS.
 * The file implements BLS (Boneh-Lynn-Shacham) signatures.
 * Used in both BLS (Barreto-Lynn-Scott) and BN (Barreto-Naehrig)
 * families of pairing-friendly curves.
 * Consists of two curves: G1 and G2:
 * - G1 is a subgroup of (x, y) E(Fq) over y² = x³ + 4.
 * - G2 is a subgroup of ((x₁, x₂+i), (y₁, y₂+i)) E(Fq²) over y² = x³ + 4(1 + i) where i is √-1
 * - Gt, created by bilinear (ate) pairing e(G1, G2), consists of p-th roots of unity in
 *   Fq^k where k is embedding degree. Only degree 12 is currently supported, 24 is not.
 * Pairing is used to aggregate and verify signatures.
 * There are two modes of operation:
 * - Long signatures:  X-byte keys + 2X-byte sigs (G1 keys + G2 sigs).
 * - Short signatures: 2X-byte keys + X-byte sigs (G2 keys + G1 sigs).
 * @module
 **/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const utils_ts_1 = require("../utils.js");
const curve_ts_1 = require("./curve.js");
const hash_to_curve_ts_1 = require("./hash-to-curve.js");
const modular_ts_1 = require("./modular.js");
const weierstrass_ts_1 = require("./weierstrass.js");
// prettier-ignore
const _0n = BigInt(0), _1n = BigInt(1), _2n = BigInt(2), _3n = BigInt(3);
// Not used with BLS12-381 (no sequential `11` in X). Useful for other curves.
function NAfDecomposition(a) {
    const res = [];
    // a>1 because of marker bit
    for (; a > _1n; a >>= _1n) {
        if ((a & _1n) === _0n)
            res.unshift(0);
        else if ((a & _3n) === _3n) {
            res.unshift(-1);
            a += _1n;
        }
        else
            res.unshift(1);
    }
    return res;
}
function aNonEmpty(arr) {
    if (!Array.isArray(arr) || arr.length === 0)
        throw new Error('expected non-empty array');
}
// This should be enough for bn254, no need to export full stuff?
function createBlsPairing(fields, G1, G2, params) {
    const { Fp2, Fp12 } = fields;
    const { twistType, ateLoopSize, xNegative, postPrecompute } = params;
    // Applies sparse multiplication as line function
    let lineFunction;
    if (twistType === 'multiplicative') {
        lineFunction = (c0, c1, c2, f, Px, Py) => Fp12.mul014(f, c0, Fp2.mul(c1, Px), Fp2.mul(c2, Py));
    }
    else if (twistType === 'divisive') {
        // NOTE: it should be [c0, c1, c2], but we use different order here to reduce complexity of
        // precompute calculations.
        lineFunction = (c0, c1, c2, f, Px, Py) => Fp12.mul034(f, Fp2.mul(c2, Py), Fp2.mul(c1, Px), c0);
    }
    else
        throw new Error('bls: unknown twist type');
    const Fp2div2 = Fp2.div(Fp2.ONE, Fp2.mul(Fp2.ONE, _2n));
    function pointDouble(ell, Rx, Ry, Rz) {
        const t0 = Fp2.sqr(Ry); // Ry²
        const t1 = Fp2.sqr(Rz); // Rz²
        const t2 = Fp2.mulByB(Fp2.mul(t1, _3n)); // 3 * T1 * B
        const t3 = Fp2.mul(t2, _3n); // 3 * T2
        const t4 = Fp2.sub(Fp2.sub(Fp2.sqr(Fp2.add(Ry, Rz)), t1), t0); // (Ry + Rz)² - T1 - T0
        const c0 = Fp2.sub(t2, t0); // T2 - T0 (i)
        const c1 = Fp2.mul(Fp2.sqr(Rx), _3n); // 3 * Rx²
        const c2 = Fp2.neg(t4); // -T4 (-h)
        ell.push([c0, c1, c2]);
        Rx = Fp2.mul(Fp2.mul(Fp2.mul(Fp2.sub(t0, t3), Rx), Ry), Fp2div2); // ((T0 - T3) * Rx * Ry) / 2
        Ry = Fp2.sub(Fp2.sqr(Fp2.mul(Fp2.add(t0, t3), Fp2div2)), Fp2.mul(Fp2.sqr(t2), _3n)); // ((T0 + T3) / 2)² - 3 * T2²
        Rz = Fp2.mul(t0, t4); // T0 * T4
        return { Rx, Ry, Rz };
    }
    function pointAdd(ell, Rx, Ry, Rz, Qx, Qy) {
        // Addition
        const t0 = Fp2.sub(Ry, Fp2.mul(Qy, Rz)); // Ry - Qy * Rz
        const t1 = Fp2.sub(Rx, Fp2.mul(Qx, Rz)); // Rx - Qx * Rz
        const c0 = Fp2.sub(Fp2.mul(t0, Qx), Fp2.mul(t1, Qy)); // T0 * Qx - T1 * Qy == Ry * Qx  - Rx * Qy
        const c1 = Fp2.neg(t0); // -T0 == Qy * Rz - Ry
        const c2 = t1; // == Rx - Qx * Rz
        ell.push([c0, c1, c2]);
        const t2 = Fp2.sqr(t1); // T1²
        const t3 = Fp2.mul(t2, t1); // T2 * T1
        const t4 = Fp2.mul(t2, Rx); // T2 * Rx
        const t5 = Fp2.add(Fp2.sub(t3, Fp2.mul(t4, _2n)), Fp2.mul(Fp2.sqr(t0), Rz)); // T3 - 2 * T4 + T0² * Rz
        Rx = Fp2.mul(t1, t5); // T1 * T5
        Ry = Fp2.sub(Fp2.mul(Fp2.sub(t4, t5), t0), Fp2.mul(t3, Ry)); // (T4 - T5) * T0 - T3 * Ry
        Rz = Fp2.mul(Rz, t3); // Rz * T3
        return { Rx, Ry, Rz };
    }
    // Pre-compute coefficients for sparse multiplication
    // Point addition and point double calculations is reused for coefficients
    // pointAdd happens only if bit set, so wNAF is reasonable. Unfortunately we cannot combine
    // add + double in windowed precomputes here, otherwise it would be single op (since X is static)
    const ATE_NAF = NAfDecomposition(ateLoopSize);
    const calcPairingPrecomputes = (0, utils_ts_1.memoized)((point) => {
        const p = point;
        const { x, y } = p.toAffine();
        // prettier-ignore
        const Qx = x, Qy = y, negQy = Fp2.neg(y);
        // prettier-ignore
        let Rx = Qx, Ry = Qy, Rz = Fp2.ONE;
        const ell = [];
        for (const bit of ATE_NAF) {
            const cur = [];
            ({ Rx, Ry, Rz } = pointDouble(cur, Rx, Ry, Rz));
            if (bit)
                ({ Rx, Ry, Rz } = pointAdd(cur, Rx, Ry, Rz, Qx, bit === -1 ? negQy : Qy));
            ell.push(cur);
        }
        if (postPrecompute) {
            const last = ell[ell.length - 1];
            postPrecompute(Rx, Ry, Rz, Qx, Qy, pointAdd.bind(null, last));
        }
        return ell;
    });
    function millerLoopBatch(pairs, withFinalExponent = false) {
        let f12 = Fp12.ONE;
        if (pairs.length) {
            const ellLen = pairs[0][0].length;
            for (let i = 0; i < ellLen; i++) {
                f12 = Fp12.sqr(f12); // This allows us to do sqr only one time for all pairings
                // NOTE: we apply multiple pairings in parallel here
                for (const [ell, Px, Py] of pairs) {
                    for (const [c0, c1, c2] of ell[i])
                        f12 = lineFunction(c0, c1, c2, f12, Px, Py);
                }
            }
        }
        if (xNegative)
            f12 = Fp12.conjugate(f12);
        return withFinalExponent ? Fp12.finalExponentiate(f12) : f12;
    }
    // Calculates product of multiple pairings
    // This up to x2 faster than just `map(({g1, g2})=>pairing({g1,g2}))`
    function pairingBatch(pairs, withFinalExponent = true) {
        const res = [];
        // Cache precomputed toAffine for all points
        (0, curve_ts_1.normalizeZ)(G1, pairs.map(({ g1 }) => g1));
        (0, curve_ts_1.normalizeZ)(G2, pairs.map(({ g2 }) => g2));
        for (const { g1, g2 } of pairs) {
            if (g1.is0() || g2.is0())
                throw new Error('pairing is not available for ZERO point');
            // This uses toAffine inside
            g1.assertValidity();
            g2.assertValidity();
            const Qa = g1.toAffine();
            res.push([calcPairingPrecomputes(g2), Qa.x, Qa.y]);
        }
        return millerLoopBatch(res, withFinalExponent);
    }
    // Calculates bilinear pairing
    function pairing(Q, P, withFinalExponent = true) {
        return pairingBatch([{ g1: Q, g2: P }], withFinalExponent);
    }
    return {
        Fp12, // NOTE: we re-export Fp12 here because pairing results are Fp12!
        millerLoopBatch,
        pairing,
        pairingBatch,
        calcPairingPrecomputes,
    };
}
function createBlsSig(blsPairing, PubCurve, SigCurve, SignatureCoder, isSigG1) {
    const { Fp12, pairingBatch } = blsPairing;
    function normPub(point) {
        return point instanceof PubCurve.Point ? point : PubCurve.Point.fromHex(point);
    }
    function normSig(point) {
        return point instanceof SigCurve.Point ? point : SigCurve.Point.fromHex(point);
    }
    function amsg(m) {
        if (!(m instanceof SigCurve.Point))
            throw new Error(`expected valid message hashed to ${!isSigG1 ? 'G2' : 'G1'} curve`);
        return m;
    }
    // What matters here is what point pairing API accepts as G1 or G2, not actual size or names
    const pair = !isSigG1
        ? (a, b) => ({ g1: a, g2: b })
        : (a, b) => ({ g1: b, g2: a });
    return {
        // P = pk x G
        getPublicKey(secretKey) {
            // TODO: replace with
            // const sec = PubCurve.Point.Fn.fromBytes(secretKey);
            const sec = (0, weierstrass_ts_1._normFnElement)(PubCurve.Point.Fn, secretKey);
            return PubCurve.Point.BASE.multiply(sec);
        },
        // S = pk x H(m)
        sign(message, secretKey, unusedArg) {
            if (unusedArg != null)
                throw new Error('sign() expects 2 arguments');
            // TODO: replace with
            // PubCurve.Point.Fn.fromBytes(secretKey)
            const sec = (0, weierstrass_ts_1._normFnElement)(PubCurve.Point.Fn, secretKey);
            amsg(message).assertValidity();
            return message.multiply(sec);
        },
        // Checks if pairing of public key & hash is equal to pairing of generator & signature.
        // e(P, H(m)) == e(G, S)
        // e(S, G) == e(H(m), P)
        verify(signature, message, publicKey, unusedArg) {
            if (unusedArg != null)
                throw new Error('verify() expects 3 arguments');
            signature = normSig(signature);
            publicKey = normPub(publicKey);
            const P = publicKey.negate();
            const G = PubCurve.Point.BASE;
            const Hm = amsg(message);
            const S = signature;
            // This code was changed in 1.9.x:
            // Before it was G.negate() in G2, now it's always pubKey.negate
            // e(P, -Q)===e(-P, Q)==e(P, Q)^-1. Negate can be done anywhere (as long it is done once per pair).
            // We just moving sign, but since pairing is multiplicative, we doing X * X^-1 = 1
            const exp = pairingBatch([pair(P, Hm), pair(G, S)]);
            return Fp12.eql(exp, Fp12.ONE);
        },
        // https://ethresear.ch/t/fast-verification-of-multiple-bls-signatures/5407
        // e(G, S) = e(G, SUM(n)(Si)) = MUL(n)(e(G, Si))
        // TODO: maybe `{message: G2Hex, publicKey: G1Hex}[]` instead?
        verifyBatch(signature, messages, publicKeys) {
            aNonEmpty(messages);
            if (publicKeys.length !== messages.length)
                throw new Error('amount of public keys and messages should be equal');
            const sig = normSig(signature);
            const nMessages = messages;
            const nPublicKeys = publicKeys.map(normPub);
            // NOTE: this works only for exact same object
            const messagePubKeyMap = new Map();
            for (let i = 0; i < nPublicKeys.length; i++) {
                const pub = nPublicKeys[i];
                const msg = nMessages[i];
                let keys = messagePubKeyMap.get(msg);
                if (keys === undefined) {
                    keys = [];
                    messagePubKeyMap.set(msg, keys);
                }
                keys.push(pub);
            }
            const paired = [];
            const G = PubCurve.Point.BASE;
            try {
                for (const [msg, keys] of messagePubKeyMap) {
                    const groupPublicKey = keys.reduce((acc, msg) => acc.add(msg));
                    paired.push(pair(groupPublicKey, msg));
                }
                paired.push(pair(G.negate(), sig));
                return Fp12.eql(pairingBatch(paired), Fp12.ONE);
            }
            catch {
                return false;
            }
        },
        // Adds a bunch of public key points together.
        // pk1 + pk2 + pk3 = pkA
        aggregatePublicKeys(publicKeys) {
            aNonEmpty(publicKeys);
            publicKeys = publicKeys.map((pub) => normPub(pub));
            const agg = publicKeys.reduce((sum, p) => sum.add(p), PubCurve.Point.ZERO);
            agg.assertValidity();
            return agg;
        },
        // Adds a bunch of signature points together.
        // pk1 + pk2 + pk3 = pkA
        aggregateSignatures(signatures) {
            aNonEmpty(signatures);
            signatures = signatures.map((sig) => normSig(sig));
            const agg = signatures.reduce((sum, s) => sum.add(s), SigCurve.Point.ZERO);
            agg.assertValidity();
            return agg;
        },
        hash(messageBytes, DST) {
            (0, utils_ts_1.abytes)(messageBytes);
            const opts = DST ? { DST } : undefined;
            return SigCurve.hashToCurve(messageBytes, opts);
        },
        Signature: SignatureCoder,
    };
}
// G1_Point: ProjConstructor<bigint>, G2_Point: ProjConstructor<Fp2>,
function bls(CURVE) {
    // Fields are specific for curve, so for now we'll need to pass them with opts
    const { Fp, Fr, Fp2, Fp6, Fp12 } = CURVE.fields;
    // Point on G1 curve: (x, y)
    const G1_ = (0, weierstrass_ts_1.weierstrassPoints)(CURVE.G1);
    const G1 = Object.assign(G1_, (0, hash_to_curve_ts_1.createHasher)(G1_.Point, CURVE.G1.mapToCurve, {
        ...CURVE.htfDefaults,
        ...CURVE.G1.htfDefaults,
    }));
    // Point on G2 curve (complex numbers): (x₁, x₂+i), (y₁, y₂+i)
    const G2_ = (0, weierstrass_ts_1.weierstrassPoints)(CURVE.G2);
    const G2 = Object.assign(G2_, (0, hash_to_curve_ts_1.createHasher)(G2_.Point, CURVE.G2.mapToCurve, {
        ...CURVE.htfDefaults,
        ...CURVE.G2.htfDefaults,
    }));
    const pairingRes = createBlsPairing(CURVE.fields, G1.Point, G2.Point, {
        ...CURVE.params,
        postPrecompute: CURVE.postPrecompute,
    });
    const { millerLoopBatch, pairing, pairingBatch, calcPairingPrecomputes } = pairingRes;
    const longSignatures = createBlsSig(pairingRes, G1, G2, CURVE.G2.Signature, false);
    const shortSignatures = createBlsSig(pairingRes, G2, G1, CURVE.G1.ShortSignature, true);
    const rand = CURVE.randomBytes || utils_ts_1.randomBytes;
    const randomSecretKey = () => {
        const length = (0, modular_ts_1.getMinHashLength)(Fr.ORDER);
        return (0, modular_ts_1.mapHashToField)(rand(length), Fr.ORDER);
    };
    const utils = {
        randomSecretKey,
        randomPrivateKey: randomSecretKey,
        calcPairingPrecomputes,
    };
    const { ShortSignature } = CURVE.G1;
    const { Signature } = CURVE.G2;
    function normP1Hash(point, htfOpts) {
        return point instanceof G1.Point
            ? point
            : shortSignatures.hash((0, utils_ts_1.ensureBytes)('point', point), htfOpts?.DST);
    }
    function normP2Hash(point, htfOpts) {
        return point instanceof G2.Point
            ? point
            : longSignatures.hash((0, utils_ts_1.ensureBytes)('point', point), htfOpts?.DST);
    }
    function getPublicKey(privateKey) {
        return longSignatures.getPublicKey(privateKey).toBytes(true);
    }
    function getPublicKeyForShortSignatures(privateKey) {
        return shortSignatures.getPublicKey(privateKey).toBytes(true);
    }
    function sign(message, privateKey, htfOpts) {
        const Hm = normP2Hash(message, htfOpts);
        const S = longSignatures.sign(Hm, privateKey);
        return message instanceof G2.Point ? S : Signature.toBytes(S);
    }
    function signShortSignature(message, privateKey, htfOpts) {
        const Hm = normP1Hash(message, htfOpts);
        const S = shortSignatures.sign(Hm, privateKey);
        return message instanceof G1.Point ? S : ShortSignature.toBytes(S);
    }
    function verify(signature, message, publicKey, htfOpts) {
        const Hm = normP2Hash(message, htfOpts);
        return longSignatures.verify(signature, Hm, publicKey);
    }
    function verifyShortSignature(signature, message, publicKey, htfOpts) {
        const Hm = normP1Hash(message, htfOpts);
        return shortSignatures.verify(signature, Hm, publicKey);
    }
    function aggregatePublicKeys(publicKeys) {
        const agg = longSignatures.aggregatePublicKeys(publicKeys);
        return publicKeys[0] instanceof G1.Point ? agg : agg.toBytes(true);
    }
    function aggregateSignatures(signatures) {
        const agg = longSignatures.aggregateSignatures(signatures);
        return signatures[0] instanceof G2.Point ? agg : Signature.toBytes(agg);
    }
    function aggregateShortSignatures(signatures) {
        const agg = shortSignatures.aggregateSignatures(signatures);
        return signatures[0] instanceof G1.Point ? agg : ShortSignature.toBytes(agg);
    }
    function verifyBatch(signature, messages, publicKeys, htfOpts) {
        const Hm = messages.map((m) => normP2Hash(m, htfOpts));
        return longSignatures.verifyBatch(signature, Hm, publicKeys);
    }
    G1.Point.BASE.precompute(4);
    return {
        longSignatures,
        shortSignatures,
        millerLoopBatch,
        pairing,
        pairingBatch,
        verifyBatch,
        fields: {
            Fr,
            Fp,
            Fp2,
            Fp6,
            Fp12,
        },
        params: {
            ateLoopSize: CURVE.params.ateLoopSize,
            twistType: CURVE.params.twistType,
            // deprecated
            r: CURVE.params.r,
            G1b: CURVE.G1.b,
            G2b: CURVE.G2.b,
        },
        utils,
        // deprecated
        getPublicKey,
        getPublicKeyForShortSignatures,
        sign,
        signShortSignature,
        verify,
        verifyShortSignature,
        aggregatePublicKeys,
        aggregateSignatures,
        aggregateShortSignatures,
        G1,
        G2,
        Signature,
        ShortSignature,
    };
}
//# sourceMappingURL=bls.js.map