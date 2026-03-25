import type { EllipticCurve } from "../config.js";
import { PublicKey } from "./PublicKey.js";
export declare class PrivateKey {
    static fromHex(hex: string, curve?: EllipticCurve): PrivateKey;
    private readonly curve?;
    private readonly data;
    readonly publicKey: PublicKey;
    /**
     * @description
     * In version 0.4.18, `Buffer` is returned when available, otherwise `Uint8Array`.
     * From version 0.5.0, `Uint8Array` will be returned instead of `Buffer`.
     */
    get secret(): Uint8Array;
    constructor(secret?: Uint8Array, curve?: EllipticCurve);
    toHex(): string;
    /**
     * Derives a shared secret from ephemeral private key (this) and receiver's public key (pk).
     * @description The shared key is 32 bytes, derived with `HKDF-SHA256(senderPoint || sharedPoint)`. See implementation for details.
     *
     * There are some variations in different ECIES implementations:
     * which key derivation function to use, compressed or uncompressed `senderPoint`/`sharedPoint`, whether to include `senderPoint`, etc.
     *
     * Because the entropy of `senderPoint`, `sharedPoint` is enough high[1], we don't need salt to derive keys.
     *
     * [1]: Two reasons: the public keys are "random" bytes (albeit secp256k1 public keys are **not uniformly** random), and ephemeral keys are generated in every encryption.
     *
     * @param pk - Receiver's public key.
     * @param compressed - (default: `false`) Whether to use compressed or uncompressed public keys in the key derivation (secp256k1 only).
     * @returns Shared secret, derived with HKDF-SHA256.
     */
    encapsulate(pk: PublicKey, compressed?: boolean): Uint8Array;
    multiply(pk: PublicKey, compressed?: boolean): Uint8Array;
    equals(other: PrivateKey): boolean;
}
