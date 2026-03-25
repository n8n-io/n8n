import type * as msalNode from "@azure/msal-node";
import type { MsalClientOptions } from "./msalClient.js";
import type { NativeBrokerPluginControl, VisualStudioCodeCredentialControl } from "../../plugins/provider.js";
import type { TokenCachePersistenceOptions } from "./tokenCachePersistenceOptions.js";
/**
 * Configuration for the plugins used by the MSAL node client.
 */
export interface PluginConfiguration {
    /**
     * Configuration for the cache plugin.
     */
    cache: {
        /**
         * The non-CAE cache plugin handler.
         */
        cachePlugin?: Promise<msalNode.ICachePlugin>;
        /**
         * The CAE cache plugin handler - persisted to a different file.
         */
        cachePluginCae?: Promise<msalNode.ICachePlugin>;
    };
    /**
     * Configuration for the broker plugin.
     */
    broker: {
        /**
         * True if the broker plugin is enabled and available. False otherwise.
         *
         * It is a bug if this is true and the broker plugin is not available.
         */
        isEnabled: boolean;
        /**
         * If true, MSA account will be passed through, required for WAM authentication.
         */
        enableMsaPassthrough: boolean;
        /**
         * The parent window handle for the broker.
         */
        parentWindowHandle?: Uint8Array;
        /**
         * The native broker plugin handler.
         */
        nativeBrokerPlugin?: msalNode.INativeBrokerPlugin;
        /**
         * If set to true, the credential will attempt to use the default broker account for authentication before falling back to interactive authentication. Default is set to false.
         */
        useDefaultBrokerAccount?: boolean;
    };
}
/**
 * The current persistence provider, undefined by default.
 * @internal
 */
export declare let persistenceProvider: ((options?: TokenCachePersistenceOptions) => Promise<msalNode.ICachePlugin>) | undefined;
/**
 * An object that allows setting the persistence provider.
 * @internal
 */
export declare const msalNodeFlowCacheControl: {
    setPersistence(pluginProvider: Exclude<typeof persistenceProvider, undefined>): void;
};
/**
 * The current native broker provider, undefined by default.
 * @internal
 */
export declare let nativeBrokerInfo: {
    broker: msalNode.INativeBrokerPlugin;
} | undefined;
/**
 * The current VSCode auth record path, undefined by default.
 * @internal
 */
export declare let vsCodeAuthRecordPath: string | undefined;
/**
 * The current VSCode broker, undefined by default.
 * @internal
 */
export declare let vsCodeBrokerInfo: {
    broker: msalNode.INativeBrokerPlugin;
} | undefined;
export declare function hasNativeBroker(): boolean;
export declare function hasVSCodePlugin(): boolean;
/**
 * An object that allows setting the native broker provider.
 * @internal
 */
export declare const msalNodeFlowNativeBrokerControl: NativeBrokerPluginControl;
/**
 * An object that allows setting the VSCode credential auth record path and broker.
 * @internal
 */
export declare const msalNodeFlowVSCodeCredentialControl: VisualStudioCodeCredentialControl;
/**
 * Configures plugins, validating that required plugins are available and enabled.
 *
 * Does not create the plugins themselves, but rather returns the configuration that will be used to create them.
 *
 * @param options - options for creating the MSAL client
 * @returns plugin configuration
 */
declare function generatePluginConfiguration(options: MsalClientOptions): PluginConfiguration;
/**
 * Wraps generatePluginConfiguration as a writeable property for test stubbing purposes.
 */
export declare const msalPlugins: {
    generatePluginConfiguration: typeof generatePluginConfiguration;
};
export {};
//# sourceMappingURL=msalPlugins.d.ts.map