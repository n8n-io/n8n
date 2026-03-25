import type { TokenCachePersistenceOptions } from "../msal/nodeFlows/tokenCachePersistenceOptions.js";
/**
 * The type of an Azure Identity plugin, a function accepting a plugin
 * context.
 */
export type IdentityPlugin = (context: unknown) => void;
/**
 * Plugin context entries for controlling cache plugins.
 */
export interface CachePluginControl {
    setPersistence(persistenceFactory: (options?: TokenCachePersistenceOptions) => Promise<import("@azure/msal-node").ICachePlugin>): void;
}
export interface NativeBrokerPluginControl {
    setNativeBroker(nativeBroker: import("@azure/msal-node").INativeBrokerPlugin): void;
}
/**
 * Plugin context entries for controlling VisualStudioCodeCredential.
 */
export interface VisualStudioCodeCredentialControl {
    setVSCodeAuthRecordPath(path: string): void;
    setVSCodeBroker(broker: import("@azure/msal-node").INativeBrokerPlugin): void;
}
/**
 * Context options passed to a plugin during initialization.
 *
 * Plugin authors are responsible for casting their plugin context values
 * to this type.
 *
 * @internal
 */
export interface AzurePluginContext {
    cachePluginControl: CachePluginControl;
    nativeBrokerPluginControl: NativeBrokerPluginControl;
    vsCodeCredentialControl: VisualStudioCodeCredentialControl;
}
//# sourceMappingURL=provider.d.ts.map