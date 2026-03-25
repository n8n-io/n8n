import type { ApiProxy } from './proxy.js';
import type { PluginDescriptor, SetupFunction } from './index.js';
export interface PluginQueueItem {
    pluginDescriptor: PluginDescriptor;
    setupFn: SetupFunction;
    proxy?: ApiProxy;
}
interface GlobalTarget {
    __VUE_DEVTOOLS_PLUGINS__?: PluginQueueItem[];
    __VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__?: boolean;
}
export declare function getDevtoolsGlobalHook(): any;
export declare function getTarget(): GlobalTarget;
export declare const isProxyAvailable: boolean;
export {};
