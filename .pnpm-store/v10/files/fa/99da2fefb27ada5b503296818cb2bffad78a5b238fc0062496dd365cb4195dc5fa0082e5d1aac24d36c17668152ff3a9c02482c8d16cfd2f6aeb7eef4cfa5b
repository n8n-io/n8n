/**
 * (C) Copyright IBM Corp. 2025-2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BaseService, validateParams, readExternalSources } from 'ibm-cloud-sdk-core';
import { Agent } from 'https';
import { readFileSync } from 'fs';
import { getAuthenticatorFromEnvironment } from "../authentication/utils/get-authenticator-from-environment.mjs";
import { getSdkHeaders, transformStreamToObjectStream, transformStreamToStringStream, } from "../lib/common.mjs";
import { PLATFORM_URL_MAPPINGS } from "../config/index.mjs";
/**
 * WatsonxBaseService class extends BaseService and provides common functionalities for Watsonx
 * services.
 *
 * @category BaseService
 */
export class WatsonxBaseService extends BaseService {
    /**
     * Constructs an instance of WatsonxBaseService with passed in options and external configuration.
     *
     * @category Constructor
     * @param {UserOptions} [options] - The parameters to send to the service.
     * @param {string} [options.version] - The version date for the API of the form `YYYY-MM-DD`
     * @param {string} [options.serviceUrl] - The base URL for the service
     * @param {string} [options.serviceName] - The name of the service to configure
     * @param {Authenticator} [options.authenticator] - The Authenticator object used to authenticate
     *   requests to the service
     */
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const requiredParams = ['version'];
        // @ts-expect-error validateParams has invalid type declaration, it accepts null however typing does not allow it
        const validationErrors = validateParams(options, requiredParams, null);
        if (validationErrors) {
            throw validationErrors;
        }
        // version is required parameter, if it is 'undefined' it will throw an error above
        options.version = options.version;
        (_a = options.serviceName) !== null && _a !== void 0 ? _a : (options.serviceName = WatsonxBaseService.DEFAULT_SERVICE_NAME);
        let httpsAgentAuth;
        if (typeof options.caCert === 'string') {
            const certFile = readFileSync(options.caCert);
            httpsAgentAuth = new Agent({
                ca: certFile,
            });
            options.httpsAgent = httpsAgentAuth;
        }
        else if ((_c = (_b = options.caCert) === null || _b === void 0 ? void 0 : _b.auth) === null || _c === void 0 ? void 0 : _c.path) {
            const certFile = readFileSync(options.caCert.auth.path);
            httpsAgentAuth = new Agent({
                ca: certFile,
            });
        }
        // Create authenticator with user given params and environment variables
        if (!options.authenticator) {
            const { serviceName, requestToken, serviceUrl } = options;
            options.authenticator = getAuthenticatorFromEnvironment({
                serviceName,
                requestToken,
                serviceUrl,
                httpsAgent: httpsAgentAuth,
            });
        }
        (_d = options.url) !== null && _d !== void 0 ? _d : (options.url = options.serviceUrl);
        super(options);
        this.httpsAgentMap = { service: undefined, dataplatform: undefined };
        this.version = options.version;
        this.configureService(options.serviceName);
        // Using build-in method to ensure user-given URL is correct ex. trimming slashes
        if (options.serviceUrl) {
            this.setServiceUrl(options.serviceUrl);
        }
        else {
            this.setServiceUrl(WatsonxBaseService.DEFAULT_SERVICE_URL);
        }
        if (typeof options.caCert !== 'string') {
            if ((_f = (_e = options.caCert) === null || _e === void 0 ? void 0 : _e.service) === null || _f === void 0 ? void 0 : _f.path) {
                const certFile = readFileSync(options.caCert.service.path);
                this.httpsAgentMap.service = new Agent({
                    ca: certFile,
                });
            }
            if ((_h = (_g = options.caCert) === null || _g === void 0 ? void 0 : _g.dataplatform) === null || _h === void 0 ? void 0 : _h.path) {
                const certFile = readFileSync(options.caCert.dataplatform.path);
                this.httpsAgentMap.dataplatform = new Agent({
                    ca: certFile,
                });
            }
        }
        if (!this.baseOptions.serviceUrl)
            throw new Error('Something went wrong with setting up serviceUrl');
        // Read platformUrl from environment variables
        (_j = options.platformUrl) !== null && _j !== void 0 ? _j : (options.platformUrl = readExternalSources(options.serviceName).platformUrl);
        // Set platformUrl depending on user given urls
        if (options.platformUrl) {
            this.wxServiceUrl = options.platformUrl.concat('/wx');
            this.serviceUrl = options.platformUrl;
        }
        else if (Object.keys(WatsonxBaseService.PLATFORM_URLS_MAP).includes(this.baseOptions.serviceUrl)) {
            this.wxServiceUrl =
                WatsonxBaseService.PLATFORM_URLS_MAP[this.baseOptions.serviceUrl];
            [this.serviceUrl] =
                WatsonxBaseService.PLATFORM_URLS_MAP[this.baseOptions.serviceUrl].split('/wx');
        }
        else {
            this.wxServiceUrl = this.baseOptions.serviceUrl.concat('/wx');
            this.serviceUrl = this.baseOptions.serviceUrl;
        }
    }
}
/** @ignore */
WatsonxBaseService.DEFAULT_SERVICE_URL = 'https://us-south.ml.cloud.ibm.com';
/** @ignore */
WatsonxBaseService.DEFAULT_SERVICE_NAME = 'watsonx_ai';
WatsonxBaseService.PLATFORM_URLS_MAP = PLATFORM_URL_MAPPINGS;
/**
 * APIBaseService class extends WatsonxBaseService and provides common API request functionalities.
 *
 * @category APIBaseService
 */
export class APIBaseService extends WatsonxBaseService {
    /**
     * Performs a POST request to the specified URL.
     *
     * @template T
     * @param {PostParameters} params - The parameters for the POST request.
     * @param {string} params.url - The parameters for the POST request.
     * @param {Record<string, any>} [params.body] - Body parameters to be passed to an endpoint
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Response<T>>} - A promise that resolves to the response from the POST
     *   request.
     */
    _post(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!params)
                throw new Error('Input is required');
            const { url, signal = null, path, body = {}, query = {}, headers = {} } = params;
            const qs = Object.assign({ 'version': this.version }, query);
            const sdkHeaders = getSdkHeaders();
            const parameters = {
                options: {
                    url,
                    method: 'POST',
                    body,
                    qs,
                    path,
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), headers), axiosOptions: {
                        signal,
                    } }),
            };
            return this.createRequest(parameters);
        });
    }
    /**
     * Performs a GET request to the specified URL.
     *
     * @template T
     * @param {GetParameters} params - The parameters for the GET request.
     * @param {string} [params.url] - The parameters for the GET request.
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Response<T>>} - A promise that resolves to the response from the GET request.
     */
    _get(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!params)
                throw new Error('Input is required');
            const { url, signal = null, query = {}, path, headers = {} } = params;
            const qs = Object.assign({ 'version': this.version }, query);
            const sdkHeaders = getSdkHeaders();
            const parameters = {
                options: {
                    url,
                    method: 'GET',
                    qs,
                    path,
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), headers), axiosOptions: {
                        signal,
                    } }),
            };
            return this.createRequest(parameters);
        });
    }
    /**
     * Performs a DELETE request to the specified URL.
     *
     * @template T
     * @param {DeleteParameters} params - The parameters for the DELETE request.
     * @param {string} params.url - The parameters for the DELETE request.
     * @param {Record<string, any>} [params.body] - Body parameters to be passed to an endpoint
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Response<T>>} - A promise that resolves to the response from the DELETE
     *   request.
     */
    _delete(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!params)
                throw new Error('Input is required');
            const { url, signal = null, path, body, query = {}, headers = {} } = params;
            const qs = Object.assign({ 'version': this.version }, query);
            const sdkHeaders = getSdkHeaders();
            const deleteHeaders = body ? { 'Content-Type': 'application/json' } : {};
            const parameters = {
                options: {
                    url,
                    method: 'DELETE',
                    qs,
                    body,
                    path,
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), deleteHeaders), headers), axiosOptions: {
                        signal,
                    } }),
            };
            return this.createRequest(parameters);
        });
    }
    /**
     * Performs a PUT request to the specified URL.
     *
     * @template T
     * @param {PutParameters} params - The parameters for the PUT request.
     * @param {string} params.url - The parameters for the PUT request.
     * @param {Record<string, any>} [params.body] - Body parameters to be passed to an endpoint
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Response<T>>} - A promise that resolves to the response from the PUT request.
     */
    _put(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!params)
                throw new Error('Input is required');
            const { url, signal = null, path, body = {}, query = {}, headers = {} } = params;
            const qs = Object.assign({ 'version': this.version }, query);
            const sdkHeaders = getSdkHeaders();
            const parameters = {
                options: {
                    url,
                    method: 'PUT',
                    body,
                    qs,
                    path,
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), headers), axiosOptions: {
                        signal,
                    } }),
            };
            return this.createRequest(parameters);
        });
    }
    /**
     * Performs a POST request to the specified URL and returns a stream.
     *
     * @template T
     * @param {CreateStreamParameters} params - The parameters for the POST request.
     * @param {string} params.url - The parameters for the POST request.
     * @param {Record<string, any>} [params.body] - Body parameters to be passed to an endpoint
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {Record<string, any>} [params.returnObject] - Flag that indicates return type. Set
     *   'true' to return objects, 'false' to return SSE
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Stream<T | string>>} - A promise that resolves to a stream from the POST
     *   request.
     */
    _postStream(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!params)
                throw new Error('Input is required');
            const { url, returnObject = true, signal = null, body = {}, query = {}, headers = {} } = params;
            const qs = Object.assign({ 'version': this.version }, query);
            const sdkHeaders = getSdkHeaders();
            const parameters = {
                options: {
                    url,
                    method: 'POST',
                    body,
                    qs,
                    responseType: 'stream',
                    adapter: 'fetch',
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'text/event-stream', 'Connection': 'keep-alive', 'Content-Type': 'application/json' }), headers), axiosOptions: {
                        signal,
                    } }),
            };
            const apiResponse = yield this.createRequest(parameters);
            const stream = returnObject
                ? transformStreamToObjectStream(apiResponse)
                : transformStreamToStringStream(apiResponse);
            return stream;
        });
    }
}
//# sourceMappingURL=base.mjs.map