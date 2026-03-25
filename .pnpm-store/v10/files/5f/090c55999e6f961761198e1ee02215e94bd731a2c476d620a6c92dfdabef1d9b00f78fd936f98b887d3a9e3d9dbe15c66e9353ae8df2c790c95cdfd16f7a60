import type { TokenCachePersistenceOptions } from "../msal/nodeFlows/tokenCachePersistenceOptions.js";
/**
 * Shared configuration options for credentials that support persistent token
 * caching.
 */
export interface CredentialPersistenceOptions {
    /**
     * Options to provide to the persistence layer (if one is available) when
     * storing credentials.
     *
     * You must first register a persistence provider plugin. See the
     * `@azure/identity-cache-persistence` package on NPM.
     *
     * Example:
     *
     * ```ts snippet:credential_persistence_options_example
     * import { useIdentityPlugin, DeviceCodeCredential } from "@azure/identity";
     *
     * useIdentityPlugin(cachePersistencePlugin);
     *
     * const credential = new DeviceCodeCredential({
     *   tokenCachePersistenceOptions: {
     *     enabled: true,
     *   },
     * });
     * ```
     */
    tokenCachePersistenceOptions?: TokenCachePersistenceOptions;
}
//# sourceMappingURL=credentialPersistenceOptions.d.ts.map