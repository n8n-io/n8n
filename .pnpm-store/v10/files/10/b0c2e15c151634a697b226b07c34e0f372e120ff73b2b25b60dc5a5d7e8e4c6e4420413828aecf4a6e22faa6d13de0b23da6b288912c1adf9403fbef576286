// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/// <reference lib="esnext.asynciterable" />
import { __rest } from "tslib";
import { logger } from "./log.js";
import { KnownDeletionRecoveryLevel } from "./generated/models/index.js";
import { KeyVaultClient } from "./generated/keyVaultClient.js";
import { SDK_VERSION } from "./constants.js";
import { keyVaultAuthenticationPolicy } from "@azure/keyvault-common";
import { DeleteKeyPoller } from "./lro/delete/poller.js";
import { RecoverDeletedKeyPoller } from "./lro/recover/poller.js";
import { KnownKeyOperations, LATEST_API_VERSION, } from "./keysModels.js";
import { CryptographyClient } from "./cryptographyClient.js";
import { KnownKeyExportEncryptionAlgorithm, KnownEncryptionAlgorithms, KnownKeyTypes, KnownKeyCurveNames, KnownSignatureAlgorithms, } from "./cryptographyClientModels.js";
import { parseKeyVaultKeyIdentifier } from "./identifier.js";
import { getDeletedKeyFromDeletedKeyItem, getKeyFromKeyBundle, getKeyPropertiesFromKeyItem, keyRotationTransformations, mapPagedAsyncIterable, } from "./transformations.js";
import { tracingClient } from "./tracing.js";
import { bearerTokenAuthenticationPolicyName } from "@azure/core-rest-pipeline";
export { CryptographyClient, KnownDeletionRecoveryLevel, KnownKeyCurveNames, KnownKeyExportEncryptionAlgorithm, KnownEncryptionAlgorithms, KnownKeyOperations, KnownKeyTypes, KnownSignatureAlgorithms, parseKeyVaultKeyIdentifier, logger, };
/**
 * The KeyClient provides methods to manage {@link KeyVaultKey} in the
 * Azure Key Vault. The client supports creating, retrieving, updating,
 * deleting, purging, backing up, restoring and listing KeyVaultKeys. The
 * client also supports listing {@link DeletedKey} for a soft-delete enabled Azure Key
 * Vault.
 */
export class KeyClient {
    /**
     * Creates an instance of KeyClient.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleCreateClient
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * // Build the URL to reach your key vault
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`; // or `https://${vaultName}.managedhsm.azure.net` for managed HSM.
     *
     * // Lastly, create our keys client and connect to the service
     * const client = new KeyClient(url, credential);
     * ```
     * @param vaultUrl - the URL of the Key Vault. It should have this shape: `https://${your-key-vault-name}.vault.azure.net`. You should validate that this URL references a valid Key Vault or Managed HSM resource. See https://aka.ms/azsdk/blog/vault-uri for details.
     * @param credential - An object that implements the `TokenCredential` interface used to authenticate requests to the service. Use the \@azure/identity package to create a credential that suits your needs.
     * @param pipelineOptions - Pipeline options used to configure Key Vault API requests. Omit this parameter to use the default pipeline configuration.
     */
    constructor(vaultUrl, credential, pipelineOptions = {}) {
        this.vaultUrl = vaultUrl;
        const libInfo = `azsdk-js-keyvault-keys/${SDK_VERSION}`;
        const userAgentOptions = pipelineOptions.userAgentOptions;
        pipelineOptions.userAgentOptions = {
            userAgentPrefix: userAgentOptions && userAgentOptions.userAgentPrefix
                ? `${userAgentOptions.userAgentPrefix} ${libInfo}`
                : libInfo,
        };
        const internalPipelineOptions = Object.assign(Object.assign({}, pipelineOptions), { apiVersion: pipelineOptions.serviceVersion || LATEST_API_VERSION, loggingOptions: {
                logger: logger.info,
                additionalAllowedHeaderNames: [
                    "x-ms-keyvault-region",
                    "x-ms-keyvault-network-info",
                    "x-ms-keyvault-service-version",
                ],
            } });
        this.credential = credential;
        this.client = new KeyVaultClient(vaultUrl, credential, internalPipelineOptions);
        this.client.pipeline.removePolicy({ name: bearerTokenAuthenticationPolicyName });
        this.client.pipeline.addPolicy(keyVaultAuthenticationPolicy(credential, pipelineOptions));
        // Workaround for: https://github.com/Azure/azure-sdk-for-js/issues/31843
        this.client.pipeline.addPolicy({
            name: "ContentTypePolicy",
            sendRequest(request, next) {
                var _a;
                const contentType = (_a = request.headers.get("Content-Type")) !== null && _a !== void 0 ? _a : "";
                if (contentType.startsWith("application/json")) {
                    request.headers.set("Content-Type", "application/json");
                }
                return next(request);
            },
        });
    }
    /**
     * The create key operation can be used to create any key type in Azure Key Vault. If the named key
     * already exists, Azure Key Vault creates a new version of the key. It requires the keys/create
     * permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleCreateKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     * const result = await client.createKey(keyName, "RSA");
     * console.log("result: ", result);
     * ```
     * Creates a new key, stores it, then returns key parameters and properties to the client.
     * @param name - The name of the key.
     * @param keyType - The type of the key. One of the following: 'EC', 'EC-HSM', 'RSA', 'RSA-HSM', 'oct'.
     * @param options - The optional parameters.
     */
    createKey(name, keyType, options = {}) {
        return tracingClient.withSpan("KeyClient.createKey", options, async (updatedOptions) => {
            const response = await this.client.createKey(name, {
                kty: keyType,
                curve: options === null || options === void 0 ? void 0 : options.curve,
                keyAttributes: {
                    enabled: options === null || options === void 0 ? void 0 : options.enabled,
                    notBefore: options === null || options === void 0 ? void 0 : options.notBefore,
                    expires: options === null || options === void 0 ? void 0 : options.expiresOn,
                    exportable: options === null || options === void 0 ? void 0 : options.exportable,
                },
                keyOps: options === null || options === void 0 ? void 0 : options.keyOps,
                keySize: options === null || options === void 0 ? void 0 : options.keySize,
                releasePolicy: options === null || options === void 0 ? void 0 : options.releasePolicy,
                tags: options === null || options === void 0 ? void 0 : options.tags,
            }, updatedOptions);
            return getKeyFromKeyBundle(response);
        });
    }
    /**
     * The createEcKey method creates a new elliptic curve key in Azure Key Vault. If the named key
     * already exists, Azure Key Vault creates a new version of the key. It requires the keys/create
     * permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleCreateEcKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     * const result = await client.createEcKey(keyName, { curve: "P-256" });
     * console.log("result: ", result);
     * ```
     * Creates a new key, stores it, then returns key parameters and properties to the client.
     * @param name - The name of the key.
     * @param options - The optional parameters.
     */
    async createEcKey(name, options) {
        const keyType = (options === null || options === void 0 ? void 0 : options.hsm) ? KnownKeyTypes.ECHSM : KnownKeyTypes.EC;
        return this.createKey(name, keyType, options);
    }
    /**
     * The createRSAKey method creates a new RSA key in Azure Key Vault. If the named key
     * already exists, Azure Key Vault creates a new version of the key. It requires the keys/create
     * permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleCreateRsaKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     * const result = await client.createRsaKey("MyKey", { keySize: 2048 });
     * console.log("result: ", result);
     * ```
     * Creates a new key, stores it, then returns key parameters and properties to the client.
     * @param name - The name of the key.
     * @param options - The optional parameters.
     */
    async createRsaKey(name, options) {
        const keyType = (options === null || options === void 0 ? void 0 : options.hsm) ? KnownKeyTypes.RSAHSM : KnownKeyTypes.RSA;
        return this.createKey(name, keyType, options);
    }
    /**
     * The createOctKey method creates a new OCT key in Azure Key Vault. If the named key
     * already exists, Azure Key Vault creates a new version of the key. It requires the keys/create
     * permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleCreateOctKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     * const result = await client.createOctKey("MyKey", { hsm: true });
     * console.log("result: ", result);
     * ```
     * Creates a new key, stores it, then returns key parameters and properties to the client.
     * @param name - The name of the key.
     * @param options - The optional parameters.
     */
    async createOctKey(name, options) {
        const keyType = (options === null || options === void 0 ? void 0 : options.hsm) ? KnownKeyTypes.OctHSM : KnownKeyTypes.Oct;
        return this.createKey(name, keyType, options);
    }
    /**
     * The import key operation may be used to import any key type into an Azure Key Vault. If the
     * named key already exists, Azure Key Vault creates a new version of the key. This operation
     * requires the keys/import permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleImportKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const jsonWebKey = {
     *   kty: "RSA",
     *   kid: "test-key-123",
     *   use: "sig",
     *   alg: "RS256",
     *   n: new Uint8Array([112, 34, 56, 98, 123, 244, 200, 99]),
     *   e: new Uint8Array([1, 0, 1]),
     *   d: new Uint8Array([45, 67, 89, 23, 144, 200, 76, 233]),
     *   p: new Uint8Array([34, 89, 100, 77, 204, 56, 29, 77]),
     *   q: new Uint8Array([78, 99, 201, 45, 188, 34, 67, 90]),
     *   dp: new Uint8Array([23, 45, 78, 56, 200, 144, 32, 67]),
     *   dq: new Uint8Array([12, 67, 89, 144, 99, 56, 23, 45]),
     *   qi: new Uint8Array([78, 90, 45, 201, 34, 67, 120, 55]),
     * };
     *
     * const result = await client.importKey("MyKey", jsonWebKey);
     * ```
     * Imports an externally created key, stores it, and returns key parameters and properties
     * to the client.
     * @param name - Name for the imported key.
     * @param key - The JSON web key.
     * @param options - The optional parameters.
     */
    importKey(name, key, options = {}) {
        return tracingClient.withSpan(`KeyClient.importKey`, options, async (updatedOptions) => {
            const { enabled, notBefore, expiresOn: expires, exportable, releasePolicy, tags } = options;
            const keyAttributes = {
                enabled,
                notBefore,
                expires,
                exportable,
            };
            const parameters = {
                key,
                hsm: options === null || options === void 0 ? void 0 : options.hardwareProtected,
                keyAttributes,
                releasePolicy,
                tags,
            };
            const response = await this.client.importKey(name, parameters, updatedOptions);
            return getKeyFromKeyBundle(response);
        });
    }
    /**
     * Gets a {@link CryptographyClient} for the given key.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleGetCryptographyClient
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * // Get a cryptography client for a given key
     * const cryptographyClient = client.getCryptographyClient("MyKey");
     * ```
     * @param name - The name of the key used to perform cryptographic operations.
     * @param version - Optional version of the key used to perform cryptographic operations.
     * @returns - A {@link CryptographyClient} using the same options, credentials, and http client as this {@link KeyClient}
     */
    getCryptographyClient(keyName, options) {
        const keyUrl = new URL(["keys", keyName, options === null || options === void 0 ? void 0 : options.keyVersion].filter(Boolean).join("/"), this.vaultUrl);
        // The goals of this method are discoverability and performance (by sharing a client and pipeline).
        // The existing cryptography client does not accept a pipeline as an argument, nor does it expose it.
        // In order to avoid publicly exposing the pipeline we will pass in the underlying client as an undocumented
        // property to the constructor so that crypto providers downstream can use it.
        const constructorOptions = {
            generatedClient: this.client,
        };
        const cryptoClient = new CryptographyClient(keyUrl.toString(), this.credential, constructorOptions);
        return cryptoClient;
    }
    /**
     * The delete operation applies to any key stored in Azure Key Vault. Individual versions
     * of a key can not be deleted, only all versions of a given key at once.
     *
     * This function returns a Long Running Operation poller that allows you to wait indefinitely until the key is deleted.
     *
     * This operation requires the keys/delete permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleDeleteKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const poller = await client.beginDeleteKey(keyName);
     * await poller.pollUntilDone();
     * ```
     * Deletes a key from a specified key vault.
     * @param name - The name of the key.
     * @param options - The optional parameters.
     */
    async beginDeleteKey(name, options = {}) {
        const poller = new DeleteKeyPoller({
            name,
            client: this.client,
            intervalInMs: options.intervalInMs,
            resumeFrom: options.resumeFrom,
            operationOptions: options,
        });
        // This will initialize the poller's operation (the deletion of the key).
        await poller.poll();
        return poller;
    }
    updateKeyProperties(...args) {
        const [name, keyVersion, options] = this.disambiguateUpdateKeyPropertiesArgs(args);
        return tracingClient.withSpan(`KeyClient.updateKeyProperties`, options, async (updatedOptions) => {
            const response = await this.client.updateKey(name, keyVersion, {
                keyAttributes: {
                    enabled: options === null || options === void 0 ? void 0 : options.enabled,
                    notBefore: options === null || options === void 0 ? void 0 : options.notBefore,
                    expires: options === null || options === void 0 ? void 0 : options.expiresOn,
                },
                keyOps: options === null || options === void 0 ? void 0 : options.keyOps,
                releasePolicy: options === null || options === void 0 ? void 0 : options.releasePolicy,
                tags: options === null || options === void 0 ? void 0 : options.tags,
            }, updatedOptions);
            return getKeyFromKeyBundle(response);
        });
    }
    /**
     * Standardizes an overloaded arguments collection for the updateKeyProperties method.
     *
     * @param args - The arguments collection.
     * @returns - The standardized arguments collection.
     */
    disambiguateUpdateKeyPropertiesArgs(args) {
        if (typeof args[1] === "string") {
            // [name, keyVersion, options?] => [name, keyVersion, options || {}]
            return [args[0], args[1], args[2] || {}];
        }
        else {
            // [name, options?] => [name , "", options || {}]
            return [args[0], "", args[1] || {}];
        }
    }
    /**
     * The getKey method gets a specified key and is applicable to any key stored in Azure Key Vault.
     * This operation requires the keys/get permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleGetKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const latestKey = await client.getKey(keyName);
     * console.log(`Latest version of the key ${keyName}: `, latestKey);
     *
     * const specificKey = await client.getKey(keyName, { version: latestKey.properties.version! });
     * console.log(`The key ${keyName} at the version ${latestKey.properties.version!}: `, specificKey);
     * ```
     * Get a specified key from a given key vault.
     * @param name - The name of the key.
     * @param options - The optional parameters.
     */
    getKey(name, options = {}) {
        return tracingClient.withSpan(`KeyClient.getKey`, options, async (updatedOptions) => {
            const response = await this.client.getKey(name, options.version || "", updatedOptions);
            return getKeyFromKeyBundle(response);
        });
    }
    /**
     * The getKeyAttestation method gets a specified key and its attestation blob and is applicable to any key stored in Azure Key Vault Managed HSM.
     * This operation requires the keys/get permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleGetKeyAttestation
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT MANAGED HSM NAME>";
     * const url = `https://${vaultName}.managedhsm.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const latestKey = await client.getKeyAttestation(keyName);
     * console.log(`Latest version of the key ${keyName}: `, latestKey);
     *
     * const specificKey = await client.getKeyAttestation(keyName, {
     *   version: latestKey.properties.version!,
     * });
     * console.log(`The key ${keyName} at the version ${latestKey.properties.version!}: `, specificKey);
     * ```
     * Get a specified key from a given key vault.
     * @param name - The name of the key.
     * @param options - The optional parameters.
     */
    getKeyAttestation(name, options = {}) {
        return tracingClient.withSpan(`KeyClient.getKeyAttestation`, options, async (updatedOptions) => {
            var _a;
            const response = await this.client.getKeyAttestation(name, (_a = updatedOptions.version) !== null && _a !== void 0 ? _a : "", updatedOptions);
            return getKeyFromKeyBundle(response);
        });
    }
    /**
     * The getDeletedKey method returns the specified deleted key along with its properties.
     * This operation requires the keys/get permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleGetDeletedKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * await client.getDeletedKey(keyName);
     * ```
     * Gets the specified deleted key.
     * @param name - The name of the key.
     * @param options - The optional parameters.
     */
    getDeletedKey(name, options = {}) {
        return tracingClient.withSpan(`KeyClient.getDeletedKey`, options, async (updatedOptions) => {
            const response = await this.client.getDeletedKey(name, updatedOptions);
            return getKeyFromKeyBundle(response);
        });
    }
    /**
     * The purge deleted key operation removes the key permanently, without the possibility of
     * recovery. This operation can only be enabled on a soft-delete enabled vault. This operation
     * requires the keys/purge permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSamplePurgeDeletedKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const deletePoller = await client.beginDeleteKey(keyName);
     * await deletePoller.pollUntilDone();
     *
     * await client.purgeDeletedKey(keyName);
     * ```
     * Permanently deletes the specified key.
     * @param name - The name of the key.
     * @param options - The optional parameters.
     */
    purgeDeletedKey(name, options = {}) {
        return tracingClient.withSpan(`KeyClient.purgeDeletedKey`, options, async (updatedOptions) => {
            await this.client.purgeDeletedKey(name, updatedOptions);
        });
    }
    /**
     * Recovers the deleted key in the specified vault. This operation can only be performed on a
     * soft-delete enabled vault.
     *
     * This function returns a Long Running Operation poller that allows you to wait indefinitely until the deleted key is recovered.
     *
     * This operation requires the keys/recover permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleRecoverDeletedKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const deletePoller = await client.beginDeleteKey(keyName);
     * await deletePoller.pollUntilDone();
     *
     * const recoverPoller = await client.beginRecoverDeletedKey(keyName);
     * const recoveredKey = await recoverPoller.pollUntilDone();
     * ```
     * Recovers the deleted key to the latest version.
     * @param name - The name of the deleted key.
     * @param options - The optional parameters.
     */
    async beginRecoverDeletedKey(name, options = {}) {
        const poller = new RecoverDeletedKeyPoller({
            name,
            client: this.client,
            intervalInMs: options.intervalInMs,
            resumeFrom: options.resumeFrom,
            operationOptions: options,
        });
        // This will initialize the poller's operation (the deletion of the key).
        await poller.poll();
        return poller;
    }
    /**
     * Requests that a backup of the specified key be downloaded to the client. All versions of the
     * key will be downloaded. This operation requires the keys/backup permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleBackupKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const backupContents = await client.backupKey(keyName);
     * ```
     * Backs up the specified key.
     * @param name - The name of the key.
     * @param options - The optional parameters.
     */
    backupKey(name, options = {}) {
        return tracingClient.withSpan(`KeyClient.backupKey`, options, async (updatedOptions) => {
            const response = await this.client.backupKey(name, updatedOptions);
            return response.value;
        });
    }
    /**
     * Restores a backed up key, and all its versions, to a vault. This operation requires the
     * keys/restore permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleRestoreKeyBackup
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const backupContents = await client.backupKey(keyName);
     *
     * const key = await client.restoreKeyBackup(backupContents);
     * ```
     * Restores a backed up key to a vault.
     * @param backup - The backup blob associated with a key bundle.
     * @param options - The optional parameters.
     */
    async restoreKeyBackup(backup, options = {}) {
        return tracingClient.withSpan(`KeyClient.restoreKeyBackup`, options, async (updatedOptions) => {
            const response = await this.client.restoreKey({ keyBundleBackup: backup }, updatedOptions);
            return getKeyFromKeyBundle(response);
        });
    }
    /**
     * Gets the requested number of bytes containing random values from a managed HSM.
     * This operation requires the managedHsm/rng permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleGetRandomBytes
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const bytes = await client.getRandomBytes(10);
     * ```
     * @param count - The number of bytes to generate between 1 and 128 inclusive.
     * @param options - The optional parameters.
     */
    getRandomBytes(count, options = {}) {
        return tracingClient.withSpan("KeyClient.getRandomBytes", options, async (updatedOptions) => {
            const response = await this.client.getRandomBytes({ count }, updatedOptions);
            return response.value;
        });
    }
    /**
     * Rotates the key based on the key policy by generating a new version of the key. This operation requires the keys/rotate permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleKeyRotation
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * // Set the key's automated rotation policy to rotate the key 30 days before expiry.
     * const policy = await client.updateKeyRotationPolicy(keyName, {
     *   lifetimeActions: [
     *     {
     *       action: "Rotate",
     *       timeBeforeExpiry: "P30D",
     *     },
     *   ],
     *   // You may also specify the duration after which any newly rotated key will expire.
     *   // In this case, any new key versions will expire after 90 days.
     *   expiresIn: "P90D",
     * });
     *
     * // You can get the current key rotation policy of a given key by calling the getKeyRotationPolicy method.
     * const currentPolicy = await client.getKeyRotationPolicy(keyName);
     *
     * // Finally, you can rotate a key on-demand by creating a new version of the given key.
     * const rotatedKey = await client.rotateKey(keyName);
     * ```
     *
     * @param name - The name of the key to rotate.
     * @param options - The optional parameters.
     */
    rotateKey(name, options = {}) {
        return tracingClient.withSpan("KeyClient.rotateKey", options, async (updatedOptions) => {
            const key = await this.client.rotateKey(name, updatedOptions);
            return getKeyFromKeyBundle(key);
        });
    }
    /**
     * Releases a key from a managed HSM.
     *
     * The release key operation is applicable to all key types. The operation requires the key to be marked exportable and the keys/release permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleReleaseKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const result = await client.releaseKey("myKey", "<attestation-target>");
     * ```
     *
     * @param name - The name of the key.
     * @param targetAttestationToken - The attestation assertion for the target of the key release.
     * @param options - The optional parameters.
     */
    releaseKey(name, targetAttestationToken, options = {}) {
        return tracingClient.withSpan("KeyClient.releaseKey", options, async (updatedOptions) => {
            const { nonce, algorithm } = updatedOptions, rest = __rest(updatedOptions, ["nonce", "algorithm"]);
            const result = await this.client.release(name, (options === null || options === void 0 ? void 0 : options.version) || "", {
                targetAttestationToken,
                enc: algorithm,
                nonce,
            }, rest);
            return { value: result.value };
        });
    }
    /**
     * Gets the rotation policy of a Key Vault Key.
     * By default, all keys have a policy that will notify 30 days before expiry.
     *
     * This operation requires the keys/get permission.
     * Example usage:
     * ```ts snippet:ReadmeSampleGetKeyRotationPolicy
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const result = await client.getKeyRotationPolicy(keyName);
     * ```
     *
     * @param keyName - The name of the key.
     * @param options - The optional parameters.
     */
    getKeyRotationPolicy(keyName, options = {}) {
        return tracingClient.withSpan("KeyClient.getKeyRotationPolicy", options, async () => {
            const policy = await this.client.getKeyRotationPolicy(keyName);
            return keyRotationTransformations.generatedToPublic(policy);
        });
    }
    /**
     * Updates the rotation policy of a Key Vault Key.
     * This operation requires the keys/update permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleUpdateKeyRotationPolicy
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * const myPolicy = await client.getKeyRotationPolicy(keyName);
     *
     * const setPolicy = await client.updateKeyRotationPolicy(keyName, myPolicy);
     * ```
     *
     * @param keyName - The name of the key.
     * @param policyProperties - The {@link KeyRotationPolicyProperties} for the policy.
     * @param options - The optional parameters.
     */
    updateKeyRotationPolicy(keyName, policy, options = {}) {
        return tracingClient.withSpan("KeyClient.updateKeyRotationPolicy", options, async (updatedOptions) => {
            const result = await this.client.updateKeyRotationPolicy(keyName, keyRotationTransformations.propertiesToGenerated(policy), updatedOptions);
            return keyRotationTransformations.generatedToPublic(result);
        });
    }
    /**
     * Iterates all versions of the given key in the vault. The full key identifier, properties, and tags are provided
     * in the response. This operation requires the keys/list permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleListKeys
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * for await (const keyProperties of client.listPropertiesOfKeys()) {
     *   console.log("Key properties: ", keyProperties);
     * }
     *
     * for await (const deletedKey of client.listDeletedKeys()) {
     *   console.log("Deleted: ", deletedKey);
     * }
     *
     * for await (const versionProperties of client.listPropertiesOfKeyVersions(keyName)) {
     *   console.log("Version properties: ", versionProperties);
     * }
     * ```
     * @param name - Name of the key to fetch versions for
     * @param options - The optional parameters.
     */
    listPropertiesOfKeyVersions(name, options = {}) {
        return mapPagedAsyncIterable(options, (mappedOptions) => this.client.getKeyVersions(name, mappedOptions), getKeyPropertiesFromKeyItem);
    }
    /**
     * Iterates the latest version of all keys in the vault.  The full key identifier and properties are provided
     * in the response. No values are returned for the keys. This operations requires the keys/list permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleListKeys
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * for await (const keyProperties of client.listPropertiesOfKeys()) {
     *   console.log("Key properties: ", keyProperties);
     * }
     *
     * for await (const deletedKey of client.listDeletedKeys()) {
     *   console.log("Deleted: ", deletedKey);
     * }
     *
     * for await (const versionProperties of client.listPropertiesOfKeyVersions(keyName)) {
     *   console.log("Version properties: ", versionProperties);
     * }
     * ```
     * List all keys in the vault
     * @param options - The optional parameters.
     */
    listPropertiesOfKeys(options = {}) {
        return mapPagedAsyncIterable(options, this.client.getKeys.bind(this.client), getKeyPropertiesFromKeyItem);
    }
    /**
     * Iterates the deleted keys in the vault.  The full key identifier and properties are provided
     * in the response. No values are returned for the keys. This operations requires the keys/list permission.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleListKeys
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const keyName = "MyKeyName";
     *
     * for await (const keyProperties of client.listPropertiesOfKeys()) {
     *   console.log("Key properties: ", keyProperties);
     * }
     *
     * for await (const deletedKey of client.listDeletedKeys()) {
     *   console.log("Deleted: ", deletedKey);
     * }
     *
     * for await (const versionProperties of client.listPropertiesOfKeyVersions(keyName)) {
     *   console.log("Version properties: ", versionProperties);
     * }
     * ```
     * List all keys in the vault
     * @param options - The optional parameters.
     */
    listDeletedKeys(options = {}) {
        return mapPagedAsyncIterable(options, this.client.getDeletedKeys.bind(this.client), getDeletedKeyFromDeletedKeyItem);
    }
}
//# sourceMappingURL=index.js.map