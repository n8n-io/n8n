"use strict";
// Copyright 2012 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthClient = exports.DEFAULT_EAGER_REFRESH_THRESHOLD_MILLIS = exports.DEFAULT_UNIVERSE = void 0;
const events_1 = require("events");
const gaxios_1 = require("gaxios");
const util_1 = require("../util");
const google_logging_utils_1 = require("google-logging-utils");
const shared_cjs_1 = require("../shared.cjs");
/**
 * The default cloud universe
 *
 * @see {@link AuthJSONOptions.universe_domain}
 */
exports.DEFAULT_UNIVERSE = 'googleapis.com';
/**
 * The default {@link AuthClientOptions.eagerRefreshThresholdMillis}
 */
exports.DEFAULT_EAGER_REFRESH_THRESHOLD_MILLIS = 5 * 60 * 1000;
/**
 * The base of all Auth Clients.
 */
class AuthClient extends events_1.EventEmitter {
    apiKey;
    projectId;
    /**
     * The quota project ID. The quota project can be used by client libraries for the billing purpose.
     * See {@link https://cloud.google.com/docs/quota Working with quotas}
     */
    quotaProjectId;
    /**
     * The {@link Gaxios `Gaxios`} instance used for making requests.
     */
    transporter;
    credentials = {};
    eagerRefreshThresholdMillis = exports.DEFAULT_EAGER_REFRESH_THRESHOLD_MILLIS;
    forceRefreshOnFailure = false;
    universeDomain = exports.DEFAULT_UNIVERSE;
    /**
     * Symbols that can be added to GaxiosOptions to specify the method name that is
     * making an RPC call, for logging purposes, as well as a string ID that can be
     * used to correlate calls and responses.
     */
    static RequestMethodNameSymbol = Symbol('request method name');
    static RequestLogIdSymbol = Symbol('request log id');
    constructor(opts = {}) {
        super();
        const options = (0, util_1.originalOrCamelOptions)(opts);
        // Shared auth options
        this.apiKey = opts.apiKey;
        this.projectId = options.get('project_id') ?? null;
        this.quotaProjectId = options.get('quota_project_id');
        this.credentials = options.get('credentials') ?? {};
        this.universeDomain = options.get('universe_domain') ?? exports.DEFAULT_UNIVERSE;
        // Shared client options
        this.transporter = opts.transporter ?? new gaxios_1.Gaxios(opts.transporterOptions);
        if (options.get('useAuthRequestParameters') !== false) {
            this.transporter.interceptors.request.add(AuthClient.DEFAULT_REQUEST_INTERCEPTOR);
            this.transporter.interceptors.response.add(AuthClient.DEFAULT_RESPONSE_INTERCEPTOR);
        }
        if (opts.eagerRefreshThresholdMillis) {
            this.eagerRefreshThresholdMillis = opts.eagerRefreshThresholdMillis;
        }
        this.forceRefreshOnFailure = opts.forceRefreshOnFailure ?? false;
    }
    /**
     * A {@link fetch `fetch`} compliant API for {@link AuthClient}.
     *
     * @see {@link AuthClient.request} for the classic method.
     *
     * @remarks
     *
     * This is useful as a drop-in replacement for `fetch` API usage.
     *
     * @example
     *
     * ```ts
     * const authClient = new AuthClient();
     * const fetchWithAuthClient: typeof fetch = (...args) => authClient.fetch(...args);
     * await fetchWithAuthClient('https://example.com');
     * ```
     *
     * @param args `fetch` API or {@link Gaxios.fetch `Gaxios#fetch`} parameters
     * @returns the {@link GaxiosResponse} with Gaxios-added properties
     */
    fetch(...args) {
        // Up to 2 parameters in either overload
        const input = args[0];
        const init = args[1];
        let url = undefined;
        const headers = new Headers();
        // prepare URL
        if (typeof input === 'string') {
            url = new URL(input);
        }
        else if (input instanceof URL) {
            url = input;
        }
        else if (input && input.url) {
            url = new URL(input.url);
        }
        // prepare headers
        if (input && typeof input === 'object' && 'headers' in input) {
            gaxios_1.Gaxios.mergeHeaders(headers, input.headers);
        }
        if (init) {
            gaxios_1.Gaxios.mergeHeaders(headers, new Headers(init.headers));
        }
        // prepare request
        if (typeof input === 'object' && !(input instanceof URL)) {
            // input must have been a non-URL object
            return this.request({ ...init, ...input, headers, url });
        }
        else {
            // input must have been a string or URL
            return this.request({ ...init, headers, url });
        }
    }
    /**
     * Sets the auth credentials.
     */
    setCredentials(credentials) {
        this.credentials = credentials;
    }
    /**
     * Append additional headers, e.g., x-goog-user-project, shared across the
     * classes inheriting AuthClient. This method should be used by any method
     * that overrides getRequestMetadataAsync(), which is a shared helper for
     * setting request information in both gRPC and HTTP API calls.
     *
     * @param headers object to append additional headers to.
     */
    addSharedMetadataHeaders(headers) {
        // quota_project_id, stored in application_default_credentials.json, is set in
        // the x-goog-user-project header, to indicate an alternate account for
        // billing and quota:
        if (!headers.has('x-goog-user-project') && // don't override a value the user sets.
            this.quotaProjectId) {
            headers.set('x-goog-user-project', this.quotaProjectId);
        }
        return headers;
    }
    /**
     * Adds the `x-goog-user-project` and `authorization` headers to the target Headers
     * object, if they exist on the source.
     *
     * @param target the headers to target
     * @param source the headers to source from
     * @returns the target headers
     */
    addUserProjectAndAuthHeaders(target, source) {
        const xGoogUserProject = source.get('x-goog-user-project');
        const authorizationHeader = source.get('authorization');
        if (xGoogUserProject) {
            target.set('x-goog-user-project', xGoogUserProject);
        }
        if (authorizationHeader) {
            target.set('authorization', authorizationHeader);
        }
        return target;
    }
    static log = (0, google_logging_utils_1.log)('auth');
    static DEFAULT_REQUEST_INTERCEPTOR = {
        resolved: async (config) => {
            // Set `x-goog-api-client`, if not already set
            if (!config.headers.has('x-goog-api-client')) {
                const nodeVersion = process.version.replace(/^v/, '');
                config.headers.set('x-goog-api-client', `gl-node/${nodeVersion}`);
            }
            // Set `User-Agent`
            const userAgent = config.headers.get('User-Agent');
            if (!userAgent) {
                config.headers.set('User-Agent', shared_cjs_1.USER_AGENT);
            }
            else if (!userAgent.includes(`${shared_cjs_1.PRODUCT_NAME}/`)) {
                config.headers.set('User-Agent', `${userAgent} ${shared_cjs_1.USER_AGENT}`);
            }
            try {
                const symbols = config;
                const methodName = symbols[AuthClient.RequestMethodNameSymbol];
                // This doesn't need to be very unique or interesting, it's just an aid for
                // matching requests to responses.
                const logId = `${Math.floor(Math.random() * 1000)}`;
                symbols[AuthClient.RequestLogIdSymbol] = logId;
                // Boil down the object we're printing out.
                const logObject = {
                    url: config.url,
                    headers: config.headers,
                };
                if (methodName) {
                    AuthClient.log.info('%s [%s] request %j', methodName, logId, logObject);
                }
                else {
                    AuthClient.log.info('[%s] request %j', logId, logObject);
                }
            }
            catch (e) {
                // Logging must not create new errors; swallow them all.
            }
            return config;
        },
    };
    static DEFAULT_RESPONSE_INTERCEPTOR = {
        resolved: async (response) => {
            try {
                const symbols = response.config;
                const methodName = symbols[AuthClient.RequestMethodNameSymbol];
                const logId = symbols[AuthClient.RequestLogIdSymbol];
                if (methodName) {
                    AuthClient.log.info('%s [%s] response %j', methodName, logId, response.data);
                }
                else {
                    AuthClient.log.info('[%s] response %j', logId, response.data);
                }
            }
            catch (e) {
                // Logging must not create new errors; swallow them all.
            }
            return response;
        },
        rejected: async (error) => {
            try {
                const symbols = error.config;
                const methodName = symbols[AuthClient.RequestMethodNameSymbol];
                const logId = symbols[AuthClient.RequestLogIdSymbol];
                if (methodName) {
                    AuthClient.log.info('%s [%s] error %j', methodName, logId, error.response?.data);
                }
                else {
                    AuthClient.log.error('[%s] error %j', logId, error.response?.data);
                }
            }
            catch (e) {
                // Logging must not create new errors; swallow them all.
            }
            // Re-throw the error.
            throw error;
        },
    };
    /**
     * Sets the method name that is making a Gaxios request, so that logging may tag
     * log lines with the operation.
     * @param config A Gaxios request config
     * @param methodName The method name making the call
     */
    static setMethodName(config, methodName) {
        try {
            const symbols = config;
            symbols[AuthClient.RequestMethodNameSymbol] = methodName;
        }
        catch (e) {
            // Logging must not create new errors; swallow them all.
        }
    }
    /**
     * Retry config for Auth-related requests.
     *
     * @remarks
     *
     * This is not a part of the default {@link AuthClient.transporter transporter/gaxios}
     * config as some downstream APIs would prefer if customers explicitly enable retries,
     * such as GCS.
     */
    static get RETRY_CONFIG() {
        return {
            retry: true,
            retryConfig: {
                httpMethodsToRetry: ['GET', 'PUT', 'POST', 'HEAD', 'OPTIONS', 'DELETE'],
            },
        };
    }
}
exports.AuthClient = AuthClient;
//# sourceMappingURL=authclient.js.map