import type { OperationOptions } from "@azure-rest/core-client";
import type { DecryptOptions, DecryptParameters, DecryptResult, EncryptOptions, EncryptParameters, EncryptResult, KeyWrapAlgorithm, SignOptions, SignResult, SignatureAlgorithm, UnwrapKeyOptions, UnwrapResult, VerifyOptions, VerifyResult, WrapKeyOptions, WrapResult } from "../index.js";
export declare class LocalCryptographyUnsupportedError extends Error {
}
/**
 * The set of operations a {@link CryptographyProvider} supports.
 *
 * This corresponds to every single method on the interface so that providers
 * can declare whether they support this method or not.
 *
 * Purposely more granular than {@link KnownKeyOperations} because some providers
 * support verifyData but not verify.
 * @internal
 */
export type CryptographyProviderOperation = "encrypt" | "decrypt" | "wrapKey" | "unwrapKey" | "sign" | "signData" | "verify" | "verifyData";
/**
 *
 * Represents an object that can perform cryptography operations.
 * @internal
 */
export interface CryptographyProvider {
    /**
     * Encrypts the given plaintext with the specified encryption parameters.
     * @internal
     *
     * @param encryptParameters - The encryption parameters, keyed on the encryption algorithm chosen.
     * @param options - Additional options.
     */
    encrypt(encryptParameters: EncryptParameters, options?: EncryptOptions): Promise<EncryptResult>;
    /**
     * Decrypts the given ciphertext with the specified decryption parameters.
     * @internal
     *
     * @param decryptParameters - The decryption parameters.
     * @param options - Additional options.
     */
    decrypt(decryptParameters: DecryptParameters, options?: DecryptOptions): Promise<DecryptResult>;
    /**
     *
     * @param algorithm - The algorithm to check support for.
     * @param operation - The {@link CryptographyProviderOperation} to check support for.
     */
    isSupported(algorithm: string, operation: CryptographyProviderOperation): boolean;
    /**
     * Wraps the given key using the specified cryptography algorithm
     * @internal
     *
     * @param algorithm - The encryption algorithm to use to wrap the given key.
     * @param keyToWrap - The key to wrap.
     * @param options - Additional options.
     */
    wrapKey(algorithm: KeyWrapAlgorithm, keyToWrap: Uint8Array, options?: WrapKeyOptions): Promise<WrapResult>;
    /**
     * Unwraps the given wrapped key using the specified cryptography algorithm
     * @internal
     *
     * @param algorithm - The decryption algorithm to use to unwrap the key.
     * @param encryptedKey - The encrypted key to unwrap.
     * @param options - Additional options.
     */
    unwrapKey(algorithm: KeyWrapAlgorithm, encryptedKey: Uint8Array, options?: UnwrapKeyOptions): Promise<UnwrapResult>;
    /**
     * Cryptographically sign the digest of a message
     * @internal
     *
     * @param algorithm - The signing algorithm to use.
     * @param digest - The digest of the data to sign.
     * @param options - Additional options.
     */
    sign(algorithm: SignatureAlgorithm, digest: Uint8Array, options?: SignOptions): Promise<SignResult>;
    /**
     * Cryptographically sign a block of data
     * @internal
     *
     * @param algorithm - The signing algorithm to use.
     * @param data - The data to sign.
     * @param options - Additional options.
     */
    signData(algorithm: SignatureAlgorithm, data: Uint8Array, options?: SignOptions): Promise<SignResult>;
    /**
     * Verify the signed message digest
     * @internal
     *
     * @param algorithm - The signing algorithm to use to verify with.
     * @param digest - The digest to verify.
     * @param signature - The signature to verify the digest against.
     * @param options - Additional options.
     */
    verify(algorithm: SignatureAlgorithm, digest: Uint8Array, signature: Uint8Array, options?: VerifyOptions): Promise<VerifyResult>;
    /**
     * Verify the signed block of data
     * @internal
     *
     * @param algorithm - The algorithm to use to verify with.
     * @param data - The signed block of data to verify.
     * @param signature - The signature to verify the block against.
     * @param updatedOptions - Additional options.
     */
    verifyData(algorithm: string, data: Uint8Array, signature: Uint8Array, updatedOptions: OperationOptions): Promise<VerifyResult>;
}
//# sourceMappingURL=models.d.ts.map