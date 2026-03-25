import { type EllipticCurve } from "../config.js";
export declare const getValidSecret: (curve?: EllipticCurve) => Uint8Array;
export declare const isValidPrivateKey: (secret: Uint8Array, curve?: EllipticCurve) => boolean;
export declare const getPublicKey: (secret: Uint8Array, curve?: EllipticCurve) => Uint8Array;
export declare const getSharedPoint: (sk: Uint8Array, pk: Uint8Array, compressed?: boolean, curve?: EllipticCurve) => Uint8Array;
export declare const convertPublicKeyFormat: (pk: Uint8Array, compressed: boolean, curve?: EllipticCurve) => Uint8Array;
export declare const hexToPublicKey: (hex: string, curve?: EllipticCurve) => Uint8Array;
