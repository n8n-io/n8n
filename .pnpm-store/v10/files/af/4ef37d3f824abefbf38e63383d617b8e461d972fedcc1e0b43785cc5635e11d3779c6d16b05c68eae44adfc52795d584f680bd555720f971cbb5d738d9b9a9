// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { proxyPolicy as tspProxyPolicy, proxyPolicyName as tspProxyPolicyName, getDefaultProxySettings as tspGetDefaultProxySettings, } from "@typespec/ts-http-runtime/internal/policies";
/**
 * The programmatic identifier of the proxyPolicy.
 */
export const proxyPolicyName = tspProxyPolicyName;
/**
 * This method converts a proxy url into `ProxySettings` for use with ProxyPolicy.
 * If no argument is given, it attempts to parse a proxy URL from the environment
 * variables `HTTPS_PROXY` or `HTTP_PROXY`.
 * @param proxyUrl - The url of the proxy to use. May contain authentication information.
 * @deprecated - Internally this method is no longer necessary when setting proxy information.
 */
export function getDefaultProxySettings(proxyUrl) {
    return tspGetDefaultProxySettings(proxyUrl);
}
/**
 * A policy that allows one to apply proxy settings to all requests.
 * If not passed static settings, they will be retrieved from the HTTPS_PROXY
 * or HTTP_PROXY environment variables.
 * @param proxySettings - ProxySettings to use on each request.
 * @param options - additional settings, for example, custom NO_PROXY patterns
 */
export function proxyPolicy(proxySettings, options) {
    return tspProxyPolicy(proxySettings, options);
}
//# sourceMappingURL=proxyPolicy.js.map