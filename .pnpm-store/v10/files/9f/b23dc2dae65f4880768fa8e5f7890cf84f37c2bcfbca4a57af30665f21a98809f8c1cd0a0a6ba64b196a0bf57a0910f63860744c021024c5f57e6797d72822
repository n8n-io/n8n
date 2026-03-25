// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/// <reference lib="esnext.asynciterable" />
import { __asyncGenerator, __asyncValues, __await, __rest } from "tslib";
import { bearerTokenAuthenticationPolicy } from "@azure/core-rest-pipeline";
import { logger } from "./log";
import { KnownDeletionRecoveryLevel, } from "./generated/models";
import { KeyVaultClient } from "./generated/keyVaultClient";
import { createKeyVaultChallengeCallbacks } from "../../keyvault-common/src";
import { DeleteSecretPoller } from "./lro/delete/poller";
import { RecoverDeletedSecretPoller } from "./lro/recover/poller";
import { LATEST_API_VERSION, } from "./secretsModels";
import { parseKeyVaultSecretIdentifier } from "./identifier";
import { getSecretFromSecretBundle } from "./transformations";
import { tracingClient } from "./tracing";
export { KnownDeletionRecoveryLevel, parseKeyVaultSecretIdentifier, logger, };
/**
 * The SecretClient provides methods to manage {@link KeyVaultSecret} in
 * the Azure Key Vault. The client supports creating, retrieving, updating,
 * deleting, purging, backing up, restoring and listing KeyVaultSecrets. The
 * client also supports listing {@link DeletedSecret} for a soft-delete enabled Azure
 * Key Vault.
 */
export class SecretClient {
    /**
     * Creates an instance of SecretClient.
     *
     * Example usage:
     * ```ts
     * import { SecretClient } from "@azure/keyvault-secrets";
     * import { DefaultAzureCredential } from "@azure/identity";
     *
     * let vaultUrl = `https://<MY KEYVAULT HERE>.vault.azure.net`;
     * let credentials = new DefaultAzureCredential();
     *
     * let client = new SecretClient(vaultUrl, credentials);
     * ```
     * @param vaultUrl - The base URL to the vault. You should validate that this URL references a valid Key Vault resource. See https://aka.ms/azsdk/blog/vault-uri for details.
     * @param credential - An object that implements the `TokenCredential` interface used to authenticate requests to the service. Use the \@azure/identity package to create a credential that suits your needs.
     * @param pipelineOptions - Pipeline options used to configure Key Vault API requests.
     *                          Omit this parameter to use the default pipeline configuration.
     */
    constructor(vaultUrl, credential, pipelineOptions = {}) {
        this.vaultUrl = vaultUrl;
        const authPolicy = bearerTokenAuthenticationPolicy({
            credential,
            scopes: [],
            challengeCallbacks: createKeyVaultChallengeCallbacks(pipelineOptions),
        });
        const internalPipelineOptions = Object.assign(Object.assign({}, pipelineOptions), { loggingOptions: {
                logger: logger.info,
                allowedHeaderNames: [
                    "x-ms-keyvault-region",
                    "x-ms-keyvault-network-info",
                    "x-ms-keyvault-service-version",
                ],
            } });
        this.client = new KeyVaultClient(pipelineOptions.serviceVersion || LATEST_API_VERSION, internalPipelineOptions);
        this.client.pipeline.addPolicy(authPolicy);
    }
    /**
     * The setSecret method adds a secret or secret version to the Azure Key Vault. If the named secret
     * already exists, Azure Key Vault creates a new version of that secret.
     * This operation requires the secrets/set permission.
     *
     * Example usage:
     * ```ts
     * let client = new SecretClient(url, credentials);
     * await client.setSecret("MySecretName", "ABC123");
     * ```
     * Adds a secret in a specified key vault.
     * @param secretName - The name of the secret.
     * @param value - The value of the secret.
     * @param options - The optional parameters.
     */
    setSecret(secretName, value, options = {}) {
        let unflattenedOptions = {};
        if (options) {
            const { enabled, notBefore, expiresOn: expires } = options, remainingOptions = __rest(options, ["enabled", "notBefore", "expiresOn"]);
            unflattenedOptions = Object.assign(Object.assign({}, remainingOptions), { secretAttributes: {
                    enabled,
                    notBefore,
                    expires,
                } });
        }
        return tracingClient.withSpan("SecretClient.setSecret", unflattenedOptions, async (updatedOptions) => {
            const response = await this.client.setSecret(this.vaultUrl, secretName, value, updatedOptions);
            return getSecretFromSecretBundle(response);
        });
    }
    /**
     * Deletes a secret stored in Azure Key Vault.
     * This function returns a Long Running Operation poller that allows you to wait indefinitely until the secret is deleted.
     *
     * This operation requires the secrets/delete permission.
     *
     * Example usage:
     * ```ts
     * const client = new SecretClient(url, credentials);
     * await client.setSecret("MySecretName", "ABC123");
     *
     * const deletePoller = await client.beginDeleteSecret("MySecretName");
     *
     * // Serializing the poller
     * const serialized = deletePoller.toString();
     *
     * // A new poller can be created with:
     * // const newPoller = await client.beginDeleteSecret("MySecretName", { resumeFrom: serialized });
     *
     * // Waiting until it's done
     * const deletedSecret = await deletePoller.pollUntilDone();
     * console.log(deletedSecret);
     * ```
     * Deletes a secret from a specified key vault.
     * @param secretName - The name of the secret.
     * @param options - The optional parameters.
     */
    async beginDeleteSecret(name, options = {}) {
        const poller = new DeleteSecretPoller(Object.assign(Object.assign({ name, client: this.client, vaultUrl: this.vaultUrl }, options), { operationOptions: options }));
        // This will initialize the poller's operation (the deletion of the secret).
        await poller.poll();
        return poller;
    }
    /**
     * The updateSecret method changes specified attributes of an existing stored secret. Properties that
     * are not specified in the request are left unchanged. The value of a secret itself cannot be
     * changed. This operation requires the secrets/set permission.
     *
     * Example usage:
     * ```ts
     * let secretName = "MySecretName";
     * let client = new SecretClient(url, credentials);
     * let secret = await client.getSecret(secretName);
     * await client.updateSecretProperties(secretName, secret.properties.version, { enabled: false });
     * ```
     * Updates the attributes associated with a specified secret in a given key vault.
     * @param secretName - The name of the secret.
     * @param secretVersion - The version of the secret.
     * @param options - The optional parameters.
     */
    async updateSecretProperties(secretName, secretVersion, options = {}) {
        let unflattenedOptions = {};
        if (options) {
            const { enabled, notBefore, expiresOn: expires } = options, remainingOptions = __rest(options, ["enabled", "notBefore", "expiresOn"]);
            unflattenedOptions = Object.assign(Object.assign({}, remainingOptions), { secretAttributes: {
                    enabled,
                    notBefore,
                    expires,
                } });
        }
        return tracingClient.withSpan("SecretClient.updateSecretProperties", unflattenedOptions, async (updatedOptions) => {
            const response = await this.client.updateSecret(this.vaultUrl, secretName, secretVersion, updatedOptions);
            return getSecretFromSecretBundle(response).properties;
        });
    }
    /**
     * The getSecret method is applicable to any secret stored in Azure Key Vault. This operation requires
     * the secrets/get permission.
     *
     * Example usage:
     * ```ts
     * let client = new SecretClient(url, credentials);
     * let secret = await client.getSecret("MySecretName");
     * ```
     * Get a specified secret from a given key vault.
     * @param secretName - The name of the secret.
     * @param options - The optional parameters.
     */
    getSecret(secretName, options = {}) {
        return tracingClient.withSpan("SecretClient.getSecret", options, async (updatedOptions) => {
            const response = await this.client.getSecret(this.vaultUrl, secretName, options && options.version ? options.version : "", updatedOptions);
            return getSecretFromSecretBundle(response);
        });
    }
    /**
     * The getDeletedSecret method returns the specified deleted secret along with its attributes.
     * This operation requires the secrets/get permission.
     *
     * Example usage:
     * ```ts
     * let client = new SecretClient(url, credentials);
     * await client.getDeletedSecret("MyDeletedSecret");
     * ```
     * Gets the specified deleted secret.
     * @param secretName - The name of the secret.
     * @param options - The optional parameters.
     */
    getDeletedSecret(secretName, options = {}) {
        return tracingClient.withSpan("SecretClient.getDeletedSecret", options, async (updatedOptions) => {
            const response = await this.client.getDeletedSecret(this.vaultUrl, secretName, updatedOptions);
            return getSecretFromSecretBundle(response);
        });
    }
    /**
     * The purge deleted secret operation removes the secret permanently, without the possibility of
     * recovery. This operation can only be enabled on a soft-delete enabled vault. This operation
     * requires the secrets/purge permission.
     *
     * Example usage:
     * ```ts
     * const client = new SecretClient(url, credentials);
     * const deletePoller = await client.beginDeleteSecret("MySecretName");
     * await deletePoller.pollUntilDone();
     * await client.purgeDeletedSecret("MySecretName");
     * ```
     * Permanently deletes the specified secret.
     * @param secretName - The name of the secret.
     * @param options - The optional parameters.
     */
    purgeDeletedSecret(secretName, options = {}) {
        return tracingClient.withSpan("SecretClient.purgeDeletedSecret", options, async (updatedOptions) => {
            await this.client.purgeDeletedSecret(this.vaultUrl, secretName, updatedOptions);
        });
    }
    /**
     * Recovers the deleted secret in the specified vault.
     * This function returns a Long Running Operation poller that allows you to wait indefinitely until the secret is recovered.
     *
     * This operation requires the secrets/recover permission.
     *
     * Example usage:
     * ```ts
     * const client = new SecretClient(url, credentials);
     * await client.setSecret("MySecretName", "ABC123");
     *
     * const deletePoller = await client.beginDeleteSecret("MySecretName");
     * await deletePoller.pollUntilDone();
     *
     * const recoverPoller = await client.beginRecoverDeletedSecret("MySecretName");
     *
     * // Serializing the poller
     * const serialized = recoverPoller.toString();
     *
     * // A new poller can be created with:
     * // const newPoller = await client.beginRecoverDeletedSecret("MySecretName", { resumeFrom: serialized });
     *
     * // Waiting until it's done
     * const deletedSecret = await recoverPoller.pollUntilDone();
     * console.log(deletedSecret);
     * ```
     * Recovers the deleted secret to the latest version.
     * @param secretName - The name of the deleted secret.
     * @param options - The optional parameters.
     */
    async beginRecoverDeletedSecret(name, options = {}) {
        const poller = new RecoverDeletedSecretPoller(Object.assign(Object.assign({ name, client: this.client, vaultUrl: this.vaultUrl }, options), { operationOptions: options }));
        // This will initialize the poller's operation (the recovery of the deleted secret).
        await poller.poll();
        return poller;
    }
    /**
     * Requests that a backup of the specified secret be downloaded to the client. All versions of the
     * secret will be downloaded. This operation requires the secrets/backup permission.
     *
     * Example usage:
     * ```ts
     * let client = new SecretClient(url, credentials);
     * let backupResult = await client.backupSecret("MySecretName");
     * ```
     * Backs up the specified secret.
     * @param secretName - The name of the secret.
     * @param options - The optional parameters.
     */
    backupSecret(secretName, options = {}) {
        return tracingClient.withSpan("SecretClient.backupSecret", options, async (updatedOptions) => {
            const response = await this.client.backupSecret(this.vaultUrl, secretName, updatedOptions);
            return response.value;
        });
    }
    /**
     * Restores a backed up secret, and all its versions, to a vault. This operation requires the
     * secrets/restore permission.
     *
     * Example usage:
     * ```ts
     * let client = new SecretClient(url, credentials);
     * let mySecretBundle = await client.backupSecret("MySecretName");
     * // ...
     * await client.restoreSecretBackup(mySecretBundle);
     * ```
     * Restores a backed up secret to a vault.
     * @param secretBundleBackup - The backup blob associated with a secret bundle.
     * @param options - The optional parameters.
     */
    restoreSecretBackup(secretBundleBackup, options = {}) {
        return tracingClient.withSpan("SecretClient.restoreSecretBackup", options, async (updatedOptions) => {
            const response = await this.client.restoreSecret(this.vaultUrl, secretBundleBackup, updatedOptions);
            return getSecretFromSecretBundle(response).properties;
        });
    }
    /**
     * Deals with the pagination of {@link listPropertiesOfSecretVersions}.
     * @param name - The name of the KeyVault Secret.
     * @param continuationState - An object that indicates the position of the paginated request.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    listPropertiesOfSecretVersionsPage(secretName, continuationState, options = {}) {
        return __asyncGenerator(this, arguments, function* listPropertiesOfSecretVersionsPage_1() {
            if (continuationState.continuationToken == null) {
                const optionsComplete = Object.assign({ maxresults: continuationState.maxPageSize }, options);
                const currentSetResponse = yield __await(tracingClient.withSpan("SecretClient.listPropertiesOfSecretVersionsPage", optionsComplete, (updatedOptions) => this.client.getSecretVersions(this.vaultUrl, secretName, updatedOptions)));
                continuationState.continuationToken = currentSetResponse.nextLink;
                if (currentSetResponse.value) {
                    yield yield __await(currentSetResponse.value.map((bundle) => getSecretFromSecretBundle(bundle).properties));
                }
            }
            while (continuationState.continuationToken) {
                const currentSetResponse = yield __await(tracingClient.withSpan("SecretClient.listPropertiesOfSecretVersionsPage", options, (updatedOptions) => this.client.getSecretVersionsNext(this.vaultUrl, secretName, continuationState.continuationToken, updatedOptions)));
                continuationState.continuationToken = currentSetResponse.nextLink;
                if (currentSetResponse.value) {
                    yield yield __await(currentSetResponse.value.map((bundle) => getSecretFromSecretBundle(bundle).properties));
                }
                else {
                    break;
                }
            }
        });
    }
    /**
     * Deals with the iteration of all the available results of {@link listPropertiesOfSecretVersions}.
     * @param name - The name of the KeyVault Secret.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    listPropertiesOfSecretVersionsAll(secretName, options = {}) {
        return __asyncGenerator(this, arguments, function* listPropertiesOfSecretVersionsAll_1() {
            var _a, e_1, _b, _c;
            const f = {};
            try {
                for (var _d = true, _e = __asyncValues(this.listPropertiesOfSecretVersionsPage(secretName, f, options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const page = _c;
                    for (const item of page) {
                        yield yield __await(item);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    }
    /**
     * Iterates all versions of the given secret in the vault. The full secret identifier and attributes are provided
     * in the response. No values are returned for the secrets. This operations requires the secrets/list permission.
     *
     * Example usage:
     * ```ts
     * let client = new SecretClient(url, credentials);
     * for await (const secretProperties of client.listPropertiesOfSecretVersions("MySecretName")) {
     *   const secret = await client.getSecret(secretProperties.name);
     *   console.log("secret version: ", secret);
     * }
     * ```
     * @param secretName - Name of the secret to fetch versions for.
     * @param options - The optional parameters.
     */
    listPropertiesOfSecretVersions(secretName, options = {}) {
        const iter = this.listPropertiesOfSecretVersionsAll(secretName, options);
        return {
            next() {
                return iter.next();
            },
            [Symbol.asyncIterator]() {
                return this;
            },
            byPage: (settings = {}) => this.listPropertiesOfSecretVersionsPage(secretName, settings, options),
        };
    }
    /**
     * Deals with the pagination of {@link listPropertiesOfSecrets}.
     * @param continuationState - An object that indicates the position of the paginated request.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    listPropertiesOfSecretsPage(continuationState, options = {}) {
        return __asyncGenerator(this, arguments, function* listPropertiesOfSecretsPage_1() {
            if (continuationState.continuationToken == null) {
                const optionsComplete = Object.assign({ maxresults: continuationState.maxPageSize }, options);
                const currentSetResponse = yield __await(tracingClient.withSpan("SecretClient.listPropertiesOfSecretsPage", optionsComplete, (updatedOptions) => this.client.getSecrets(this.vaultUrl, updatedOptions)));
                continuationState.continuationToken = currentSetResponse.nextLink;
                if (currentSetResponse.value) {
                    yield yield __await(currentSetResponse.value.map((bundle) => getSecretFromSecretBundle(bundle).properties));
                }
            }
            while (continuationState.continuationToken) {
                const currentSetResponse = yield __await(tracingClient.withSpan("SecretClient.listPropertiesOfSecretsPage", options, (updatedOptions) => this.client.getSecretsNext(this.vaultUrl, continuationState.continuationToken, updatedOptions)));
                continuationState.continuationToken = currentSetResponse.nextLink;
                if (currentSetResponse.value) {
                    yield yield __await(currentSetResponse.value.map((bundle) => getSecretFromSecretBundle(bundle).properties));
                }
                else {
                    break;
                }
            }
        });
    }
    /**
     * Deals with the iteration of all the available results of {@link listPropertiesOfSecrets}.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    listPropertiesOfSecretsAll(options = {}) {
        return __asyncGenerator(this, arguments, function* listPropertiesOfSecretsAll_1() {
            var _a, e_2, _b, _c;
            const f = {};
            try {
                for (var _d = true, _e = __asyncValues(this.listPropertiesOfSecretsPage(f, options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const page = _c;
                    for (const item of page) {
                        yield yield __await(item);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
    }
    /**
     * Iterates the latest version of all secrets in the vault.  The full secret identifier and attributes are provided
     * in the response. No values are returned for the secrets. This operations requires the secrets/list permission.
     *
     * Example usage:
     * ```ts
     * let client = new SecretClient(url, credentials);
     * for await (const secretProperties of client.listPropertiesOfSecrets()) {
     *   const secret = await client.getSecret(secretProperties.name);
     *   console.log("secret: ", secret);
     * }
     * ```
     * List all secrets in the vault.
     * @param options - The optional parameters.
     */
    listPropertiesOfSecrets(options = {}) {
        const iter = this.listPropertiesOfSecretsAll(options);
        return {
            next() {
                return iter.next();
            },
            [Symbol.asyncIterator]() {
                return this;
            },
            byPage: (settings = {}) => this.listPropertiesOfSecretsPage(settings, options),
        };
    }
    /**
     * Deals with the pagination of {@link listDeletedSecrets}.
     * @param continuationState - An object that indicates the position of the paginated request.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    listDeletedSecretsPage(continuationState, options = {}) {
        return __asyncGenerator(this, arguments, function* listDeletedSecretsPage_1() {
            if (continuationState.continuationToken == null) {
                const optionsComplete = Object.assign({ maxresults: continuationState.maxPageSize }, options);
                const currentSetResponse = yield __await(tracingClient.withSpan("SecretClient.listDeletedSecretsPage", optionsComplete, (updatedOptions) => this.client.getDeletedSecrets(this.vaultUrl, updatedOptions)));
                continuationState.continuationToken = currentSetResponse.nextLink;
                if (currentSetResponse.value) {
                    yield yield __await(currentSetResponse.value.map((bundle) => getSecretFromSecretBundle(bundle)));
                }
            }
            while (continuationState.continuationToken) {
                const currentSetResponse = yield __await(tracingClient.withSpan("SecretClient.lisDeletedSecretsPage", options, (updatedOptions) => this.client.getDeletedSecretsNext(this.vaultUrl, continuationState.continuationToken, updatedOptions)));
                continuationState.continuationToken = currentSetResponse.nextLink;
                if (currentSetResponse.value) {
                    yield yield __await(currentSetResponse.value.map((bundle) => getSecretFromSecretBundle(bundle)));
                }
                else {
                    break;
                }
            }
        });
    }
    /**
     * Deals with the iteration of all the available results of {@link listDeletedSecrets}.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    listDeletedSecretsAll(options = {}) {
        return __asyncGenerator(this, arguments, function* listDeletedSecretsAll_1() {
            var _a, e_3, _b, _c;
            const f = {};
            try {
                for (var _d = true, _e = __asyncValues(this.listDeletedSecretsPage(f, options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const page = _c;
                    for (const item of page) {
                        yield yield __await(item);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_3) throw e_3.error; }
            }
        });
    }
    /**
     * Iterates the deleted secrets in the vault.  The full secret identifier and attributes are provided
     * in the response. No values are returned for the secrets. This operations requires the secrets/list permission.
     *
     * Example usage:
     * ```ts
     * let client = new SecretClient(url, credentials);
     * for await (const deletedSecret of client.listDeletedSecrets()) {
     *   console.log("deleted secret: ", deletedSecret);
     * }
     * ```
     * List all secrets in the vault.
     * @param options - The optional parameters.
     */
    listDeletedSecrets(options = {}) {
        const iter = this.listDeletedSecretsAll(options);
        return {
            next() {
                return iter.next();
            },
            [Symbol.asyncIterator]() {
                return this;
            },
            byPage: (settings = {}) => this.listDeletedSecretsPage(settings, options),
        };
    }
}
//# sourceMappingURL=index.js.map