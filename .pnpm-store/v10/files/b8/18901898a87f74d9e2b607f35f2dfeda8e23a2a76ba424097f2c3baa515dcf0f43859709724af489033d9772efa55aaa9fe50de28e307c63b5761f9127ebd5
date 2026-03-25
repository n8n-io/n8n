import type { ProxySettings } from "../interfaces.js";
import type { PipelinePolicy } from "../pipeline.js";
/**
 * The programmatic identifier of the proxyPolicy.
 */
export declare const proxyPolicyName = "proxyPolicy";
/**
 * Stores the patterns specified in NO_PROXY environment variable.
 * @internal
 */
export declare const globalNoProxyList: string[];
export declare function loadNoProxy(): string[];
/**
 * This method converts a proxy url into `ProxySettings` for use with ProxyPolicy.
 * If no argument is given, it attempts to parse a proxy URL from the environment
 * variables `HTTPS_PROXY` or `HTTP_PROXY`.
 * @param proxyUrl - The url of the proxy to use. May contain authentication information.
 * @deprecated - Internally this method is no longer necessary when setting proxy information.
 */
export declare function getDefaultProxySettings(proxyUrl?: string): ProxySettings | undefined;
/**
 * A policy that allows one to apply proxy settings to all requests.
 * If not passed static settings, they will be retrieved from the HTTPS_PROXY
 * or HTTP_PROXY environment variables.
 * @param proxySettings - ProxySettings to use on each request.
 * @param options - additional settings, for example, custom NO_PROXY patterns
 */
export declare function proxyPolicy(proxySettings?: ProxySettings, options?: {
    /** a list of patterns to override those loaded from NO_PROXY environment variable. */
    customNoProxyList?: string[];
}): PipelinePolicy;
//# sourceMappingURL=proxyPolicy.d.ts.map