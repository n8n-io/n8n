import type { TokenCredentialOptions } from "../../tokenCredentialOptions.js";
/**
 * Options to send on the {@link ManagedIdentityCredential} constructor.
 * This variation supports `clientId` and not `resourceId`, since only one of both is supported.
 */
export interface ManagedIdentityCredentialClientIdOptions extends TokenCredentialOptions {
    /**
     * The client ID of the user - assigned identity, or app registration(when working with AKS pod - identity).
     */
    clientId?: string;
}
/**
 * Options to send on the {@link ManagedIdentityCredential} constructor.
 * This variation supports `resourceId` and not `clientId`, since only one of both is supported.
 */
export interface ManagedIdentityCredentialResourceIdOptions extends TokenCredentialOptions {
    /**
     * Allows specifying a custom resource Id.
     * In scenarios such as when user assigned identities are created using an ARM template,
     * where the resource Id of the identity is known but the client Id can't be known ahead of time,
     * this parameter allows programs to use these user assigned identities
     * without having to first determine the client Id of the created identity.
     */
    resourceId: string;
}
/**
 * Options to send on the {@link ManagedIdentityCredential} constructor.
 * This variation supports `objectId` as a constructor argument.
 */
export interface ManagedIdentityCredentialObjectIdOptions extends TokenCredentialOptions {
    /**
     * Allows specifying the object ID of the underlying service principal used to authenticate a user-assigned managed identity.
     * This is an alternative to providing a client ID or resource ID and is not required for system-assigned managed identities.
     */
    objectId: string;
}
/**
 * @internal
 * Internal options for configuring the {@link ManagedIdentityCredential} with disable probe ability for DAC.
 * This type ensures that we can use any of the credential options (clientId, resourceId, or objectId)
 * along with the disableProbe flag for DefaultAzureCredential.
 */
export type InternalManagedIdentityCredentialOptions = (ManagedIdentityCredentialClientIdOptions & ManagedIdentityDisableProbeOptions) | (ManagedIdentityCredentialResourceIdOptions & ManagedIdentityDisableProbeOptions) | (ManagedIdentityCredentialObjectIdOptions & ManagedIdentityDisableProbeOptions);
/**
 * Options for configuring Managed Identity Credential with disable probe.
 * This is only meant to use in DefaultAzureCredential when AZURE_TOKEN_CREDENTIALS is set to Managed Identity Credential.
 */
type ManagedIdentityDisableProbeOptions = {
    sendProbeRequest?: boolean;
};
export {};
//# sourceMappingURL=options.d.ts.map