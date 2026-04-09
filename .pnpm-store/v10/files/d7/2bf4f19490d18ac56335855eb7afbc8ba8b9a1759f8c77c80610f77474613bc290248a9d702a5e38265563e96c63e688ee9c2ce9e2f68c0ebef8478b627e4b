/** The key create parameters. */
export interface KeyCreateParameters {
    /** The type of key to create. For valid values, see JsonWebKeyType. */
    kty: JsonWebKeyType;
    /** The key size in bits. For example: 2048, 3072, or 4096 for RSA. */
    keySize?: number;
    /** The public exponent for a RSA key. */
    publicExponent?: number;
    /** Json web key operations. For more information on possible key operations, see JsonWebKeyOperation. */
    keyOps?: JsonWebKeyOperation[];
    /** The attributes of a key managed by the key vault service. */
    keyAttributes?: KeyAttributes;
    /** Application specific metadata in the form of key-value pairs. */
    tags?: Record<string, string>;
    /** Elliptic curve name. For valid values, see JsonWebKeyCurveName. */
    curve?: JsonWebKeyCurveName;
    /** The policy rules under which the key can be exported. */
    releasePolicy?: KeyReleasePolicy;
}
export declare function keyCreateParametersSerializer(item: KeyCreateParameters): any;
/** JsonWebKey Key Type (kty), as defined in https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40. */
export declare enum KnownJsonWebKeyType {
    /** Elliptic Curve. */
    EC = "EC",
    /** Elliptic Curve with a private key which is stored in the HSM. */
    ECHSM = "EC-HSM",
    /** RSA (https://tools.ietf.org/html/rfc3447) */
    RSA = "RSA",
    /** RSA with a private key which is stored in the HSM. */
    RSAHSM = "RSA-HSM",
    /** Octet sequence (used to represent symmetric keys) */
    Oct = "oct",
    /** Octet sequence (used to represent symmetric keys) which is stored the HSM. */
    OctHSM = "oct-HSM"
}
/**
 * JsonWebKey Key Type (kty), as defined in https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40. \
 * {@link KnownJsonWebKeyType} can be used interchangeably with JsonWebKeyType,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **EC**: Elliptic Curve. \
 * **EC-HSM**: Elliptic Curve with a private key which is stored in the HSM. \
 * **RSA**: RSA (https:\//tools.ietf.org\/html\/rfc3447) \
 * **RSA-HSM**: RSA with a private key which is stored in the HSM. \
 * **oct**: Octet sequence (used to represent symmetric keys) \
 * **oct-HSM**: Octet sequence (used to represent symmetric keys) which is stored the HSM.
 */
export type JsonWebKeyType = string;
/** JSON web key operations. For more information, see JsonWebKeyOperation. */
export declare enum KnownJsonWebKeyOperation {
    /** Indicates that the key can be used to encrypt. */
    Encrypt = "encrypt",
    /** Indicates that the key can be used to decrypt. */
    Decrypt = "decrypt",
    /** Indicates that the key can be used to sign. */
    Sign = "sign",
    /** Indicates that the key can be used to verify. */
    Verify = "verify",
    /** Indicates that the key can be used to wrap another key. */
    WrapKey = "wrapKey",
    /** Indicates that the key can be used to unwrap another key. */
    UnwrapKey = "unwrapKey",
    /** Indicates that the key can be imported during creation. */
    Import = "import",
    /** Indicates that the private component of the key can be exported. */
    Export = "export"
}
/**
 * JSON web key operations. For more information, see JsonWebKeyOperation. \
 * {@link KnownJsonWebKeyOperation} can be used interchangeably with JsonWebKeyOperation,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **encrypt**: Indicates that the key can be used to encrypt. \
 * **decrypt**: Indicates that the key can be used to decrypt. \
 * **sign**: Indicates that the key can be used to sign. \
 * **verify**: Indicates that the key can be used to verify. \
 * **wrapKey**: Indicates that the key can be used to wrap another key. \
 * **unwrapKey**: Indicates that the key can be used to unwrap another key. \
 * **import**: Indicates that the key can be imported during creation. \
 * **export**: Indicates that the private component of the key can be exported.
 */
export type JsonWebKeyOperation = string;
/** The attributes of a key managed by the key vault service. */
export interface KeyAttributes {
    /** Determines whether the object is enabled. */
    enabled?: boolean;
    /** Not before date in UTC. */
    notBefore?: Date;
    /** Expiry date in UTC. */
    expires?: Date;
    /** Creation time in UTC. */
    readonly created?: Date;
    /** Last updated time in UTC. */
    readonly updated?: Date;
    /** softDelete data retention days. Value should be >=7 and <=90 when softDelete enabled, otherwise 0. */
    readonly recoverableDays?: number;
    /** Reflects the deletion recovery level currently in effect for keys in the current vault. If it contains 'Purgeable' the key can be permanently deleted by a privileged user; otherwise, only the system can purge the key, at the end of the retention interval. */
    readonly recoveryLevel?: DeletionRecoveryLevel;
    /** Indicates if the private key can be exported. Release policy must be provided when creating the first version of an exportable key. */
    exportable?: boolean;
    /** The underlying HSM Platform. */
    readonly hsmPlatform?: string;
    /** The key or key version attestation information. */
    readonly attestation?: KeyAttestation;
}
export declare function keyAttributesSerializer(item: KeyAttributes): any;
export declare function keyAttributesDeserializer(item: any): KeyAttributes;
/** Reflects the deletion recovery level currently in effect for certificates in the current vault. If it contains 'Purgeable', the certificate can be permanently deleted by a privileged user; otherwise, only the system can purge the certificate, at the end of the retention interval. */
export declare enum KnownDeletionRecoveryLevel {
    /** Denotes a vault state in which deletion is an irreversible operation, without the possibility for recovery. This level corresponds to no protection being available against a Delete operation; the data is irretrievably lost upon accepting a Delete operation at the entity level or higher (vault, resource group, subscription etc.) */
    Purgeable = "Purgeable",
    /** Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval (90 days), unless a Purge operation is requested, or the subscription is cancelled. System wil permanently delete it after 90 days, if not recovered */
    RecoverablePurgeable = "Recoverable+Purgeable",
    /** Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval(90 days) and while the subscription is still available. System wil permanently delete it after 90 days, if not recovered */
    Recoverable = "Recoverable",
    /** Denotes a vault and subscription state in which deletion is recoverable within retention interval (90 days), immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself  cannot be permanently canceled. System wil permanently delete it after 90 days, if not recovered */
    RecoverableProtectedSubscription = "Recoverable+ProtectedSubscription",
    /** Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge when 7 <= SoftDeleteRetentionInDays < 90). This level guarantees the recoverability of the deleted entity during the retention interval, unless a Purge operation is requested, or the subscription is cancelled. */
    CustomizedRecoverablePurgeable = "CustomizedRecoverable+Purgeable",
    /** Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge when 7 <= SoftDeleteRetentionInDays < 90).This level guarantees the recoverability of the deleted entity during the retention interval and while the subscription is still available. */
    CustomizedRecoverable = "CustomizedRecoverable",
    /** Denotes a vault and subscription state in which deletion is recoverable, immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself cannot be permanently canceled when 7 <= SoftDeleteRetentionInDays < 90. This level guarantees the recoverability of the deleted entity during the retention interval, and also reflects the fact that the subscription itself cannot be cancelled. */
    CustomizedRecoverableProtectedSubscription = "CustomizedRecoverable+ProtectedSubscription"
}
/**
 * Reflects the deletion recovery level currently in effect for certificates in the current vault. If it contains 'Purgeable', the certificate can be permanently deleted by a privileged user; otherwise, only the system can purge the certificate, at the end of the retention interval. \
 * {@link KnownDeletionRecoveryLevel} can be used interchangeably with DeletionRecoveryLevel,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **Purgeable**: Denotes a vault state in which deletion is an irreversible operation, without the possibility for recovery. This level corresponds to no protection being available against a Delete operation; the data is irretrievably lost upon accepting a Delete operation at the entity level or higher (vault, resource group, subscription etc.) \
 * **Recoverable+Purgeable**: Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval (90 days), unless a Purge operation is requested, or the subscription is cancelled. System wil permanently delete it after 90 days, if not recovered \
 * **Recoverable**: Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval(90 days) and while the subscription is still available. System wil permanently delete it after 90 days, if not recovered \
 * **Recoverable+ProtectedSubscription**: Denotes a vault and subscription state in which deletion is recoverable within retention interval (90 days), immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself  cannot be permanently canceled. System wil permanently delete it after 90 days, if not recovered \
 * **CustomizedRecoverable+Purgeable**: Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge when 7 <= SoftDeleteRetentionInDays < 90). This level guarantees the recoverability of the deleted entity during the retention interval, unless a Purge operation is requested, or the subscription is cancelled. \
 * **CustomizedRecoverable**: Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge when 7 <= SoftDeleteRetentionInDays < 90).This level guarantees the recoverability of the deleted entity during the retention interval and while the subscription is still available. \
 * **CustomizedRecoverable+ProtectedSubscription**: Denotes a vault and subscription state in which deletion is recoverable, immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself cannot be permanently canceled when 7 <= SoftDeleteRetentionInDays < 90. This level guarantees the recoverability of the deleted entity during the retention interval, and also reflects the fact that the subscription itself cannot be cancelled.
 */
export type DeletionRecoveryLevel = string;
/** The key attestation information. */
export interface KeyAttestation {
    /** A base64url-encoded string containing certificates in PEM format, used for attestation validation. */
    certificatePemFile?: Uint8Array;
    /** The attestation blob bytes encoded as base64url string corresponding to a private key. */
    privateKeyAttestation?: Uint8Array;
    /** The attestation blob bytes encoded as base64url string corresponding to a public key in case of asymmetric key. */
    publicKeyAttestation?: Uint8Array;
    /** The version of the attestation. */
    version?: string;
}
export declare function keyAttestationDeserializer(item: any): KeyAttestation;
/** Elliptic curve name. For valid values, see JsonWebKeyCurveName. */
export declare enum KnownJsonWebKeyCurveName {
    /** The NIST P-256 elliptic curve, AKA SECG curve SECP256R1. */
    P256 = "P-256",
    /** The NIST P-384 elliptic curve, AKA SECG curve SECP384R1. */
    P384 = "P-384",
    /** The NIST P-521 elliptic curve, AKA SECG curve SECP521R1. */
    P521 = "P-521",
    /** The SECG SECP256K1 elliptic curve. */
    P256K = "P-256K"
}
/**
 * Elliptic curve name. For valid values, see JsonWebKeyCurveName. \
 * {@link KnownJsonWebKeyCurveName} can be used interchangeably with JsonWebKeyCurveName,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **P-256**: The NIST P-256 elliptic curve, AKA SECG curve SECP256R1. \
 * **P-384**: The NIST P-384 elliptic curve, AKA SECG curve SECP384R1. \
 * **P-521**: The NIST P-521 elliptic curve, AKA SECG curve SECP521R1. \
 * **P-256K**: The SECG SECP256K1 elliptic curve.
 */
export type JsonWebKeyCurveName = string;
/** The policy rules under which the key can be exported. */
export interface KeyReleasePolicy {
    /** Content type and version of key release policy */
    contentType?: string;
    /** Defines the mutability state of the policy. Once marked immutable, this flag cannot be reset and the policy cannot be changed under any circumstances. */
    immutable?: boolean;
    /** Blob encoding the policy rules under which the key can be released. Blob must be base64 URL encoded. */
    encodedPolicy?: Uint8Array;
}
export declare function keyReleasePolicySerializer(item: KeyReleasePolicy): any;
export declare function keyReleasePolicyDeserializer(item: any): KeyReleasePolicy;
/** A KeyBundle consisting of a WebKey plus its attributes. */
export interface KeyBundle {
    /** The Json web key. */
    key?: JsonWebKey;
    /** The key management attributes. */
    attributes?: KeyAttributes;
    /** Application specific metadata in the form of key-value pairs. */
    tags?: Record<string, string>;
    /** True if the key's lifetime is managed by key vault. If this is a key backing a certificate, then managed will be true. */
    readonly managed?: boolean;
    /** The policy rules under which the key can be exported. */
    releasePolicy?: KeyReleasePolicy;
}
export declare function keyBundleDeserializer(item: any): KeyBundle;
/** As of http://tools.ietf.org/html/draft-ietf-jose-json-web-key-18 */
export interface JsonWebKey {
    /** Key identifier. */
    kid?: string;
    /** JsonWebKey Key Type (kty), as defined in https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40. */
    kty?: JsonWebKeyType;
    /** Json web key operations. For more information on possible key operations, see JsonWebKeyOperation. */
    keyOps?: string[];
    /** RSA modulus. */
    n?: Uint8Array;
    /** RSA public exponent. */
    e?: Uint8Array;
    /** RSA private exponent, or the D component of an EC private key. */
    d?: Uint8Array;
    /** RSA private key parameter. */
    dp?: Uint8Array;
    /** RSA private key parameter. */
    dq?: Uint8Array;
    /** RSA private key parameter. */
    qi?: Uint8Array;
    /** RSA secret prime. */
    p?: Uint8Array;
    /** RSA secret prime, with p < q. */
    q?: Uint8Array;
    /** Symmetric key. */
    k?: Uint8Array;
    /** Protected Key, used with 'Bring Your Own Key'. */
    t?: Uint8Array;
    /** Elliptic curve name. For valid values, see JsonWebKeyCurveName. */
    crv?: JsonWebKeyCurveName;
    /** X component of an EC public key. */
    x?: Uint8Array;
    /** Y component of an EC public key. */
    y?: Uint8Array;
}
export declare function jsonWebKeySerializer(item: JsonWebKey): any;
export declare function jsonWebKeyDeserializer(item: any): JsonWebKey;
/** The key vault error exception. */
export interface KeyVaultError {
    /** The key vault server error. */
    readonly error?: ErrorModel;
}
export declare function keyVaultErrorDeserializer(item: any): KeyVaultError;
/** Alias for ErrorModel */
export type ErrorModel = {
    code?: string;
    message?: string;
    innerError?: ErrorModel;
} | null;
/** model interface _KeyVaultErrorError */
export interface _KeyVaultErrorError {
    /** The error code. */
    readonly code?: string;
    /** The error message. */
    readonly message?: string;
    /** The key vault server error. */
    readonly innerError?: ErrorModel;
}
export declare function _keyVaultErrorErrorDeserializer(item: any): _KeyVaultErrorError;
/** The key import parameters. */
export interface KeyImportParameters {
    /** Whether to import as a hardware key (HSM) or software key. */
    hsm?: boolean;
    /** The Json web key */
    key: JsonWebKey;
    /** The key management attributes. */
    keyAttributes?: KeyAttributes;
    /** Application specific metadata in the form of key-value pairs. */
    tags?: Record<string, string>;
    /** The policy rules under which the key can be exported. */
    releasePolicy?: KeyReleasePolicy;
}
export declare function keyImportParametersSerializer(item: KeyImportParameters): any;
/** A DeletedKeyBundle consisting of a WebKey plus its Attributes and deletion info */
export interface DeletedKeyBundle {
    /** The Json web key. */
    key?: JsonWebKey;
    /** The key management attributes. */
    attributes?: KeyAttributes;
    /** Application specific metadata in the form of key-value pairs. */
    tags?: Record<string, string>;
    /** True if the key's lifetime is managed by key vault. If this is a key backing a certificate, then managed will be true. */
    readonly managed?: boolean;
    /** The policy rules under which the key can be exported. */
    releasePolicy?: KeyReleasePolicy;
    /** The url of the recovery object, used to identify and recover the deleted key. */
    recoveryId?: string;
    /** The time when the key is scheduled to be purged, in UTC */
    readonly scheduledPurgeDate?: Date;
    /** The time when the key was deleted, in UTC */
    readonly deletedDate?: Date;
}
export declare function deletedKeyBundleDeserializer(item: any): DeletedKeyBundle;
/** The key update parameters. */
export interface KeyUpdateParameters {
    /** Json web key operations. For more information on possible key operations, see JsonWebKeyOperation. */
    keyOps?: JsonWebKeyOperation[];
    /** The attributes of a key managed by the key vault service. */
    keyAttributes?: KeyAttributes;
    /** Application specific metadata in the form of key-value pairs. */
    tags?: Record<string, string>;
    /** The policy rules under which the key can be exported. */
    releasePolicy?: KeyReleasePolicy;
}
export declare function keyUpdateParametersSerializer(item: KeyUpdateParameters): any;
/** The key list result. */
export interface _KeyListResult {
    /** A response message containing a list of keys in the key vault along with a link to the next page of keys. */
    readonly value?: KeyItem[];
    /** The URL to get the next set of keys. */
    readonly nextLink?: string;
}
export declare function _keyListResultDeserializer(item: any): _KeyListResult;
export declare function keyItemArrayDeserializer(result: Array<KeyItem>): any[];
/** The key item containing key metadata. */
export interface KeyItem {
    /** Key identifier. */
    kid?: string;
    /** The key management attributes. */
    attributes?: KeyAttributes;
    /** Application specific metadata in the form of key-value pairs. */
    tags?: Record<string, string>;
    /** True if the key's lifetime is managed by key vault. If this is a key backing a certificate, then managed will be true. */
    readonly managed?: boolean;
}
export declare function keyItemDeserializer(item: any): KeyItem;
/** The backup key result, containing the backup blob. */
export interface BackupKeyResult {
    /** The backup blob containing the backed up key. */
    readonly value?: Uint8Array;
}
export declare function backupKeyResultDeserializer(item: any): BackupKeyResult;
/** The key restore parameters. */
export interface KeyRestoreParameters {
    /** The backup blob associated with a key bundle. */
    keyBundleBackup: Uint8Array;
}
export declare function keyRestoreParametersSerializer(item: KeyRestoreParameters): any;
/** The key operations parameters. */
export interface KeyOperationsParameters {
    /** algorithm identifier */
    algorithm: JsonWebKeyEncryptionAlgorithm;
    /** The value to operate on. */
    value: Uint8Array;
    /** Cryptographically random, non-repeating initialization vector for symmetric algorithms. */
    iv?: Uint8Array;
    /** Additional data to authenticate but not encrypt/decrypt when using authenticated crypto algorithms. */
    aad?: Uint8Array;
    /** The tag to authenticate when performing decryption with an authenticated algorithm. */
    tag?: Uint8Array;
}
export declare function keyOperationsParametersSerializer(item: KeyOperationsParameters): any;
/** An algorithm used for encryption and decryption. */
export declare enum KnownJsonWebKeyEncryptionAlgorithm {
    /** [Not recommended] RSAES using Optimal Asymmetric Encryption Padding (OAEP), as described in https://tools.ietf.org/html/rfc3447, with the default parameters specified by RFC 3447 in Section A.2.1. Those default parameters are using a hash function of SHA-1 and a mask generation function of MGF1 with SHA-1. Microsoft recommends using RSA_OAEP_256 or stronger algorithms for enhanced security. Microsoft does *not* recommend RSA_OAEP, which is included solely for backwards compatibility. RSA_OAEP utilizes SHA1, which has known collision problems. */
    RSAOaep = "RSA-OAEP",
    /** RSAES using Optimal Asymmetric Encryption Padding with a hash function of SHA-256 and a mask generation function of MGF1 with SHA-256. */
    RSAOaep256 = "RSA-OAEP-256",
    /** [Not recommended] RSAES-PKCS1-V1_5 key encryption, as described in https://tools.ietf.org/html/rfc3447. Microsoft recommends using RSA_OAEP_256 or stronger algorithms for enhanced security. Microsoft does *not* recommend RSA_1_5, which is included solely for backwards compatibility. Cryptographic standards no longer consider RSA with the PKCS#1 v1.5 padding scheme secure for encryption. */
    RSA15 = "RSA1_5",
    /** 128-bit AES-GCM. */
    A128GCM = "A128GCM",
    /** 192-bit AES-GCM. */
    A192GCM = "A192GCM",
    /** 256-bit AES-GCM. */
    A256GCM = "A256GCM",
    /** 128-bit AES key wrap. */
    A128KW = "A128KW",
    /** 192-bit AES key wrap. */
    A192KW = "A192KW",
    /** 256-bit AES key wrap. */
    A256KW = "A256KW",
    /** 128-bit AES-CBC. */
    A128CBC = "A128CBC",
    /** 192-bit AES-CBC. */
    A192CBC = "A192CBC",
    /** 256-bit AES-CBC. */
    A256CBC = "A256CBC",
    /** 128-bit AES-CBC with PKCS padding. */
    A128Cbcpad = "A128CBCPAD",
    /** 192-bit AES-CBC with PKCS padding. */
    A192Cbcpad = "A192CBCPAD",
    /** 256-bit AES-CBC with PKCS padding. */
    A256Cbcpad = "A256CBCPAD",
    /** CKM AES key wrap. */
    CkmAesKeyWrap = "CKM_AES_KEY_WRAP",
    /** CKM AES key wrap with padding. */
    CkmAesKeyWrapPad = "CKM_AES_KEY_WRAP_PAD"
}
/**
 * An algorithm used for encryption and decryption. \
 * {@link KnownJsonWebKeyEncryptionAlgorithm} can be used interchangeably with JsonWebKeyEncryptionAlgorithm,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **RSA-OAEP**: [Not recommended] RSAES using Optimal Asymmetric Encryption Padding (OAEP), as described in https:\//tools.ietf.org\/html\/rfc3447, with the default parameters specified by RFC 3447 in Section A.2.1. Those default parameters are using a hash function of SHA-1 and a mask generation function of MGF1 with SHA-1. Microsoft recommends using RSA_OAEP_256 or stronger algorithms for enhanced security. Microsoft does *not* recommend RSA_OAEP, which is included solely for backwards compatibility. RSA_OAEP utilizes SHA1, which has known collision problems. \
 * **RSA-OAEP-256**: RSAES using Optimal Asymmetric Encryption Padding with a hash function of SHA-256 and a mask generation function of MGF1 with SHA-256. \
 * **RSA1_5**: [Not recommended] RSAES-PKCS1-V1_5 key encryption, as described in https:\//tools.ietf.org\/html\/rfc3447. Microsoft recommends using RSA_OAEP_256 or stronger algorithms for enhanced security. Microsoft does *not* recommend RSA_1_5, which is included solely for backwards compatibility. Cryptographic standards no longer consider RSA with the PKCS#1 v1.5 padding scheme secure for encryption. \
 * **A128GCM**: 128-bit AES-GCM. \
 * **A192GCM**: 192-bit AES-GCM. \
 * **A256GCM**: 256-bit AES-GCM. \
 * **A128KW**: 128-bit AES key wrap. \
 * **A192KW**: 192-bit AES key wrap. \
 * **A256KW**: 256-bit AES key wrap. \
 * **A128CBC**: 128-bit AES-CBC. \
 * **A192CBC**: 192-bit AES-CBC. \
 * **A256CBC**: 256-bit AES-CBC. \
 * **A128CBCPAD**: 128-bit AES-CBC with PKCS padding. \
 * **A192CBCPAD**: 192-bit AES-CBC with PKCS padding. \
 * **A256CBCPAD**: 256-bit AES-CBC with PKCS padding. \
 * **CKM_AES_KEY_WRAP**: CKM AES key wrap. \
 * **CKM_AES_KEY_WRAP_PAD**: CKM AES key wrap with padding.
 */
export type JsonWebKeyEncryptionAlgorithm = string;
/** The key operation result. */
export interface KeyOperationResult {
    /** Key identifier */
    readonly kid?: string;
    /** The result of the operation. */
    readonly result?: Uint8Array;
    /** Cryptographically random, non-repeating initialization vector for symmetric algorithms. */
    readonly iv?: Uint8Array;
    /** The tag to authenticate when performing decryption with an authenticated algorithm. */
    readonly authenticationTag?: Uint8Array;
    /** Additional data to authenticate but not encrypt/decrypt when using authenticated crypto algorithms. */
    readonly additionalAuthenticatedData?: Uint8Array;
}
export declare function keyOperationResultDeserializer(item: any): KeyOperationResult;
/** The key operations parameters. */
export interface KeySignParameters {
    /** The signing/verification algorithm identifier. For more information on possible algorithm types, see JsonWebKeySignatureAlgorithm. */
    algorithm: JsonWebKeySignatureAlgorithm;
    /** The value to operate on. */
    value: Uint8Array;
}
export declare function keySignParametersSerializer(item: KeySignParameters): any;
/** The signing/verification algorithm identifier. For more information on possible algorithm types, see JsonWebKeySignatureAlgorithm. */
export declare enum KnownJsonWebKeySignatureAlgorithm {
    /** RSASSA-PSS using SHA-256 and MGF1 with SHA-256, as described in https://tools.ietf.org/html/rfc7518 */
    PS256 = "PS256",
    /** RSASSA-PSS using SHA-384 and MGF1 with SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
    PS384 = "PS384",
    /** RSASSA-PSS using SHA-512 and MGF1 with SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
    PS512 = "PS512",
    /** RSASSA-PKCS1-v1_5 using SHA-256, as described in https://tools.ietf.org/html/rfc7518 */
    RS256 = "RS256",
    /** RSASSA-PKCS1-v1_5 using SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
    RS384 = "RS384",
    /** RSASSA-PKCS1-v1_5 using SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
    RS512 = "RS512",
    /** HMAC using SHA-256, as described in  https://tools.ietf.org/html/rfc7518 */
    HS256 = "HS256",
    /** HMAC using SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
    HS384 = "HS384",
    /** HMAC using SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
    HS512 = "HS512",
    /** Reserved */
    Rsnull = "RSNULL",
    /** ECDSA using P-256 and SHA-256, as described in https://tools.ietf.org/html/rfc7518. */
    ES256 = "ES256",
    /** ECDSA using P-384 and SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
    ES384 = "ES384",
    /** ECDSA using P-521 and SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
    ES512 = "ES512",
    /** ECDSA using P-256K and SHA-256, as described in https://tools.ietf.org/html/rfc7518 */
    ES256K = "ES256K"
}
/**
 * The signing/verification algorithm identifier. For more information on possible algorithm types, see JsonWebKeySignatureAlgorithm. \
 * {@link KnownJsonWebKeySignatureAlgorithm} can be used interchangeably with JsonWebKeySignatureAlgorithm,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **PS256**: RSASSA-PSS using SHA-256 and MGF1 with SHA-256, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **PS384**: RSASSA-PSS using SHA-384 and MGF1 with SHA-384, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **PS512**: RSASSA-PSS using SHA-512 and MGF1 with SHA-512, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **RS256**: RSASSA-PKCS1-v1_5 using SHA-256, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **RS384**: RSASSA-PKCS1-v1_5 using SHA-384, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **RS512**: RSASSA-PKCS1-v1_5 using SHA-512, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **HS256**: HMAC using SHA-256, as described in  https:\//tools.ietf.org\/html\/rfc7518 \
 * **HS384**: HMAC using SHA-384, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **HS512**: HMAC using SHA-512, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **RSNULL**: Reserved \
 * **ES256**: ECDSA using P-256 and SHA-256, as described in https:\//tools.ietf.org\/html\/rfc7518. \
 * **ES384**: ECDSA using P-384 and SHA-384, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **ES512**: ECDSA using P-521 and SHA-512, as described in https:\//tools.ietf.org\/html\/rfc7518 \
 * **ES256K**: ECDSA using P-256K and SHA-256, as described in https:\//tools.ietf.org\/html\/rfc7518
 */
export type JsonWebKeySignatureAlgorithm = string;
/** The key verify parameters. */
export interface KeyVerifyParameters {
    /** The signing/verification algorithm. For more information on possible algorithm types, see JsonWebKeySignatureAlgorithm. */
    algorithm: JsonWebKeySignatureAlgorithm;
    /** The digest used for signing. */
    digest: Uint8Array;
    /** The signature to be verified. */
    signature: Uint8Array;
}
export declare function keyVerifyParametersSerializer(item: KeyVerifyParameters): any;
/** The key verify result. */
export interface KeyVerifyResult {
    /** True if the signature is verified, otherwise false. */
    readonly value?: boolean;
}
export declare function keyVerifyResultDeserializer(item: any): KeyVerifyResult;
/** The release key parameters. */
export interface KeyReleaseParameters {
    /** The attestation assertion for the target of the key release. */
    targetAttestationToken: string;
    /** A client provided nonce for freshness. */
    nonce?: string;
    /** The encryption algorithm to use to protected the exported key material */
    enc?: KeyEncryptionAlgorithm;
}
export declare function keyReleaseParametersSerializer(item: KeyReleaseParameters): any;
/** The encryption algorithm to use to protected the exported key material */
export declare enum KnownKeyEncryptionAlgorithm {
    /** The CKM_RSA_AES_KEY_WRAP key wrap mechanism. */
    CkmRsaAesKeyWrap = "CKM_RSA_AES_KEY_WRAP",
    /** The RSA_AES_KEY_WRAP_256 key wrap mechanism. */
    RsaAesKeyWrap256 = "RSA_AES_KEY_WRAP_256",
    /** The RSA_AES_KEY_WRAP_384 key wrap mechanism. */
    RsaAesKeyWrap384 = "RSA_AES_KEY_WRAP_384"
}
/**
 * The encryption algorithm to use to protected the exported key material \
 * {@link KnownKeyEncryptionAlgorithm} can be used interchangeably with KeyEncryptionAlgorithm,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **CKM_RSA_AES_KEY_WRAP**: The CKM_RSA_AES_KEY_WRAP key wrap mechanism. \
 * **RSA_AES_KEY_WRAP_256**: The RSA_AES_KEY_WRAP_256 key wrap mechanism. \
 * **RSA_AES_KEY_WRAP_384**: The RSA_AES_KEY_WRAP_384 key wrap mechanism.
 */
export type KeyEncryptionAlgorithm = string;
/** The release result, containing the released key. */
export interface KeyReleaseResult {
    /** A signed object containing the released key. */
    readonly value?: string;
}
export declare function keyReleaseResultDeserializer(item: any): KeyReleaseResult;
/** A list of keys that have been deleted in this vault. */
export interface _DeletedKeyListResult {
    /** A response message containing a list of deleted keys in the key vault along with a link to the next page of deleted keys. */
    readonly value?: DeletedKeyItem[];
    /** The URL to get the next set of deleted keys. */
    readonly nextLink?: string;
}
export declare function _deletedKeyListResultDeserializer(item: any): _DeletedKeyListResult;
export declare function deletedKeyItemArrayDeserializer(result: Array<DeletedKeyItem>): any[];
/** The deleted key item containing the deleted key metadata and information about deletion. */
export interface DeletedKeyItem {
    /** Key identifier. */
    kid?: string;
    /** The key management attributes. */
    attributes?: KeyAttributes;
    /** Application specific metadata in the form of key-value pairs. */
    tags?: Record<string, string>;
    /** True if the key's lifetime is managed by key vault. If this is a key backing a certificate, then managed will be true. */
    readonly managed?: boolean;
    /** The url of the recovery object, used to identify and recover the deleted key. */
    recoveryId?: string;
    /** The time when the key is scheduled to be purged, in UTC */
    readonly scheduledPurgeDate?: Date;
    /** The time when the key was deleted, in UTC */
    readonly deletedDate?: Date;
}
export declare function deletedKeyItemDeserializer(item: any): DeletedKeyItem;
/** Management policy for a key. */
export interface KeyRotationPolicy {
    /** The key policy id. */
    readonly id?: string;
    /** Actions that will be performed by Key Vault over the lifetime of a key. For preview, lifetimeActions can only have two items at maximum: one for rotate, one for notify. Notification time would be default to 30 days before expiry and it is not configurable. */
    lifetimeActions?: LifetimeActions[];
    /** The key rotation policy attributes. */
    attributes?: KeyRotationPolicyAttributes;
}
export declare function keyRotationPolicySerializer(item: KeyRotationPolicy): any;
export declare function keyRotationPolicyDeserializer(item: any): KeyRotationPolicy;
export declare function lifetimeActionsArraySerializer(result: Array<LifetimeActions>): any[];
export declare function lifetimeActionsArrayDeserializer(result: Array<LifetimeActions>): any[];
/** Action and its trigger that will be performed by Key Vault over the lifetime of a key. */
export interface LifetimeActions {
    /** The condition that will execute the action. */
    trigger?: LifetimeActionsTrigger;
    /** The action that will be executed. */
    action?: LifetimeActionsType;
}
export declare function lifetimeActionsSerializer(item: LifetimeActions): any;
export declare function lifetimeActionsDeserializer(item: any): LifetimeActions;
/** A condition to be satisfied for an action to be executed. */
export interface LifetimeActionsTrigger {
    /** Time after creation to attempt to rotate. It only applies to rotate. It will be in ISO 8601 duration format. Example: 90 days : "P90D" */
    timeAfterCreate?: string;
    /** Time before expiry to attempt to rotate or notify. It will be in ISO 8601 duration format. Example: 90 days : "P90D" */
    timeBeforeExpiry?: string;
}
export declare function lifetimeActionsTriggerSerializer(item: LifetimeActionsTrigger): any;
export declare function lifetimeActionsTriggerDeserializer(item: any): LifetimeActionsTrigger;
/** The action that will be executed. */
export interface LifetimeActionsType {
    /** The type of the action. The value should be compared case-insensitively. */
    type?: KeyRotationPolicyAction;
}
export declare function lifetimeActionsTypeSerializer(item: LifetimeActionsType): any;
export declare function lifetimeActionsTypeDeserializer(item: any): LifetimeActionsType;
/** The type of the action. The value should be compared case-insensitively. */
export type KeyRotationPolicyAction = "Rotate" | "Notify";
/** The key rotation policy attributes. */
export interface KeyRotationPolicyAttributes {
    /** The expiryTime will be applied on the new key version. It should be at least 28 days. It will be in ISO 8601 Format. Examples: 90 days: P90D, 3 months: P3M, 48 hours: PT48H, 1 year and 10 days: P1Y10D */
    expiryTime?: string;
    /** The key rotation policy created time in UTC. */
    readonly created?: Date;
    /** The key rotation policy's last updated time in UTC. */
    readonly updated?: Date;
}
export declare function keyRotationPolicyAttributesSerializer(item: KeyRotationPolicyAttributes): any;
export declare function keyRotationPolicyAttributesDeserializer(item: any): KeyRotationPolicyAttributes;
/** The get random bytes request object. */
export interface GetRandomBytesRequest {
    /** The requested number of random bytes. */
    count: number;
}
export declare function getRandomBytesRequestSerializer(item: GetRandomBytesRequest): any;
/** The get random bytes response object containing the bytes. */
export interface RandomBytes {
    /** The bytes encoded as a base64url string. */
    value: Uint8Array;
}
export declare function randomBytesDeserializer(item: any): RandomBytes;
/** The available API versions. */
export declare enum KnownVersions {
    /** The 7.5 API version. */
    V75 = "7.5",
    /** The 7.6-preview.2 API version. */
    V76Preview2 = "7.6-preview.2",
    /** The 7.6 API version. */
    V76 = "7.6"
}
//# sourceMappingURL=models.d.ts.map