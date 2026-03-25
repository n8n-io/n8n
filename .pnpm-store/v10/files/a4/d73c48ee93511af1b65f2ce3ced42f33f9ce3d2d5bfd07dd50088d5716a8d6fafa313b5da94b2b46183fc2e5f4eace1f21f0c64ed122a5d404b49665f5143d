import type { CurveLengths } from './curve.ts';
type Hex = string | Uint8Array;
export type CurveType = {
    P: bigint;
    type: 'x25519' | 'x448';
    adjustScalarBytes: (bytes: Uint8Array) => Uint8Array;
    powPminus2: (x: bigint) => bigint;
    randomBytes?: (bytesLength?: number) => Uint8Array;
};
export type MontgomeryECDH = {
    scalarMult: (scalar: Hex, u: Hex) => Uint8Array;
    scalarMultBase: (scalar: Hex) => Uint8Array;
    getSharedSecret: (secretKeyA: Hex, publicKeyB: Hex) => Uint8Array;
    getPublicKey: (secretKey: Hex) => Uint8Array;
    utils: {
        randomSecretKey: () => Uint8Array;
        /** @deprecated use `randomSecretKey` */
        randomPrivateKey: () => Uint8Array;
    };
    GuBytes: Uint8Array;
    lengths: CurveLengths;
    keygen: (seed?: Uint8Array) => {
        secretKey: Uint8Array;
        publicKey: Uint8Array;
    };
};
export type CurveFn = MontgomeryECDH;
export declare function montgomery(curveDef: CurveType): MontgomeryECDH;
export {};
//# sourceMappingURL=montgomery.d.ts.map