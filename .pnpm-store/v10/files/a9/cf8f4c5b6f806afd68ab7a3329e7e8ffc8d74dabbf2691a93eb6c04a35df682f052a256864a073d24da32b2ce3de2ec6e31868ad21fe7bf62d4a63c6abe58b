import type { IdentityPlugin } from "./provider.js";
/**
 * Extend Azure Identity with additional functionality. Pass a plugin from
 * a plugin package, such as:
 *
 * - `@azure/identity-cache-persistence`: provides persistent token caching
 * - `@azure/identity-vscode`: provides the dependencies of
 *   `VisualStudioCodeCredential` and enables it
 *
 * Example:
 *
 * ```ts snippet:consumer_example
 * import { useIdentityPlugin, DeviceCodeCredential } from "@azure/identity";
 *
 * useIdentityPlugin(cachePersistencePlugin);
 * // The plugin has the capability to extend `DeviceCodeCredential` and to
 * // add middleware to the underlying credentials, such as persistence.
 * const credential = new DeviceCodeCredential({
 *   tokenCachePersistenceOptions: {
 *     enabled: true,
 *   },
 * });
 * ```
 *
 * @param plugin - the plugin to register
 */
export declare function useIdentityPlugin(plugin: IdentityPlugin): void;
//# sourceMappingURL=consumer.d.ts.map