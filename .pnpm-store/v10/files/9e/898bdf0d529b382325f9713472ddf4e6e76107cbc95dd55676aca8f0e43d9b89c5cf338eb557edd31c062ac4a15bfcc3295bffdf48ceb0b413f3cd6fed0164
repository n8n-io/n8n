"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyPolicyName = void 0;
exports.getDefaultProxySettings = getDefaultProxySettings;
exports.proxyPolicy = proxyPolicy;
const policies_1 = require("@typespec/ts-http-runtime/internal/policies");
/**
 * The programmatic identifier of the proxyPolicy.
 */
exports.proxyPolicyName = policies_1.proxyPolicyName;
/**
 * This method converts a proxy url into `ProxySettings` for use with ProxyPolicy.
 * If no argument is given, it attempts to parse a proxy URL from the environment
 * variables `HTTPS_PROXY` or `HTTP_PROXY`.
 * @param proxyUrl - The url of the proxy to use. May contain authentication information.
 * @deprecated - Internally this method is no longer necessary when setting proxy information.
 */
function getDefaultProxySettings(proxyUrl) {
    return (0, policies_1.getDefaultProxySettings)(proxyUrl);
}
/**
 * A policy that allows one to apply proxy settings to all requests.
 * If not passed static settings, they will be retrieved from the HTTPS_PROXY
 * or HTTP_PROXY environment variables.
 * @param proxySettings - ProxySettings to use on each request.
 * @param options - additional settings, for example, custom NO_PROXY patterns
 */
function proxyPolicy(proxySettings, options) {
    return (0, policies_1.proxyPolicy)(proxySettings, options);
}
//# sourceMappingURL=proxyPolicy.js.map