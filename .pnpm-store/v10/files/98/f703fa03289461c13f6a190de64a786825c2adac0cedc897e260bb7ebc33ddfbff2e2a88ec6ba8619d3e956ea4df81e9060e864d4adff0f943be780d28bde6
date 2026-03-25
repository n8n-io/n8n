import type { EllipticCurve } from "../config.js";
import type { PrivateKey } from "./PrivateKey.js";
export declare class PublicKey {
    static fromHex(hex: string, curve?: EllipticCurve): PublicKey;
    private readonly data;
    private readonly dataUncompressed;
    private get _uncompressed();
    /** @deprecated - use `PublicKey.toBytes(false)` instead. You may also need `Buffer.from`. */
    get uncompressed(): Uint8Array;
    /** @deprecated - use `PublicKey.toBytes()` instead. You may also need `Buffer.from`. */
    get compressed(): Uint8Array;
    constructor(data: Uint8Array, curve?: EllipticCurve);
    toBytes(compressed?: boolean): Uint8Array;
    toHex(compressed?: boolean): string;
    /**
     * Derives a shared secret from receiver's private key (sk) and ephemeral public key (this).
     * Opposite of `encapsulate`.
     * @see PrivateKey.encapsulate
     *
     * @param sk - Receiver's private key.
     * @param compressed - (default: `false`) Whether to use compressed or uncompressed public keys in the key derivation (secp256k1 only).
     * @returns Shared secret, derived with HKDF-SHA256.
     */
    decapsulate(sk: PrivateKey, compressed?: boolean): Uint8Array;
    equals(other: PublicKey): boolean;
}
