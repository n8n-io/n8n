import type { ProxySettings } from "../interfaces.js";
import type { PipelinePolicy } from "../pipeline.js";
export declare const proxyPolicyName = "proxyPolicy";
export declare function getDefaultProxySettings(_proxyUrl?: string): ProxySettings | undefined;
/**
 * proxyPolicy is not supported in the browser and attempting
 * to use it will raise an error.
 */
export declare function proxyPolicy(_proxySettings?: ProxySettings, _options?: {
    customNoProxyList?: string[];
}): PipelinePolicy;
/**
 * A function to reset the cached agents.
 * proxyPolicy is not supported in the browser and attempting
 * to use it will raise an error.
 * @internal
 */
export declare function resetCachedProxyAgents(): void;
//# sourceMappingURL=proxyPolicy.common.d.ts.map