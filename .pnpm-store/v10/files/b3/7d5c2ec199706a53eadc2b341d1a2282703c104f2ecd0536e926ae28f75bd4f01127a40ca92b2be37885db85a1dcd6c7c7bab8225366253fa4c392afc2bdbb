import type { CryptographyOptions, KeyVaultKey } from "./keysModels.js";
import type { JsonWebKey } from "./generated/models/index.js";
import { JsonWebKeyEncryptionAlgorithm as EncryptionAlgorithm, JsonWebKeyCurveName as KeyCurveName, KnownJsonWebKeyCurveName as KnownKeyCurveNames, KnownJsonWebKeySignatureAlgorithm as KnownSignatureAlgorithms, KnownJsonWebKeyEncryptionAlgorithm as KnownEncryptionAlgorithms, JsonWebKeySignatureAlgorithm as SignatureAlgorithm, KnownJsonWebKeyType as KnownKeyTypes, KnownKeyEncryptionAlgorithm as KnownKeyExportEncryptionAlgorithm } from "./generated/models/index.js";
export { EncryptionAlgorithm, KeyCurveName, KnownEncryptionAlgorithms, KnownKeyCurveNames, KnownKeyExportEncryptionAlgorithm, KnownKeyTypes, KnownSignatureAlgorithms, SignatureAlgorithm, };
/**
 * Supported algorithms for key wrapping/unwrapping
 */
export type KeyWrapAlgorithm = "A128KW" | "A192KW" | "A256KW" | "RSA-OAEP" | "RSA-OAEP-256" | "RSA1_5" | "CKM_AES_KEY_WRAP" | "CKM_AES_KEY_WRAP_PAD";
/**
 * Result of the {@link encrypt} operation.
 */
export interface EncryptResult {
    /**
     * Result of the {@link encrypt} operation in bytes.
     */
    result: Uint8Array;
    /**
     * The {@link EncryptionAlgorithm} used to encrypt the data.
     */
    algorithm: EncryptionAlgorithm;
    /**
     * The ID of the Key Vault Key used to encrypt the data.
     */
    keyID?: string;
    /**
     * The initialization vector used for encryption.
     */
    iv?: Uint8Array;
    /**
     * The authentication tag resulting from encryption with a symmetric key including A128GCM, A192GCM, and A256GCM.
     */
    authenticationTag?: Uint8Array;
    /**
     * Additional data that is authenticated during decryption but not encrypted.
     */
    additionalAuthenticatedData?: Uint8Array;
}
/**
 * Result of the {@link wrap} operation.
 */
export interface WrapResult {
    /**
     * Result of the {@link wrap} operation in bytes.
     */
    result: Uint8Array;
    /**
     * The ID of the Key Vault Key used to wrap the data.
     */
    keyID?: string;
    /**
     * The {@link EncryptionAlgorithm} used to wrap the data.
     */
    algorithm: KeyWrapAlgorithm;
}
/**
 * Result of the {@link unwrap} operation.
 */
export interface UnwrapResult {
    /**
     * Result of the {@link unwrap} operation in bytes.
     */
    result: Uint8Array;
    /**
     * The ID of the Key Vault Key used to unwrap the data.
     */
    keyID?: string;
    /**
     * The {@link KeyWrapAlgorithm} used to unwrap the data.
     */
    algorithm: KeyWrapAlgorithm;
}
/**
 * Result of the {@link decrypt} operation.
 */
export interface DecryptResult {
    /**
     * Result of the {@link decrypt} operation in bytes.
     */
    result: Uint8Array;
    /**
     * The ID of the Key Vault Key used to decrypt the encrypted data.
     */
    keyID?: string;
    /**
     * The {@link EncryptionAlgorithm} used to decrypt the encrypted data.
     */
    algorithm: EncryptionAlgorithm;
}
/**
 * Result of the {@link sign} operation.
 */
export interface SignResult {
    /**
     * Result of the {@link sign} operation in bytes.
     */
    result: Uint8Array;
    /**
     * The ID of the Key Vault Key used to sign the data.
     */
    keyID?: string;
    /**
     * The {@link EncryptionAlgorithm} used to sign the data.
     */
    algorithm: SignatureAlgorithm;
}
/**
 * Result of the {@link verify} operation.
 */
export interface VerifyResult {
    /**
     * Result of the {@link verify} operation in bytes.
     */
    result: boolean;
    /**
     * The ID of the Key Vault Key used to verify the data.
     */
    keyID?: string;
}
/**
 * Options for {@link encrypt}.
 */
export interface EncryptOptions extends CryptographyOptions {
}
/**
 * Options for {@link decrypt}.
 */
export interface DecryptOptions extends CryptographyOptions {
}
/**
 * Options for {@link sign}.
 */
export interface SignOptions extends CryptographyOptions {
}
/**
 * Options for {@link verify}.
 */
export interface VerifyOptions extends CryptographyOptions {
}
/**
 * Options for {@link verifyData}
 */
export interface VerifyDataOptions extends CryptographyOptions {
}
/**
 * Options for {@link wrapKey}.
 */
export interface WrapKeyOptions extends CryptographyOptions {
}
/**
 * Options for {@link unwrapKey}.
 */
export interface UnwrapKeyOptions extends CryptographyOptions {
}
/**
 * A union type representing all supported RSA encryption algorithms.
 */
export type RsaEncryptionAlgorithm = "RSA1_5" | "RSA-OAEP" | "RSA-OAEP-256";
/**
 * Encryption parameters for RSA encryption algorithms.
 */
export interface RsaEncryptParameters {
    /**
     * The encryption algorithm to use.
     */
    algorithm: RsaEncryptionAlgorithm;
    /**
     * The plain text to encrypt.
     */
    plaintext: Uint8Array;
}
/**
 * A union type representing all supported AES-GCM encryption algorithms.
 */
export type AesGcmEncryptionAlgorithm = "A128GCM" | "A192GCM" | "A256GCM";
/**
 * Encryption parameters for AES-GCM encryption algorithms.
 */
export interface AesGcmEncryptParameters {
    /**
     * The encryption algorithm to use.
     */
    algorithm: AesGcmEncryptionAlgorithm;
    /**
     * The plain text to encrypt.
     */
    plaintext: Uint8Array;
    /**
     * Optional data that is authenticated but not encrypted.
     */
    additionalAuthenticatedData?: Uint8Array;
}
/**
 * A union type representing all supported AES-CBC encryption algorithms.
 */
export type AesCbcEncryptionAlgorithm = "A128CBC" | "A192CBC" | "A256CBC" | "A128CBCPAD" | "A192CBCPAD" | "A256CBCPAD";
/**
 * Encryption parameters for AES-CBC encryption algorithms.
 */
export interface AesCbcEncryptParameters {
    /**
     * The encryption algorithm to use.
     */
    algorithm: AesCbcEncryptionAlgorithm;
    /**
     * The plain text to encrypt.
     */
    plaintext: Uint8Array;
    /**
     * The initialization vector used for encryption. If omitted we will attempt to generate an IV using crypto's `randomBytes` functionality.
     * An error will be thrown if creating an IV fails, and you may recover by passing in your own cryptographically secure IV.
     *
     * When passing your own IV, make sure you use a cryptographically random, non-repeating IV.
     */
    iv?: Uint8Array;
}
/**
 * A type representing all currently supported encryption parameters as they apply to different encryption algorithms.
 */
export type EncryptParameters = RsaEncryptParameters | AesGcmEncryptParameters | AesCbcEncryptParameters;
/**
 * Decryption parameters for RSA encryption algorithms.
 */
export interface RsaDecryptParameters {
    /**
     * The encryption algorithm to use.
     */
    algorithm: RsaEncryptionAlgorithm;
    /**
     * The ciphertext to decrypt.
     */
    ciphertext: Uint8Array;
}
/**
 * Decryption parameters for AES-GCM encryption algorithms.
 */
export interface AesGcmDecryptParameters {
    /**
     * The encryption algorithm to use.
     */
    algorithm: AesGcmEncryptionAlgorithm;
    /**
     * The ciphertext to decrypt.
     */
    ciphertext: Uint8Array;
    /**
     * The initialization vector (or nonce) generated during encryption.
     */
    iv: Uint8Array;
    /**
     * The authentication tag generated during encryption.
     */
    authenticationTag: Uint8Array;
    /**
     * Optional data that is authenticated but not encrypted.
     */
    additionalAuthenticatedData?: Uint8Array;
}
/**
 * Decryption parameters for AES-CBC encryption algorithms.
 */
export interface AesCbcDecryptParameters {
    /**
     * The encryption algorithm to use.
     */
    algorithm: AesCbcEncryptionAlgorithm;
    /**
     * The initialization vector used during encryption.
     */
    /**
     * The ciphertext to decrypt. Microsoft recommends you not use CBC without first ensuring the integrity of the ciphertext using an HMAC, for example.
     * See https://learn.microsoft.com/dotnet/standard/security/vulnerabilities-cbc-mode for more information.
     */
    ciphertext: Uint8Array;
    /**
     * The initialization vector generated during encryption.
     */
    iv: Uint8Array;
}
/**
 * A type representing all currently supported decryption parameters as they apply to different encryption algorithms.
 */
export type DecryptParameters = RsaDecryptParameters | AesGcmDecryptParameters | AesCbcDecryptParameters;
/**
 * The various key types a {@link CryptographyClient} can hold.
 * The key may be an identifier (URL) to a KeyVault key, the actual KeyVault key,
 * or a local-only JsonWebKey.
 *
 * If an identifier is used, an attempt will be made to exchange it for a {@link KeyVaultKey} during the first operation call. If this attempt fails, the identifier
 * will become a remote-only identifier and the {@link CryptographyClient} will only be able to perform remote operations.
 */
export type CryptographyClientKey = {
    kind: "identifier";
    value: string;
} | {
    kind: "remoteOnlyIdentifier";
    value: string;
} | {
    kind: "KeyVaultKey";
    value: KeyVaultKey;
} | {
    kind: "JsonWebKey";
    value: JsonWebKey;
};
//# sourceMappingURL=cryptographyClientModels.d.ts.map