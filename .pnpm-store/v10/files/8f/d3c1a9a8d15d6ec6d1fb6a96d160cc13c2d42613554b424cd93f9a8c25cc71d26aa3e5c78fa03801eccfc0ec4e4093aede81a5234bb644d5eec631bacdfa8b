"use strict";
// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsClient = void 0;
/* global window */
const gax = require("./gax");
const warnings_1 = require("./warnings");
const createApiCall_1 = require("./createApiCall");
const routingHeader = require("./routingHeader");
const pageDescriptor_1 = require("./paginationCalls/pageDescriptor");
const jsonProtos = require("../protos/locations.json");
/**
 * This file defines retry strategy and timeouts for all API methods in this library.
 */
const gapicConfig = require("./locations_client_config.json");
const version = require('../../package.json').version;
/**
 *  Google Cloud Locations Client.
 *  This is manually written for providing methods [listLocations, getLocations] to the generated client.
 */
class LocationsClient {
    /**
     * Construct an instance of LocationsClient.
     *
     * @param {object} [options] - The configuration object.
     * The options accepted by the constructor are described in detail
     * in [this document](https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#creating-the-client-instance).
     * The common options are:
     * @param {object} [options.credentials] - Credentials object.
     * @param {string} [options.credentials.client_email]
     * @param {string} [options.credentials.private_key]
     * @param {string} [options.email] - Account email address. Required when
     *     using a .pem or .p12 keyFilename.
     * @param {string} [options.keyFilename] - Full path to the a .json, .pem, or
     *     .p12 key downloaded from the Google Developers Console. If you provide
     *     a path to a JSON file, the projectId option below is not necessary.
     *     NOTE: .pem and .p12 require you to specify options.email as well.
     * @param {number} [options.port] - The port on which to connect to
     *     the remote host.
     * @param {string} [options.projectId] - The project ID from the Google
     *     Developer's Console, e.g. 'grape-spaceship-123'. We will also check
     *     the environment variable GCLOUD_PROJECT for your project ID. If your
     *     app is running in an environment which supports
     *     {@link https://developers.google.com/identity/protocols/application-default-credentials Application Default Credentials},
     *     your project ID will be detected automatically.
     * @param {string} [options.apiEndpoint] - The domain name of the
     *     API remote host.
     * @param {gax.ClientConfig} [options.clientConfig] - Client configuration override.
     *     Follows the structure of {@link gapicConfig}.
     * @param {boolean} [options.fallback] - Use HTTP fallback mode.
     *     In fallback mode, a special browser-compatible transport implementation is used
     *     instead of gRPC transport. In browser context (if the `window` object is defined)
     *     the fallback mode is enabled automatically; set `options.fallback` to `false`
     *     if you need to override this behavior.
     */
    constructor(gaxGrpc, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    opts) {
        var _a, _b;
        this._terminated = false;
        this.descriptors = {
            page: {},
            stream: {},
            longrunning: {},
            batching: {},
        };
        // Ensure that options include all the required fields.
        this.gaxGrpc = gaxGrpc;
        const staticMembers = this.constructor;
        const servicePath = (opts === null || opts === void 0 ? void 0 : opts.servicePath) || (opts === null || opts === void 0 ? void 0 : opts.apiEndpoint) || staticMembers.servicePath;
        this._providedCustomServicePath = !!((opts === null || opts === void 0 ? void 0 : opts.servicePath) || (opts === null || opts === void 0 ? void 0 : opts.apiEndpoint));
        const port = (opts === null || opts === void 0 ? void 0 : opts.port) || staticMembers.port;
        const clientConfig = (_a = opts === null || opts === void 0 ? void 0 : opts.clientConfig) !== null && _a !== void 0 ? _a : {};
        const fallback = (_b = opts === null || opts === void 0 ? void 0 : opts.fallback) !== null && _b !== void 0 ? _b : (typeof window !== 'undefined' && typeof (window === null || window === void 0 ? void 0 : window.fetch) === 'function');
        opts = Object.assign({ servicePath, port, clientConfig, fallback }, opts);
        // If scopes are unset in options and we're connecting to a non-default endpoint, set scopes just in case.
        if (servicePath !== staticMembers.servicePath && !('scopes' in opts)) {
            opts['scopes'] = staticMembers.scopes;
        }
        // Save options to use in initialize() method.
        this._opts = opts;
        // Save the auth object to the client, for use by other methods.
        this.auth = gaxGrpc.auth;
        // Set the default scopes in auth client if needed.
        if (servicePath === staticMembers.servicePath) {
            this.auth.defaultScopes = staticMembers.scopes;
        }
        // Determine the client header string.
        const clientHeader = [`gax/${version}`, `gapic/${version}`];
        if (typeof process !== 'undefined' && 'versions' in process) {
            clientHeader.push(`gl-node/${process.versions.node}`);
        }
        else {
            clientHeader.push(`gl-web/${version}`);
        }
        if (!opts.fallback) {
            clientHeader.push(`grpc/${gaxGrpc.grpcVersion}`);
        }
        else if (opts.fallback === 'rest') {
            clientHeader.push(`rest/${gaxGrpc.grpcVersion}`);
        }
        if (opts.libName && opts.libVersion) {
            clientHeader.push(`${opts.libName}/${opts.libVersion}`);
        }
        // Load the applicable protos.
        this._protos = gaxGrpc.loadProtoJSON(jsonProtos);
        // Some of the methods on this service return "paged" results,
        // (e.g. 50 results at a time, with tokens to get subsequent
        // pages). Denote the keys used for pagination and results.
        this.descriptors.page = {
            listLocations: new pageDescriptor_1.PageDescriptor('pageToken', 'nextPageToken', 'locations'),
        };
        // Put together the default options sent with requests.
        this._defaults = gaxGrpc.constructSettings('google.cloud.location.Locations', gapicConfig, opts.clientConfig || {}, { 'x-goog-api-client': clientHeader.join(' ') });
        // Set up a dictionary of "inner API calls"; the core implementation
        // of calling the API is handled in `google-gax`, with this code
        // merely providing the destination and request information.
        this.innerApiCalls = {};
        // Add a warn function to the client constructor so it can be easily tested.
        this.warn = warnings_1.warn;
    }
    /**
     * Initialize the client.
     * Performs asynchronous operations (such as authentication) and prepares the client.
     * This function will be called automatically when any class method is called for the
     * first time, but if you need to initialize it before calling an actual method,
     * feel free to call initialize() directly.
     *
     * You can await on this method if you want to make sure the client is initialized.
     *
     * @returns {Promise} A promise that resolves to an authenticated service stub.
     */
    initialize() {
        // If the client stub promise is already initialized, return immediately.
        if (this.locationsStub) {
            return this.locationsStub;
        }
        // Put together the "service stub" for
        // google.cloud.location.Locations.
        this.locationsStub = this.gaxGrpc.createStub(this._opts.fallback
            ? this._protos.lookupService('google.cloud.location.Locations')
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this._protos.google.cloud.location.Locations, this._opts, this._providedCustomServicePath);
        // Iterate over each of the methods that the service provides
        // and create an API call method for each.
        const locationsStubMethods = ['listLocations', 'getLocation'];
        for (const methodName of locationsStubMethods) {
            const callPromise = this.locationsStub.then(stub => (...args) => {
                if (this._terminated) {
                    return Promise.reject('The client has already been closed.');
                }
                const func = stub[methodName];
                return func.apply(stub, args);
            }, (err) => () => {
                throw err;
            });
            const descriptor = this.descriptors.page[methodName] || undefined;
            const apiCall = (0, createApiCall_1.createApiCall)(callPromise, this._defaults[methodName], descriptor);
            this.innerApiCalls[methodName] = apiCall;
        }
        return this.locationsStub;
    }
    /**
     * The DNS address for this API service.
     * @returns {string} The DNS address for this service.
     */
    static get servicePath() {
        return 'cloud.googleapis.com';
    }
    /**
     * The DNS address for this API service - same as servicePath(),
     * exists for compatibility reasons.
     * @returns {string} The DNS address for this service.
     */
    static get apiEndpoint() {
        return 'cloud.googleapis.com';
    }
    /**
     * The port for this API service.
     * @returns {number} The default port for this service.
     */
    static get port() {
        return 443;
    }
    /**
     * The scopes needed to make gRPC calls for every method defined
     * in this service.
     * @returns {string[]} List of default scopes.
     */
    static get scopes() {
        return ['https://www.googleapis.com/auth/cloud-platform'];
    }
    getProjectId(callback) {
        if (callback) {
            this.auth.getProjectId(callback);
            return;
        }
        return this.auth.getProjectId();
    }
    /**
     * Gets information about a location.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Resource name for the location.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing [Location]{@link google.cloud.location.Location}.
     *   Please see the
     *   [documentation](https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#regular-methods)
     *   for more details and examples.
     * @example
     * const [response] = await client.getLocation(request);
     */
    getLocation(request, optionsOrCallback, callback) {
        request = request || {};
        let options;
        if (typeof optionsOrCallback === 'function' && callback === undefined) {
            callback = optionsOrCallback;
            options = {};
        }
        else {
            options = optionsOrCallback;
        }
        options = options || {};
        options.otherArgs = options.otherArgs || {};
        options.otherArgs.headers = options.otherArgs.headers || {};
        options.otherArgs.headers['x-goog-request-params'] =
            routingHeader.fromParams({
                name: request.name || '',
            });
        this.initialize();
        return this.innerApiCalls.getLocation(request, options, callback);
    }
    /**
     * Lists information about the supported locations for this service.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   The resource that owns the locations collection, if applicable.
     * @param {string} request.filter
     *   The standard list filter.
     * @param {number} request.pageSize
     *   The standard list page size.
     * @param {string} request.pageToken
     *   The standard list page token.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is Array of [Location]{@link google.cloud.location.Location}.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed and will merge results from all the pages into this array.
     *   Note that it can affect your quota.
     *   We recommend using `listLocationsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the
     *   [documentation](https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#auto-pagination)
     *   for more details and examples.
     */
    listLocations(request, optionsOrCallback, callback) {
        request = request || {};
        let options;
        if (typeof optionsOrCallback === 'function' && callback === undefined) {
            callback = optionsOrCallback;
            options = {};
        }
        else {
            options = optionsOrCallback;
        }
        options = options || {};
        options.otherArgs = options.otherArgs || {};
        options.otherArgs.headers = options.otherArgs.headers || {};
        options.otherArgs.headers['x-goog-request-params'] =
            routingHeader.fromParams({
                name: request.name || '',
            });
        this.initialize();
        return this.innerApiCalls.listLocations(request, options, callback);
    }
    /**
     * Equivalent to `listLocations`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   The resource that owns the locations collection, if applicable.
     * @param {string} request.filter
     *   The standard list filter.
     * @param {number} request.pageSize
     *   The standard list page size.
     * @param {string} request.pageToken
     *   The standard list page token.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows [async iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols).
     *   When you iterate the returned iterable, each element will be an object representing
     *   [Location]{@link google.cloud.location.Location}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the
     *   [documentation](https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#auto-pagination)
     *   for more details and examples.
     * @example
     * const iterable = client.listLocationsAsync(request);
     * for await (const response of iterable) {
     *   // process response
     * }
     */
    listLocationsAsync(request, options) {
        request = request || {};
        options = options || {};
        options.otherArgs = options.otherArgs || {};
        options.otherArgs.headers = options.otherArgs.headers || {};
        options.otherArgs.headers['x-goog-request-params'] =
            routingHeader.fromParams({
                name: request.name || '',
            });
        options = options || {};
        const callSettings = new gax.CallSettings(options);
        this.initialize();
        return this.descriptors.page.listLocations.asyncIterate(this.innerApiCalls['listLocations'], request, callSettings);
    }
    /**
     * Terminate the gRPC channel and close the client.
     *
     * The client will no longer be usable and all future behavior is undefined.
     * @returns {Promise} A promise that resolves when the client is closed.
     */
    close() {
        this.initialize();
        if (!this._terminated) {
            return this.locationsStub.then(stub => {
                this._terminated = true;
                stub.close();
            });
        }
        return Promise.resolve();
    }
}
exports.LocationsClient = LocationsClient;
//# sourceMappingURL=locationService.js.map