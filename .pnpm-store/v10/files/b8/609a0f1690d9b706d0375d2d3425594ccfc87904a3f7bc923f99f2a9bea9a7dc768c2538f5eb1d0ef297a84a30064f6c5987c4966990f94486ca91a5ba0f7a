import { type CurveFnWithCreate } from './_shortw_utils.ts';
import type { CurveLengths } from './abstract/curve.ts';
import { type H2CHasher, type H2CMethod } from './abstract/hash-to-curve.ts';
import { mod } from './abstract/modular.ts';
import { type WeierstrassPoint as PointType, type WeierstrassPointCons } from './abstract/weierstrass.ts';
import type { Hex, PrivKey } from './utils.ts';
import { bytesToNumberBE, numberToBytesBE } from './utils.ts';
/**
 * secp256k1 curve, ECDSA and ECDH methods.
 *
 * Field: `2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n`
 *
 * @example
 * ```js
 * import { secp256k1 } from '@noble/curves/secp256k1';
 * const { secretKey, publicKey } = secp256k1.keygen();
 * const msg = new TextEncoder().encode('hello');
 * const sig = secp256k1.sign(msg, secretKey);
 * const isValid = secp256k1.verify(sig, msg, publicKey) === true;
 * ```
 */
export declare const secp256k1: CurveFnWithCreate;
declare function taggedHash(tag: string, ...messages: Uint8Array[]): Uint8Array;
/**
 * lift_x from BIP340. Convert 32-byte x coordinate to elliptic curve point.
 * @returns valid point checked for being on-curve
 */
declare function lift_x(x: bigint): PointType<bigint>;
/**
 * Schnorr public key is just `x` coordinate of Point as per BIP340.
 */
declare function schnorrGetPublicKey(secretKey: Hex): Uint8Array;
/**
 * Creates Schnorr signature as per BIP340. Verifies itself before returning anything.
 * auxRand is optional and is not the sole source of k generation: bad CSPRNG won't be dangerous.
 */
declare function schnorrSign(message: Hex, secretKey: PrivKey, auxRand?: Hex): Uint8Array;
/**
 * Verifies Schnorr signature.
 * Will swallow errors & return false except for initial type validation of arguments.
 */
declare function schnorrVerify(signature: Hex, message: Hex, publicKey: Hex): boolean;
export type SecpSchnorr = {
    keygen: (seed?: Uint8Array) => {
        secretKey: Uint8Array;
        publicKey: Uint8Array;
    };
    getPublicKey: typeof schnorrGetPublicKey;
    sign: typeof schnorrSign;
    verify: typeof schnorrVerify;
    Point: WeierstrassPointCons<bigint>;
    utils: {
        randomSecretKey: (seed?: Uint8Array) => Uint8Array;
        pointToBytes: (point: PointType<bigint>) => Uint8Array;
        lift_x: typeof lift_x;
        taggedHash: typeof taggedHash;
        /** @deprecated use `randomSecretKey` */
        randomPrivateKey: (seed?: Uint8Array) => Uint8Array;
        /** @deprecated use `utils` */
        numberToBytesBE: typeof numberToBytesBE;
        /** @deprecated use `utils` */
        bytesToNumberBE: typeof bytesToNumberBE;
        /** @deprecated use `modular` */
        mod: typeof mod;
    };
    lengths: CurveLengths;
};
/**
 * Schnorr signatures over secp256k1.
 * https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
 * @example
 * ```js
 * import { schnorr } from '@noble/curves/secp256k1';
 * const { secretKey, publicKey } = schnorr.keygen();
 * // const publicKey = schnorr.getPublicKey(secretKey);
 * const msg = new TextEncoder().encode('hello');
 * const sig = schnorr.sign(msg, secretKey);
 * const isValid = schnorr.verify(sig, msg, publicKey);
 * ```
 */
export declare const schnorr: SecpSchnorr;
/** Hashing / encoding to secp256k1 points / field. RFC 9380 methods. */
export declare const secp256k1_hasher: H2CHasher<bigint>;
/** @deprecated use `import { secp256k1_hasher } from '@noble/curves/secp256k1.js';` */
export declare const hashToCurve: H2CMethod<bigint>;
/** @deprecated use `import { secp256k1_hasher } from '@noble/curves/secp256k1.js';` */
export declare const encodeToCurve: H2CMethod<bigint>;
export {};
//# sourceMappingURL=secp256k1.d.ts.map