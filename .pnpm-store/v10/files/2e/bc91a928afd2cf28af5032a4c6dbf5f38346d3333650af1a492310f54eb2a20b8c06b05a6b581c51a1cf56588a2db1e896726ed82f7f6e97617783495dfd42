"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyVaultClient = void 0;
const index_js_1 = require("./api/index.js");
const operations_js_1 = require("./api/operations.js");
class KeyVaultClient {
    /** The key vault client performs cryptographic key operations and vault operations against the Key Vault service. */
    constructor(endpointParam, credential, options = {}) {
        var _a;
        const prefixFromOptions = (_a = options === null || options === void 0 ? void 0 : options.userAgentOptions) === null || _a === void 0 ? void 0 : _a.userAgentPrefix;
        const userAgentPrefix = prefixFromOptions
            ? `${prefixFromOptions} azsdk-js-client`
            : `azsdk-js-client`;
        this._client = (0, index_js_1.createKeyVault)(endpointParam, credential, Object.assign(Object.assign({}, options), { userAgentOptions: { userAgentPrefix } }));
        this.pipeline = this._client.pipeline;
    }
    /** The get key attestation operation returns the key along with its attestation blob. This operation requires the keys/get permission. */
    getKeyAttestation(keyName, keyVersion, options = { requestOptions: {} }) {
        return (0, operations_js_1.getKeyAttestation)(this._client, keyName, keyVersion, options);
    }
    /** Get the requested number of bytes containing random values from a managed HSM. */
    getRandomBytes(parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.getRandomBytes)(this._client, parameters, options);
    }
    /** Set specified members in the key policy. Leave others as undefined. This operation requires the keys/update permission. */
    updateKeyRotationPolicy(keyName, keyRotationPolicy, options = { requestOptions: {} }) {
        return (0, operations_js_1.updateKeyRotationPolicy)(this._client, keyName, keyRotationPolicy, options);
    }
    /** The GetKeyRotationPolicy operation returns the specified key policy resources in the specified key vault. This operation requires the keys/get permission. */
    getKeyRotationPolicy(keyName, options = { requestOptions: {} }) {
        return (0, operations_js_1.getKeyRotationPolicy)(this._client, keyName, options);
    }
    /** The Recover Deleted Key operation is applicable for deleted keys in soft-delete enabled vaults. It recovers the deleted key back to its latest version under /keys. An attempt to recover an non-deleted key will return an error. Consider this the inverse of the delete operation on soft-delete enabled vaults. This operation requires the keys/recover permission. */
    recoverDeletedKey(keyName, options = { requestOptions: {} }) {
        return (0, operations_js_1.recoverDeletedKey)(this._client, keyName, options);
    }
    /** The Purge Deleted Key operation is applicable for soft-delete enabled vaults. While the operation can be invoked on any vault, it will return an error if invoked on a non soft-delete enabled vault. This operation requires the keys/purge permission. */
    purgeDeletedKey(keyName, options = { requestOptions: {} }) {
        return (0, operations_js_1.purgeDeletedKey)(this._client, keyName, options);
    }
    /** The Get Deleted Key operation is applicable for soft-delete enabled vaults. While the operation can be invoked on any vault, it will return an error if invoked on a non soft-delete enabled vault. This operation requires the keys/get permission. */
    getDeletedKey(keyName, options = { requestOptions: {} }) {
        return (0, operations_js_1.getDeletedKey)(this._client, keyName, options);
    }
    /** Retrieves a list of the keys in the Key Vault as JSON Web Key structures that contain the public part of a deleted key. This operation includes deletion-specific information. The Get Deleted Keys operation is applicable for vaults enabled for soft-delete. While the operation can be invoked on any vault, it will return an error if invoked on a non soft-delete enabled vault. This operation requires the keys/list permission. */
    getDeletedKeys(options = { requestOptions: {} }) {
        return (0, operations_js_1.getDeletedKeys)(this._client, options);
    }
    /** The release key operation is applicable to all key types. The target key must be marked exportable. This operation requires the keys/release permission. */
    release(keyName, keyVersion, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.release)(this._client, keyName, keyVersion, parameters, options);
    }
    /** The UNWRAP operation supports decryption of a symmetric key using the target key encryption key. This operation is the reverse of the WRAP operation. The UNWRAP operation applies to asymmetric and symmetric keys stored in Azure Key Vault since it uses the private portion of the key. This operation requires the keys/unwrapKey permission. */
    unwrapKey(keyName, keyVersion, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.unwrapKey)(this._client, keyName, keyVersion, parameters, options);
    }
    /** The WRAP operation supports encryption of a symmetric key using a key encryption key that has previously been stored in an Azure Key Vault. The WRAP operation is only strictly necessary for symmetric keys stored in Azure Key Vault since protection with an asymmetric key can be performed using the public portion of the key. This operation is supported for asymmetric keys as a convenience for callers that have a key-reference but do not have access to the public key material. This operation requires the keys/wrapKey permission. */
    wrapKey(keyName, keyVersion, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.wrapKey)(this._client, keyName, keyVersion, parameters, options);
    }
    /** The VERIFY operation is applicable to symmetric keys stored in Azure Key Vault. VERIFY is not strictly necessary for asymmetric keys stored in Azure Key Vault since signature verification can be performed using the public portion of the key but this operation is supported as a convenience for callers that only have a key-reference and not the public portion of the key. This operation requires the keys/verify permission. */
    verify(keyName, keyVersion, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.verify)(this._client, keyName, keyVersion, parameters, options);
    }
    /** The SIGN operation is applicable to asymmetric and symmetric keys stored in Azure Key Vault since this operation uses the private portion of the key. This operation requires the keys/sign permission. */
    sign(keyName, keyVersion, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.sign)(this._client, keyName, keyVersion, parameters, options);
    }
    /** The DECRYPT operation decrypts a well-formed block of ciphertext using the target encryption key and specified algorithm. This operation is the reverse of the ENCRYPT operation; only a single block of data may be decrypted, the size of this block is dependent on the target key and the algorithm to be used. The DECRYPT operation applies to asymmetric and symmetric keys stored in Azure Key Vault since it uses the private portion of the key. This operation requires the keys/decrypt permission. Microsoft recommends not to use CBC algorithms for decryption without first ensuring the integrity of the ciphertext using an HMAC, for example. See https://learn.microsoft.com/dotnet/standard/security/vulnerabilities-cbc-mode for more information. */
    decrypt(keyName, keyVersion, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.decrypt)(this._client, keyName, keyVersion, parameters, options);
    }
    /** The ENCRYPT operation encrypts an arbitrary sequence of bytes using an encryption key that is stored in Azure Key Vault. Note that the ENCRYPT operation only supports a single block of data, the size of which is dependent on the target key and the encryption algorithm to be used. The ENCRYPT operation is only strictly necessary for symmetric keys stored in Azure Key Vault since protection with an asymmetric key can be performed using public portion of the key. This operation is supported for asymmetric keys as a convenience for callers that have a key-reference but do not have access to the public key material. This operation requires the keys/encrypt permission. */
    encrypt(keyName, keyVersion, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.encrypt)(this._client, keyName, keyVersion, parameters, options);
    }
    /** Imports a previously backed up key into Azure Key Vault, restoring the key, its key identifier, attributes and access control policies. The RESTORE operation may be used to import a previously backed up key. Individual versions of a key cannot be restored. The key is restored in its entirety with the same key name as it had when it was backed up. If the key name is not available in the target Key Vault, the RESTORE operation will be rejected. While the key name is retained during restore, the final key identifier will change if the key is restored to a different vault. Restore will restore all versions and preserve version identifiers. The RESTORE operation is subject to security constraints: The target Key Vault must be owned by the same Microsoft Azure Subscription as the source Key Vault The user must have RESTORE permission in the target Key Vault. This operation requires the keys/restore permission. */
    restoreKey(parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.restoreKey)(this._client, parameters, options);
    }
    /** The Key Backup operation exports a key from Azure Key Vault in a protected form. Note that this operation does NOT return key material in a form that can be used outside the Azure Key Vault system, the returned key material is either protected to a Azure Key Vault HSM or to Azure Key Vault itself. The intent of this operation is to allow a client to GENERATE a key in one Azure Key Vault instance, BACKUP the key, and then RESTORE it into another Azure Key Vault instance. The BACKUP operation may be used to export, in protected form, any key type from Azure Key Vault. Individual versions of a key cannot be backed up. BACKUP / RESTORE can be performed within geographical boundaries only; meaning that a BACKUP from one geographical area cannot be restored to another geographical area. For example, a backup from the US geographical area cannot be restored in an EU geographical area. This operation requires the key/backup permission. */
    backupKey(keyName, options = { requestOptions: {} }) {
        return (0, operations_js_1.backupKey)(this._client, keyName, options);
    }
    /** Retrieves a list of the keys in the Key Vault as JSON Web Key structures that contain the public part of a stored key. The LIST operation is applicable to all key types, however only the base key identifier, attributes, and tags are provided in the response. Individual versions of a key are not listed in the response. This operation requires the keys/list permission. */
    getKeys(options = { requestOptions: {} }) {
        return (0, operations_js_1.getKeys)(this._client, options);
    }
    /** The full key identifier, attributes, and tags are provided in the response. This operation requires the keys/list permission. */
    getKeyVersions(keyName, options = { requestOptions: {} }) {
        return (0, operations_js_1.getKeyVersions)(this._client, keyName, options);
    }
    /** The get key operation is applicable to all key types. If the requested key is symmetric, then no key material is released in the response. This operation requires the keys/get permission. */
    getKey(keyName, keyVersion, options = { requestOptions: {} }) {
        return (0, operations_js_1.getKey)(this._client, keyName, keyVersion, options);
    }
    /** In order to perform this operation, the key must already exist in the Key Vault. Note: The cryptographic material of a key itself cannot be changed. This operation requires the keys/update permission. */
    updateKey(keyName, keyVersion, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.updateKey)(this._client, keyName, keyVersion, parameters, options);
    }
    /** The delete key operation cannot be used to remove individual versions of a key. This operation removes the cryptographic material associated with the key, which means the key is not usable for Sign/Verify, Wrap/Unwrap or Encrypt/Decrypt operations. This operation requires the keys/delete permission. */
    deleteKey(keyName, options = { requestOptions: {} }) {
        return (0, operations_js_1.deleteKey)(this._client, keyName, options);
    }
    /** The import key operation may be used to import any key type into an Azure Key Vault. If the named key already exists, Azure Key Vault creates a new version of the key. This operation requires the keys/import permission. */
    importKey(keyName, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.importKey)(this._client, keyName, parameters, options);
    }
    /** The operation will rotate the key based on the key policy. It requires the keys/rotate permission. */
    rotateKey(keyName, options = { requestOptions: {} }) {
        return (0, operations_js_1.rotateKey)(this._client, keyName, options);
    }
    /** The create key operation can be used to create any key type in Azure Key Vault. If the named key already exists, Azure Key Vault creates a new version of the key. It requires the keys/create permission. */
    createKey(keyName, parameters, options = { requestOptions: {} }) {
        return (0, operations_js_1.createKey)(this._client, keyName, parameters, options);
    }
}
exports.KeyVaultClient = KeyVaultClient;
//# sourceMappingURL=keyVaultClient.js.map