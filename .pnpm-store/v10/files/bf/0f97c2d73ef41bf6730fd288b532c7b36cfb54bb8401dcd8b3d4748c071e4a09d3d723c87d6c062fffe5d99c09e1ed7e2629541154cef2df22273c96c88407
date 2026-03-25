"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIdentityPlugin = useIdentityPlugin;
const msalPlugins_js_1 = require("../msal/nodeFlows/msalPlugins.js");
/**
 * The context passed to an Identity plugin. This contains objects that
 * plugins can use to set backend implementations.
 */
const pluginContext = {
    cachePluginControl: msalPlugins_js_1.msalNodeFlowCacheControl,
    nativeBrokerPluginControl: msalPlugins_js_1.msalNodeFlowNativeBrokerControl,
    vsCodeCredentialControl: msalPlugins_js_1.msalNodeFlowVSCodeCredentialControl,
};
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
function useIdentityPlugin(plugin) {
    plugin(pluginContext);
}
//# sourceMappingURL=consumer.js.map