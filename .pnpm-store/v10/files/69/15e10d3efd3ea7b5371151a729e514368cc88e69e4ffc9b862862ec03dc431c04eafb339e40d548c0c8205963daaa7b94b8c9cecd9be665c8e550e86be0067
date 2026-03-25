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
import { type CHash, type Hex, type PrivKey } from '../utils.ts';
import { type H2CHasher, type H2CHashOpts, type H2COpts, type htfBasicOpts, type MapToCurve } from './hash-to-curve.ts';
import { type IField } from './modular.ts';
import type { Fp12, Fp12Bls, Fp2, Fp2Bls, Fp6Bls } from './tower.ts';
import { type CurvePointsRes, type CurvePointsType, type WeierstrassPoint, type WeierstrassPointCons } from './weierstrass.ts';
type Fp = bigint;
export type TwistType = 'multiplicative' | 'divisive';
export type ShortSignatureCoder<Fp> = {
    fromBytes(bytes: Uint8Array): WeierstrassPoint<Fp>;
    fromHex(hex: Hex): WeierstrassPoint<Fp>;
    toBytes(point: WeierstrassPoint<Fp>): Uint8Array;
    toHex(point: WeierstrassPoint<Fp>): string;
    /** @deprecated use `toBytes` */
    toRawBytes(point: WeierstrassPoint<Fp>): Uint8Array;
};
export type SignatureCoder<Fp> = {
    fromBytes(bytes: Uint8Array): WeierstrassPoint<Fp>;
    fromHex(hex: Hex): WeierstrassPoint<Fp>;
    toBytes(point: WeierstrassPoint<Fp>): Uint8Array;
    toHex(point: WeierstrassPoint<Fp>): string;
    /** @deprecated use `toBytes` */
    toRawBytes(point: WeierstrassPoint<Fp>): Uint8Array;
};
export type BlsFields = {
    Fp: IField<Fp>;
    Fr: IField<bigint>;
    Fp2: Fp2Bls;
    Fp6: Fp6Bls;
    Fp12: Fp12Bls;
};
export type PostPrecomputePointAddFn = (Rx: Fp2, Ry: Fp2, Rz: Fp2, Qx: Fp2, Qy: Fp2) => {
    Rx: Fp2;
    Ry: Fp2;
    Rz: Fp2;
};
export type PostPrecomputeFn = (Rx: Fp2, Ry: Fp2, Rz: Fp2, Qx: Fp2, Qy: Fp2, pointAdd: PostPrecomputePointAddFn) => void;
export type BlsPairing = {
    Fp12: Fp12Bls;
    calcPairingPrecomputes: (p: WeierstrassPoint<Fp2>) => Precompute;
    millerLoopBatch: (pairs: [Precompute, Fp, Fp][]) => Fp12;
    pairing: (P: WeierstrassPoint<Fp>, Q: WeierstrassPoint<Fp2>, withFinalExponent?: boolean) => Fp12;
    pairingBatch: (pairs: {
        g1: WeierstrassPoint<Fp>;
        g2: WeierstrassPoint<Fp2>;
    }[], withFinalExponent?: boolean) => Fp12;
};
export type BlsPairingParams = {
    ateLoopSize: bigint;
    xNegative: boolean;
    twistType: TwistType;
    postPrecompute?: PostPrecomputeFn;
};
export type CurveType = {
    G1: CurvePointsType<Fp> & {
        ShortSignature: SignatureCoder<Fp>;
        mapToCurve: MapToCurve<Fp>;
        htfDefaults: H2COpts;
    };
    G2: CurvePointsType<Fp2> & {
        Signature: SignatureCoder<Fp2>;
        mapToCurve: MapToCurve<Fp2>;
        htfDefaults: H2COpts;
    };
    fields: BlsFields;
    params: {
        ateLoopSize: BlsPairingParams['ateLoopSize'];
        xNegative: BlsPairingParams['xNegative'];
        r: bigint;
        twistType: BlsPairingParams['twistType'];
    };
    htfDefaults: H2COpts;
    hash: CHash;
    randomBytes?: (bytesLength?: number) => Uint8Array;
    postPrecompute?: PostPrecomputeFn;
};
type PrecomputeSingle = [Fp2, Fp2, Fp2][];
type Precompute = PrecomputeSingle[];
/**
 * BLS consists of two curves: G1 and G2:
 * - G1 is a subgroup of (x, y) E(Fq) over y² = x³ + 4.
 * - G2 is a subgroup of ((x₁, x₂+i), (y₁, y₂+i)) E(Fq²) over y² = x³ + 4(1 + i) where i is √-1
 */
export interface BLSCurvePair {
    longSignatures: BLSSigs<bigint, Fp2>;
    shortSignatures: BLSSigs<Fp2, bigint>;
    millerLoopBatch: BlsPairing['millerLoopBatch'];
    pairing: BlsPairing['pairing'];
    pairingBatch: BlsPairing['pairingBatch'];
    G1: {
        Point: WeierstrassPointCons<bigint>;
    } & H2CHasher<Fp>;
    G2: {
        Point: WeierstrassPointCons<Fp2>;
    } & H2CHasher<Fp2>;
    fields: {
        Fp: IField<Fp>;
        Fp2: Fp2Bls;
        Fp6: Fp6Bls;
        Fp12: Fp12Bls;
        Fr: IField<bigint>;
    };
    utils: {
        randomSecretKey: () => Uint8Array;
        /** @deprecated use randomSecretKey */
        randomPrivateKey: () => Uint8Array;
        calcPairingPrecomputes: BlsPairing['calcPairingPrecomputes'];
    };
}
export type CurveFn = BLSCurvePair & {
    /** @deprecated use `longSignatures.getPublicKey` */
    getPublicKey: (secretKey: PrivKey) => Uint8Array;
    /** @deprecated use `shortSignatures.getPublicKey` */
    getPublicKeyForShortSignatures: (secretKey: PrivKey) => Uint8Array;
    /** @deprecated use `longSignatures.sign` */
    sign: {
        (message: Hex, secretKey: PrivKey, htfOpts?: htfBasicOpts): Uint8Array;
        (message: WeierstrassPoint<Fp2>, secretKey: PrivKey, htfOpts?: htfBasicOpts): WeierstrassPoint<Fp2>;
    };
    /** @deprecated use `shortSignatures.sign` */
    signShortSignature: {
        (message: Hex, secretKey: PrivKey, htfOpts?: htfBasicOpts): Uint8Array;
        (message: WeierstrassPoint<Fp>, secretKey: PrivKey, htfOpts?: htfBasicOpts): WeierstrassPoint<Fp>;
    };
    /** @deprecated use `longSignatures.verify` */
    verify: (signature: Hex | WeierstrassPoint<Fp2>, message: Hex | WeierstrassPoint<Fp2>, publicKey: Hex | WeierstrassPoint<Fp>, htfOpts?: htfBasicOpts) => boolean;
    /** @deprecated use `shortSignatures.verify` */
    verifyShortSignature: (signature: Hex | WeierstrassPoint<Fp>, message: Hex | WeierstrassPoint<Fp>, publicKey: Hex | WeierstrassPoint<Fp2>, htfOpts?: htfBasicOpts) => boolean;
    verifyBatch: (signature: Hex | WeierstrassPoint<Fp2>, messages: (Hex | WeierstrassPoint<Fp2>)[], publicKeys: (Hex | WeierstrassPoint<Fp>)[], htfOpts?: htfBasicOpts) => boolean;
    /** @deprecated use `longSignatures.aggregatePublicKeys` */
    aggregatePublicKeys: {
        (publicKeys: Hex[]): Uint8Array;
        (publicKeys: WeierstrassPoint<Fp>[]): WeierstrassPoint<Fp>;
    };
    /** @deprecated use `longSignatures.aggregateSignatures` */
    aggregateSignatures: {
        (signatures: Hex[]): Uint8Array;
        (signatures: WeierstrassPoint<Fp2>[]): WeierstrassPoint<Fp2>;
    };
    /** @deprecated use `shortSignatures.aggregateSignatures` */
    aggregateShortSignatures: {
        (signatures: Hex[]): Uint8Array;
        (signatures: WeierstrassPoint<Fp>[]): WeierstrassPoint<Fp>;
    };
    G1: CurvePointsRes<Fp> & H2CHasher<Fp>;
    G2: CurvePointsRes<Fp2> & H2CHasher<Fp2>;
    /** @deprecated use `longSignatures.Signature` */
    Signature: SignatureCoder<Fp2>;
    /** @deprecated use `shortSignatures.Signature` */
    ShortSignature: ShortSignatureCoder<Fp>;
    params: {
        ateLoopSize: bigint;
        r: bigint;
        twistType: TwistType;
        /** @deprecated */
        G1b: bigint;
        /** @deprecated */
        G2b: Fp2;
    };
};
type BLSInput = Hex | Uint8Array;
export interface BLSSigs<P, S> {
    getPublicKey(secretKey: PrivKey): WeierstrassPoint<P>;
    sign(hashedMessage: WeierstrassPoint<S>, secretKey: PrivKey): WeierstrassPoint<S>;
    verify(signature: WeierstrassPoint<S> | BLSInput, message: WeierstrassPoint<S>, publicKey: WeierstrassPoint<P> | BLSInput): boolean;
    verifyBatch: (signature: WeierstrassPoint<S> | BLSInput, messages: WeierstrassPoint<S>[], publicKeys: (WeierstrassPoint<P> | BLSInput)[]) => boolean;
    aggregatePublicKeys(publicKeys: (WeierstrassPoint<P> | BLSInput)[]): WeierstrassPoint<P>;
    aggregateSignatures(signatures: (WeierstrassPoint<S> | BLSInput)[]): WeierstrassPoint<S>;
    hash(message: Uint8Array, DST?: string | Uint8Array, hashOpts?: H2CHashOpts): WeierstrassPoint<S>;
    Signature: SignatureCoder<S>;
}
export declare function bls(CURVE: CurveType): CurveFn;
export {};
//# sourceMappingURL=bls.d.ts.map