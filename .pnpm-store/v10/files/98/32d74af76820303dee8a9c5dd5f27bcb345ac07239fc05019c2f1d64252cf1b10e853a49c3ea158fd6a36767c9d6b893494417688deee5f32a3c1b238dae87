export type EllipticCurve = "secp256k1" | "x25519" | "ed25519";
export type SymmetricAlgorithm = "aes-256-gcm" | "xchacha20" | "aes-256-cbc";
export type NonceLength = 12 | 16;
export declare class Config {
    ellipticCurve: EllipticCurve;
    isEphemeralKeyCompressed: boolean;
    isHkdfKeyCompressed: boolean;
    symmetricAlgorithm: SymmetricAlgorithm;
    symmetricNonceLength: NonceLength;
    get ephemeralKeySize(): number;
}
export declare const ECIES_CONFIG: Config;
/** @deprecated - use individual attribute instead */
export declare const ellipticCurve: () => EllipticCurve;
/** @deprecated - use individual attribute instead */
export declare const isEphemeralKeyCompressed: () => boolean;
/** @deprecated - use individual attribute instead */
export declare const isHkdfKeyCompressed: () => boolean;
/** @deprecated - use individual attribute instead */
export declare const symmetricAlgorithm: () => SymmetricAlgorithm;
/** @deprecated - use individual attribute instead */
export declare const symmetricNonceLength: () => NonceLength;
/** @deprecated - use individual attribute instead */
export declare const ephemeralKeySize: () => number;
