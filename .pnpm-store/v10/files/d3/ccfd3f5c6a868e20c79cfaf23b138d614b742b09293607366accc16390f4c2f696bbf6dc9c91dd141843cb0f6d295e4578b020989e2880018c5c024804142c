// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { logger } from "../log.js";
const HTTPS_PROXY = "HTTPS_PROXY";
const HTTP_PROXY = "HTTP_PROXY";
const ALL_PROXY = "ALL_PROXY";
const NO_PROXY = "NO_PROXY";
/**
 * The programmatic identifier of the proxyPolicy.
 */
export const proxyPolicyName = "proxyPolicy";
/**
 * Stores the patterns specified in NO_PROXY environment variable.
 * @internal
 */
export const globalNoProxyList = [];
let noProxyListLoaded = false;
/** A cache of whether a host should bypass the proxy. */
const globalBypassedMap = new Map();
function getEnvironmentValue(name) {
    if (process.env[name]) {
        return process.env[name];
    }
    else if (process.env[name.toLowerCase()]) {
        return process.env[name.toLowerCase()];
    }
    return undefined;
}
function loadEnvironmentProxyValue() {
    if (!process) {
        return undefined;
    }
    const httpsProxy = getEnvironmentValue(HTTPS_PROXY);
    const allProxy = getEnvironmentValue(ALL_PROXY);
    const httpProxy = getEnvironmentValue(HTTP_PROXY);
    return httpsProxy || allProxy || httpProxy;
}
/**
 * Check whether the host of a given `uri` matches any pattern in the no proxy list.
 * If there's a match, any request sent to the same host shouldn't have the proxy settings set.
 * This implementation is a port of https://github.com/Azure/azure-sdk-for-net/blob/8cca811371159e527159c7eb65602477898683e2/sdk/core/Azure.Core/src/Pipeline/Internal/HttpEnvironmentProxy.cs#L210
 */
function isBypassed(uri, noProxyList, bypassedMap) {
    if (noProxyList.length === 0) {
        return false;
    }
    const host = new URL(uri).hostname;
    if (bypassedMap === null || bypassedMap === void 0 ? void 0 : bypassedMap.has(host)) {
        return bypassedMap.get(host);
    }
    let isBypassedFlag = false;
    for (const pattern of noProxyList) {
        if (pattern[0] === ".") {
            // This should match either domain it self or any subdomain or host
            // .foo.com will match foo.com it self or *.foo.com
            if (host.endsWith(pattern)) {
                isBypassedFlag = true;
            }
            else {
                if (host.length === pattern.length - 1 && host === pattern.slice(1)) {
                    isBypassedFlag = true;
                }
            }
        }
        else {
            if (host === pattern) {
                isBypassedFlag = true;
            }
        }
    }
    bypassedMap === null || bypassedMap === void 0 ? void 0 : bypassedMap.set(host, isBypassedFlag);
    return isBypassedFlag;
}
export function loadNoProxy() {
    const noProxy = getEnvironmentValue(NO_PROXY);
    noProxyListLoaded = true;
    if (noProxy) {
        return noProxy
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length);
    }
    return [];
}
/**
 * This method converts a proxy url into `ProxySettings` for use with ProxyPolicy.
 * If no argument is given, it attempts to parse a proxy URL from the environment
 * variables `HTTPS_PROXY` or `HTTP_PROXY`.
 * @param proxyUrl - The url of the proxy to use. May contain authentication information.
 * @deprecated - Internally this method is no longer necessary when setting proxy information.
 */
export function getDefaultProxySettings(proxyUrl) {
    if (!proxyUrl) {
        proxyUrl = loadEnvironmentProxyValue();
        if (!proxyUrl) {
            return undefined;
        }
    }
    const parsedUrl = new URL(proxyUrl);
    const schema = parsedUrl.protocol ? parsedUrl.protocol + "//" : "";
    return {
        host: schema + parsedUrl.hostname,
        port: Number.parseInt(parsedUrl.port || "80"),
        username: parsedUrl.username,
        password: parsedUrl.password,
    };
}
/**
 * This method attempts to parse a proxy URL from the environment
 * variables `HTTPS_PROXY` or `HTTP_PROXY`.
 */
function getDefaultProxySettingsInternal() {
    const envProxy = loadEnvironmentProxyValue();
    return envProxy ? new URL(envProxy) : undefined;
}
function getUrlFromProxySettings(settings) {
    let parsedProxyUrl;
    try {
        parsedProxyUrl = new URL(settings.host);
    }
    catch (_a) {
        throw new Error(`Expecting a valid host string in proxy settings, but found "${settings.host}".`);
    }
    parsedProxyUrl.port = String(settings.port);
    if (settings.username) {
        parsedProxyUrl.username = settings.username;
    }
    if (settings.password) {
        parsedProxyUrl.password = settings.password;
    }
    return parsedProxyUrl;
}
function setProxyAgentOnRequest(request, cachedAgents, proxyUrl) {
    // Custom Agent should take precedence so if one is present
    // we should skip to avoid overwriting it.
    if (request.agent) {
        return;
    }
    const url = new URL(request.url);
    const isInsecure = url.protocol !== "https:";
    if (request.tlsSettings) {
        logger.warning("TLS settings are not supported in combination with custom Proxy, certificates provided to the client will be ignored.");
    }
    const headers = request.headers.toJSON();
    if (isInsecure) {
        if (!cachedAgents.httpProxyAgent) {
            cachedAgents.httpProxyAgent = new HttpProxyAgent(proxyUrl, { headers });
        }
        request.agent = cachedAgents.httpProxyAgent;
    }
    else {
        if (!cachedAgents.httpsProxyAgent) {
            cachedAgents.httpsProxyAgent = new HttpsProxyAgent(proxyUrl, { headers });
        }
        request.agent = cachedAgents.httpsProxyAgent;
    }
}
/**
 * A policy that allows one to apply proxy settings to all requests.
 * If not passed static settings, they will be retrieved from the HTTPS_PROXY
 * or HTTP_PROXY environment variables.
 * @param proxySettings - ProxySettings to use on each request.
 * @param options - additional settings, for example, custom NO_PROXY patterns
 */
export function proxyPolicy(proxySettings, options) {
    if (!noProxyListLoaded) {
        globalNoProxyList.push(...loadNoProxy());
    }
    const defaultProxy = proxySettings
        ? getUrlFromProxySettings(proxySettings)
        : getDefaultProxySettingsInternal();
    const cachedAgents = {};
    return {
        name: proxyPolicyName,
        async sendRequest(request, next) {
            var _a;
            if (!request.proxySettings &&
                defaultProxy &&
                !isBypassed(request.url, (_a = options === null || options === void 0 ? void 0 : options.customNoProxyList) !== null && _a !== void 0 ? _a : globalNoProxyList, (options === null || options === void 0 ? void 0 : options.customNoProxyList) ? undefined : globalBypassedMap)) {
                setProxyAgentOnRequest(request, cachedAgents, defaultProxy);
            }
            else if (request.proxySettings) {
                setProxyAgentOnRequest(request, cachedAgents, getUrlFromProxySettings(request.proxySettings));
            }
            return next(request);
        },
    };
}
//# sourceMappingURL=proxyPolicy.js.map