import { KeyVaultContext as Client } from "./index.js";
import { KeyCreateParameters, KeyBundle, KeyImportParameters, DeletedKeyBundle, KeyUpdateParameters, _KeyListResult, KeyItem, BackupKeyResult, KeyRestoreParameters, KeyOperationsParameters, KeyOperationResult, KeySignParameters, KeyVerifyParameters, KeyVerifyResult, KeyReleaseParameters, KeyReleaseResult, _DeletedKeyListResult, DeletedKeyItem, KeyRotationPolicy, GetRandomBytesRequest, RandomBytes } from "../models/models.js";
import { GetKeyAttestationOptionalParams, GetRandomBytesOptionalParams, UpdateKeyRotationPolicyOptionalParams, GetKeyRotationPolicyOptionalParams, RecoverDeletedKeyOptionalParams, PurgeDeletedKeyOptionalParams, GetDeletedKeyOptionalParams, GetDeletedKeysOptionalParams, ReleaseOptionalParams, UnwrapKeyOptionalParams, WrapKeyOptionalParams, VerifyOptionalParams, SignOptionalParams, DecryptOptionalParams, EncryptOptionalParams, RestoreKeyOptionalParams, BackupKeyOptionalParams, GetKeysOptionalParams, GetKeyVersionsOptionalParams, GetKeyOptionalParams, UpdateKeyOptionalParams, DeleteKeyOptionalParams, ImportKeyOptionalParams, RotateKeyOptionalParams, CreateKeyOptionalParams } from "./options.js";
import { PagedAsyncIterableIterator } from "../static-helpers/pagingHelpers.js";
import { StreamableMethod, PathUncheckedResponse } from "@azure-rest/core-client";
export declare function _getKeyAttestationSend(context: Client, keyName: string, keyVersion: string, options?: GetKeyAttestationOptionalParams): StreamableMethod;
export declare function _getKeyAttestationDeserialize(result: PathUncheckedResponse): Promise<KeyBundle>;
/** The get key attestation operation returns the key along with its attestation blob. This operation requires the keys/get permission. */
export declare function getKeyAttestation(context: Client, keyName: string, keyVersion: string, options?: GetKeyAttestationOptionalParams): Promise<KeyBundle>;
export declare function _getRandomBytesSend(context: Client, parameters: GetRandomBytesRequest, options?: GetRandomBytesOptionalParams): StreamableMethod;
export declare function _getRandomBytesDeserialize(result: PathUncheckedResponse): Promise<RandomBytes>;
/** Get the requested number of bytes containing random values from a managed HSM. */
export declare function getRandomBytes(context: Client, parameters: GetRandomBytesRequest, options?: GetRandomBytesOptionalParams): Promise<RandomBytes>;
export declare function _updateKeyRotationPolicySend(context: Client, keyName: string, keyRotationPolicy: KeyRotationPolicy, options?: UpdateKeyRotationPolicyOptionalParams): StreamableMethod;
export declare function _updateKeyRotationPolicyDeserialize(result: PathUncheckedResponse): Promise<KeyRotationPolicy>;
/** Set specified members in the key policy. Leave others as undefined. This operation requires the keys/update permission. */
export declare function updateKeyRotationPolicy(context: Client, keyName: string, keyRotationPolicy: KeyRotationPolicy, options?: UpdateKeyRotationPolicyOptionalParams): Promise<KeyRotationPolicy>;
export declare function _getKeyRotationPolicySend(context: Client, keyName: string, options?: GetKeyRotationPolicyOptionalParams): StreamableMethod;
export declare function _getKeyRotationPolicyDeserialize(result: PathUncheckedResponse): Promise<KeyRotationPolicy>;
/** The GetKeyRotationPolicy operation returns the specified key policy resources in the specified key vault. This operation requires the keys/get permission. */
export declare function getKeyRotationPolicy(context: Client, keyName: string, options?: GetKeyRotationPolicyOptionalParams): Promise<KeyRotationPolicy>;
export declare function _recoverDeletedKeySend(context: Client, keyName: string, options?: RecoverDeletedKeyOptionalParams): StreamableMethod;
export declare function _recoverDeletedKeyDeserialize(result: PathUncheckedResponse): Promise<KeyBundle>;
/** The Recover Deleted Key operation is applicable for deleted keys in soft-delete enabled vaults. It recovers the deleted key back to its latest version under /keys. An attempt to recover an non-deleted key will return an error. Consider this the inverse of the delete operation on soft-delete enabled vaults. This operation requires the keys/recover permission. */
export declare function recoverDeletedKey(context: Client, keyName: string, options?: RecoverDeletedKeyOptionalParams): Promise<KeyBundle>;
export declare function _purgeDeletedKeySend(context: Client, keyName: string, options?: PurgeDeletedKeyOptionalParams): StreamableMethod;
export declare function _purgeDeletedKeyDeserialize(result: PathUncheckedResponse): Promise<void>;
/** The Purge Deleted Key operation is applicable for soft-delete enabled vaults. While the operation can be invoked on any vault, it will return an error if invoked on a non soft-delete enabled vault. This operation requires the keys/purge permission. */
export declare function purgeDeletedKey(context: Client, keyName: string, options?: PurgeDeletedKeyOptionalParams): Promise<void>;
export declare function _getDeletedKeySend(context: Client, keyName: string, options?: GetDeletedKeyOptionalParams): StreamableMethod;
export declare function _getDeletedKeyDeserialize(result: PathUncheckedResponse): Promise<DeletedKeyBundle>;
/** The Get Deleted Key operation is applicable for soft-delete enabled vaults. While the operation can be invoked on any vault, it will return an error if invoked on a non soft-delete enabled vault. This operation requires the keys/get permission. */
export declare function getDeletedKey(context: Client, keyName: string, options?: GetDeletedKeyOptionalParams): Promise<DeletedKeyBundle>;
export declare function _getDeletedKeysSend(context: Client, options?: GetDeletedKeysOptionalParams): StreamableMethod;
export declare function _getDeletedKeysDeserialize(result: PathUncheckedResponse): Promise<_DeletedKeyListResult>;
/** Retrieves a list of the keys in the Key Vault as JSON Web Key structures that contain the public part of a deleted key. This operation includes deletion-specific information. The Get Deleted Keys operation is applicable for vaults enabled for soft-delete. While the operation can be invoked on any vault, it will return an error if invoked on a non soft-delete enabled vault. This operation requires the keys/list permission. */
export declare function getDeletedKeys(context: Client, options?: GetDeletedKeysOptionalParams): PagedAsyncIterableIterator<DeletedKeyItem>;
export declare function _releaseSend(context: Client, keyName: string, keyVersion: string, parameters: KeyReleaseParameters, options?: ReleaseOptionalParams): StreamableMethod;
export declare function _releaseDeserialize(result: PathUncheckedResponse): Promise<KeyReleaseResult>;
/** The release key operation is applicable to all key types. The target key must be marked exportable. This operation requires the keys/release permission. */
export declare function release(context: Client, keyName: string, keyVersion: string, parameters: KeyReleaseParameters, options?: ReleaseOptionalParams): Promise<KeyReleaseResult>;
export declare function _unwrapKeySend(context: Client, keyName: string, keyVersion: string, parameters: KeyOperationsParameters, options?: UnwrapKeyOptionalParams): StreamableMethod;
export declare function _unwrapKeyDeserialize(result: PathUncheckedResponse): Promise<KeyOperationResult>;
/** The UNWRAP operation supports decryption of a symmetric key using the target key encryption key. This operation is the reverse of the WRAP operation. The UNWRAP operation applies to asymmetric and symmetric keys stored in Azure Key Vault since it uses the private portion of the key. This operation requires the keys/unwrapKey permission. */
export declare function unwrapKey(context: Client, keyName: string, keyVersion: string, parameters: KeyOperationsParameters, options?: UnwrapKeyOptionalParams): Promise<KeyOperationResult>;
export declare function _wrapKeySend(context: Client, keyName: string, keyVersion: string, parameters: KeyOperationsParameters, options?: WrapKeyOptionalParams): StreamableMethod;
export declare function _wrapKeyDeserialize(result: PathUncheckedResponse): Promise<KeyOperationResult>;
/** The WRAP operation supports encryption of a symmetric key using a key encryption key that has previously been stored in an Azure Key Vault. The WRAP operation is only strictly necessary for symmetric keys stored in Azure Key Vault since protection with an asymmetric key can be performed using the public portion of the key. This operation is supported for asymmetric keys as a convenience for callers that have a key-reference but do not have access to the public key material. This operation requires the keys/wrapKey permission. */
export declare function wrapKey(context: Client, keyName: string, keyVersion: string, parameters: KeyOperationsParameters, options?: WrapKeyOptionalParams): Promise<KeyOperationResult>;
export declare function _verifySend(context: Client, keyName: string, keyVersion: string, parameters: KeyVerifyParameters, options?: VerifyOptionalParams): StreamableMethod;
export declare function _verifyDeserialize(result: PathUncheckedResponse): Promise<KeyVerifyResult>;
/** The VERIFY operation is applicable to symmetric keys stored in Azure Key Vault. VERIFY is not strictly necessary for asymmetric keys stored in Azure Key Vault since signature verification can be performed using the public portion of the key but this operation is supported as a convenience for callers that only have a key-reference and not the public portion of the key. This operation requires the keys/verify permission. */
export declare function verify(context: Client, keyName: string, keyVersion: string, parameters: KeyVerifyParameters, options?: VerifyOptionalParams): Promise<KeyVerifyResult>;
export declare function _signSend(context: Client, keyName: string, keyVersion: string, parameters: KeySignParameters, options?: SignOptionalParams): StreamableMethod;
export declare function _signDeserialize(result: PathUncheckedResponse): Promise<KeyOperationResult>;
/** The SIGN operation is applicable to asymmetric and symmetric keys stored in Azure Key Vault since this operation uses the private portion of the key. This operation requires the keys/sign permission. */
export declare function sign(context: Client, keyName: string, keyVersion: string, parameters: KeySignParameters, options?: SignOptionalParams): Promise<KeyOperationResult>;
export declare function _decryptSend(context: Client, keyName: string, keyVersion: string, parameters: KeyOperationsParameters, options?: DecryptOptionalParams): StreamableMethod;
export declare function _decryptDeserialize(result: PathUncheckedResponse): Promise<KeyOperationResult>;
/** The DECRYPT operation decrypts a well-formed block of ciphertext using the target encryption key and specified algorithm. This operation is the reverse of the ENCRYPT operation; only a single block of data may be decrypted, the size of this block is dependent on the target key and the algorithm to be used. The DECRYPT operation applies to asymmetric and symmetric keys stored in Azure Key Vault since it uses the private portion of the key. This operation requires the keys/decrypt permission. Microsoft recommends not to use CBC algorithms for decryption without first ensuring the integrity of the ciphertext using an HMAC, for example. See https://learn.microsoft.com/dotnet/standard/security/vulnerabilities-cbc-mode for more information. */
export declare function decrypt(context: Client, keyName: string, keyVersion: string, parameters: KeyOperationsParameters, options?: DecryptOptionalParams): Promise<KeyOperationResult>;
export declare function _encryptSend(context: Client, keyName: string, keyVersion: string, parameters: KeyOperationsParameters, options?: EncryptOptionalParams): StreamableMethod;
export declare function _encryptDeserialize(result: PathUncheckedResponse): Promise<KeyOperationResult>;
/** The ENCRYPT operation encrypts an arbitrary sequence of bytes using an encryption key that is stored in Azure Key Vault. Note that the ENCRYPT operation only supports a single block of data, the size of which is dependent on the target key and the encryption algorithm to be used. The ENCRYPT operation is only strictly necessary for symmetric keys stored in Azure Key Vault since protection with an asymmetric key can be performed using public portion of the key. This operation is supported for asymmetric keys as a convenience for callers that have a key-reference but do not have access to the public key material. This operation requires the keys/encrypt permission. */
export declare function encrypt(context: Client, keyName: string, keyVersion: string, parameters: KeyOperationsParameters, options?: EncryptOptionalParams): Promise<KeyOperationResult>;
export declare function _restoreKeySend(context: Client, parameters: KeyRestoreParameters, options?: RestoreKeyOptionalParams): StreamableMethod;
export declare function _restoreKeyDeserialize(result: PathUncheckedResponse): Promise<KeyBundle>;
/** Imports a previously backed up key into Azure Key Vault, restoring the key, its key identifier, attributes and access control policies. The RESTORE operation may be used to import a previously backed up key. Individual versions of a key cannot be restored. The key is restored in its entirety with the same key name as it had when it was backed up. If the key name is not available in the target Key Vault, the RESTORE operation will be rejected. While the key name is retained during restore, the final key identifier will change if the key is restored to a different vault. Restore will restore all versions and preserve version identifiers. The RESTORE operation is subject to security constraints: The target Key Vault must be owned by the same Microsoft Azure Subscription as the source Key Vault The user must have RESTORE permission in the target Key Vault. This operation requires the keys/restore permission. */
export declare function restoreKey(context: Client, parameters: KeyRestoreParameters, options?: RestoreKeyOptionalParams): Promise<KeyBundle>;
export declare function _backupKeySend(context: Client, keyName: string, options?: BackupKeyOptionalParams): StreamableMethod;
export declare function _backupKeyDeserialize(result: PathUncheckedResponse): Promise<BackupKeyResult>;
/** The Key Backup operation exports a key from Azure Key Vault in a protected form. Note that this operation does NOT return key material in a form that can be used outside the Azure Key Vault system, the returned key material is either protected to a Azure Key Vault HSM or to Azure Key Vault itself. The intent of this operation is to allow a client to GENERATE a key in one Azure Key Vault instance, BACKUP the key, and then RESTORE it into another Azure Key Vault instance. The BACKUP operation may be used to export, in protected form, any key type from Azure Key Vault. Individual versions of a key cannot be backed up. BACKUP / RESTORE can be performed within geographical boundaries only; meaning that a BACKUP from one geographical area cannot be restored to another geographical area. For example, a backup from the US geographical area cannot be restored in an EU geographical area. This operation requires the key/backup permission. */
export declare function backupKey(context: Client, keyName: string, options?: BackupKeyOptionalParams): Promise<BackupKeyResult>;
export declare function _getKeysSend(context: Client, options?: GetKeysOptionalParams): StreamableMethod;
export declare function _getKeysDeserialize(result: PathUncheckedResponse): Promise<_KeyListResult>;
/** Retrieves a list of the keys in the Key Vault as JSON Web Key structures that contain the public part of a stored key. The LIST operation is applicable to all key types, however only the base key identifier, attributes, and tags are provided in the response. Individual versions of a key are not listed in the response. This operation requires the keys/list permission. */
export declare function getKeys(context: Client, options?: GetKeysOptionalParams): PagedAsyncIterableIterator<KeyItem>;
export declare function _getKeyVersionsSend(context: Client, keyName: string, options?: GetKeyVersionsOptionalParams): StreamableMethod;
export declare function _getKeyVersionsDeserialize(result: PathUncheckedResponse): Promise<_KeyListResult>;
/** The full key identifier, attributes, and tags are provided in the response. This operation requires the keys/list permission. */
export declare function getKeyVersions(context: Client, keyName: string, options?: GetKeyVersionsOptionalParams): PagedAsyncIterableIterator<KeyItem>;
export declare function _getKeySend(context: Client, keyName: string, keyVersion: string, options?: GetKeyOptionalParams): StreamableMethod;
export declare function _getKeyDeserialize(result: PathUncheckedResponse): Promise<KeyBundle>;
/** The get key operation is applicable to all key types. If the requested key is symmetric, then no key material is released in the response. This operation requires the keys/get permission. */
export declare function getKey(context: Client, keyName: string, keyVersion: string, options?: GetKeyOptionalParams): Promise<KeyBundle>;
export declare function _updateKeySend(context: Client, keyName: string, keyVersion: string, parameters: KeyUpdateParameters, options?: UpdateKeyOptionalParams): StreamableMethod;
export declare function _updateKeyDeserialize(result: PathUncheckedResponse): Promise<KeyBundle>;
/** In order to perform this operation, the key must already exist in the Key Vault. Note: The cryptographic material of a key itself cannot be changed. This operation requires the keys/update permission. */
export declare function updateKey(context: Client, keyName: string, keyVersion: string, parameters: KeyUpdateParameters, options?: UpdateKeyOptionalParams): Promise<KeyBundle>;
export declare function _deleteKeySend(context: Client, keyName: string, options?: DeleteKeyOptionalParams): StreamableMethod;
export declare function _deleteKeyDeserialize(result: PathUncheckedResponse): Promise<DeletedKeyBundle>;
/** The delete key operation cannot be used to remove individual versions of a key. This operation removes the cryptographic material associated with the key, which means the key is not usable for Sign/Verify, Wrap/Unwrap or Encrypt/Decrypt operations. This operation requires the keys/delete permission. */
export declare function deleteKey(context: Client, keyName: string, options?: DeleteKeyOptionalParams): Promise<DeletedKeyBundle>;
export declare function _importKeySend(context: Client, keyName: string, parameters: KeyImportParameters, options?: ImportKeyOptionalParams): StreamableMethod;
export declare function _importKeyDeserialize(result: PathUncheckedResponse): Promise<KeyBundle>;
/** The import key operation may be used to import any key type into an Azure Key Vault. If the named key already exists, Azure Key Vault creates a new version of the key. This operation requires the keys/import permission. */
export declare function importKey(context: Client, keyName: string, parameters: KeyImportParameters, options?: ImportKeyOptionalParams): Promise<KeyBundle>;
export declare function _rotateKeySend(context: Client, keyName: string, options?: RotateKeyOptionalParams): StreamableMethod;
export declare function _rotateKeyDeserialize(result: PathUncheckedResponse): Promise<KeyBundle>;
/** The operation will rotate the key based on the key policy. It requires the keys/rotate permission. */
export declare function rotateKey(context: Client, keyName: string, options?: RotateKeyOptionalParams): Promise<KeyBundle>;
export declare function _createKeySend(context: Client, keyName: string, parameters: KeyCreateParameters, options?: CreateKeyOptionalParams): StreamableMethod;
export declare function _createKeyDeserialize(result: PathUncheckedResponse): Promise<KeyBundle>;
/** The create key operation can be used to create any key type in Azure Key Vault. If the named key already exists, Azure Key Vault creates a new version of the key. It requires the keys/create permission. */
export declare function createKey(context: Client, keyName: string, parameters: KeyCreateParameters, options?: CreateKeyOptionalParams): Promise<KeyBundle>;
//# sourceMappingURL=operations.d.ts.map