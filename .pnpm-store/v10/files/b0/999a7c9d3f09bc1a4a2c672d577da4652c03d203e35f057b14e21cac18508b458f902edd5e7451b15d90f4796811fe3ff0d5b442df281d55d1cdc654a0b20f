import type * as coreClient from "@azure-rest/core-client";
import type { ExtendedCommonClientOptions } from "@azure/core-http-compat";
import type { DeletionRecoveryLevel } from "./generated/models/index.js";
import { JsonWebKeyOperation as KeyOperation, JsonWebKeyType as KeyType } from "./generated/models/index.js";
import type { KeyCurveName } from "./cryptographyClientModels.js";
export { KeyType, KeyOperation };
/**
 * The latest supported Key Vault service API version
 */
export declare const LATEST_API_VERSION = "7.6";
/**
 * The optional parameters accepted by the KeyVault's KeyClient
 */
export interface KeyClientOptions extends ExtendedCommonClientOptions {
    /**
     * The version of the KeyVault's service API to make calls against.
     */
    serviceVersion?: string;
    /**
     * Whether to disable verification that the authentication challenge resource matches the Key Vault or Managed HSM domain.
     * Defaults to false.
     */
    disableChallengeResourceVerification?: boolean;
}
/**
 * The optional parameters accepted by the KeyVault's CryptographyClient
 */
export interface CryptographyClientOptions extends KeyClientOptions {
}
/**
 * As of http://tools.ietf.org/html/draft-ietf-jose-json-web-key-18
 */
export interface JsonWebKey {
    /**
     * Key identifier.
     */
    kid?: string;
    /**
     * JsonWebKey Key Type (kty), as defined in
     * https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40. Possible values include:
     * 'EC', 'EC-HSM', 'RSA', 'RSA-HSM', 'oct', "oct-HSM"
     */
    kty?: KeyType;
    /**
     * Json web key operations. For more
     * information on possible key operations, see KeyOperation.
     */
    keyOps?: KeyOperation[];
    /**
     * RSA modulus.
     */
    n?: Uint8Array;
    /**
     * RSA public exponent.
     */
    e?: Uint8Array;
    /**
     * RSA private exponent, or the D component of an EC private key.
     */
    d?: Uint8Array;
    /**
     * RSA private key parameter.
     */
    dp?: Uint8Array;
    /**
     * RSA private key parameter.
     */
    dq?: Uint8Array;
    /**
     * RSA private key parameter.
     */
    qi?: Uint8Array;
    /**
     * RSA secret prime.
     */
    p?: Uint8Array;
    /**
     * RSA secret prime, with `p < q`.
     */
    q?: Uint8Array;
    /**
     * Symmetric key.
     */
    k?: Uint8Array;
    /**
     * HSM Token, used with 'Bring Your Own Key'.
     */
    t?: Uint8Array;
    /**
     * Elliptic curve name. For valid values, see KeyCurveName. Possible values include:
     * 'P-256', 'P-384', 'P-521', 'P-256K'
     */
    crv?: KeyCurveName;
    /**
     * X component of an EC public key.
     */
    x?: Uint8Array;
    /**
     * Y component of an EC public key.
     */
    y?: Uint8Array;
}
/**
 * An interface representing a Key Vault Key, with its name, value and {@link KeyProperties}.
 */
export interface KeyVaultKey {
    /**
     * The key value.
     */
    key?: JsonWebKey;
    /**
     * The name of the key.
     */
    name: string;
    /**
     * Key identifier.
     */
    id?: string;
    /**
     * JsonWebKey Key Type (kty), as defined in
     * https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40. Possible values include:
     * 'EC', 'EC-HSM', 'RSA', 'RSA-HSM', 'oct', "oct-HSM"
     */
    keyType?: KeyType;
    /**
     * Operations allowed on this key
     */
    keyOperations?: KeyOperation[];
    /**
     * The properties of the key.
     */
    properties: KeyProperties;
}
/**
 * An interface representing the properties of a key's attestation
 */
export interface KeyAttestation {
    /**
     * The certificate used for attestation validation, in PEM format.
     */
    certificatePemFile?: Uint8Array;
    /**
     * The key attestation corresponding to the private key material of the key.
     */
    privateKeyAttestation?: Uint8Array;
    /**
     * The key attestation corresponding to the public key material of the key.
     */
    publicKeyAttestation?: Uint8Array;
    /**
     * The version of the attestation.
     */
    version?: string;
}
/**
 * An interface representing the Properties of {@link KeyVaultKey}
 */
export interface KeyProperties {
    /**
     * Key identifier.
     */
    id?: string;
    /**
     * The name of the key.
     */
    name: string;
    /**
     * The vault URI.
     */
    vaultUrl: string;
    /**
     * The version of the key. May be undefined.
     */
    version?: string;
    /**
     * Determines whether the object is enabled.
     */
    enabled?: boolean;
    /**
     * Not before date in UTC.
     */
    notBefore?: Date;
    /**
     * Expiry date in UTC.
     */
    expiresOn?: Date;
    /**
     * Application specific metadata in the form of key-value pairs.
     */
    tags?: {
        [propertyName: string]: string;
    };
    /**
     * Creation time in UTC.
     * **NOTE: This property will not be serialized. It can only be populated by
     * the server.**
     */
    readonly createdOn?: Date;
    /**
     * Last updated time in UTC.
     * **NOTE: This property will not be serialized. It can only be populated by
     * the server.**
     */
    readonly updatedOn?: Date;
    /**
     * Reflects the deletion recovery level currently in effect for keys in the current vault.
     * If it contains 'Purgeable' the key can be permanently deleted by a privileged
     * user; otherwise, only the system can purge the key, at the end of the
     * retention interval. Possible values include: 'Purgeable',
     * 'Recoverable+Purgeable', 'Recoverable',
     * 'Recoverable+ProtectedSubscription'
     * **NOTE: This property will not be serialized. It can only be populated by
     * the server.**
     */
    readonly recoveryLevel?: DeletionRecoveryLevel;
    /**
     * The retention dates of the softDelete data.
     * The value should be `>=7` and `<=90` when softDelete enabled.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    recoverableDays?: number;
    /**
     * True if the secret's lifetime is managed by
     * key vault. If this is a secret backing a certificate, then managed will be
     * true.
     * **NOTE: This property will not be serialized. It can only be populated by
     * the server.**
     */
    readonly managed?: boolean;
    /**
     * Indicates whether the private key can be exported.
     */
    exportable?: boolean;
    /**
     * A {@link KeyReleasePolicy} object specifying the rules under which the key can be exported.
     */
    releasePolicy?: KeyReleasePolicy;
    /**
     * The underlying HSM Platform.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly hsmPlatform?: string;
    /**
     * The key attestation, if available and requested.
     */
    attestation?: KeyAttestation;
}
/**
 * An interface representing a deleted Key Vault Key.
 */
export interface DeletedKey {
    /**
     * The key value.
     */
    key?: JsonWebKey;
    /**
     * The name of the key.
     */
    name: string;
    /**
     * Key identifier.
     */
    id?: string;
    /**
     * JsonWebKey Key Type (kty), as defined in
     * https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40. Possible values include:
     * 'EC', 'EC-HSM', 'RSA', 'RSA-HSM', 'oct', "oct-HSM"
     */
    keyType?: KeyType;
    /**
     * Operations allowed on this key
     */
    keyOperations?: KeyOperation[];
    /**
     * The properties of the key.
     */
    properties: KeyProperties & {
        /**
         * The url of the recovery object, used to
         * identify and recover the deleted key.
         */
        readonly recoveryId?: string;
        /**
         * The time when the key is scheduled to be purged, in UTC
         * **NOTE: This property will not be serialized. It can only be populated by
         * the server.**
         */
        readonly scheduledPurgeDate?: Date;
        /**
         * The time when the key was deleted, in UTC
         * **NOTE: This property will not be serialized. It can only be populated by
         * the server.**
         */
        deletedOn?: Date;
    };
}
/**
 * The policy rules under which a key can be exported.
 */
export interface KeyReleasePolicy {
    /**
     * Content type and version of key release policy.
     *
     * Defaults to "application/json; charset=utf-8" if omitted.
     */
    contentType?: string;
    /**
     * The policy rules under which the key can be released. Encoded based on the {@link KeyReleasePolicy.contentType}.
     *
     * For more information regarding the release policy grammar for Azure Key Vault, please refer to:
     * - https://aka.ms/policygrammarkeys for Azure Key Vault release policy grammar.
     * - https://aka.ms/policygrammarmhsm for Azure Managed HSM release policy grammar.
     */
    encodedPolicy?: Uint8Array;
    /** Marks a release policy as immutable. An immutable release policy cannot be changed or updated after being marked immutable. */
    immutable?: boolean;
}
/**
 * An interface representing the optional parameters that can be
 * passed to {@link createKey}
 */
export interface CreateKeyOptions extends coreClient.OperationOptions {
    /**
     * Application specific metadata in the form of key-value pairs.
     */
    tags?: {
        [propertyName: string]: string;
    };
    /**
     * Json web key operations. For more
     * information on possible key operations, see KeyOperation.
     */
    keyOps?: KeyOperation[];
    /**
     * Determines whether the object is enabled.
     */
    enabled?: boolean;
    /**
     * Not before date in UTC.
     */
    notBefore?: Date;
    /**
     * Expiry date in UTC.
     */
    readonly expiresOn?: Date;
    /**
     * The key size in bits. For example: 2048, 3072, or 4096 for RSA.
     */
    keySize?: number;
    /**
     * Elliptic curve name. For valid values, see KeyCurveName.
     * Possible values include: 'P-256', 'P-384', 'P-521', 'P-256K'
     */
    curve?: KeyCurveName;
    /**
     * Whether to import as a hardware key (HSM) or software key.
     */
    hsm?: boolean;
    /**
     * Indicates whether the private key can be exported.
     */
    exportable?: boolean;
    /**
     * A {@link KeyReleasePolicy} object specifying the rules under which the key can be exported.
     */
    releasePolicy?: KeyReleasePolicy;
}
/**
 * An interface representing the optional parameters that can be
 * passed to {@link beginDeleteKey} and {@link beginRecoverDeletedKey}
 */
export interface KeyPollerOptions extends coreClient.OperationOptions {
    /**
     * Time between each polling
     */
    intervalInMs?: number;
    /**
     * A serialized poller, used to resume an existing operation
     */
    resumeFrom?: string;
}
/**
 * An interface representing the optional parameters that can be
 * passed to {@link beginDeleteKey}
 */
export interface BeginDeleteKeyOptions extends KeyPollerOptions {
}
/**
 * An interface representing the optional parameters that can be
 * passed to {@link beginRecoverDeletedKey}
 */
export interface BeginRecoverDeletedKeyOptions extends KeyPollerOptions {
}
/**
 * An interface representing the optional parameters that can be
 * passed to {@link createEcKey}
 */
export interface CreateEcKeyOptions extends CreateKeyOptions {
}
/**
 * An interface representing the optional parameters that can be
 * passed to {@link createRsaKey}
 */
export interface CreateRsaKeyOptions extends CreateKeyOptions {
    /** The public exponent for a RSA key. */
    publicExponent?: number;
}
/**
 * An interface representing the optional parameters that can be
 * passed to {@link createOctKey}
 */
export interface CreateOctKeyOptions extends CreateKeyOptions {
}
/**
 * An interface representing the optional parameters that can be
 * passed to {@link importKey}
 */
export interface ImportKeyOptions extends coreClient.OperationOptions {
    /**
     * Application specific metadata in the form of key-value pairs.
     */
    tags?: {
        [propertyName: string]: string;
    };
    /**
     * Whether to import as a hardware key (HSM) or software key.
     */
    hardwareProtected?: boolean;
    /**
     * Determines whether the object is enabled.
     */
    enabled?: boolean;
    /**
     * Not before date in UTC.
     */
    notBefore?: Date;
    /**
     * Expiry date in UTC.
     */
    expiresOn?: Date;
    /**
     * Indicates whether the private key can be exported.
     */
    exportable?: boolean;
    /**
     * A {@link KeyReleasePolicy} object specifying the rules under which the key can be exported.
     */
    releasePolicy?: KeyReleasePolicy;
}
/**
 * Options for {@link updateKeyProperties}.
 */
export interface UpdateKeyPropertiesOptions extends coreClient.OperationOptions {
    /**
     * Json web key operations. For more
     * information on possible key operations, see KeyOperation.
     */
    keyOps?: KeyOperation[];
    /**
     * Determines whether the object is enabled.
     */
    enabled?: boolean;
    /**
     * Not before date in UTC.
     */
    notBefore?: Date;
    /**
     * Expiry date in UTC.
     */
    expiresOn?: Date;
    /**
     * Application specific metadata in the form of key-value pairs.
     */
    tags?: {
        [propertyName: string]: string;
    };
    /**
     * A {@link KeyReleasePolicy} object specifying the rules under which the key can be exported.
     * Only valid if the key is marked exportable, which cannot be changed after key creation.
     */
    releasePolicy?: KeyReleasePolicy;
}
/**
 * Options for {@link getKey}.
 */
export interface GetKeyOptions extends coreClient.OperationOptions {
    /**
     * The version of the secret to retrieve. If not
     * specified the latest version of the secret will be retrieved.
     */
    version?: string;
}
/**
 * Options for {@link getKeyAttestation}.
 */
export interface GetKeyAttestationOptions extends coreClient.OperationOptions {
    /**
     * The version of the key to retrieve the attestation for. If not
     * specified the latest version of the key will be retrieved.
     */
    version?: string;
}
/**
 * An interface representing optional parameters for KeyClient paged operations passed to {@link listKeys}.
 */
export interface ListKeysOptions extends coreClient.OperationOptions {
}
/**
 * An interface representing optional parameters for KeyClient paged operations passed to {@link listPropertiesOfKeys}.
 */
export interface ListPropertiesOfKeysOptions extends coreClient.OperationOptions {
}
/**
 * An interface representing optional parameters for KeyClient paged operations passed to {@link listPropertiesOfKeyVersions}.
 */
export interface ListPropertiesOfKeyVersionsOptions extends coreClient.OperationOptions {
}
/**
 * An interface representing optional parameters for KeyClient paged operations passed to {@link listDeletedKeys}.
 */
export interface ListDeletedKeysOptions extends coreClient.OperationOptions {
}
/**
 * Options for {@link getDeletedKey}.
 */
export interface GetDeletedKeyOptions extends coreClient.OperationOptions {
}
/**
 * Options for {@link purgeDeletedKey}.
 */
export interface PurgeDeletedKeyOptions extends coreClient.OperationOptions {
}
/**
 * @internal
 * Options for {@link recoverDeletedKey}.
 */
export interface RecoverDeletedKeyOptions extends coreClient.OperationOptions {
}
/**
 * @internal
 * Options for {@link deleteKey}.
 */
export interface DeleteKeyOptions extends coreClient.OperationOptions {
}
/**
 * Options for {@link backupKey}.
 */
export interface BackupKeyOptions extends coreClient.OperationOptions {
}
/**
 * Options for {@link restoreKeyBackup}.
 */
export interface RestoreKeyBackupOptions extends coreClient.OperationOptions {
}
/**
 * An interface representing the options of the cryptography API methods, go to the {@link CryptographyClient} for more information.
 */
export interface CryptographyOptions extends coreClient.OperationOptions {
}
/**
 * Options for {@link KeyClient.getRandomBytes}
 */
export interface GetRandomBytesOptions extends coreClient.OperationOptions {
}
/**
 * Options for {@link KeyClient.releaseKey}
 */
export interface ReleaseKeyOptions extends coreClient.OperationOptions {
    /** A client provided nonce for freshness. */
    nonce?: string;
    /** The {@link KeyExportEncryptionAlgorithm} to for protecting the exported key material. */
    algorithm?: KeyExportEncryptionAlgorithm;
    /**
     * The version of the key to release. Defaults to the latest version of the key if omitted.
     */
    version?: string;
}
/**
 * Result of the {@link KeyClient.releaseKey} operation.
 */
export interface ReleaseKeyResult {
    /** A signed token containing the released key. */
    value: string;
}
/** Known values of {@link KeyOperation} that the service accepts. */
export declare enum KnownKeyOperations {
    /** Key operation - encrypt */
    Encrypt = "encrypt",
    /** Key operation - decrypt */
    Decrypt = "decrypt",
    /** Key operation - sign */
    Sign = "sign",
    /** Key operation - verify */
    Verify = "verify",
    /** Key operation - wrapKey */
    WrapKey = "wrapKey",
    /** Key operation - unwrapKey */
    UnwrapKey = "unwrapKey",
    /** Key operation - import */
    Import = "import"
}
/**
 * Defines values for KeyEncryptionAlgorithm.
 * {@link KnownKeyExportEncryptionAlgorithm} can be used interchangeably with KeyEncryptionAlgorithm,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **CKM_RSA_AES_KEY_WRAP** \
 * **RSA_AES_KEY_WRAP_256** \
 * **RSA_AES_KEY_WRAP_384**
 */
export type KeyExportEncryptionAlgorithm = string;
/**
 * Options for {@link KeyClient.getCryptographyClient}.
 */
export interface GetCryptographyClientOptions {
    /**
     * The version of the key to use for cryptographic operations.
     *
     * When undefined, the latest version of the key will be used.
     */
    keyVersion?: string;
}
/**
 * Options for {@link KeyClient.rotateKey}
 */
export interface RotateKeyOptions extends coreClient.OperationOptions {
}
/**
 * The properties of a key rotation policy that the client can set for a given key.
 *
 * You may also reset the key rotation policy to its default values by setting lifetimeActions to an empty array.
 */
export interface KeyRotationPolicyProperties {
    /**
     * Optional key expiration period used to define the duration after which a newly rotated key will expire, defined as an ISO 8601 duration.
     */
    expiresIn?: string;
    /**
     * Actions that will be performed by Key Vault over the lifetime of a key.
     *
     * You may also pass an empty array to restore to its default values.
     */
    lifetimeActions?: KeyRotationLifetimeAction[];
}
/**
 * The complete key rotation policy that belongs to a key.
 */
export interface KeyRotationPolicy extends KeyRotationPolicyProperties {
    /**
     * The identifier of the Key Rotation Policy.
     * May be undefined if a policy has not been explicitly set.
     */
    readonly id?: string;
    /**
     * The created time in UTC.
     * May be undefined if a policy has not been explicitly set.
     */
    readonly createdOn?: Date;
    /**
     * The last updated time in UTC.
     * May be undefined if a policy has not been explicitly set.
     */
    readonly updatedOn?: Date;
}
/**
 * An action and its corresponding trigger that will be performed by Key Vault over the lifetime of a key.
 */
export interface KeyRotationLifetimeAction {
    /**
     * Time after creation to attempt the specified action, defined as an ISO 8601 duration.
     */
    timeAfterCreate?: string;
    /**
     * Time before expiry to attempt the specified action, defined as an ISO 8601 duration.
     */
    timeBeforeExpiry?: string;
    /**
     * The action that will be executed.
     */
    action: KeyRotationPolicyAction;
}
/**
 * The action that will be executed.
 */
export type KeyRotationPolicyAction = "Rotate" | "Notify";
/**
 * Options for {@link KeyClient.updateKeyRotationPolicy}
 */
export interface UpdateKeyRotationPolicyOptions extends coreClient.OperationOptions {
}
/**
 * Options for {@link KeyClient.getRotationPolicy}
 */
export interface GetKeyRotationPolicyOptions extends coreClient.OperationOptions {
}
//# sourceMappingURL=keysModels.d.ts.map