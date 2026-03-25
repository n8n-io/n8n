/* eslint-disable class-methods-use-this */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * (C) Copyright IBM Corp. 2014, 2024.
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
import axios from 'axios';
import * as rax from 'retry-axios';
import extend from 'extend';
import FormData from 'form-data';
import { Agent } from 'https';
import isStream from 'isstream';
import { stringify } from 'querystring';
import { gzipSync } from 'zlib';
import { buildRequestFileObject, isEmptyObject, isFileData, isFileWithMetadata, isJsonMimeType, stripTrailingSlash, } from './helper';
import { redactSecrets } from './private-helpers';
import logger from './logger';
import { streamToPromise } from './stream-to-promise';
import { createCookieInterceptor } from './cookie-support';
import { chainError } from './chain-error';
export class RequestWrapper {
    constructor(axiosOptions) {
        axiosOptions = axiosOptions || {};
        this.compressRequestData = Boolean(axiosOptions.enableGzipCompression);
        // override a couple axios defaults
        const axiosConfig = {
            maxContentLength: -1,
            maxBodyLength: Infinity,
        };
        // merge axios config into default
        extend(true, axiosConfig, axiosOptions);
        // if the user explicitly sets `disableSslVerification` to true,
        // `rejectUnauthorized` must be set to false in the https agent
        if (axiosOptions.disableSslVerification === true) {
            // the user may have already provided a custom agent. if so, update it
            if (axiosConfig.httpsAgent) {
                // check for presence of `options` field for "type safety"
                if (axiosConfig.httpsAgent.options) {
                    axiosConfig.httpsAgent.options.rejectUnauthorized = false;
                }
            }
            else {
                // if no agent is present, create a new one
                axiosConfig.httpsAgent = new Agent({
                    rejectUnauthorized: false,
                });
            }
        }
        this.axiosInstance = axios.create(axiosConfig);
        // axios sets the default Content-Type for `post`, `put`, and `patch` operations
        // to 'application/x-www-form-urlencoded'. This causes problems, so overriding the
        // defaults here
        ['post', 'put', 'patch'].forEach((op) => {
            this.axiosInstance.defaults.headers[op]['Content-Type'] = 'application/json';
        });
        // if a cookie jar is provided, register our cookie interceptors with axios
        if (axiosOptions.jar) {
            createCookieInterceptor(axiosOptions.jar)(this.axiosInstance);
        }
        // get retry config properties and conditionally enable retries
        if (axiosOptions.enableRetries) {
            const retryOptions = {};
            if (axiosOptions.maxRetries !== undefined) {
                retryOptions.maxRetries = axiosOptions.maxRetries;
            }
            if (axiosOptions.retryInterval !== undefined) {
                retryOptions.maxRetryInterval = axiosOptions.retryInterval;
            }
            this.enableRetries(retryOptions);
        }
        // If debug logging is requested, set up interceptors to log http request/response messages.
        if (logger.debug.enabled || process.env.NODE_DEBUG === 'axios') {
            this.axiosInstance.interceptors.request.use((request) => {
                logger.debug(`--> HTTP Request:\n${this.formatAxiosRequest(request)}`);
                return request;
            }, (error) => {
                logger.debug(`<-- HTTP Error:\n${this.formatAxiosError(error)}`);
                return Promise.reject(error);
            });
            this.axiosInstance.interceptors.response.use((response) => {
                logger.debug(`<-- HTTP Response:\n${this.formatAxiosResponse(response)}`);
                return response;
            }, (error) => {
                logger.debug(`<-- HTTP Error:\n${this.formatAxiosError(error)}`);
                return Promise.reject(error);
            });
        }
    }
    /**
     * Formats the specified Axios request for debug logging.
     * @param request - the request to be logged
     * @returns the string representation of the request
     */
    formatAxiosRequest(request) {
        const { method, url, data, headers } = request;
        const headersOutput = this.formatAxiosHeaders(headers);
        const body = this.formatAxiosBody(data);
        const output = `${(method || '??').toUpperCase()} ${url || '??'}\n${headersOutput}\n${body}`;
        return redactSecrets(output);
    }
    /**
     * Formats the specified Axios response for debug logging.
     * @param response - the response to be logged
     * @returns the string representation of the response
     */
    formatAxiosResponse(response) {
        const { status, statusText, headers, data } = response;
        const headersOutput = this.formatAxiosHeaders(headers);
        const body = this.formatAxiosBody(data);
        const statusMsg = statusText || `status_code_${status}`;
        const output = `${status} ${statusMsg}\n${headersOutput}\n${body}`;
        return redactSecrets(output);
    }
    /**
     * Formats the specified Axios error for debug logging.
     * @param error - the error to be logged
     * @returns the string representation of the error
     */
    formatAxiosError(error) {
        const { response } = error;
        let output = `HTTP error message=${error.message || ''}, code=${error.code || ''}`;
        if (response) {
            output = this.formatAxiosResponse(response);
        }
        return output;
    }
    /**
     * Formats 'headers' to be included in the debug output
     * like this:
     *    Accept: application/json
     *    Content-Type: application/json
     *    My-Header: my-value
     *    ...
     * @param headers - the headers associated with an Axios request or response
     * @returns the formatted output to be included in the HTTP message traces
     */
    formatAxiosHeaders(headers) {
        let output = '';
        if (headers) {
            const lines = [];
            Object.keys(headers).forEach((key) => {
                lines.push(`${key}: ${headers[key]}`);
            });
            output = lines.join('\n');
        }
        return output;
    }
    /**
     * Formats 'body' (either a string or object/array) to be included in the debug output
     *
     * @param body - a string, object or array that contains the request or response body
     * @returns the formatted output to be included in the HTTP message traces
     */
    formatAxiosBody(body) {
        let output = '';
        if (body) {
            output = typeof body === 'string' ? body : JSON.stringify(body);
        }
        return output;
    }
    setCompressRequestData(setting) {
        this.compressRequestData = setting;
    }
    /**
     * Creates the request.
     * 1. Merge default options with user provided options
     * 2. Checks for missing parameters
     * 3. Encode path and query parameters
     * 4. Call the api
     * @returns ReadableStream|undefined
     * @throws Error
     */
    sendRequest(parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = extend(true, {}, parameters.defaultOptions, parameters.options);
            const { path, body, form, formData, qs, method, serviceUrl, axiosOptions } = options;
            let { headers, url } = options;
            const multipartForm = new FormData();
            // Form params
            if (formData) {
                for (const key of Object.keys(formData)) { // eslint-disable-line
                    let values = Array.isArray(formData[key]) ? formData[key] : [formData[key]];
                    // Skip keys with undefined/null values or empty object value
                    values = values.filter((v) => v != null && !isEmptyObject(v));
                    for (let value of values) { // eslint-disable-line
                        // Ignore special case of empty file object
                        if (!Object.prototype.hasOwnProperty.call(value, 'contentType') ||
                            Object.prototype.hasOwnProperty.call(value, 'data')) {
                            if (isFileWithMetadata(value)) {
                                const fileObj = yield buildRequestFileObject(value); // eslint-disable-line
                                multipartForm.append(key, fileObj.value, fileObj.options);
                            }
                            else {
                                if (typeof value === 'object' && !isFileData(value)) {
                                    value = JSON.stringify(value);
                                }
                                multipartForm.append(key, value);
                            }
                        }
                    }
                }
            }
            // Path params
            url = parsePath(url, path);
            // Headers
            options.headers = Object.assign({}, options.headers);
            // Convert array-valued query params to strings
            if (qs && Object.keys(qs).length > 0) {
                Object.keys(qs).forEach((key) => {
                    if (Array.isArray(qs[key])) {
                        qs[key] = qs[key].join(',');
                    }
                });
            }
            // Add service default endpoint if options.url start with /
            if (url && url.charAt(0) === '/') {
                url = stripTrailingSlash(serviceUrl) + url;
            }
            url = stripTrailingSlash(url);
            let data = body;
            if (form) {
                data = stringify(form);
                headers['Content-type'] = 'application/x-www-form-urlencoded';
            }
            if (formData) {
                data = multipartForm;
                // form-data generates headers that MUST be included or the request will fail
                headers = extend(true, {}, headers, multipartForm.getHeaders());
            }
            // accept gzip encoded responses if Accept-Encoding is not already set
            headers['Accept-Encoding'] = headers['Accept-Encoding'] || 'gzip';
            // compress request body data if enabled
            if (this.compressRequestData) {
                data = yield this.gzipRequestBody(data, headers);
            }
            const requestParams = Object.assign({ url,
                method,
                headers, params: qs, data, raxConfig: this.raxConfig, responseType: options.responseType || 'json', paramsSerializer: { serialize: (params) => stringify(params) } }, axiosOptions);
            return this.axiosInstance(requestParams).then((res) => {
                // sometimes error responses will still trigger the `then` block - escape that behavior here
                if (!res) {
                    return undefined;
                }
                // these objects contain circular json structures and are not always relevant to the user
                // if the user wants them, they can be accessed through the debug properties
                delete res.config;
                delete res.request;
                // the other sdks use the interface `result` for the body
                // eslint-disable-next-line @typescript-eslint/dot-notation
                res['result'] = ensureJSONResponseBodyIsObject(res);
                delete res.data;
                // return another promise that resolves with 'res' to be handled in generated code
                return res;
            }, (err) => {
                // return another promise that rejects with 'err' to be handled in generated code
                throw this.formatError(err);
            });
        });
    }
    /**
     * Format error returned by axios
     * @param axiosError - the object returned by axios via rejection
     * @returns the Error object
     */
    formatError(axiosError) {
        // return an actual error object,
        // but make it flexible so we can add properties like 'body'
        const error = new Error();
        // axios specific handling
        // this branch is for an error received from the service
        if (axiosError.response) {
            axiosError = axiosError.response;
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            delete axiosError.config;
            delete axiosError.request;
            error.statusText = axiosError.statusText;
            error.name = axiosError.statusText; // ** deprecated **
            error.status = axiosError.status;
            error.code = axiosError.status; // ** deprecated **
            error.message = parseServiceErrorMessage(axiosError.data) || axiosError.statusText;
            // attach the error response body to the error
            let errorBody;
            try {
                // try/catch to detect objects with circular references
                errorBody = JSON.stringify(axiosError.data);
            }
            catch (e) {
                logger.warn('Error field `result` contains circular reference(s)');
                logger.debug(`Failed to stringify error response body: ${e}`);
                errorBody = axiosError.data;
            }
            error.result = ensureJSONResponseBodyIsObject(axiosError);
            error.body = errorBody; // ** deprecated **
            // attach headers to error object
            error.headers = axiosError.headers;
            // print a more descriptive error message for auth issues
            if (isAuthenticationError(axiosError)) {
                error.message = 'Access is denied due to invalid credentials.';
            }
        }
        else if (axiosError.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            error.message = axiosError.message;
            error.statusText = axiosError.code;
            error.body = 'Response not received - no connection was made to the service.';
            // when a request to a private cloud instance has an ssl problem, it never connects and follows this branch of the error handling
            if (isSelfSignedCertificateError(axiosError)) {
                error.message =
                    `The connection failed because the SSL certificate is not valid. ` +
                        `To use a self-signed certificate, set the \`disableSslVerification\` parameter in the constructor options.`;
            }
        }
        else {
            // Something happened in setting up the request that triggered an Error
            error.message = axiosError.message;
        }
        return error;
    }
    getHttpClient() {
        return this.axiosInstance;
    }
    static getRaxConfig(axiosInstance, retryOptions) {
        const config = {
            retry: 4,
            retryDelay: 1000,
            httpMethodsToRetry: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT', 'POST'],
            // do not retry on 501
            statusCodesToRetry: [
                [429, 429],
                [500, 500],
                [502, 599],
            ],
            instance: axiosInstance,
            backoffType: 'exponential',
            checkRetryAfter: true,
            maxRetryDelay: 30 * 1000,
            shouldRetry: this.retryPolicy,
        };
        if (retryOptions) {
            if (typeof retryOptions.maxRetries === 'number') {
                config.retry = retryOptions.maxRetries;
            }
            if (typeof retryOptions.maxRetryInterval === 'number') {
                // convert seconds to ms for retry-axios
                config.maxRetryDelay = retryOptions.maxRetryInterval * 1000;
            }
        }
        return config;
    }
    enableRetries(retryOptions) {
        // avoid attaching the same interceptor multiple times
        // to protect against user error and ensure disableRetries() always disables retries
        if (typeof this.retryInterceptorId === 'number') {
            this.disableRetries();
        }
        this.raxConfig = RequestWrapper.getRaxConfig(this.axiosInstance, retryOptions);
        this.retryInterceptorId = rax.attach(this.axiosInstance);
        logger.debug(`Enabled retries; maxRetries=${this.raxConfig.retry}, maxRetryInterval=${this.raxConfig.maxRetryDelay}`);
    }
    disableRetries() {
        if (typeof this.retryInterceptorId === 'number') {
            rax.detach(this.retryInterceptorId, this.axiosInstance);
            delete this.retryInterceptorId;
            delete this.raxConfig;
            logger.debug('Disabled retries');
        }
    }
    /**
     * Returns true iff the previously-failed request contained in "error" should be retried.
     * @param error - an AxiosError instance that contains a previously-failed request
     * @returns true iff the request should be retried
     */
    static retryPolicy(error) {
        if (logger.debug.enabled) {
            const details = [];
            if (error.response) {
                const statusText = error.response.statusText || ``;
                details.push(`status_code=${error.response.status} (${statusText})`);
            }
            if (error.config) {
                if (error.config.method) {
                    details.push(`method=${error.config.method.toUpperCase()}`);
                }
                if (error.config.url) {
                    details.push(`url=${error.config.url}`);
                }
            }
            logger.debug(`Considering retry attempt; ${details.join(', ')}`);
        }
        // Delegate to the default function defined by retry-axios.
        const shouldRetry = rax.shouldRetryRequest(error);
        logger.debug(`Retry will ${shouldRetry ? '' : 'not '}be attempted`);
        return shouldRetry;
    }
    gzipRequestBody(data, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            // skip compression if user has set the encoding header to gzip
            const contentSetToGzip = headers['Content-Encoding'] && headers['Content-Encoding'].toString().includes('gzip');
            if (!data || contentSetToGzip) {
                return data;
            }
            let reqBuffer;
            try {
                if (isStream(data)) {
                    const streamData = yield streamToPromise(data);
                    reqBuffer = Buffer.isBuffer(streamData) ? streamData : Buffer.from(streamData);
                }
                else if (Buffer.isBuffer(data)) {
                    reqBuffer = data;
                }
                else if (data.toString && data.toString() !== '[object Object]' && !Array.isArray(data)) {
                    // this handles pretty much any primitive that isnt a JSON object or array
                    reqBuffer = Buffer.from(data.toString());
                }
                else {
                    reqBuffer = Buffer.from(JSON.stringify(data));
                }
            }
            catch (err) {
                logger.error('Error converting request body to a buffer - data will not be compressed.');
                logger.debug(err);
                return data;
            }
            try {
                data = gzipSync(reqBuffer);
                // update the headers by reference - only if the data was actually compressed
                headers['Content-Encoding'] = 'gzip';
            }
            catch (err) {
                // if an exception is caught, `data` will still be in its original form
                // we can just proceed with the request uncompressed
                logger.error('Error compressing request body - data will not be compressed.');
                logger.debug(err);
            }
            return data;
        });
    }
}
/**
 * Parses the path.
 * @param path - the path
 * @param params - the params
 * @returns the parsed path
 */
function parsePath(path, params) {
    if (!path || !params) {
        return path;
    }
    return Object.keys(params).reduce((parsedPath, param) => {
        const value = encodeURIComponent(params[param]);
        return parsedPath.replace(new RegExp(`{${param}}`), value);
    }, path);
}
/**
 * Determine if the error is due to bad credentials
 * @param error - error object returned from axios
 * @returns true if error is due to authentication
 */
function isAuthenticationError(error) {
    let isAuthErr = false;
    const code = error.status || null;
    const body = error.data || {};
    // handle specific error from iam service, should be relevant across platforms
    const isIamServiceError = body.context && body.context.url && body.context.url.indexOf('iam') > -1;
    if (code === 401 || code === 403 || isIamServiceError) {
        isAuthErr = true;
    }
    return isAuthErr;
}
/**
 * Determine if the error is due to a bad self signed certificate
 * @param error - error object returned from axios
 * @returnstrue if error is due to an SSL error
 */
function isSelfSignedCertificateError(error) {
    let result = false;
    const sslCode = 'DEPTH_ZERO_SELF_SIGNED_CERT';
    const sslMessage = 'self signed certificate';
    const hasSslCode = error.code === sslCode;
    const hasSslMessage = hasStringProperty(error, 'message') && error.message.includes(sslMessage);
    if (hasSslCode || hasSslMessage) {
        result = true;
    }
    return result;
}
/**
 * Return true if object has a specified property that is a string
 * @param obj - object to look for property in
 * @param property - name of the property to look for
 * @returns true if property exists and is string
 */
function hasStringProperty(obj, property) {
    return Boolean(obj[property] && typeof obj[property] === 'string');
}
/**
 * Look for service error message in common places, by priority
 * first look in `errors[0].message`, then in `error`, then in
 * `message`, then in `errorMessage`
 * @param response - error response body received from service
 * @returns the error message if is was found, undefined otherwise
 */
function parseServiceErrorMessage(response) {
    let message;
    if (Array.isArray(response.errors) &&
        response.errors.length > 0 &&
        hasStringProperty(response.errors[0], 'message')) {
        message = response.errors[0].message;
    }
    else if (hasStringProperty(response, 'error')) {
        message = response.error;
    }
    else if (hasStringProperty(response, 'message')) {
        message = response.message;
    }
    else if (hasStringProperty(response, 'errorMessage')) {
        message = response.errorMessage;
    }
    logger.info(`Parsing service error message: ${message}`);
    return message;
}
/**
 * Check response for a JSON content type and a string-formatted body. If those
 * conditions are met, we want to return an object for the body to the user. If
 * the JSON string coming from the service is invalid, we want to raise an
 * exception.
 *
 * @param response - incoming response object
 * @returns response body - as either an object or a string
 * @throws error - if the content is meant as JSON but is malformed
 */
function ensureJSONResponseBodyIsObject(response) {
    // If axios gave us an empty string, it is because the response had an empty body
    // which can happen for a HEAD request, etc. Return the empty string in that case
    if (typeof response.data !== 'string' ||
        response.data === '' ||
        !isJsonMimeType(response.headers['content-type'])) {
        return response.data;
    }
    // If the content is supposed to be JSON but axios gave us a string, it is most
    // likely due to the fact that the service sent malformed JSON, which is an error.
    //
    // We'll try to parse the string and return a proper object to the user but if
    // it fails, we'll log an error and raise an exception.
    let dataAsObject = response.data;
    try {
        dataAsObject = JSON.parse(response.data);
    }
    catch (e) {
        logger.verbose('Response body was supposed to have JSON content but JSON parsing failed.');
        logger.verbose(`Malformed JSON string: ${response.data}`);
        throw chainError(new Error('Error processing HTTP response:'), e);
    }
    return dataAsObject;
}
