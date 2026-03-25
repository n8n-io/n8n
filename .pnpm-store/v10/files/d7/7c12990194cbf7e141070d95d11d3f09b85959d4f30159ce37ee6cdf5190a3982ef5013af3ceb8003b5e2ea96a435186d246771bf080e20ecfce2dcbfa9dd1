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
const transporters_1 = require("../transporters");
const util_1 = require("../util");
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
class AuthClient extends events_1.EventEmitter {
    constructor(opts = {}) {
        var _a, _b, _c, _d, _e;
        super();
        this.credentials = {};
        this.eagerRefreshThresholdMillis = exports.DEFAULT_EAGER_REFRESH_THRESHOLD_MILLIS;
        this.forceRefreshOnFailure = false;
        this.universeDomain = exports.DEFAULT_UNIVERSE;
        const options = (0, util_1.originalOrCamelOptions)(opts);
        // Shared auth options
        this.apiKey = opts.apiKey;
        this.projectId = (_a = options.get('project_id')) !== null && _a !== void 0 ? _a : null;
        this.quotaProjectId = options.get('quota_project_id');
        this.credentials = (_b = options.get('credentials')) !== null && _b !== void 0 ? _b : {};
        this.universeDomain = (_c = options.get('universe_domain')) !== null && _c !== void 0 ? _c : exports.DEFAULT_UNIVERSE;
        // Shared client options
        this.transporter = (_d = opts.transporter) !== null && _d !== void 0 ? _d : new transporters_1.DefaultTransporter();
        if (opts.transporterOptions) {
            this.transporter.defaults = opts.transporterOptions;
        }
        if (opts.eagerRefreshThresholdMillis) {
            this.eagerRefreshThresholdMillis = opts.eagerRefreshThresholdMillis;
        }
        this.forceRefreshOnFailure = (_e = opts.forceRefreshOnFailure) !== null && _e !== void 0 ? _e : false;
    }
    /**
     * Return the {@link Gaxios `Gaxios`} instance from the {@link AuthClient.transporter}.
     *
     * @expiremental
     */
    get gaxios() {
        if (this.transporter instanceof gaxios_1.Gaxios) {
            return this.transporter;
        }
        else if (this.transporter instanceof transporters_1.DefaultTransporter) {
            return this.transporter.instance;
        }
        else if ('instance' in this.transporter &&
            this.transporter.instance instanceof gaxios_1.Gaxios) {
            return this.transporter.instance;
        }
        return null;
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
        if (!headers['x-goog-user-project'] && // don't override a value the user sets.
            this.quotaProjectId) {
            headers['x-goog-user-project'] = this.quotaProjectId;
        }
        return headers;
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
