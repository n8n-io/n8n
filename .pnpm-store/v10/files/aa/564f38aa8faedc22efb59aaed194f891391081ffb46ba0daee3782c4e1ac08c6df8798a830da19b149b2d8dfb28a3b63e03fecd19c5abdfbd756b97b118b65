"use strict";
/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gcpResidencyCache = exports.METADATA_SERVER_DETECTION = exports.HEADERS = exports.HEADER_VALUE = exports.HEADER_NAME = exports.SECONDARY_HOST_ADDRESS = exports.HOST_ADDRESS = exports.BASE_PATH = void 0;
exports.instance = instance;
exports.project = project;
exports.universe = universe;
exports.bulk = bulk;
exports.isAvailable = isAvailable;
exports.resetIsAvailableCache = resetIsAvailableCache;
exports.getGCPResidency = getGCPResidency;
exports.setGCPResidency = setGCPResidency;
exports.requestTimeout = requestTimeout;
const gaxios_1 = require("gaxios");
const jsonBigint = require("json-bigint");
const gcp_residency_1 = require("./gcp-residency");
const logger = require("google-logging-utils");
exports.BASE_PATH = '/computeMetadata/v1';
exports.HOST_ADDRESS = 'http://169.254.169.254';
exports.SECONDARY_HOST_ADDRESS = 'http://metadata.google.internal.';
exports.HEADER_NAME = 'Metadata-Flavor';
exports.HEADER_VALUE = 'Google';
exports.HEADERS = Object.freeze({ [exports.HEADER_NAME]: exports.HEADER_VALUE });
const log = logger.log('gcp metadata');
/**
 * Metadata server detection override options.
 *
 * Available via `process.env.METADATA_SERVER_DETECTION`.
 */
exports.METADATA_SERVER_DETECTION = Object.freeze({
    'assume-present': "don't try to ping the metadata server, but assume it's present",
    none: "don't try to ping the metadata server, but don't try to use it either",
    'bios-only': "treat the result of a BIOS probe as canonical (don't fall back to pinging)",
    'ping-only': 'skip the BIOS probe, and go straight to pinging',
});
/**
 * Returns the base URL while taking into account the GCE_METADATA_HOST
 * environment variable if it exists.
 *
 * @returns The base URL, e.g., http://169.254.169.254/computeMetadata/v1.
 */
function getBaseUrl(baseUrl) {
    if (!baseUrl) {
        baseUrl =
            process.env.GCE_METADATA_IP ||
                process.env.GCE_METADATA_HOST ||
                exports.HOST_ADDRESS;
    }
    // If no scheme is provided default to HTTP:
    if (!/^https?:\/\//.test(baseUrl)) {
        baseUrl = `http://${baseUrl}`;
    }
    return new URL(exports.BASE_PATH, baseUrl).href;
}
// Accepts an options object passed from the user to the API. In previous
// versions of the API, it referred to a `Request` or an `Axios` request
// options object.  Now it refers to an object with very limited property
// names. This is here to help ensure users don't pass invalid options when
// they  upgrade from 0.4 to 0.5 to 0.8.
function validate(options) {
    Object.keys(options).forEach(key => {
        switch (key) {
            case 'params':
            case 'property':
            case 'headers':
                break;
            case 'qs':
                throw new Error("'qs' is not a valid configuration option. Please use 'params' instead.");
            default:
                throw new Error(`'${key}' is not a valid configuration option.`);
        }
    });
}
async function metadataAccessor(type, options = {}, noResponseRetries = 3, fastFail = false) {
    let metadataKey = '';
    let params = {};
    let headers = {};
    if (typeof type === 'object') {
        const metadataAccessor = type;
        metadataKey = metadataAccessor.metadataKey;
        params = metadataAccessor.params || params;
        headers = metadataAccessor.headers || headers;
        noResponseRetries = metadataAccessor.noResponseRetries || noResponseRetries;
        fastFail = metadataAccessor.fastFail || fastFail;
    }
    else {
        metadataKey = type;
    }
    if (typeof options === 'string') {
        metadataKey += `/${options}`;
    }
    else {
        validate(options);
        if (options.property) {
            metadataKey += `/${options.property}`;
        }
        headers = options.headers || headers;
        params = options.params || params;
    }
    const requestMethod = fastFail ? fastFailMetadataRequest : gaxios_1.request;
    const req = {
        url: `${getBaseUrl()}/${metadataKey}`,
        headers: { ...exports.HEADERS, ...headers },
        retryConfig: { noResponseRetries },
        params,
        responseType: 'text',
        timeout: requestTimeout(),
    };
    log.info('instance request %j', req);
    const res = await requestMethod(req);
    log.info('instance metadata is %s', res.data);
    // NOTE: node.js converts all incoming headers to lower case.
    if (res.headers[exports.HEADER_NAME.toLowerCase()] !== exports.HEADER_VALUE) {
        throw new Error(`Invalid response from metadata service: incorrect ${exports.HEADER_NAME} header. Expected '${exports.HEADER_VALUE}', got ${res.headers[exports.HEADER_NAME.toLowerCase()] ? `'${res.headers[exports.HEADER_NAME.toLowerCase()]}'` : 'no header'}`);
    }
    if (typeof res.data === 'string') {
        try {
            return jsonBigint.parse(res.data);
        }
        catch (_a) {
            /* ignore */
        }
    }
    return res.data;
}
async function fastFailMetadataRequest(options) {
    var _a;
    const secondaryOptions = {
        ...options,
        url: (_a = options.url) === null || _a === void 0 ? void 0 : _a.toString().replace(getBaseUrl(), getBaseUrl(exports.SECONDARY_HOST_ADDRESS)),
    };
    // We race a connection between DNS/IP to metadata server. There are a couple
    // reasons for this:
    //
    // 1. the DNS is slow in some GCP environments; by checking both, we might
    //    detect the runtime environment signficantly faster.
    // 2. we can't just check the IP, which is tarpitted and slow to respond
    //    on a user's local machine.
    //
    // Additional logic has been added to make sure that we don't create an
    // unhandled rejection in scenarios where a failure happens sometime
    // after a success.
    //
    // Note, however, if a failure happens prior to a success, a rejection should
    // occur, this is for folks running locally.
    //
    let responded = false;
    const r1 = (0, gaxios_1.request)(options)
        .then(res => {
        responded = true;
        return res;
    })
        .catch(err => {
        if (responded) {
            return r2;
        }
        else {
            responded = true;
            throw err;
        }
    });
    const r2 = (0, gaxios_1.request)(secondaryOptions)
        .then(res => {
        responded = true;
        return res;
    })
        .catch(err => {
        if (responded) {
            return r1;
        }
        else {
            responded = true;
            throw err;
        }
    });
    return Promise.race([r1, r2]);
}
/**
 * Obtain metadata for the current GCE instance.
 *
 * @see {@link https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys}
 *
 * @example
 * ```
 * const serviceAccount: {} = await instance('service-accounts/');
 * const serviceAccountEmail: string = await instance('service-accounts/default/email');
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function instance(options) {
    return metadataAccessor('instance', options);
}
/**
 * Obtain metadata for the current GCP project.
 *
 * @see {@link https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys}
 *
 * @example
 * ```
 * const projectId: string = await project('project-id');
 * const numericProjectId: number = await project('numeric-project-id');
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function project(options) {
    return metadataAccessor('project', options);
}
/**
 * Obtain metadata for the current universe.
 *
 * @see {@link https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys}
 *
 * @example
 * ```
 * const universeDomain: string = await universe('universe-domain');
 * ```
 */
function universe(options) {
    return metadataAccessor('universe', options);
}
/**
 * Retrieve metadata items in parallel.
 *
 * @see {@link https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys}
 *
 * @example
 * ```
 * const data = await bulk([
 *   {
 *     metadataKey: 'instance',
 *   },
 *   {
 *     metadataKey: 'project/project-id',
 *   },
 * ] as const);
 *
 * // data.instance;
 * // data['project/project-id'];
 * ```
 *
 * @param properties The metadata properties to retrieve
 * @returns The metadata in `metadatakey:value` format
 */
async function bulk(properties) {
    const r = {};
    await Promise.all(properties.map(item => {
        return (async () => {
            const res = await metadataAccessor(item);
            const key = item.metadataKey;
            r[key] = res;
        })();
    }));
    return r;
}
/*
 * How many times should we retry detecting GCP environment.
 */
function detectGCPAvailableRetries() {
    return process.env.DETECT_GCP_RETRIES
        ? Number(process.env.DETECT_GCP_RETRIES)
        : 0;
}
let cachedIsAvailableResponse;
/**
 * Determine if the metadata server is currently available.
 */
async function isAvailable() {
    if (process.env.METADATA_SERVER_DETECTION) {
        const value = process.env.METADATA_SERVER_DETECTION.trim().toLocaleLowerCase();
        if (!(value in exports.METADATA_SERVER_DETECTION)) {
            throw new RangeError(`Unknown \`METADATA_SERVER_DETECTION\` env variable. Got \`${value}\`, but it should be \`${Object.keys(exports.METADATA_SERVER_DETECTION).join('`, `')}\`, or unset`);
        }
        switch (value) {
            case 'assume-present':
                return true;
            case 'none':
                return false;
            case 'bios-only':
                return getGCPResidency();
            case 'ping-only':
            // continue, we want to ping the server
        }
    }
    try {
        // If a user is instantiating several GCP libraries at the same time,
        // this may result in multiple calls to isAvailable(), to detect the
        // runtime environment. We use the same promise for each of these calls
        // to reduce the network load.
        if (cachedIsAvailableResponse === undefined) {
            cachedIsAvailableResponse = metadataAccessor('instance', undefined, detectGCPAvailableRetries(), 
            // If the default HOST_ADDRESS has been overridden, we should not
            // make an effort to try SECONDARY_HOST_ADDRESS (as we are likely in
            // a non-GCP environment):
            !(process.env.GCE_METADATA_IP || process.env.GCE_METADATA_HOST));
        }
        await cachedIsAvailableResponse;
        return true;
    }
    catch (e) {
        const err = e;
        if (process.env.DEBUG_AUTH) {
            console.info(err);
        }
        if (err.type === 'request-timeout') {
            // If running in a GCP environment, metadata endpoint should return
            // within ms.
            return false;
        }
        if (err.response && err.response.status === 404) {
            return false;
        }
        else {
            if (!(err.response && err.response.status === 404) &&
                // A warning is emitted if we see an unexpected err.code, or err.code
                // is not populated:
                (!err.code ||
                    ![
                        'EHOSTDOWN',
                        'EHOSTUNREACH',
                        'ENETUNREACH',
                        'ENOENT',
                        'ENOTFOUND',
                        'ECONNREFUSED',
                    ].includes(err.code))) {
                let code = 'UNKNOWN';
                if (err.code)
                    code = err.code;
                process.emitWarning(`received unexpected error = ${err.message} code = ${code}`, 'MetadataLookupWarning');
            }
            // Failure to resolve the metadata service means that it is not available.
            return false;
        }
    }
}
/**
 * reset the memoized isAvailable() lookup.
 */
function resetIsAvailableCache() {
    cachedIsAvailableResponse = undefined;
}
/**
 * A cache for the detected GCP Residency.
 */
exports.gcpResidencyCache = null;
/**
 * Detects GCP Residency.
 * Caches results to reduce costs for subsequent calls.
 *
 * @see setGCPResidency for setting
 */
function getGCPResidency() {
    if (exports.gcpResidencyCache === null) {
        setGCPResidency();
    }
    return exports.gcpResidencyCache;
}
/**
 * Sets the detected GCP Residency.
 * Useful for forcing metadata server detection behavior.
 *
 * Set `null` to autodetect the environment (default behavior).
 * @see getGCPResidency for getting
 */
function setGCPResidency(value = null) {
    exports.gcpResidencyCache = value !== null ? value : (0, gcp_residency_1.detectGCPResidency)();
}
/**
 * Obtain the timeout for requests to the metadata server.
 *
 * In certain environments and conditions requests can take longer than
 * the default timeout to complete. This function will determine the
 * appropriate timeout based on the environment.
 *
 * @returns {number} a request timeout duration in milliseconds.
 */
function requestTimeout() {
    return getGCPResidency() ? 0 : 3000;
}
__exportStar(require("./gcp-residency"), exports);
//# sourceMappingURL=index.js.map