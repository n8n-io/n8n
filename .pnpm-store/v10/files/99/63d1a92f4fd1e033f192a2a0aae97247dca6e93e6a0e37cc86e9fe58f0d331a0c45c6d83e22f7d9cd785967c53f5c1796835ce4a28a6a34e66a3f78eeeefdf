/**
 * This module provides a subset of the Web Crypto API. It is an interface
 * allowing a k6 script to use cryptographic primitives.
 *
 * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/webcrypto/
 */

export const crypto: Crypto;

export interface Crypto extends SubtleCrypto {
    /**
     * Returns a SubtleCrypto object providing access to common cryptographic
     * primitives, like hashing, signing, encryption, or decryption.
     */
    readonly subtle: SubtleCrypto;

    /**
     * Fills the passed TypedArray with cryptographically sound random values.
     *
     * @param typedArray - The TypedArray to fill with random values.
     * @throws {QuotaExceededError} - thrown if the `byteLength` of `typedArray` exceeds 65536.
     * @returns The typedArray argument.
     */
    getRandomValues(typedArray: TypedArray): TypedArray;

    /**
     * Returns a 36 character long string containing a cryptographically random UUID v4.
     *
     * @returns A 36 character long string containing a cryptographically random UUID v4.
     */
    randomUUID(): string;
}

export interface SubtleCrypto {
    /**
     * The `decrypt()` method decrypts some encrypted data.
     *
     * @param algorithm defines the algorithm to use and any extra-parameters.
     * @param key the key to use for decryption.
     * @param data the data to decrypt (also known as "ciphertext").
     * @throws {InvalidAccessError} - if the provided key cannot be used for the decrypt operation.
     * @throws {OperationError} - if the operation failed for an operation-specific reason.
     * @returns A promise that resolves with the decrypted data (also known as "plaintext").
     */
    decrypt(
        algorithm: AesCtrParams | AesCbcParams | AesGcmParams,
        key: CryptoKey,
        data: ArrayBuffer | ArrayBufferView | DataView,
    ): Promise<ArrayBuffer>;

    /**
     * The `digest()` method computes a cryptographic digest of the given data using the
     * given algorithm.
     *
     * A digest is a fixed-length hash of the original data. It is often used
     * to verify the integrity of the original data, or to create a
     * "fingerprint" or "summary" of the original data that can be used to
     * identify it.
     *
     * Cryptographic digests should exhibit collision-resistance, meaning that it's hard to
     * come up with two different inputs that have the same digest value.
     *
     * @param algorithm names the algorithm to use.
     * @param data the data to be digested
     * @returns A promise that resolves with the digest value.
     */
    digest(
        algorithm: HashAlgorithmIdentifier | Algorithm<HashAlgorithmIdentifier>,
        data: ArrayBuffer | ArrayBufferView | DataView,
    ): Promise<ArrayBuffer>;

    /**
     * The `encrypt()` method encrypts data.
     *
     * @param algorithm defines the algorithm to use and any extra-parameters.
     * @param key the key to use for encryption.
     * @param data the data to encrypt (also known as "plaintext").
     * @throws {InvalidAccessError} - if the provided key cannot be used for the encrypt operation.
     * @throws {OperationError} - if the operation failed for an operation-specific reason.
     * @returns A promise that resolves with the encrypted data (also known as "ciphertext").
     */
    encrypt(
        algorithm: AesCtrParams | AesCbcParams | AesGcmParams,
        key: CryptoKey,
        data: ArrayBuffer | ArrayBufferView | DataView,
    ): Promise<ArrayBuffer>;

    /**
     * The `exportKey()` method exports a key: that is, it takes as input a `CryptoKey`
     * object and gives you the key in an external, portable format.
     *
     * To export a key, the key must have `CryptoKey.extractable` set to `true`.
     *
     * @param format the format in which to export the key.
     * @param key the key to export.
     * @throws {InvalidAccessError} - if the key is not extractable.
     * @throws {NotSupportedError} - if the format is not supported.
     * @throws {TypeError} - when trying to use an invalid format.
     * @returns A promise that resolves with the exported key.
     */
    exportKey(format: "raw" | "jwk" | "spki" | "pkcs8", key: CryptoKey): Promise<ArrayBuffer | JWK>;

    /**
     * Use the `generateKey()` method to generate a new key.
     *
     * @param algorithm defines the type of key to generate and providing extra algorithm-specific parameters.
     * @param extractable indicates whether it will be possible to export the key using `SubtleCrypto.exportKey()` or `SubtleCrypto.wrapKey`.
     * @param keyUsages indicates what can be done with the newly generated key.
     * @throws {SyntaxError} - if the result is a `CryptoKey` of type `secret` or `private` but `keyUsages is empty.
     * @returns A promise that resolves with the newly generated `CryptoKey`.
     */
    generateKey(
        algorithm: AesKeyGenParams | HmacKeyGenParams,
        extractable: boolean,
        keyUsages: Array<"encrypt" | "decrypt" | "sign" | "verify">,
    ): Promise<CryptoKey>;

    /**
     * Use the `generateKey()` method to generate a new key pair for asymmetric algorithms.
     *
     * @param algorithm defines the type of key to generate and providing extra algorithm-specific parameters.
     * @param extractable indicates whether it will be possible to export the key using `SubtleCrypto.exportKey()` or `SubtleCrypto.wrapKey`.
     * @param keyUsages indicates what can be done with the newly generated key.
     * @throws {SyntaxError} - if the result is a `CryptoKey` of type `secret` or `private` but `keyUsages is empty.
     * @returns A promise that resolves with the newly generated CryptoKeyPair`.
     */
    generateKey(
        algorithm: EcKeyGenParams,
        extractable: boolean,
        keyUsages: Array<"sign" | "verify" | "deriveKey" | "deriveBits">,
    ): Promise<CryptoKeyPair>;

    /**
     * The `importKey()` method imports a key into a `CryptoKey` object.
     * It takes as input a key in an external, portable format and gives you
     * a `CryptoKey` object that can be used in the Web Crypto API.
     *
     * @param format the format of the key to import.
     * @param keyData the key data to import.
     * @param algorithm defines the algorithm to use and any extra-parameters.
     * @param extractable indicates whether it will be possible to export the key using `SubtleCrypto.exportKey()` or `SubtleCrypto.wrapKey`.
     * @param keyUsages indicates what can be done with the newly generated key.
     * @throws {SyntaxError} - if the result is a `CryptoKey` of type `secret` or `private` but `keyUsages is empty.
     * @throws {TypeError} - when trying to use an invalid format or if the `keyData` is not suited for that format.
     * @returns A promise that resolves with the imported `CryptoKey`.
     */
    importKey(
        format: "raw" | "jwk" | "spki" | "pkcs8",
        keyData: ArrayBuffer | ArrayBufferView | DataView | JWK,
        algorithm:
            | "AES-CBC"
            | "AES-CTR"
            | "AES-GCM"
            | Algorithm<"AES-CBC" | "AES-CTR" | "AES-GCM">
            | HmacImportParams
            | EcKeyImportParams,
        extractable: boolean,
        keyUsages: Array<"encrypt" | "decrypt" | "sign" | "verify" | "deriveKey" | "deriveBits">,
    ): Promise<CryptoKey>;

    /**
     * The `sign()` method generates a digital signature.
     *
     * It takes as its argument a key to sign with, some algorithm-identifier
     * specific parameters, and the data to sign.
     *
     * @param algorithm defines the algorithm to use and any extra-parameters.
     * @param key the key to use for signing. If `algorithm` identifies a public-key cryptosystem, this is the private key.
     * @param data the data to sign.
     * @throws {InvalidAccessError} - if the provided key cannot be used for the sign operation.
     * @returns A promise that resolves with the signature.
     */
    sign(
        algorithm: "HMAC" | Algorithm<"HMAC"> | EcdsaParams,
        key: CryptoKey,
        data: ArrayBuffer | ArrayBufferView | DataView,
    ): Promise<ArrayBuffer>;

    /**
     * The `verify()` method verifies a digital signature.
     *
     * @param algorithm defines the algorithm to use and any extra-parameters.
     * @param key the key to use for verifying. It is the secret key for a symmetric algorithm and the public key for a public-key system.
     * @param signature the signature to verify.
     * @param data the data to verify.
     * @throws {InvalidAccessError} - if the provided key cannot be used for the verify operation.
     * @returns A promise that resolves with a boolean indicating whether the signature is valid.
     */
    verify(
        algorithm: "HMAC" | Algorithm<"HMAC"> | EcdsaParams,
        key: CryptoKey,
        signature: ArrayBuffer | ArrayBufferView | DataView,
        data: ArrayBuffer | ArrayBufferView | DataView,
    ): Promise<boolean>;

    /**
     * The `deriveBits()` method derives an array of bits from a base key.
     *
     * @param algorithm defines the derivation algorithm to use.
     * @param baseKey A `CryptoKey` representing the input to the derivation algorithm. Currently, only an ECDH private key is possible.
     * @param length A number representing the number of bits to derive. Currently, the number should be a multiple of 8.
     */
    deriveBits(
        algorithm: EcdhKeyDeriveParams,
        baseKey: CryptoKey,
        length?: number,
    ): Promise<ArrayBuffer>;
}

export interface CryptoKey {
    /**
     * The type of key the object represents.
     */
    readonly type: "secret" | "private" | "public";

    /**
     * A boolean value indicating whether or not the
     * key may be extracted using `SubtleCrypto.exportKey()` or
     * `SubtleCrypto.wrapKey()`.
     */
    readonly extractable: boolean;

    /**
     * An object describing the algorithm for which this key can be used
     * and any associated extra parameters.
     */
    readonly algorithm: object;

    /**
     * An array of strings, indicating what can be done with the key.
     */
    readonly usages: Array<"encrypt" | "decrypt" | "sign" | "verify" | "deriveKey" | "deriveBits">;
}

/**
 * The `CryptoKeyPair` dictionary represents a key pair
 * for an asymmetric cryptography algorithm,
 * also known as a public-key algorithm.
 */
export interface CryptoKeyPair {
    /**
     * A `CryptoKey` object representing the private key.
     * For encryption and decryption algorithms, this key is used to decrypt.
     * For signing and verification algorithms it is used to sign.
     */
    readonly privateKey: CryptoKey;
    /**
     * A CryptoKey object representing the public key.
     * For encryption and decryption algorithms, this key is used to encrypt.
     * For signing and verification algorithms it is used to verify signatures.
     */
    readonly publicKey: CryptoKey;
}

/**
 * The `Algorithm` dictionary of the Web Crypto API represents the
 * object that should be passed as the `algorithm` parameter of
 * most `SubtleCrypto` methods.
 */
export interface Algorithm<I extends AlgorithmIdentifier | HashAlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: I;
}

/**
 * The `AlgorithmIdentifier` type of the Web Crypto API represents
 * the name of an algorithm.
 */
export type AlgorithmIdentifier = string;

/**
 * The `HashAlgorithmIdentifier` type of the Web Crypto API represents
 * the name of a hash algorithm.
 */
export type HashAlgorithmIdentifier = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

/**
 * The `AesKeyGenParams` dictionary of the Web Crypto API represents the
 * object that should be passed as the `algorithm` parameter of the
 * `SubtleCrypto.generateKey()` method when generating a new AES key.
 */
export interface AesKeyGenParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: "AES-GCM" | "AES-CBC" | "AES-CTR" | "AES-CFB" | "AES-KW";

    /**
     * The length of the key, in bits.
     */
    length: 128 | 192 | 256;
}

/**
 * The `AesCtrParams` dictionary of the Web Crypto API represents the
 * object that should be passed as the `algorithm` parameter of the
 * `SubtleCrypto.encrypt()` and `SubtleCrypto.decrypt()`, `SubtleCrypto.wrapKey()` and
 * `SubtleCrypto.unwrapKey()` methods when using the AES-CTR algorithm.
 */
export interface AesCtrParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: "AES-CTR";

    /**
     * The initial value of the counter block. This must be 16-byte
     * long (the AES block size). The rightmost `length` bits of this
     * block are used for the counter, and the rest is used for the
     * nonce.
     */
    counter: ArrayBuffer | ArrayBufferView | DataView;

    /**
     * The number of bits in the counter block that are used for the actual
     * counter. The counter must be big enough that it doesn't wrap. If the
     * message is `n` blocks and the counter is `m` bits long, then the following
     * must be true: `n < 2^m`.
     */
    length: number;
}

/**
 * The `AesCbcParams` dictionary of the Web Crypto API represents the
 * object that should be passed as the `algorithm` parameter of the
 * `SubtleCrypto.encrypt()` and `SubtleCrypto.decrypt()`, `SubtleCrypto.wrapKey()` and
 * `SubtleCrypto.unwrapKey()` methods when using the AES-CBC algorithm.
 */
export interface AesCbcParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: "AES-CBC";

    /**
     * The initialization vector to use for the operation.
     * This must be 16-byte long (the AES block size), unpredictable, and
     * preferably cryptographically random. However, it is not required to be
     * secret (it may be transmitted unencrypted along with the ciphertext).
     */
    iv: ArrayBuffer | ArrayBufferView | DataView;
}

/**
 * The `AesGcmParams` dictionary of the Web Crypto API represents the
 * object that should be passed as the `algorithm` parameter of the
 * `SubtleCrypto.encrypt()` and `SubtleCrypto.decrypt()`, `SubtleCrypto.wrapKey()` and
 * `SubtleCrypto.unwrapKey()` methods when using the AES-GCM algorithm.
 */
export interface AesGcmParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: "AES-GCM";

    /**
     * The initialization vector to use for the operation.
     * This must be 12-byte long (the GCM block size), unpredictable, and
     * preferably cryptographically random. This must be unique for every
     * encryption operation carried out with a given key. Put another way,
     * never reuse an IV with the same key.
     */
    iv: ArrayBuffer | ArrayBufferView | DataView;

    /**
     * Contains additional data that will not be encrypted but will be
     * authenticated. This is optional, and can be omitted if you don't
     * need to pass any additional data. If `additionalData` is specified,
     * then the same data must be given in the corresponding call to `decrypt()`.
     * If the data is not the same, then the decryption will fail. This gives
     * you a way to authenticate the data, without having to encrypt it.
     */
    additionalData?: ArrayBuffer | ArrayBufferView | DataView;

    /**
     * The length of the authentication tag, in bits. This must be of size
     * 96.
     */
    tagLength?: number;
}

/**
 * The `HmacKeyGenParams` dictionary of the Web Crypto API represents the
 * object that should be passed as the `algorithm` parameter of the
 * `SubtleCrypto.generateKey()` method when generating a new HMAC key.
 */
export interface HmacKeyGenParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: "HMAC";

    /**
     * A string representing the name of the digest function to use.
     */
    hash: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

    /**
     * The length of the key, in bits. If the length is not specified,
     * then the generated key will be as long as the block size of
     * the hash function you have chosen. Unless you have a good reason
     * to use a different length, omit this property and use the default.
     */
    length?: number;
}

/**
 * The EcKeyGenParams dictionary of the Web Crypto API represents the
 * object that should be passed as the algorithm parameter into
 * `SubtleCrypto.generateKey()`, when generating
 *  any elliptic-curve-based key pair:
 *  that is, when the algorithm is identified as either of ECDSA or ECDH.
 */
export interface EcKeyGenParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: "ECDSA" | "ECDH";

    /**
     * The name of the elliptic curve to use.
     * This may be any of the following names for NIST-approved curves.
     */
    namedCurve: "P-256" | "P-384" | "P-521";
}

/**
 * The `HmacImportParams` dictionary of the Web Crypto API represents the
 * object that should be passed as the `algorithm` parameter of the
 * `SubtleCrypto.importKey()` method when importing an HMAC key.
 */
export interface HmacImportParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: "HMAC";

    /**
     * The name of the digest function to use.
     */
    hash: HashAlgorithmIdentifier;

    /**
     * The length of the key, in bits. If the length is not specified,
     * then the generated key will be as long as the block size of
     * the hash function you have chosen. Unless you have a good reason
     * to use a different length, omit this property and use the default.
     */
    length?: number;
}

/**
 * The `EcKeyImportParams` dictionary of the Web Crypto API represents
 * the object that should be passed as the algorithm parameter
 * into SubtleCrypto.importKey() or SubtleCrypto.unwrapKey(),
 * when generating any elliptic-curve-based key pair:
 * that is, when the algorithm is identified as either of ECDSA or ECDH.
 */
export interface EcKeyImportParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: "ECDSA" | "ECDH";

    /**
     * The name of the elliptic curve to use.
     * This may be any of the following names for NIST-approved curves.
     */
    namedCurve: "P-256" | "P-384" | "P-521";
}

/**
 * The `EcdsaParams` dictionary of the Web Crypto API represents
 * the object that should be passed as the algorithm parameter
 * into SubtleCrypto.sign() or SubtleCrypto.verify()
 * when using the ECDSA algorithm.
 */
export interface EcdsaParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use.
     */
    name: "ECDSA";

    /**
     * An identifier for the digest algorithm to use.
     */
    hash: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
}

/**
 * The `EcdhKeyDeriveParams` dictionary of the Web Crypto API represents
 * the object that should be passed as the algorithm parameter
 * into `SubtleCrypto.deriveKey()`, when using the ECDH algorithm.
 */
export interface EcdhKeyDeriveParams extends Algorithm<AlgorithmIdentifier> {
    /**
     * The name of the algorithm to use. Only the "ECDH" value is possible.
     */
    name: "ECDH";

    /**
     * A `CryptoKey` object representing the public key of the other entity.
     */
    public: CryptoKey;
}

/**
 * The TypedArray interface represents an array-like view of an underlying
 * binary data buffer. It is used to represent a generic, fixed-length
 * raw binary data buffer. The ArrayBuffer that underlies a typed array
 * can be accessed and modified by using the ArrayBufferView methods.
 *
 * Note that this type does not include Float32Array and Float64Array, which
 * makes it differ from the ArrayBufferView type.
 */
export type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array;

/**
 * JSON Web Key Value.
 * JWKs are not supported for now, since webcrypto doesn't support exporting key/pairs
 */
export type JWKValue = null | boolean | number | string | string[] | JWK;

/**
 * Object representable with JSON Web Key.
 */
export interface JWK {
    [key: string]: JWKValue;
}
