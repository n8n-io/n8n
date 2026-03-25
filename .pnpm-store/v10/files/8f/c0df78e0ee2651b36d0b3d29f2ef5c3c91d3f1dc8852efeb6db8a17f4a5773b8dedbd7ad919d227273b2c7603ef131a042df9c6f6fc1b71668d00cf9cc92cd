/// <reference lib="esnext.asynciterable" />

import { AzureLogger } from '@azure/logger';
import * as coreClient from '@azure/core-client';
import { ExtendedCommonClientOptions } from '@azure/core-http-compat';
import { PagedAsyncIterableIterator } from '@azure/core-paging';
import { PageSettings } from '@azure/core-paging';
import { PollerLike } from '@azure/core-lro';
import { PollOperationState } from '@azure/core-lro';
import { TokenCredential } from '@azure/core-auth';

/**
 * Options for {@link backupSecretOptions}.
 */
export declare interface BackupSecretOptions extends coreClient.OperationOptions {
}

/**
 * An interface representing the optional parameters that can be
 * passed to {@link beginDeleteSecret}
 */
export declare interface BeginDeleteSecretOptions extends SecretPollerOptions {
}

/**
 * An interface representing the optional parameters that can be
 * passed to {@link beginRecoverDeletedSecret}
 */
export declare interface BeginRecoverDeletedSecretOptions extends SecretPollerOptions {
}

/**
 * An interface representing a deleted KeyVault Secret.
 */
export declare interface DeletedSecret {
    /**
     * The properties of the secret
     */
    properties: SecretProperties & {
        /**
         * The url of the recovery object, used to
         * identify and recover the deleted secret.
         * @deprecated Please use {@link DeletedSecret.recoveryId}.
         */
        recoveryId?: string;
        /**
         * The time when the secret is scheduled
         * to be purged, in UTC
         * **NOTE: This property will not be serialized. It can only be populated by
         * the server.**
         * @deprecated Please use {@link DeletedSecret.scheduledPurgeDate}.
         */
        scheduledPurgeDate?: Date;
        /**
         * The time when the secret was deleted, in UTC
         * **NOTE: This property will not be serialized. It can only be populated by
         * the server.**
         * @deprecated Please use {@link DeletedSecret.deletedOn}.
         */
        deletedOn?: Date;
    };
    /**
     * The secret value.
     */
    value?: string;
    /**
     * The name of the secret.
     */
    name: string;
    /**
     * The url of the recovery object, used to
     * identify and recover the deleted secret.
     */
    recoveryId?: string;
    /**
     * The time when the secret is scheduled
     * to be purged, in UTC
     * **NOTE: This property will not be serialized. It can only be populated by
     * the server.**
     */
    scheduledPurgeDate?: Date;
    /**
     * The time when the secret was deleted, in UTC
     * **NOTE: This property will not be serialized. It can only be populated by
     * the server.**
     */
    deletedOn?: Date;
}

/**
 * Defines values for DeletionRecoveryLevel. \
 * {@link KnownDeletionRecoveryLevel} can be used interchangeably with DeletionRecoveryLevel,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **Purgeable**: Denotes a vault state in which deletion is an irreversible operation, without the possibility for recovery. This level corresponds to no protection being available against a Delete operation; the data is irretrievably lost upon accepting a Delete operation at the entity level or higher (vault, resource group, subscription etc.) \
 * **Recoverable+Purgeable**: Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval (90 days), unless a Purge operation is requested, or the subscription is cancelled. System wil permanently delete it after 90 days, if not recovered \
 * **Recoverable**: Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval(90 days) and while the subscription is still available. System wil permanently delete it after 90 days, if not recovered \
 * **Recoverable+ProtectedSubscription**: Denotes a vault and subscription state in which deletion is recoverable within retention interval (90 days), immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself  cannot be permanently canceled. System wil permanently delete it after 90 days, if not recovered \
 * **CustomizedRecoverable+Purgeable**: Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge when 7<= SoftDeleteRetentionInDays < 90). This level guarantees the recoverability of the deleted entity during the retention interval, unless a Purge operation is requested, or the subscription is cancelled. \
 * **CustomizedRecoverable**: Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge when 7<= SoftDeleteRetentionInDays < 90).This level guarantees the recoverability of the deleted entity during the retention interval and while the subscription is still available. \
 * **CustomizedRecoverable+ProtectedSubscription**: Denotes a vault and subscription state in which deletion is recoverable, immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself cannot be permanently canceled when 7<= SoftDeleteRetentionInDays < 90. This level guarantees the recoverability of the deleted entity during the retention interval, and also reflects the fact that the subscription itself cannot be cancelled.
 */
export declare type DeletionRecoveryLevel = string;

/**
 * Options for {@link getDeletedSecret}.
 */
export declare interface GetDeletedSecretOptions extends coreClient.OperationOptions {
}

/**
 * Options for {@link getSecret}.
 */
export declare interface GetSecretOptions extends coreClient.OperationOptions {
    /**
     * The version of the secret to retrieve. If not
     * specified the latest version of the secret will be retrieved.
     */
    version?: string;
}

/**
 * An interface representing a KeyVault Secret, with its name, value and {@link SecretProperties}.
 */
export declare interface KeyVaultSecret {
    /**
     * The properties of the secret.
     */
    properties: SecretProperties;
    /**
     * The value of the secret.
     */
    value?: string;
    /**
     * The name of the secret.
     */
    name: string;
}

/**
 * Represents the segments that compose a Key Vault Secret Id.
 */
export declare interface KeyVaultSecretIdentifier {
    /**
     * The complete representation of the Key Vault Secret Id. For example:
     *
     *   https://<keyvault-name>.vault.azure.net/secrets/<secret-name>/<unique-version-id>
     *
     */
    sourceId: string;
    /**
     * The URL of the Azure Key Vault instance to which the Secret belongs.
     */
    vaultUrl: string;
    /**
     * The version of Key Vault Secret. Might be undefined.
     */
    version?: string;
    /**
     * The name of the Key Vault Secret.
     */
    name: string;
}

/** Known values of {@link DeletionRecoveryLevel} that the service accepts. */
export declare enum KnownDeletionRecoveryLevel {
    /** Denotes a vault state in which deletion is an irreversible operation, without the possibility for recovery. This level corresponds to no protection being available against a Delete operation; the data is irretrievably lost upon accepting a Delete operation at the entity level or higher (vault, resource group, subscription etc.) */
    Purgeable = "Purgeable",
    /** Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval (90 days), unless a Purge operation is requested, or the subscription is cancelled. System wil permanently delete it after 90 days, if not recovered */
    RecoverablePurgeable = "Recoverable+Purgeable",
    /** Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval(90 days) and while the subscription is still available. System wil permanently delete it after 90 days, if not recovered */
    Recoverable = "Recoverable",
    /** Denotes a vault and subscription state in which deletion is recoverable within retention interval (90 days), immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself  cannot be permanently canceled. System wil permanently delete it after 90 days, if not recovered */
    RecoverableProtectedSubscription = "Recoverable+ProtectedSubscription",
    /** Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge when 7<= SoftDeleteRetentionInDays < 90). This level guarantees the recoverability of the deleted entity during the retention interval, unless a Purge operation is requested, or the subscription is cancelled. */
    CustomizedRecoverablePurgeable = "CustomizedRecoverable+Purgeable",
    /** Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge when 7<= SoftDeleteRetentionInDays < 90).This level guarantees the recoverability of the deleted entity during the retention interval and while the subscription is still available. */
    CustomizedRecoverable = "CustomizedRecoverable",
    /** Denotes a vault and subscription state in which deletion is recoverable, immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself cannot be permanently canceled when 7<= SoftDeleteRetentionInDays < 90. This level guarantees the recoverability of the deleted entity during the retention interval, and also reflects the fact that the subscription itself cannot be cancelled. */
    CustomizedRecoverableProtectedSubscription = "CustomizedRecoverable+ProtectedSubscription"
}

/**
 * Options for {@link listDeletedSecrets}.
 */
export declare interface ListDeletedSecretsOptions extends coreClient.OperationOptions {
}

/**
 * Options for {@link listPropertiesOfSecrets}.
 */
export declare interface ListPropertiesOfSecretsOptions extends coreClient.OperationOptions {
}

/**
 * Options for {@link listPropertiesOfSecretVersions}.
 */
export declare interface ListPropertiesOfSecretVersionsOptions extends coreClient.OperationOptions {
}

/**
 * The \@azure/logger configuration for this package.
 */
export declare const logger: AzureLogger;

export { PagedAsyncIterableIterator }

export { PageSettings }

/**
 * Parses the given Key Vault Secret Id. An example is:
 *
 *   https://<keyvault-name>.vault.azure.net/secrets/<secret-name>/<unique-version-id>
 *
 * On parsing the above Id, this function returns:
 *```ts
 *   {
 *      sourceId: "https://<keyvault-name>.vault.azure.net/secrets/<secret-name>/<unique-version-id>",
 *      vaultUrl: "https://<keyvault-name>.vault.azure.net",
 *      version: "<unique-version-id>",
 *      name: "<secret-name>"
 *   }
 *```
 * @param id - The Id of the Key Vault Secret.
 */
export declare function parseKeyVaultSecretIdentifier(id: string): KeyVaultSecretIdentifier;

export { PollerLike }

export { PollOperationState }

/**
 * Options for {@link purgeDeletedSecret}.
 */
export declare interface PurgeDeletedSecretOptions extends coreClient.OperationOptions {
}

/**
 * Options for {@link restoreSecretBackup}.
 */
export declare interface RestoreSecretBackupOptions extends coreClient.OperationOptions {
}

/**
 * The SecretClient provides methods to manage {@link KeyVaultSecret} in
 * the Azure Key Vault. The client supports creating, retrieving, updating,
 * deleting, purging, backing up, restoring and listing KeyVaultSecrets. The
 * client also supports listing {@link DeletedSecret} for a soft-delete enabled Azure
 * Key Vault.
 */
export declare class SecretClient {
    /**
     * The base URL to the vault
     */
    readonly vaultUrl: string;
    /**
     * A reference to the auto-generated KeyVault HTTP client.
     */
    private readonly client;
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
    constructor(vaultUrl: string, credential: TokenCredential, pipelineOptions?: SecretClientOptions);
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
    setSecret(secretName: string, value: string, options?: SetSecretOptions): Promise<KeyVaultSecret>;
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
    beginDeleteSecret(name: string, options?: BeginDeleteSecretOptions): Promise<PollerLike<PollOperationState<DeletedSecret>, DeletedSecret>>;
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
    updateSecretProperties(secretName: string, secretVersion: string, options?: UpdateSecretPropertiesOptions): Promise<SecretProperties>;
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
    getSecret(secretName: string, options?: GetSecretOptions): Promise<KeyVaultSecret>;
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
    getDeletedSecret(secretName: string, options?: GetDeletedSecretOptions): Promise<DeletedSecret>;
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
    purgeDeletedSecret(secretName: string, options?: PurgeDeletedSecretOptions): Promise<void>;
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
    beginRecoverDeletedSecret(name: string, options?: BeginRecoverDeletedSecretOptions): Promise<PollerLike<PollOperationState<SecretProperties>, SecretProperties>>;
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
    backupSecret(secretName: string, options?: BackupSecretOptions): Promise<Uint8Array | undefined>;
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
    restoreSecretBackup(secretBundleBackup: Uint8Array, options?: RestoreSecretBackupOptions): Promise<SecretProperties>;
    /**
     * Deals with the pagination of {@link listPropertiesOfSecretVersions}.
     * @param name - The name of the KeyVault Secret.
     * @param continuationState - An object that indicates the position of the paginated request.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    private listPropertiesOfSecretVersionsPage;
    /**
     * Deals with the iteration of all the available results of {@link listPropertiesOfSecretVersions}.
     * @param name - The name of the KeyVault Secret.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    private listPropertiesOfSecretVersionsAll;
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
    listPropertiesOfSecretVersions(secretName: string, options?: ListPropertiesOfSecretVersionsOptions): PagedAsyncIterableIterator<SecretProperties>;
    /**
     * Deals with the pagination of {@link listPropertiesOfSecrets}.
     * @param continuationState - An object that indicates the position of the paginated request.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    private listPropertiesOfSecretsPage;
    /**
     * Deals with the iteration of all the available results of {@link listPropertiesOfSecrets}.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    private listPropertiesOfSecretsAll;
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
    listPropertiesOfSecrets(options?: ListPropertiesOfSecretsOptions): PagedAsyncIterableIterator<SecretProperties>;
    /**
     * Deals with the pagination of {@link listDeletedSecrets}.
     * @param continuationState - An object that indicates the position of the paginated request.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    private listDeletedSecretsPage;
    /**
     * Deals with the iteration of all the available results of {@link listDeletedSecrets}.
     * @param options - Optional parameters for the underlying HTTP request.
     */
    private listDeletedSecretsAll;
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
    listDeletedSecrets(options?: ListDeletedSecretsOptions): PagedAsyncIterableIterator<DeletedSecret>;
}

/**
 * The optional parameters accepted by the KeyVault's KeyClient
 */
export declare interface SecretClientOptions extends ExtendedCommonClientOptions {
    /**
     * The accepted versions of the KeyVault's service API.
     */
    serviceVersion?: "7.0" | "7.1" | "7.2" | "7.3" | "7.4" | "7.5";
    /**
     * Whether to disable verification that the authentication challenge resource matches the Key Vault domain.
     * Defaults to false.
     */
    disableChallengeResourceVerification?: boolean;
}

/**
 * An interface representing the optional parameters that can be
 * passed to {@link beginDeleteSecret} and {@link beginRecoverDeletedKey}.
 */
export declare interface SecretPollerOptions extends coreClient.OperationOptions {
    /**
     * Time between each polling in milliseconds.
     */
    intervalInMs?: number;
    /**
     * A serialized poller, used to resume an existing operation
     */
    resumeFrom?: string;
}

/**
 * An interface representing the properties of a {@link KeyVaultSecret}.
 */
export declare interface SecretProperties {
    /**
     * The base URL to the vault.
     */
    vaultUrl: string;
    /**
     * The version of the secret. May be undefined.
     */
    version?: string;
    /**
     * The name of the secret.
     */
    name: string;
    /**
     * The secret id.
     */
    id?: string;
    /**
     * The content type of the secret.
     */
    contentType?: string;
    /**
     * Determines whether the object is enabled.
     */
    enabled?: boolean;
    /**
     * Not before date in UTC.
     */
    readonly notBefore?: Date;
    /**
     * Expiry date in UTC.
     */
    readonly expiresOn?: Date;
    /**
     * Application specific
     * metadata in the form of key-value pairs.
     */
    tags?: {
        [propertyName: string]: string;
    };
    /**
     * If this is a secret backing a KV certificate, then
     * this field specifies the corresponding key backing the KV certificate.
     * **NOTE: This property will not be serialized. It can only be populated by
     * the server.**
     * @deprecated Please use {@link SecretProperties.certificateKeyId} instead. `keyId` will always be undefined.
     */
    readonly keyId?: never;
    /**
     * If this is a secret backing a KV certificate, then
     * this field specifies the identifier of the corresponding key backing the KV certificate.
     * **NOTE: This property will not be serialized. It can only be populated by
     * the server.**
     */
    readonly certificateKeyId?: string;
    /**
     * True if the secret's lifetime is managed by
     * key vault. If this is a secret backing a certificate, then managed will be
     * true.
     * **NOTE: This property will not be serialized. It can only be populated by
     * the server.**
     */
    readonly managed?: boolean;
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
     * Reflects the deletion
     * recovery level currently in effect for keys in the current vault. If it
     * contains 'Purgeable' the key can be permanently deleted by a privileged
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
}

/**
 * Options for {@link setSecret}.
 */
export declare interface SetSecretOptions extends coreClient.OperationOptions {
    /**
     * Application specific metadata in the form of key-value pairs.
     */
    tags?: {
        [propertyName: string]: string;
    };
    /**
     * Type of the secret value such as a password.
     */
    contentType?: string;
    /**
     * Determines whether the object is enabled.
     */
    enabled?: boolean;
    /**
     * Not before date in UTC.
     */
    readonly notBefore?: Date;
    /**
     * Expiry date in UTC.
     */
    readonly expiresOn?: Date;
}

/**
 * Options for {@link updateSecretProperties}.
 */
export declare interface UpdateSecretPropertiesOptions extends coreClient.OperationOptions {
    /**
     * Type of the secret value such as a password.
     */
    contentType?: string;
    /**
     * Determines whether the object is enabled.
     */
    enabled?: boolean;
    /**
     * Not before date in UTC.
     */
    readonly notBefore?: Date;
    /**
     * Expiry date in UTC.
     */
    readonly expiresOn?: Date;
    /**
     * Application specific metadata in the form of key-value pairs.
     */
    tags?: {
        [propertyName: string]: string;
    };
}

export { }
