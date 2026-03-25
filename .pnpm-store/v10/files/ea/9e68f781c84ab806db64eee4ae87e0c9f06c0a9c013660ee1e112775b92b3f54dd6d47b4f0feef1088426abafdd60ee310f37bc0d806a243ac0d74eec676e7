'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var logger$1 = require('@azure/logger');
var coreUtil = require('@azure/core-util');
var os = require('os');
var abortController = require('@azure/abort-controller');
var FormData = require('form-data');
var httpsProxyAgent = require('https-proxy-agent');
var httpProxyAgent = require('http-proxy-agent');
var coreTracing = require('@azure/core-tracing');
var util = require('util');
var http = require('http');
var https = require('https');
var zlib = require('zlib');
var stream = require('stream');
var uuid = require('uuid');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var os__namespace = /*#__PURE__*/_interopNamespace(os);
var FormData__default = /*#__PURE__*/_interopDefaultLegacy(FormData);
var http__namespace = /*#__PURE__*/_interopNamespace(http);
var https__namespace = /*#__PURE__*/_interopNamespace(https);
var zlib__namespace = /*#__PURE__*/_interopNamespace(zlib);

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const ValidPhaseNames = new Set(["Deserialize", "Serialize", "Retry", "Sign"]);
/**
 * A private implementation of Pipeline.
 * Do not export this class from the package.
 * @internal
 */
class HttpPipeline {
    constructor(policies = []) {
        this._policies = [];
        this._policies = policies;
        this._orderedPolicies = undefined;
    }
    addPolicy(policy, options = {}) {
        if (options.phase && options.afterPhase) {
            throw new Error("Policies inside a phase cannot specify afterPhase.");
        }
        if (options.phase && !ValidPhaseNames.has(options.phase)) {
            throw new Error(`Invalid phase name: ${options.phase}`);
        }
        if (options.afterPhase && !ValidPhaseNames.has(options.afterPhase)) {
            throw new Error(`Invalid afterPhase name: ${options.afterPhase}`);
        }
        this._policies.push({
            policy,
            options,
        });
        this._orderedPolicies = undefined;
    }
    removePolicy(options) {
        const removedPolicies = [];
        this._policies = this._policies.filter((policyDescriptor) => {
            if ((options.name && policyDescriptor.policy.name === options.name) ||
                (options.phase && policyDescriptor.options.phase === options.phase)) {
                removedPolicies.push(policyDescriptor.policy);
                return false;
            }
            else {
                return true;
            }
        });
        this._orderedPolicies = undefined;
        return removedPolicies;
    }
    sendRequest(httpClient, request) {
        const policies = this.getOrderedPolicies();
        const pipeline = policies.reduceRight((next, policy) => {
            return (req) => {
                return policy.sendRequest(req, next);
            };
        }, (req) => httpClient.sendRequest(req));
        return pipeline(request);
    }
    getOrderedPolicies() {
        if (!this._orderedPolicies) {
            this._orderedPolicies = this.orderPolicies();
        }
        return this._orderedPolicies;
    }
    clone() {
        return new HttpPipeline(this._policies);
    }
    static create() {
        return new HttpPipeline();
    }
    orderPolicies() {
        /**
         * The goal of this method is to reliably order pipeline policies
         * based on their declared requirements when they were added.
         *
         * Order is first determined by phase:
         *
         * 1. Serialize Phase
         * 2. Policies not in a phase
         * 3. Deserialize Phase
         * 4. Retry Phase
         * 5. Sign Phase
         *
         * Within each phase, policies are executed in the order
         * they were added unless they were specified to execute
         * before/after other policies or after a particular phase.
         *
         * To determine the final order, we will walk the policy list
         * in phase order multiple times until all dependencies are
         * satisfied.
         *
         * `afterPolicies` are the set of policies that must be
         * executed before a given policy. This requirement is
         * considered satisfied when each of the listed policies
         * have been scheduled.
         *
         * `beforePolicies` are the set of policies that must be
         * executed after a given policy. Since this dependency
         * can be expressed by converting it into a equivalent
         * `afterPolicies` declarations, they are normalized
         * into that form for simplicity.
         *
         * An `afterPhase` dependency is considered satisfied when all
         * policies in that phase have scheduled.
         *
         */
        const result = [];
        // Track all policies we know about.
        const policyMap = new Map();
        function createPhase(name) {
            return {
                name,
                policies: new Set(),
                hasRun: false,
                hasAfterPolicies: false,
            };
        }
        // Track policies for each phase.
        const serializePhase = createPhase("Serialize");
        const noPhase = createPhase("None");
        const deserializePhase = createPhase("Deserialize");
        const retryPhase = createPhase("Retry");
        const signPhase = createPhase("Sign");
        // a list of phases in order
        const orderedPhases = [serializePhase, noPhase, deserializePhase, retryPhase, signPhase];
        // Small helper function to map phase name to each Phase
        function getPhase(phase) {
            if (phase === "Retry") {
                return retryPhase;
            }
            else if (phase === "Serialize") {
                return serializePhase;
            }
            else if (phase === "Deserialize") {
                return deserializePhase;
            }
            else if (phase === "Sign") {
                return signPhase;
            }
            else {
                return noPhase;
            }
        }
        // First walk each policy and create a node to track metadata.
        for (const descriptor of this._policies) {
            const policy = descriptor.policy;
            const options = descriptor.options;
            const policyName = policy.name;
            if (policyMap.has(policyName)) {
                throw new Error("Duplicate policy names not allowed in pipeline");
            }
            const node = {
                policy,
                dependsOn: new Set(),
                dependants: new Set(),
            };
            if (options.afterPhase) {
                node.afterPhase = getPhase(options.afterPhase);
                node.afterPhase.hasAfterPolicies = true;
            }
            policyMap.set(policyName, node);
            const phase = getPhase(options.phase);
            phase.policies.add(node);
        }
        // Now that each policy has a node, connect dependency references.
        for (const descriptor of this._policies) {
            const { policy, options } = descriptor;
            const policyName = policy.name;
            const node = policyMap.get(policyName);
            if (!node) {
                throw new Error(`Missing node for policy ${policyName}`);
            }
            if (options.afterPolicies) {
                for (const afterPolicyName of options.afterPolicies) {
                    const afterNode = policyMap.get(afterPolicyName);
                    if (afterNode) {
                        // Linking in both directions helps later
                        // when we want to notify dependants.
                        node.dependsOn.add(afterNode);
                        afterNode.dependants.add(node);
                    }
                }
            }
            if (options.beforePolicies) {
                for (const beforePolicyName of options.beforePolicies) {
                    const beforeNode = policyMap.get(beforePolicyName);
                    if (beforeNode) {
                        // To execute before another node, make it
                        // depend on the current node.
                        beforeNode.dependsOn.add(node);
                        node.dependants.add(beforeNode);
                    }
                }
            }
        }
        function walkPhase(phase) {
            phase.hasRun = true;
            // Sets iterate in insertion order
            for (const node of phase.policies) {
                if (node.afterPhase && (!node.afterPhase.hasRun || node.afterPhase.policies.size)) {
                    // If this node is waiting on a phase to complete,
                    // we need to skip it for now.
                    // Even if the phase is empty, we should wait for it
                    // to be walked to avoid re-ordering policies.
                    continue;
                }
                if (node.dependsOn.size === 0) {
                    // If there's nothing else we're waiting for, we can
                    // add this policy to the result list.
                    result.push(node.policy);
                    // Notify anything that depends on this policy that
                    // the policy has been scheduled.
                    for (const dependant of node.dependants) {
                        dependant.dependsOn.delete(node);
                    }
                    policyMap.delete(node.policy.name);
                    phase.policies.delete(node);
                }
            }
        }
        function walkPhases() {
            for (const phase of orderedPhases) {
                walkPhase(phase);
                // if the phase isn't complete
                if (phase.policies.size > 0 && phase !== noPhase) {
                    if (!noPhase.hasRun) {
                        // Try running noPhase to see if that unblocks this phase next tick.
                        // This can happen if a phase that happens before noPhase
                        // is waiting on a noPhase policy to complete.
                        walkPhase(noPhase);
                    }
                    // Don't proceed to the next phase until this phase finishes.
                    return;
                }
                if (phase.hasAfterPolicies) {
                    // Run any policies unblocked by this phase
                    walkPhase(noPhase);
                }
            }
        }
        // Iterate until we've put every node in the result list.
        let iteration = 0;
        while (policyMap.size > 0) {
            iteration++;
            const initialResultLength = result.length;
            // Keep walking each phase in order until we can order every node.
            walkPhases();
            // The result list *should* get at least one larger each time
            // after the first full pass.
            // Otherwise, we're going to loop forever.
            if (result.length <= initialResultLength && iteration > 1) {
                throw new Error("Cannot satisfy policy dependencies due to requirements cycle.");
            }
        }
        return result;
    }
}
/**
 * Creates a totally empty pipeline.
 * Useful for testing or creating a custom one.
 */
function createEmptyPipeline() {
    return HttpPipeline.create();
}

// Copyright (c) Microsoft Corporation.
const logger = logger$1.createClientLogger("core-rest-pipeline");

// Copyright (c) Microsoft Corporation.
const RedactedString = "REDACTED";
// Make sure this list is up-to-date with the one under core/logger/Readme#Keyconcepts
const defaultAllowedHeaderNames = [
    "x-ms-client-request-id",
    "x-ms-return-client-request-id",
    "x-ms-useragent",
    "x-ms-correlation-request-id",
    "x-ms-request-id",
    "client-request-id",
    "ms-cv",
    "return-client-request-id",
    "traceparent",
    "Access-Control-Allow-Credentials",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Methods",
    "Access-Control-Allow-Origin",
    "Access-Control-Expose-Headers",
    "Access-Control-Max-Age",
    "Access-Control-Request-Headers",
    "Access-Control-Request-Method",
    "Origin",
    "Accept",
    "Accept-Encoding",
    "Cache-Control",
    "Connection",
    "Content-Length",
    "Content-Type",
    "Date",
    "ETag",
    "Expires",
    "If-Match",
    "If-Modified-Since",
    "If-None-Match",
    "If-Unmodified-Since",
    "Last-Modified",
    "Pragma",
    "Request-Id",
    "Retry-After",
    "Server",
    "Transfer-Encoding",
    "User-Agent",
    "WWW-Authenticate",
];
const defaultAllowedQueryParameters = ["api-version"];
/**
 * @internal
 */
class Sanitizer {
    constructor({ additionalAllowedHeaderNames: allowedHeaderNames = [], additionalAllowedQueryParameters: allowedQueryParameters = [], } = {}) {
        allowedHeaderNames = defaultAllowedHeaderNames.concat(allowedHeaderNames);
        allowedQueryParameters = defaultAllowedQueryParameters.concat(allowedQueryParameters);
        this.allowedHeaderNames = new Set(allowedHeaderNames.map((n) => n.toLowerCase()));
        this.allowedQueryParameters = new Set(allowedQueryParameters.map((p) => p.toLowerCase()));
    }
    sanitize(obj) {
        const seen = new Set();
        return JSON.stringify(obj, (key, value) => {
            // Ensure Errors include their interesting non-enumerable members
            if (value instanceof Error) {
                return Object.assign(Object.assign({}, value), { name: value.name, message: value.message });
            }
            if (key === "headers") {
                return this.sanitizeHeaders(value);
            }
            else if (key === "url") {
                return this.sanitizeUrl(value);
            }
            else if (key === "query") {
                return this.sanitizeQuery(value);
            }
            else if (key === "body") {
                // Don't log the request body
                return undefined;
            }
            else if (key === "response") {
                // Don't log response again
                return undefined;
            }
            else if (key === "operationSpec") {
                // When using sendOperationRequest, the request carries a massive
                // field with the autorest spec. No need to log it.
                return undefined;
            }
            else if (Array.isArray(value) || coreUtil.isObject(value)) {
                if (seen.has(value)) {
                    return "[Circular]";
                }
                seen.add(value);
            }
            return value;
        }, 2);
    }
    sanitizeHeaders(obj) {
        const sanitized = {};
        for (const key of Object.keys(obj)) {
            if (this.allowedHeaderNames.has(key.toLowerCase())) {
                sanitized[key] = obj[key];
            }
            else {
                sanitized[key] = RedactedString;
            }
        }
        return sanitized;
    }
    sanitizeQuery(value) {
        if (typeof value !== "object" || value === null) {
            return value;
        }
        const sanitized = {};
        for (const k of Object.keys(value)) {
            if (this.allowedQueryParameters.has(k.toLowerCase())) {
                sanitized[k] = value[k];
            }
            else {
                sanitized[k] = RedactedString;
            }
        }
        return sanitized;
    }
    sanitizeUrl(value) {
        if (typeof value !== "string" || value === null) {
            return value;
        }
        const url = new URL(value);
        if (!url.search) {
            return value;
        }
        for (const [key] of url.searchParams) {
            if (!this.allowedQueryParameters.has(key.toLowerCase())) {
                url.searchParams.set(key, RedactedString);
            }
        }
        return url.toString();
    }
}

// Copyright (c) Microsoft Corporation.
/**
 * The programmatic identifier of the logPolicy.
 */
const logPolicyName = "logPolicy";
/**
 * A policy that logs all requests and responses.
 * @param options - Options to configure logPolicy.
 */
function logPolicy(options = {}) {
    var _a;
    const logger$1 = (_a = options.logger) !== null && _a !== void 0 ? _a : logger.info;
    const sanitizer = new Sanitizer({
        additionalAllowedHeaderNames: options.additionalAllowedHeaderNames,
        additionalAllowedQueryParameters: options.additionalAllowedQueryParameters,
    });
    return {
        name: logPolicyName,
        async sendRequest(request, next) {
            if (!logger$1.enabled) {
                return next(request);
            }
            logger$1(`Request: ${sanitizer.sanitize(request)}`);
            const response = await next(request);
            logger$1(`Response status code: ${response.status}`);
            logger$1(`Headers: ${sanitizer.sanitize(response.headers)}`);
            return response;
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * The programmatic identifier of the redirectPolicy.
 */
const redirectPolicyName = "redirectPolicy";
/**
 * Methods that are allowed to follow redirects 301 and 302
 */
const allowedRedirect = ["GET", "HEAD"];
/**
 * A policy to follow Location headers from the server in order
 * to support server-side redirection.
 * In the browser, this policy is not used.
 * @param options - Options to control policy behavior.
 */
function redirectPolicy(options = {}) {
    const { maxRetries = 20 } = options;
    return {
        name: redirectPolicyName,
        async sendRequest(request, next) {
            const response = await next(request);
            return handleRedirect(next, response, maxRetries);
        },
    };
}
async function handleRedirect(next, response, maxRetries, currentRetries = 0) {
    const { request, status, headers } = response;
    const locationHeader = headers.get("location");
    if (locationHeader &&
        (status === 300 ||
            (status === 301 && allowedRedirect.includes(request.method)) ||
            (status === 302 && allowedRedirect.includes(request.method)) ||
            (status === 303 && request.method === "POST") ||
            status === 307) &&
        currentRetries < maxRetries) {
        const url = new URL(locationHeader, request.url);
        request.url = url.toString();
        // POST request with Status code 303 should be converted into a
        // redirected GET request if the redirect url is present in the location header
        if (status === 303) {
            request.method = "GET";
            request.headers.delete("Content-Length");
            delete request.body;
        }
        request.headers.delete("Authorization");
        const res = await next(request);
        return handleRedirect(next, res, maxRetries, currentRetries + 1);
    }
    return response;
}

// Copyright (c) Microsoft Corporation.
/**
 * @internal
 */
function getHeaderName() {
    return "User-Agent";
}
/**
 * @internal
 */
function setPlatformSpecificData(map) {
    map.set("Node", process.version);
    map.set("OS", `(${os__namespace.arch()}-${os__namespace.type()}-${os__namespace.release()})`);
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const SDK_VERSION = "1.9.2";
const DEFAULT_RETRY_POLICY_COUNT = 3;

// Copyright (c) Microsoft Corporation.
function getUserAgentString(telemetryInfo) {
    const parts = [];
    for (const [key, value] of telemetryInfo) {
        const token = value ? `${key}/${value}` : key;
        parts.push(token);
    }
    return parts.join(" ");
}
/**
 * @internal
 */
function getUserAgentHeaderName() {
    return getHeaderName();
}
/**
 * @internal
 */
function getUserAgentValue(prefix) {
    const runtimeInfo = new Map();
    runtimeInfo.set("core-rest-pipeline", SDK_VERSION);
    setPlatformSpecificData(runtimeInfo);
    const defaultAgent = getUserAgentString(runtimeInfo);
    const userAgentValue = prefix ? `${prefix} ${defaultAgent}` : defaultAgent;
    return userAgentValue;
}

// Copyright (c) Microsoft Corporation.
const UserAgentHeaderName = getUserAgentHeaderName();
/**
 * The programmatic identifier of the userAgentPolicy.
 */
const userAgentPolicyName = "userAgentPolicy";
/**
 * A policy that sets the User-Agent header (or equivalent) to reflect
 * the library version.
 * @param options - Options to customize the user agent value.
 */
function userAgentPolicy(options = {}) {
    const userAgentValue = getUserAgentValue(options.userAgentPrefix);
    return {
        name: userAgentPolicyName,
        async sendRequest(request, next) {
            if (!request.headers.has(UserAgentHeaderName)) {
                request.headers.set(UserAgentHeaderName, userAgentValue);
            }
            return next(request);
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * The programmatic identifier of the decompressResponsePolicy.
 */
const decompressResponsePolicyName = "decompressResponsePolicy";
/**
 * A policy to enable response decompression according to Accept-Encoding header
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
 */
function decompressResponsePolicy() {
    return {
        name: decompressResponsePolicyName,
        async sendRequest(request, next) {
            // HEAD requests have no body
            if (request.method !== "HEAD") {
                request.headers.set("Accept-Encoding", "gzip,deflate");
            }
            return next(request);
        },
    };
}

// Copyright (c) Microsoft Corporation.
const StandardAbortMessage = "The operation was aborted.";
/**
 * A wrapper for setTimeout that resolves a promise after delayInMs milliseconds.
 * @param delayInMs - The number of milliseconds to be delayed.
 * @param value - The value to be resolved with after a timeout of t milliseconds.
 * @param options - The options for delay - currently abort options
 *                  - abortSignal - The abortSignal associated with containing operation.
 *                  - abortErrorMsg - The abort error message associated with containing operation.
 * @returns Resolved promise
 */
function delay(delayInMs, value, options) {
    return new Promise((resolve, reject) => {
        let timer = undefined;
        let onAborted = undefined;
        const rejectOnAbort = () => {
            return reject(new abortController.AbortError((options === null || options === void 0 ? void 0 : options.abortErrorMsg) ? options === null || options === void 0 ? void 0 : options.abortErrorMsg : StandardAbortMessage));
        };
        const removeListeners = () => {
            if ((options === null || options === void 0 ? void 0 : options.abortSignal) && onAborted) {
                options.abortSignal.removeEventListener("abort", onAborted);
            }
        };
        onAborted = () => {
            if (timer) {
                clearTimeout(timer);
            }
            removeListeners();
            return rejectOnAbort();
        };
        if ((options === null || options === void 0 ? void 0 : options.abortSignal) && options.abortSignal.aborted) {
            return rejectOnAbort();
        }
        timer = setTimeout(() => {
            removeListeners();
            resolve(value);
        }, delayInMs);
        if (options === null || options === void 0 ? void 0 : options.abortSignal) {
            options.abortSignal.addEventListener("abort", onAborted);
        }
    });
}
/**
 * @internal
 * @returns the parsed value or undefined if the parsed value is invalid.
 */
function parseHeaderValueAsNumber(response, headerName) {
    const value = response.headers.get(headerName);
    if (!value)
        return;
    const valueAsNum = Number(value);
    if (Number.isNaN(valueAsNum))
        return;
    return valueAsNum;
}

// Copyright (c) Microsoft Corporation.
/**
 * The header that comes back from Azure services representing
 * the amount of time (minimum) to wait to retry (in seconds or timestamp after which we can retry).
 */
const RetryAfterHeader = "Retry-After";
/**
 * The headers that come back from Azure services representing
 * the amount of time (minimum) to wait to retry.
 *
 * "retry-after-ms", "x-ms-retry-after-ms" : milliseconds
 * "Retry-After" : seconds or timestamp
 */
const AllRetryAfterHeaders = ["retry-after-ms", "x-ms-retry-after-ms", RetryAfterHeader];
/**
 * A response is a throttling retry response if it has a throttling status code (429 or 503),
 * as long as one of the [ "Retry-After" or "retry-after-ms" or "x-ms-retry-after-ms" ] headers has a valid value.
 *
 * Returns the `retryAfterInMs` value if the response is a throttling retry response.
 * If not throttling retry response, returns `undefined`.
 *
 * @internal
 */
function getRetryAfterInMs(response) {
    if (!(response && [429, 503].includes(response.status)))
        return undefined;
    try {
        // Headers: "retry-after-ms", "x-ms-retry-after-ms", "Retry-After"
        for (const header of AllRetryAfterHeaders) {
            const retryAfterValue = parseHeaderValueAsNumber(response, header);
            if (retryAfterValue === 0 || retryAfterValue) {
                // "Retry-After" header ==> seconds
                // "retry-after-ms", "x-ms-retry-after-ms" headers ==> milli-seconds
                const multiplyingFactor = header === RetryAfterHeader ? 1000 : 1;
                return retryAfterValue * multiplyingFactor; // in milli-seconds
            }
        }
        // RetryAfterHeader ("Retry-After") has a special case where it might be formatted as a date instead of a number of seconds
        const retryAfterHeader = response.headers.get(RetryAfterHeader);
        if (!retryAfterHeader)
            return;
        const date = Date.parse(retryAfterHeader);
        const diff = date - Date.now();
        // negative diff would mean a date in the past, so retry asap with 0 milliseconds
        return Number.isFinite(diff) ? Math.max(0, diff) : undefined;
    }
    catch (e) {
        return undefined;
    }
}
/**
 * A response is a retry response if it has a throttling status code (429 or 503),
 * as long as one of the [ "Retry-After" or "retry-after-ms" or "x-ms-retry-after-ms" ] headers has a valid value.
 */
function isThrottlingRetryResponse(response) {
    return Number.isFinite(getRetryAfterInMs(response));
}
function throttlingRetryStrategy() {
    return {
        name: "throttlingRetryStrategy",
        retry({ response }) {
            const retryAfterInMs = getRetryAfterInMs(response);
            if (!Number.isFinite(retryAfterInMs)) {
                return { skipStrategy: true };
            }
            return {
                retryAfterInMs,
            };
        },
    };
}

// Copyright (c) Microsoft Corporation.
// intervals are in milliseconds
const DEFAULT_CLIENT_RETRY_INTERVAL = 1000;
const DEFAULT_CLIENT_MAX_RETRY_INTERVAL = 1000 * 64;
/**
 * A retry strategy that retries with an exponentially increasing delay in these two cases:
 * - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
 * - Or otherwise if the outgoing request fails (408, greater or equal than 500, except for 501 and 505).
 */
function exponentialRetryStrategy(options = {}) {
    var _a, _b;
    const retryInterval = (_a = options.retryDelayInMs) !== null && _a !== void 0 ? _a : DEFAULT_CLIENT_RETRY_INTERVAL;
    const maxRetryInterval = (_b = options.maxRetryDelayInMs) !== null && _b !== void 0 ? _b : DEFAULT_CLIENT_MAX_RETRY_INTERVAL;
    let retryAfterInMs = retryInterval;
    return {
        name: "exponentialRetryStrategy",
        retry({ retryCount, response, responseError }) {
            const matchedSystemError = isSystemError(responseError);
            const ignoreSystemErrors = matchedSystemError && options.ignoreSystemErrors;
            const isExponential = isExponentialRetryResponse(response);
            const ignoreExponentialResponse = isExponential && options.ignoreHttpStatusCodes;
            const unknownResponse = response && (isThrottlingRetryResponse(response) || !isExponential);
            if (unknownResponse || ignoreExponentialResponse || ignoreSystemErrors) {
                return { skipStrategy: true };
            }
            if (responseError && !matchedSystemError && !isExponential) {
                return { errorToThrow: responseError };
            }
            // Exponentially increase the delay each time
            const exponentialDelay = retryAfterInMs * Math.pow(2, retryCount);
            // Don't let the delay exceed the maximum
            const clampedExponentialDelay = Math.min(maxRetryInterval, exponentialDelay);
            // Allow the final value to have some "jitter" (within 50% of the delay size) so
            // that retries across multiple clients don't occur simultaneously.
            retryAfterInMs =
                clampedExponentialDelay / 2 + coreUtil.getRandomIntegerInclusive(0, clampedExponentialDelay / 2);
            return { retryAfterInMs };
        },
    };
}
/**
 * A response is a retry response if it has status codes:
 * - 408, or
 * - Greater or equal than 500, except for 501 and 505.
 */
function isExponentialRetryResponse(response) {
    return Boolean(response &&
        response.status !== undefined &&
        (response.status >= 500 || response.status === 408) &&
        response.status !== 501 &&
        response.status !== 505);
}
/**
 * Determines whether an error from a pipeline response was triggered in the network layer.
 */
function isSystemError(err) {
    if (!err) {
        return false;
    }
    return (err.code === "ETIMEDOUT" ||
        err.code === "ESOCKETTIMEDOUT" ||
        err.code === "ECONNREFUSED" ||
        err.code === "ECONNRESET" ||
        err.code === "ENOENT");
}

// Copyright (c) Microsoft Corporation.
const retryPolicyLogger = logger$1.createClientLogger("core-rest-pipeline retryPolicy");
/**
 * The programmatic identifier of the retryPolicy.
 */
const retryPolicyName = "retryPolicy";
/**
 * retryPolicy is a generic policy to enable retrying requests when certain conditions are met
 */
function retryPolicy(strategies, options = { maxRetries: DEFAULT_RETRY_POLICY_COUNT }) {
    const logger = options.logger || retryPolicyLogger;
    return {
        name: retryPolicyName,
        async sendRequest(request, next) {
            var _a, _b;
            let response;
            let responseError;
            let retryCount = -1;
            // eslint-disable-next-line no-constant-condition
            retryRequest: while (true) {
                retryCount += 1;
                response = undefined;
                responseError = undefined;
                try {
                    logger.info(`Retry ${retryCount}: Attempting to send request`, request.requestId);
                    response = await next(request);
                    logger.info(`Retry ${retryCount}: Received a response from request`, request.requestId);
                }
                catch (e) {
                    logger.error(`Retry ${retryCount}: Received an error from request`, request.requestId);
                    // RestErrors are valid targets for the retry strategies.
                    // If none of the retry strategies can work with them, they will be thrown later in this policy.
                    // If the received error is not a RestError, it is immediately thrown.
                    responseError = e;
                    if (!e || responseError.name !== "RestError") {
                        throw e;
                    }
                    response = responseError.response;
                }
                if ((_a = request.abortSignal) === null || _a === void 0 ? void 0 : _a.aborted) {
                    logger.error(`Retry ${retryCount}: Request aborted.`);
                    const abortError = new abortController.AbortError();
                    throw abortError;
                }
                if (retryCount >= ((_b = options.maxRetries) !== null && _b !== void 0 ? _b : DEFAULT_RETRY_POLICY_COUNT)) {
                    logger.info(`Retry ${retryCount}: Maximum retries reached. Returning the last received response, or throwing the last received error.`);
                    if (responseError) {
                        throw responseError;
                    }
                    else if (response) {
                        return response;
                    }
                    else {
                        throw new Error("Maximum retries reached with no response or error to throw");
                    }
                }
                logger.info(`Retry ${retryCount}: Processing ${strategies.length} retry strategies.`);
                strategiesLoop: for (const strategy of strategies) {
                    const strategyLogger = strategy.logger || retryPolicyLogger;
                    strategyLogger.info(`Retry ${retryCount}: Processing retry strategy ${strategy.name}.`);
                    const modifiers = strategy.retry({
                        retryCount,
                        response,
                        responseError,
                    });
                    if (modifiers.skipStrategy) {
                        strategyLogger.info(`Retry ${retryCount}: Skipped.`);
                        continue strategiesLoop;
                    }
                    const { errorToThrow, retryAfterInMs, redirectTo } = modifiers;
                    if (errorToThrow) {
                        strategyLogger.error(`Retry ${retryCount}: Retry strategy ${strategy.name} throws error:`, errorToThrow);
                        throw errorToThrow;
                    }
                    if (retryAfterInMs || retryAfterInMs === 0) {
                        strategyLogger.info(`Retry ${retryCount}: Retry strategy ${strategy.name} retries after ${retryAfterInMs}`);
                        await delay(retryAfterInMs, undefined, { abortSignal: request.abortSignal });
                        continue retryRequest;
                    }
                    if (redirectTo) {
                        strategyLogger.info(`Retry ${retryCount}: Retry strategy ${strategy.name} redirects to ${redirectTo}`);
                        request.url = redirectTo;
                        continue retryRequest;
                    }
                }
                if (responseError) {
                    logger.info(`None of the retry strategies could work with the received error. Throwing it.`);
                    throw responseError;
                }
                if (response) {
                    logger.info(`None of the retry strategies could work with the received response. Returning it.`);
                    return response;
                }
                // If all the retries skip and there's no response,
                // we're still in the retry loop, so a new request will be sent
                // until `maxRetries` is reached.
            }
        },
    };
}

// Copyright (c) Microsoft Corporation.
/**
 * Name of the {@link defaultRetryPolicy}
 */
const defaultRetryPolicyName = "defaultRetryPolicy";
/**
 * A policy that retries according to three strategies:
 * - When the server sends a 429 response with a Retry-After header.
 * - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
 * - Or otherwise if the outgoing request fails, it will retry with an exponentially increasing delay.
 */
function defaultRetryPolicy(options = {}) {
    var _a;
    return {
        name: defaultRetryPolicyName,
        sendRequest: retryPolicy([throttlingRetryStrategy(), exponentialRetryStrategy(options)], {
            maxRetries: (_a = options.maxRetries) !== null && _a !== void 0 ? _a : DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}

// Copyright (c) Microsoft Corporation.
/**
 * The programmatic identifier of the formDataPolicy.
 */
const formDataPolicyName = "formDataPolicy";
/**
 * A policy that encodes FormData on the request into the body.
 */
function formDataPolicy() {
    return {
        name: formDataPolicyName,
        async sendRequest(request, next) {
            if (request.formData) {
                const contentType = request.headers.get("Content-Type");
                if (contentType && contentType.indexOf("application/x-www-form-urlencoded") !== -1) {
                    request.body = wwwFormUrlEncode(request.formData);
                    request.formData = undefined;
                }
                else {
                    prepareFormData(request.formData, request);
                }
            }
            return next(request);
        },
    };
}
function wwwFormUrlEncode(formData) {
    const urlSearchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(formData)) {
        if (Array.isArray(value)) {
            for (const subValue of value) {
                urlSearchParams.append(key, subValue.toString());
            }
        }
        else {
            urlSearchParams.append(key, value.toString());
        }
    }
    return urlSearchParams.toString();
}
async function prepareFormData(formData, request) {
    const requestForm = new FormData__default["default"]();
    for (const formKey of Object.keys(formData)) {
        const formValue = formData[formKey];
        if (Array.isArray(formValue)) {
            for (const subValue of formValue) {
                requestForm.append(formKey, subValue);
            }
        }
        else {
            requestForm.append(formKey, formValue);
        }
    }
    request.body = requestForm;
    request.formData = undefined;
    const contentType = request.headers.get("Content-Type");
    if (contentType && contentType.indexOf("multipart/form-data") !== -1) {
        request.headers.set("Content-Type", `multipart/form-data; boundary=${requestForm.getBoundary()}`);
    }
    try {
        const contentLength = await new Promise((resolve, reject) => {
            requestForm.getLength((err, length) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(length);
                }
            });
        });
        request.headers.set("Content-Length", contentLength);
    }
    catch (e) {
        // ignore setting the length if this fails
    }
}

// Copyright (c) Microsoft Corporation.
const HTTPS_PROXY = "HTTPS_PROXY";
const HTTP_PROXY = "HTTP_PROXY";
const ALL_PROXY = "ALL_PROXY";
const NO_PROXY = "NO_PROXY";
/**
 * The programmatic identifier of the proxyPolicy.
 */
const proxyPolicyName = "proxyPolicy";
/**
 * Stores the patterns specified in NO_PROXY environment variable.
 * @internal
 */
const globalNoProxyList = [];
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
function loadNoProxy() {
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
 */
function getDefaultProxySettings(proxyUrl) {
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
 * @internal
 */
function getProxyAgentOptions(proxySettings, { headers, tlsSettings }) {
    let parsedProxyUrl;
    try {
        parsedProxyUrl = new URL(proxySettings.host);
    }
    catch (_error) {
        throw new Error(`Expecting a valid host string in proxy settings, but found "${proxySettings.host}".`);
    }
    if (tlsSettings) {
        logger.warning("TLS settings are not supported in combination with custom Proxy, certificates provided to the client will be ignored.");
    }
    const proxyAgentOptions = {
        hostname: parsedProxyUrl.hostname,
        port: proxySettings.port,
        protocol: parsedProxyUrl.protocol,
        headers: headers.toJSON(),
    };
    if (proxySettings.username && proxySettings.password) {
        proxyAgentOptions.auth = `${proxySettings.username}:${proxySettings.password}`;
    }
    else if (proxySettings.username) {
        proxyAgentOptions.auth = `${proxySettings.username}`;
    }
    return proxyAgentOptions;
}
function setProxyAgentOnRequest(request, cachedAgents) {
    // Custom Agent should take precedence so if one is present
    // we should skip to avoid overwriting it.
    if (request.agent) {
        return;
    }
    const url = new URL(request.url);
    const isInsecure = url.protocol !== "https:";
    const proxySettings = request.proxySettings;
    if (proxySettings) {
        if (isInsecure) {
            if (!cachedAgents.httpProxyAgent) {
                const proxyAgentOptions = getProxyAgentOptions(proxySettings, request);
                cachedAgents.httpProxyAgent = new httpProxyAgent.HttpProxyAgent(proxyAgentOptions);
            }
            request.agent = cachedAgents.httpProxyAgent;
        }
        else {
            if (!cachedAgents.httpsProxyAgent) {
                const proxyAgentOptions = getProxyAgentOptions(proxySettings, request);
                cachedAgents.httpsProxyAgent = new httpsProxyAgent.HttpsProxyAgent(proxyAgentOptions);
            }
            request.agent = cachedAgents.httpsProxyAgent;
        }
    }
}
/**
 * A policy that allows one to apply proxy settings to all requests.
 * If not passed static settings, they will be retrieved from the HTTPS_PROXY
 * or HTTP_PROXY environment variables.
 * @param proxySettings - ProxySettings to use on each request.
 * @param options - additional settings, for example, custom NO_PROXY patterns
 */
function proxyPolicy(proxySettings = getDefaultProxySettings(), options) {
    if (!noProxyListLoaded) {
        globalNoProxyList.push(...loadNoProxy());
    }
    const cachedAgents = {};
    return {
        name: proxyPolicyName,
        async sendRequest(request, next) {
            var _a;
            if (!request.proxySettings &&
                !isBypassed(request.url, (_a = options === null || options === void 0 ? void 0 : options.customNoProxyList) !== null && _a !== void 0 ? _a : globalNoProxyList, (options === null || options === void 0 ? void 0 : options.customNoProxyList) ? undefined : globalBypassedMap)) {
                request.proxySettings = proxySettings;
            }
            if (request.proxySettings) {
                setProxyAgentOnRequest(request, cachedAgents);
            }
            return next(request);
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * The programmatic identifier of the setClientRequestIdPolicy.
 */
const setClientRequestIdPolicyName = "setClientRequestIdPolicy";
/**
 * Each PipelineRequest gets a unique id upon creation.
 * This policy passes that unique id along via an HTTP header to enable better
 * telemetry and tracing.
 * @param requestIdHeaderName - The name of the header to pass the request ID to.
 */
function setClientRequestIdPolicy(requestIdHeaderName = "x-ms-client-request-id") {
    return {
        name: setClientRequestIdPolicyName,
        async sendRequest(request, next) {
            if (!request.headers.has(requestIdHeaderName)) {
                request.headers.set(requestIdHeaderName, request.requestId);
            }
            return next(request);
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Name of the TLS Policy
 */
const tlsPolicyName = "tlsPolicy";
/**
 * Gets a pipeline policy that adds the client certificate to the HttpClient agent for authentication.
 */
function tlsPolicy(tlsSettings) {
    return {
        name: tlsPolicyName,
        sendRequest: async (req, next) => {
            // Users may define a request tlsSettings, honor those over the client level one
            if (!req.tlsSettings) {
                req.tlsSettings = tlsSettings;
            }
            return next(req);
        },
    };
}

// Copyright (c) Microsoft Corporation.
const custom = util.inspect.custom;

// Copyright (c) Microsoft Corporation.
const errorSanitizer = new Sanitizer();
/**
 * A custom error type for failed pipeline requests.
 */
class RestError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = "RestError";
        this.code = options.code;
        this.statusCode = options.statusCode;
        this.request = options.request;
        this.response = options.response;
        Object.setPrototypeOf(this, RestError.prototype);
    }
    /**
     * Logging method for util.inspect in Node
     */
    [custom]() {
        return `RestError: ${this.message} \n ${errorSanitizer.sanitize(this)}`;
    }
}
/**
 * Something went wrong when making the request.
 * This means the actual request failed for some reason,
 * such as a DNS issue or the connection being lost.
 */
RestError.REQUEST_SEND_ERROR = "REQUEST_SEND_ERROR";
/**
 * This means that parsing the response from the server failed.
 * It may have been malformed.
 */
RestError.PARSE_ERROR = "PARSE_ERROR";
/**
 * Typeguard for RestError
 * @param e - Something caught by a catch clause.
 */
function isRestError(e) {
    if (e instanceof RestError) {
        return true;
    }
    return coreUtil.isError(e) && e.name === "RestError";
}

// Copyright (c) Microsoft Corporation.
/**
 * The programmatic identifier of the tracingPolicy.
 */
const tracingPolicyName = "tracingPolicy";
/**
 * A simple policy to create OpenTelemetry Spans for each request made by the pipeline
 * that has SpanOptions with a parent.
 * Requests made without a parent Span will not be recorded.
 * @param options - Options to configure the telemetry logged by the tracing policy.
 */
function tracingPolicy(options = {}) {
    const userAgent = getUserAgentValue(options.userAgentPrefix);
    const tracingClient = tryCreateTracingClient();
    return {
        name: tracingPolicyName,
        async sendRequest(request, next) {
            var _a, _b;
            if (!tracingClient || !((_a = request.tracingOptions) === null || _a === void 0 ? void 0 : _a.tracingContext)) {
                return next(request);
            }
            const { span, tracingContext } = (_b = tryCreateSpan(tracingClient, request, userAgent)) !== null && _b !== void 0 ? _b : {};
            if (!span || !tracingContext) {
                return next(request);
            }
            try {
                const response = await tracingClient.withContext(tracingContext, next, request);
                tryProcessResponse(span, response);
                return response;
            }
            catch (err) {
                tryProcessError(span, err);
                throw err;
            }
        },
    };
}
function tryCreateTracingClient() {
    try {
        return coreTracing.createTracingClient({
            namespace: "",
            packageName: "@azure/core-rest-pipeline",
            packageVersion: SDK_VERSION,
        });
    }
    catch (e) {
        logger.warning(`Error when creating the TracingClient: ${coreUtil.getErrorMessage(e)}`);
        return undefined;
    }
}
function tryCreateSpan(tracingClient, request, userAgent) {
    try {
        // As per spec, we do not need to differentiate between HTTP and HTTPS in span name.
        const { span, updatedOptions } = tracingClient.startSpan(`HTTP ${request.method}`, { tracingOptions: request.tracingOptions }, {
            spanKind: "client",
            spanAttributes: {
                "http.method": request.method,
                "http.url": request.url,
                requestId: request.requestId,
            },
        });
        // If the span is not recording, don't do any more work.
        if (!span.isRecording()) {
            span.end();
            return undefined;
        }
        if (userAgent) {
            span.setAttribute("http.user_agent", userAgent);
        }
        // set headers
        const headers = tracingClient.createRequestHeaders(updatedOptions.tracingOptions.tracingContext);
        for (const [key, value] of Object.entries(headers)) {
            request.headers.set(key, value);
        }
        return { span, tracingContext: updatedOptions.tracingOptions.tracingContext };
    }
    catch (e) {
        logger.warning(`Skipping creating a tracing span due to an error: ${coreUtil.getErrorMessage(e)}`);
        return undefined;
    }
}
function tryProcessError(span, error) {
    try {
        span.setStatus({
            status: "error",
            error: coreUtil.isError(error) ? error : undefined,
        });
        if (isRestError(error) && error.statusCode) {
            span.setAttribute("http.status_code", error.statusCode);
        }
        span.end();
    }
    catch (e) {
        logger.warning(`Skipping tracing span processing due to an error: ${coreUtil.getErrorMessage(e)}`);
    }
}
function tryProcessResponse(span, response) {
    try {
        span.setAttribute("http.status_code", response.status);
        const serviceRequestId = response.headers.get("x-ms-request-id");
        if (serviceRequestId) {
            span.setAttribute("serviceRequestId", serviceRequestId);
        }
        span.setStatus({
            status: "success",
        });
        span.end();
    }
    catch (e) {
        logger.warning(`Skipping tracing span processing due to an error: ${coreUtil.getErrorMessage(e)}`);
    }
}

// Copyright (c) Microsoft Corporation.
/**
 * Create a new pipeline with a default set of customizable policies.
 * @param options - Options to configure a custom pipeline.
 */
function createPipelineFromOptions(options) {
    const pipeline = createEmptyPipeline();
    if (coreUtil.isNode) {
        if (options.tlsOptions) {
            pipeline.addPolicy(tlsPolicy(options.tlsOptions));
        }
        pipeline.addPolicy(proxyPolicy(options.proxyOptions));
        pipeline.addPolicy(decompressResponsePolicy());
    }
    pipeline.addPolicy(formDataPolicy());
    pipeline.addPolicy(userAgentPolicy(options.userAgentOptions));
    pipeline.addPolicy(setClientRequestIdPolicy());
    pipeline.addPolicy(defaultRetryPolicy(options.retryOptions), { phase: "Retry" });
    pipeline.addPolicy(tracingPolicy(options.userAgentOptions), { afterPhase: "Retry" });
    if (coreUtil.isNode) {
        // Both XHR and Fetch expect to handle redirects automatically,
        // so only include this policy when we're in Node.
        pipeline.addPolicy(redirectPolicy(options.redirectOptions), { afterPhase: "Retry" });
    }
    pipeline.addPolicy(logPolicy(options.loggingOptions), { afterPhase: "Sign" });
    return pipeline;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
function normalizeName(name) {
    return name.toLowerCase();
}
function* headerIterator(map) {
    for (const entry of map.values()) {
        yield [entry.name, entry.value];
    }
}
class HttpHeadersImpl {
    constructor(rawHeaders) {
        this._headersMap = new Map();
        if (rawHeaders) {
            for (const headerName of Object.keys(rawHeaders)) {
                this.set(headerName, rawHeaders[headerName]);
            }
        }
    }
    /**
     * Set a header in this collection with the provided name and value. The name is
     * case-insensitive.
     * @param name - The name of the header to set. This value is case-insensitive.
     * @param value - The value of the header to set.
     */
    set(name, value) {
        this._headersMap.set(normalizeName(name), { name, value: String(value) });
    }
    /**
     * Get the header value for the provided header name, or undefined if no header exists in this
     * collection with the provided name.
     * @param name - The name of the header. This value is case-insensitive.
     */
    get(name) {
        var _a;
        return (_a = this._headersMap.get(normalizeName(name))) === null || _a === void 0 ? void 0 : _a.value;
    }
    /**
     * Get whether or not this header collection contains a header entry for the provided header name.
     * @param name - The name of the header to set. This value is case-insensitive.
     */
    has(name) {
        return this._headersMap.has(normalizeName(name));
    }
    /**
     * Remove the header with the provided headerName.
     * @param name - The name of the header to remove.
     */
    delete(name) {
        this._headersMap.delete(normalizeName(name));
    }
    /**
     * Get the JSON object representation of this HTTP header collection.
     */
    toJSON(options = {}) {
        const result = {};
        if (options.preserveCase) {
            for (const entry of this._headersMap.values()) {
                result[entry.name] = entry.value;
            }
        }
        else {
            for (const [normalizedName, entry] of this._headersMap) {
                result[normalizedName] = entry.value;
            }
        }
        return result;
    }
    /**
     * Get the string representation of this HTTP header collection.
     */
    toString() {
        return JSON.stringify(this.toJSON({ preserveCase: true }));
    }
    /**
     * Iterate over tuples of header [name, value] pairs.
     */
    [Symbol.iterator]() {
        return headerIterator(this._headersMap);
    }
}
/**
 * Creates an object that satisfies the `HttpHeaders` interface.
 * @param rawHeaders - A simple object representing initial headers
 */
function createHttpHeaders(rawHeaders) {
    return new HttpHeadersImpl(rawHeaders);
}

// Copyright (c) Microsoft Corporation.
const DEFAULT_TLS_SETTINGS = {};
function isReadableStream(body) {
    return body && typeof body.pipe === "function";
}
function isStreamComplete(stream) {
    return new Promise((resolve) => {
        stream.on("close", resolve);
        stream.on("end", resolve);
        stream.on("error", resolve);
    });
}
function isArrayBuffer(body) {
    return body && typeof body.byteLength === "number";
}
class ReportTransform extends stream.Transform {
    constructor(progressCallback) {
        super();
        this.loadedBytes = 0;
        this.progressCallback = progressCallback;
    }
    // eslint-disable-next-line @typescript-eslint/ban-types
    _transform(chunk, _encoding, callback) {
        this.push(chunk);
        this.loadedBytes += chunk.length;
        try {
            this.progressCallback({ loadedBytes: this.loadedBytes });
            callback();
        }
        catch (e) {
            callback(e);
        }
    }
}
/**
 * A HttpClient implementation that uses Node's "https" module to send HTTPS requests.
 * @internal
 */
class NodeHttpClient {
    constructor() {
        this.cachedHttpsAgents = new WeakMap();
    }
    /**
     * Makes a request over an underlying transport layer and returns the response.
     * @param request - The request to be made.
     */
    async sendRequest(request) {
        var _a, _b, _c;
        const abortController$1 = new abortController.AbortController();
        let abortListener;
        if (request.abortSignal) {
            if (request.abortSignal.aborted) {
                throw new abortController.AbortError("The operation was aborted.");
            }
            abortListener = (event) => {
                if (event.type === "abort") {
                    abortController$1.abort();
                }
            };
            request.abortSignal.addEventListener("abort", abortListener);
        }
        if (request.timeout > 0) {
            setTimeout(() => {
                abortController$1.abort();
            }, request.timeout);
        }
        const acceptEncoding = request.headers.get("Accept-Encoding");
        const shouldDecompress = (acceptEncoding === null || acceptEncoding === void 0 ? void 0 : acceptEncoding.includes("gzip")) || (acceptEncoding === null || acceptEncoding === void 0 ? void 0 : acceptEncoding.includes("deflate"));
        let body = typeof request.body === "function" ? request.body() : request.body;
        if (body && !request.headers.has("Content-Length")) {
            const bodyLength = getBodyLength(body);
            if (bodyLength !== null) {
                request.headers.set("Content-Length", bodyLength);
            }
        }
        let responseStream;
        try {
            if (body && request.onUploadProgress) {
                const onUploadProgress = request.onUploadProgress;
                const uploadReportStream = new ReportTransform(onUploadProgress);
                uploadReportStream.on("error", (e) => {
                    logger.error("Error in upload progress", e);
                });
                if (isReadableStream(body)) {
                    body.pipe(uploadReportStream);
                }
                else {
                    uploadReportStream.end(body);
                }
                body = uploadReportStream;
            }
            const res = await this.makeRequest(request, abortController$1, body);
            const headers = getResponseHeaders(res);
            const status = (_a = res.statusCode) !== null && _a !== void 0 ? _a : 0;
            const response = {
                status,
                headers,
                request,
            };
            // Responses to HEAD must not have a body.
            // If they do return a body, that body must be ignored.
            if (request.method === "HEAD") {
                res.destroy();
                return response;
            }
            responseStream = shouldDecompress ? getDecodedResponseStream(res, headers) : res;
            const onDownloadProgress = request.onDownloadProgress;
            if (onDownloadProgress) {
                const downloadReportStream = new ReportTransform(onDownloadProgress);
                downloadReportStream.on("error", (e) => {
                    logger.error("Error in download progress", e);
                });
                responseStream.pipe(downloadReportStream);
                responseStream = downloadReportStream;
            }
            if (
            // Value of POSITIVE_INFINITY in streamResponseStatusCodes is considered as any status code
            ((_b = request.streamResponseStatusCodes) === null || _b === void 0 ? void 0 : _b.has(Number.POSITIVE_INFINITY)) ||
                ((_c = request.streamResponseStatusCodes) === null || _c === void 0 ? void 0 : _c.has(response.status))) {
                response.readableStreamBody = responseStream;
            }
            else {
                response.bodyAsText = await streamToText(responseStream);
            }
            return response;
        }
        finally {
            // clean up event listener
            if (request.abortSignal && abortListener) {
                let uploadStreamDone = Promise.resolve();
                if (isReadableStream(body)) {
                    uploadStreamDone = isStreamComplete(body);
                }
                let downloadStreamDone = Promise.resolve();
                if (isReadableStream(responseStream)) {
                    downloadStreamDone = isStreamComplete(responseStream);
                }
                Promise.all([uploadStreamDone, downloadStreamDone])
                    .then(() => {
                    var _a;
                    // eslint-disable-next-line promise/always-return
                    if (abortListener) {
                        (_a = request.abortSignal) === null || _a === void 0 ? void 0 : _a.removeEventListener("abort", abortListener);
                    }
                })
                    .catch((e) => {
                    logger.warning("Error when cleaning up abortListener on httpRequest", e);
                });
            }
        }
    }
    makeRequest(request, abortController$1, body) {
        var _a;
        const url = new URL(request.url);
        const isInsecure = url.protocol !== "https:";
        if (isInsecure && !request.allowInsecureConnection) {
            throw new Error(`Cannot connect to ${request.url} while allowInsecureConnection is false.`);
        }
        const agent = (_a = request.agent) !== null && _a !== void 0 ? _a : this.getOrCreateAgent(request, isInsecure);
        const options = {
            agent,
            hostname: url.hostname,
            path: `${url.pathname}${url.search}`,
            port: url.port,
            method: request.method,
            headers: request.headers.toJSON({ preserveCase: true }),
        };
        return new Promise((resolve, reject) => {
            const req = isInsecure ? http__namespace.request(options, resolve) : https__namespace.request(options, resolve);
            req.once("error", (err) => {
                var _a;
                reject(new RestError(err.message, { code: (_a = err.code) !== null && _a !== void 0 ? _a : RestError.REQUEST_SEND_ERROR, request }));
            });
            abortController$1.signal.addEventListener("abort", () => {
                const abortError = new abortController.AbortError("The operation was aborted.");
                req.destroy(abortError);
                reject(abortError);
            });
            if (body && isReadableStream(body)) {
                body.pipe(req);
            }
            else if (body) {
                if (typeof body === "string" || Buffer.isBuffer(body)) {
                    req.end(body);
                }
                else if (isArrayBuffer(body)) {
                    req.end(ArrayBuffer.isView(body) ? Buffer.from(body.buffer) : Buffer.from(body));
                }
                else {
                    logger.error("Unrecognized body type", body);
                    reject(new RestError("Unrecognized body type"));
                }
            }
            else {
                // streams don't like "undefined" being passed as data
                req.end();
            }
        });
    }
    getOrCreateAgent(request, isInsecure) {
        var _a;
        const disableKeepAlive = request.disableKeepAlive;
        // Handle Insecure requests first
        if (isInsecure) {
            if (disableKeepAlive) {
                // keepAlive:false is the default so we don't need a custom Agent
                return http__namespace.globalAgent;
            }
            if (!this.cachedHttpAgent) {
                // If there is no cached agent create a new one and cache it.
                this.cachedHttpAgent = new http__namespace.Agent({ keepAlive: true });
            }
            return this.cachedHttpAgent;
        }
        else {
            if (disableKeepAlive && !request.tlsSettings) {
                // When there are no tlsSettings and keepAlive is false
                // we don't need a custom agent
                return https__namespace.globalAgent;
            }
            // We use the tlsSettings to index cached clients
            const tlsSettings = (_a = request.tlsSettings) !== null && _a !== void 0 ? _a : DEFAULT_TLS_SETTINGS;
            // Get the cached agent or create a new one with the
            // provided values for keepAlive and tlsSettings
            let agent = this.cachedHttpsAgents.get(tlsSettings);
            if (agent && agent.options.keepAlive === !disableKeepAlive) {
                return agent;
            }
            logger.info("No cached TLS Agent exist, creating a new Agent");
            agent = new https__namespace.Agent(Object.assign({ 
                // keepAlive is true if disableKeepAlive is false.
                keepAlive: !disableKeepAlive }, tlsSettings));
            this.cachedHttpsAgents.set(tlsSettings, agent);
            return agent;
        }
    }
}
function getResponseHeaders(res) {
    const headers = createHttpHeaders();
    for (const header of Object.keys(res.headers)) {
        const value = res.headers[header];
        if (Array.isArray(value)) {
            if (value.length > 0) {
                headers.set(header, value[0]);
            }
        }
        else if (value) {
            headers.set(header, value);
        }
    }
    return headers;
}
function getDecodedResponseStream(stream, headers) {
    const contentEncoding = headers.get("Content-Encoding");
    if (contentEncoding === "gzip") {
        const unzip = zlib__namespace.createGunzip();
        stream.pipe(unzip);
        return unzip;
    }
    else if (contentEncoding === "deflate") {
        const inflate = zlib__namespace.createInflate();
        stream.pipe(inflate);
        return inflate;
    }
    return stream;
}
function streamToText(stream) {
    return new Promise((resolve, reject) => {
        const buffer = [];
        stream.on("data", (chunk) => {
            if (Buffer.isBuffer(chunk)) {
                buffer.push(chunk);
            }
            else {
                buffer.push(Buffer.from(chunk));
            }
        });
        stream.on("end", () => {
            resolve(Buffer.concat(buffer).toString("utf8"));
        });
        stream.on("error", (e) => {
            if (e && (e === null || e === void 0 ? void 0 : e.name) === "AbortError") {
                reject(e);
            }
            else {
                reject(new RestError(`Error reading response as text: ${e.message}`, {
                    code: RestError.PARSE_ERROR,
                }));
            }
        });
    });
}
/** @internal */
function getBodyLength(body) {
    if (!body) {
        return 0;
    }
    else if (Buffer.isBuffer(body)) {
        return body.length;
    }
    else if (isReadableStream(body)) {
        return null;
    }
    else if (isArrayBuffer(body)) {
        return body.byteLength;
    }
    else if (typeof body === "string") {
        return Buffer.from(body).length;
    }
    else {
        return null;
    }
}
/**
 * Create a new HttpClient instance for the NodeJS environment.
 * @internal
 */
function createNodeHttpClient() {
    return new NodeHttpClient();
}

// Copyright (c) Microsoft Corporation.
/**
 * Create the correct HttpClient for the current environment.
 */
function createDefaultHttpClient() {
    return createNodeHttpClient();
}

// Copyright (c) Microsoft Corporation.
/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 * @internal
 */
function generateUuid() {
    return uuid.v4();
}

// Copyright (c) Microsoft Corporation.
class PipelineRequestImpl {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g;
        this.url = options.url;
        this.body = options.body;
        this.headers = (_a = options.headers) !== null && _a !== void 0 ? _a : createHttpHeaders();
        this.method = (_b = options.method) !== null && _b !== void 0 ? _b : "GET";
        this.timeout = (_c = options.timeout) !== null && _c !== void 0 ? _c : 0;
        this.formData = options.formData;
        this.disableKeepAlive = (_d = options.disableKeepAlive) !== null && _d !== void 0 ? _d : false;
        this.proxySettings = options.proxySettings;
        this.streamResponseStatusCodes = options.streamResponseStatusCodes;
        this.withCredentials = (_e = options.withCredentials) !== null && _e !== void 0 ? _e : false;
        this.abortSignal = options.abortSignal;
        this.tracingOptions = options.tracingOptions;
        this.onUploadProgress = options.onUploadProgress;
        this.onDownloadProgress = options.onDownloadProgress;
        this.requestId = options.requestId || generateUuid();
        this.allowInsecureConnection = (_f = options.allowInsecureConnection) !== null && _f !== void 0 ? _f : false;
        this.enableBrowserStreams = (_g = options.enableBrowserStreams) !== null && _g !== void 0 ? _g : false;
    }
}
/**
 * Creates a new pipeline request with the given options.
 * This method is to allow for the easy setting of default values and not required.
 * @param options - The options to create the request with.
 */
function createPipelineRequest(options) {
    return new PipelineRequestImpl(options);
}

// Copyright (c) Microsoft Corporation.
/**
 * The programmatic identifier of the exponentialRetryPolicy.
 */
const exponentialRetryPolicyName = "exponentialRetryPolicy";
/**
 * A policy that attempts to retry requests while introducing an exponentially increasing delay.
 * @param options - Options that configure retry logic.
 */
function exponentialRetryPolicy(options = {}) {
    var _a;
    return retryPolicy([
        exponentialRetryStrategy(Object.assign(Object.assign({}, options), { ignoreSystemErrors: true })),
    ], {
        maxRetries: (_a = options.maxRetries) !== null && _a !== void 0 ? _a : DEFAULT_RETRY_POLICY_COUNT,
    });
}

// Copyright (c) Microsoft Corporation.
/**
 * Name of the {@link systemErrorRetryPolicy}
 */
const systemErrorRetryPolicyName = "systemErrorRetryPolicy";
/**
 * A retry policy that specifically seeks to handle errors in the
 * underlying transport layer (e.g. DNS lookup failures) rather than
 * retryable error codes from the server itself.
 * @param options - Options that customize the policy.
 */
function systemErrorRetryPolicy(options = {}) {
    var _a;
    return {
        name: systemErrorRetryPolicyName,
        sendRequest: retryPolicy([
            exponentialRetryStrategy(Object.assign(Object.assign({}, options), { ignoreHttpStatusCodes: true })),
        ], {
            maxRetries: (_a = options.maxRetries) !== null && _a !== void 0 ? _a : DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}

// Copyright (c) Microsoft Corporation.
/**
 * Name of the {@link throttlingRetryPolicy}
 */
const throttlingRetryPolicyName = "throttlingRetryPolicy";
/**
 * A policy that retries when the server sends a 429 response with a Retry-After header.
 *
 * To learn more, please refer to
 * https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-manager-request-limits,
 * https://docs.microsoft.com/en-us/azure/azure-subscription-service-limits and
 * https://docs.microsoft.com/en-us/azure/virtual-machines/troubleshooting/troubleshooting-throttling-errors
 *
 * @param options - Options that configure retry logic.
 */
function throttlingRetryPolicy(options = {}) {
    var _a;
    return {
        name: throttlingRetryPolicyName,
        sendRequest: retryPolicy([throttlingRetryStrategy()], {
            maxRetries: (_a = options.maxRetries) !== null && _a !== void 0 ? _a : DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}

// Copyright (c) Microsoft Corporation.
// Default options for the cycler if none are provided
const DEFAULT_CYCLER_OPTIONS = {
    forcedRefreshWindowInMs: 1000,
    retryIntervalInMs: 3000,
    refreshWindowInMs: 1000 * 60 * 2, // Start refreshing 2m before expiry
};
/**
 * Converts an an unreliable access token getter (which may resolve with null)
 * into an AccessTokenGetter by retrying the unreliable getter in a regular
 * interval.
 *
 * @param getAccessToken - A function that produces a promise of an access token that may fail by returning null.
 * @param retryIntervalInMs - The time (in milliseconds) to wait between retry attempts.
 * @param refreshTimeout - The timestamp after which the refresh attempt will fail, throwing an exception.
 * @returns - A promise that, if it resolves, will resolve with an access token.
 */
async function beginRefresh(getAccessToken, retryIntervalInMs, refreshTimeout) {
    // This wrapper handles exceptions gracefully as long as we haven't exceeded
    // the timeout.
    async function tryGetAccessToken() {
        if (Date.now() < refreshTimeout) {
            try {
                return await getAccessToken();
            }
            catch (_a) {
                return null;
            }
        }
        else {
            const finalToken = await getAccessToken();
            // Timeout is up, so throw if it's still null
            if (finalToken === null) {
                throw new Error("Failed to refresh access token.");
            }
            return finalToken;
        }
    }
    let token = await tryGetAccessToken();
    while (token === null) {
        await delay(retryIntervalInMs);
        token = await tryGetAccessToken();
    }
    return token;
}
/**
 * Creates a token cycler from a credential, scopes, and optional settings.
 *
 * A token cycler represents a way to reliably retrieve a valid access token
 * from a TokenCredential. It will handle initializing the token, refreshing it
 * when it nears expiration, and synchronizes refresh attempts to avoid
 * concurrency hazards.
 *
 * @param credential - the underlying TokenCredential that provides the access
 * token
 * @param tokenCyclerOptions - optionally override default settings for the cycler
 *
 * @returns - a function that reliably produces a valid access token
 */
function createTokenCycler(credential, tokenCyclerOptions) {
    let refreshWorker = null;
    let token = null;
    let tenantId;
    const options = Object.assign(Object.assign({}, DEFAULT_CYCLER_OPTIONS), tokenCyclerOptions);
    /**
     * This little holder defines several predicates that we use to construct
     * the rules of refreshing the token.
     */
    const cycler = {
        /**
         * Produces true if a refresh job is currently in progress.
         */
        get isRefreshing() {
            return refreshWorker !== null;
        },
        /**
         * Produces true if the cycler SHOULD refresh (we are within the refresh
         * window and not already refreshing)
         */
        get shouldRefresh() {
            var _a;
            return (!cycler.isRefreshing &&
                ((_a = token === null || token === void 0 ? void 0 : token.expiresOnTimestamp) !== null && _a !== void 0 ? _a : 0) - options.refreshWindowInMs < Date.now());
        },
        /**
         * Produces true if the cycler MUST refresh (null or nearly-expired
         * token).
         */
        get mustRefresh() {
            return (token === null || token.expiresOnTimestamp - options.forcedRefreshWindowInMs < Date.now());
        },
    };
    /**
     * Starts a refresh job or returns the existing job if one is already
     * running.
     */
    function refresh(scopes, getTokenOptions) {
        var _a;
        if (!cycler.isRefreshing) {
            // We bind `scopes` here to avoid passing it around a lot
            const tryGetAccessToken = () => credential.getToken(scopes, getTokenOptions);
            // Take advantage of promise chaining to insert an assignment to `token`
            // before the refresh can be considered done.
            refreshWorker = beginRefresh(tryGetAccessToken, options.retryIntervalInMs, 
            // If we don't have a token, then we should timeout immediately
            (_a = token === null || token === void 0 ? void 0 : token.expiresOnTimestamp) !== null && _a !== void 0 ? _a : Date.now())
                .then((_token) => {
                refreshWorker = null;
                token = _token;
                tenantId = getTokenOptions.tenantId;
                return token;
            })
                .catch((reason) => {
                // We also should reset the refresher if we enter a failed state.  All
                // existing awaiters will throw, but subsequent requests will start a
                // new retry chain.
                refreshWorker = null;
                token = null;
                tenantId = undefined;
                throw reason;
            });
        }
        return refreshWorker;
    }
    return async (scopes, tokenOptions) => {
        //
        // Simple rules:
        // - If we MUST refresh, then return the refresh task, blocking
        //   the pipeline until a token is available.
        // - If we SHOULD refresh, then run refresh but don't return it
        //   (we can still use the cached token).
        // - Return the token, since it's fine if we didn't return in
        //   step 1.
        //
        // If the tenantId passed in token options is different to the one we have
        // Or if we are in claim challenge and the token was rejected and a new access token need to be issued, we need to
        // refresh the token with the new tenantId or token.
        const mustRefresh = tenantId !== tokenOptions.tenantId || Boolean(tokenOptions.claims) || cycler.mustRefresh;
        if (mustRefresh)
            return refresh(scopes, tokenOptions);
        if (cycler.shouldRefresh) {
            refresh(scopes, tokenOptions);
        }
        return token;
    };
}

// Copyright (c) Microsoft Corporation.
/**
 * The programmatic identifier of the bearerTokenAuthenticationPolicy.
 */
const bearerTokenAuthenticationPolicyName = "bearerTokenAuthenticationPolicy";
/**
 * Default authorize request handler
 */
async function defaultAuthorizeRequest(options) {
    const { scopes, getAccessToken, request } = options;
    const getTokenOptions = {
        abortSignal: request.abortSignal,
        tracingOptions: request.tracingOptions,
    };
    const accessToken = await getAccessToken(scopes, getTokenOptions);
    if (accessToken) {
        options.request.headers.set("Authorization", `Bearer ${accessToken.token}`);
    }
}
/**
 * We will retrieve the challenge only if the response status code was 401,
 * and if the response contained the header "WWW-Authenticate" with a non-empty value.
 */
function getChallenge(response) {
    const challenge = response.headers.get("WWW-Authenticate");
    if (response.status === 401 && challenge) {
        return challenge;
    }
    return;
}
/**
 * A policy that can request a token from a TokenCredential implementation and
 * then apply it to the Authorization header of a request as a Bearer token.
 */
function bearerTokenAuthenticationPolicy(options) {
    var _a;
    const { credential, scopes, challengeCallbacks } = options;
    const logger$1 = options.logger || logger;
    const callbacks = Object.assign({ authorizeRequest: (_a = challengeCallbacks === null || challengeCallbacks === void 0 ? void 0 : challengeCallbacks.authorizeRequest) !== null && _a !== void 0 ? _a : defaultAuthorizeRequest, authorizeRequestOnChallenge: challengeCallbacks === null || challengeCallbacks === void 0 ? void 0 : challengeCallbacks.authorizeRequestOnChallenge }, challengeCallbacks);
    // This function encapsulates the entire process of reliably retrieving the token
    // The options are left out of the public API until there's demand to configure this.
    // Remember to extend `BearerTokenAuthenticationPolicyOptions` with `TokenCyclerOptions`
    // in order to pass through the `options` object.
    const getAccessToken = credential
        ? createTokenCycler(credential /* , options */)
        : () => Promise.resolve(null);
    return {
        name: bearerTokenAuthenticationPolicyName,
        /**
         * If there's no challenge parameter:
         * - It will try to retrieve the token using the cache, or the credential's getToken.
         * - Then it will try the next policy with or without the retrieved token.
         *
         * It uses the challenge parameters to:
         * - Skip a first attempt to get the token from the credential if there's no cached token,
         *   since it expects the token to be retrievable only after the challenge.
         * - Prepare the outgoing request if the `prepareRequest` method has been provided.
         * - Send an initial request to receive the challenge if it fails.
         * - Process a challenge if the response contains it.
         * - Retrieve a token with the challenge information, then re-send the request.
         */
        async sendRequest(request, next) {
            if (!request.url.toLowerCase().startsWith("https://")) {
                throw new Error("Bearer token authentication is not permitted for non-TLS protected (non-https) URLs.");
            }
            await callbacks.authorizeRequest({
                scopes: Array.isArray(scopes) ? scopes : [scopes],
                request,
                getAccessToken,
                logger: logger$1,
            });
            let response;
            let error;
            try {
                response = await next(request);
            }
            catch (err) {
                error = err;
                response = err.response;
            }
            if (callbacks.authorizeRequestOnChallenge &&
                (response === null || response === void 0 ? void 0 : response.status) === 401 &&
                getChallenge(response)) {
                // processes challenge
                const shouldSendRequest = await callbacks.authorizeRequestOnChallenge({
                    scopes: Array.isArray(scopes) ? scopes : [scopes],
                    request,
                    response,
                    getAccessToken,
                    logger: logger$1,
                });
                if (shouldSendRequest) {
                    return next(request);
                }
            }
            if (error) {
                throw error;
            }
            else {
                return response;
            }
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * The programmatic identifier of the ndJsonPolicy.
 */
const ndJsonPolicyName = "ndJsonPolicy";
/**
 * ndJsonPolicy is a policy used to control keep alive settings for every request.
 */
function ndJsonPolicy() {
    return {
        name: ndJsonPolicyName,
        async sendRequest(request, next) {
            // There currently isn't a good way to bypass the serializer
            if (typeof request.body === "string" && request.body.startsWith("[")) {
                const body = JSON.parse(request.body);
                if (Array.isArray(body)) {
                    request.body = body.map((item) => JSON.stringify(item) + "\n").join("");
                }
            }
            return next(request);
        },
    };
}

exports.RestError = RestError;
exports.bearerTokenAuthenticationPolicy = bearerTokenAuthenticationPolicy;
exports.bearerTokenAuthenticationPolicyName = bearerTokenAuthenticationPolicyName;
exports.createDefaultHttpClient = createDefaultHttpClient;
exports.createEmptyPipeline = createEmptyPipeline;
exports.createHttpHeaders = createHttpHeaders;
exports.createPipelineFromOptions = createPipelineFromOptions;
exports.createPipelineRequest = createPipelineRequest;
exports.decompressResponsePolicy = decompressResponsePolicy;
exports.decompressResponsePolicyName = decompressResponsePolicyName;
exports.defaultRetryPolicy = defaultRetryPolicy;
exports.exponentialRetryPolicy = exponentialRetryPolicy;
exports.exponentialRetryPolicyName = exponentialRetryPolicyName;
exports.formDataPolicy = formDataPolicy;
exports.formDataPolicyName = formDataPolicyName;
exports.getDefaultProxySettings = getDefaultProxySettings;
exports.isRestError = isRestError;
exports.logPolicy = logPolicy;
exports.logPolicyName = logPolicyName;
exports.ndJsonPolicy = ndJsonPolicy;
exports.ndJsonPolicyName = ndJsonPolicyName;
exports.proxyPolicy = proxyPolicy;
exports.proxyPolicyName = proxyPolicyName;
exports.redirectPolicy = redirectPolicy;
exports.redirectPolicyName = redirectPolicyName;
exports.retryPolicy = retryPolicy;
exports.setClientRequestIdPolicy = setClientRequestIdPolicy;
exports.setClientRequestIdPolicyName = setClientRequestIdPolicyName;
exports.systemErrorRetryPolicy = systemErrorRetryPolicy;
exports.systemErrorRetryPolicyName = systemErrorRetryPolicyName;
exports.throttlingRetryPolicy = throttlingRetryPolicy;
exports.throttlingRetryPolicyName = throttlingRetryPolicyName;
exports.tlsPolicy = tlsPolicy;
exports.tlsPolicyName = tlsPolicyName;
exports.tracingPolicy = tracingPolicy;
exports.tracingPolicyName = tracingPolicyName;
exports.userAgentPolicy = userAgentPolicy;
exports.userAgentPolicyName = userAgentPolicyName;
//# sourceMappingURL=index.js.map
