"use strict";
/* eslint-disable class-methods-use-this */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestWrapper = void 0;
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
var axios_1 = __importDefault(require("axios"));
var rax = __importStar(require("retry-axios"));
var extend_1 = __importDefault(require("extend"));
var form_data_1 = __importDefault(require("form-data"));
var https_1 = require("https");
var isstream_1 = __importDefault(require("isstream"));
var querystring_1 = require("querystring");
var zlib_1 = require("zlib");
var helper_1 = require("./helper");
var private_helpers_1 = require("./private-helpers");
var logger_1 = __importDefault(require("./logger"));
var stream_to_promise_1 = require("./stream-to-promise");
var cookie_support_1 = require("./cookie-support");
var chain_error_1 = require("./chain-error");
var RequestWrapper = /** @class */ (function () {
    function RequestWrapper(axiosOptions) {
        var _this = this;
        axiosOptions = axiosOptions || {};
        this.compressRequestData = Boolean(axiosOptions.enableGzipCompression);
        // override a couple axios defaults
        var axiosConfig = {
            maxContentLength: -1,
            maxBodyLength: Infinity,
        };
        // merge axios config into default
        (0, extend_1.default)(true, axiosConfig, axiosOptions);
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
                axiosConfig.httpsAgent = new https_1.Agent({
                    rejectUnauthorized: false,
                });
            }
        }
        this.axiosInstance = axios_1.default.create(axiosConfig);
        // axios sets the default Content-Type for `post`, `put`, and `patch` operations
        // to 'application/x-www-form-urlencoded'. This causes problems, so overriding the
        // defaults here
        ['post', 'put', 'patch'].forEach(function (op) {
            _this.axiosInstance.defaults.headers[op]['Content-Type'] = 'application/json';
        });
        // if a cookie jar is provided, register our cookie interceptors with axios
        if (axiosOptions.jar) {
            (0, cookie_support_1.createCookieInterceptor)(axiosOptions.jar)(this.axiosInstance);
        }
        // get retry config properties and conditionally enable retries
        if (axiosOptions.enableRetries) {
            var retryOptions = {};
            if (axiosOptions.maxRetries !== undefined) {
                retryOptions.maxRetries = axiosOptions.maxRetries;
            }
            if (axiosOptions.retryInterval !== undefined) {
                retryOptions.maxRetryInterval = axiosOptions.retryInterval;
            }
            this.enableRetries(retryOptions);
        }
        // If debug logging is requested, set up interceptors to log http request/response messages.
        if (logger_1.default.debug.enabled || process.env.NODE_DEBUG === 'axios') {
            this.axiosInstance.interceptors.request.use(function (request) {
                logger_1.default.debug("--> HTTP Request:\n".concat(_this.formatAxiosRequest(request)));
                return request;
            }, function (error) {
                logger_1.default.debug("<-- HTTP Error:\n".concat(_this.formatAxiosError(error)));
                return Promise.reject(error);
            });
            this.axiosInstance.interceptors.response.use(function (response) {
                logger_1.default.debug("<-- HTTP Response:\n".concat(_this.formatAxiosResponse(response)));
                return response;
            }, function (error) {
                logger_1.default.debug("<-- HTTP Error:\n".concat(_this.formatAxiosError(error)));
                return Promise.reject(error);
            });
        }
    }
    /**
     * Formats the specified Axios request for debug logging.
     * @param request - the request to be logged
     * @returns the string representation of the request
     */
    RequestWrapper.prototype.formatAxiosRequest = function (request) {
        var method = request.method, url = request.url, data = request.data, headers = request.headers;
        var headersOutput = this.formatAxiosHeaders(headers);
        var body = this.formatAxiosBody(data);
        var output = "".concat((method || '??').toUpperCase(), " ").concat(url || '??', "\n").concat(headersOutput, "\n").concat(body);
        return (0, private_helpers_1.redactSecrets)(output);
    };
    /**
     * Formats the specified Axios response for debug logging.
     * @param response - the response to be logged
     * @returns the string representation of the response
     */
    RequestWrapper.prototype.formatAxiosResponse = function (response) {
        var status = response.status, statusText = response.statusText, headers = response.headers, data = response.data;
        var headersOutput = this.formatAxiosHeaders(headers);
        var body = this.formatAxiosBody(data);
        var statusMsg = statusText || "status_code_".concat(status);
        var output = "".concat(status, " ").concat(statusMsg, "\n").concat(headersOutput, "\n").concat(body);
        return (0, private_helpers_1.redactSecrets)(output);
    };
    /**
     * Formats the specified Axios error for debug logging.
     * @param error - the error to be logged
     * @returns the string representation of the error
     */
    RequestWrapper.prototype.formatAxiosError = function (error) {
        var response = error.response;
        var output = "HTTP error message=".concat(error.message || '', ", code=").concat(error.code || '');
        if (response) {
            output = this.formatAxiosResponse(response);
        }
        return output;
    };
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
    RequestWrapper.prototype.formatAxiosHeaders = function (headers) {
        var output = '';
        if (headers) {
            var lines_1 = [];
            Object.keys(headers).forEach(function (key) {
                lines_1.push("".concat(key, ": ").concat(headers[key]));
            });
            output = lines_1.join('\n');
        }
        return output;
    };
    /**
     * Formats 'body' (either a string or object/array) to be included in the debug output
     *
     * @param body - a string, object or array that contains the request or response body
     * @returns the formatted output to be included in the HTTP message traces
     */
    RequestWrapper.prototype.formatAxiosBody = function (body) {
        var output = '';
        if (body) {
            output = typeof body === 'string' ? body : JSON.stringify(body);
        }
        return output;
    };
    RequestWrapper.prototype.setCompressRequestData = function (setting) {
        this.compressRequestData = setting;
    };
    /**
     * Creates the request.
     * 1. Merge default options with user provided options
     * 2. Checks for missing parameters
     * 3. Encode path and query parameters
     * 4. Call the api
     * @returns ReadableStream|undefined
     * @throws Error
     */
    RequestWrapper.prototype.sendRequest = function (parameters) {
        return __awaiter(this, void 0, void 0, function () {
            var options, path, body, form, formData, qs, method, serviceUrl, axiosOptions, headers, url, multipartForm, _i, _a, key, values, _b, values_1, value, fileObj, data, requestParams;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        options = (0, extend_1.default)(true, {}, parameters.defaultOptions, parameters.options);
                        path = options.path, body = options.body, form = options.form, formData = options.formData, qs = options.qs, method = options.method, serviceUrl = options.serviceUrl, axiosOptions = options.axiosOptions;
                        headers = options.headers, url = options.url;
                        multipartForm = new form_data_1.default();
                        if (!formData) return [3 /*break*/, 7];
                        _i = 0, _a = Object.keys(formData);
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        key = _a[_i];
                        values = Array.isArray(formData[key]) ? formData[key] : [formData[key]];
                        // Skip keys with undefined/null values or empty object value
                        values = values.filter(function (v) { return v != null && !(0, helper_1.isEmptyObject)(v); });
                        _b = 0, values_1 = values;
                        _c.label = 2;
                    case 2:
                        if (!(_b < values_1.length)) return [3 /*break*/, 6];
                        value = values_1[_b];
                        if (!(!Object.prototype.hasOwnProperty.call(value, 'contentType') ||
                            Object.prototype.hasOwnProperty.call(value, 'data'))) return [3 /*break*/, 5];
                        if (!(0, helper_1.isFileWithMetadata)(value)) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, helper_1.buildRequestFileObject)(value)];
                    case 3:
                        fileObj = _c.sent();
                        multipartForm.append(key, fileObj.value, fileObj.options);
                        return [3 /*break*/, 5];
                    case 4:
                        if (typeof value === 'object' && !(0, helper_1.isFileData)(value)) {
                            value = JSON.stringify(value);
                        }
                        multipartForm.append(key, value);
                        _c.label = 5;
                    case 5:
                        _b++;
                        return [3 /*break*/, 2];
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7:
                        // Path params
                        url = parsePath(url, path);
                        // Headers
                        options.headers = __assign({}, options.headers);
                        // Convert array-valued query params to strings
                        if (qs && Object.keys(qs).length > 0) {
                            Object.keys(qs).forEach(function (key) {
                                if (Array.isArray(qs[key])) {
                                    qs[key] = qs[key].join(',');
                                }
                            });
                        }
                        // Add service default endpoint if options.url start with /
                        if (url && url.charAt(0) === '/') {
                            url = (0, helper_1.stripTrailingSlash)(serviceUrl) + url;
                        }
                        url = (0, helper_1.stripTrailingSlash)(url);
                        data = body;
                        if (form) {
                            data = (0, querystring_1.stringify)(form);
                            headers['Content-type'] = 'application/x-www-form-urlencoded';
                        }
                        if (formData) {
                            data = multipartForm;
                            // form-data generates headers that MUST be included or the request will fail
                            headers = (0, extend_1.default)(true, {}, headers, multipartForm.getHeaders());
                        }
                        // accept gzip encoded responses if Accept-Encoding is not already set
                        headers['Accept-Encoding'] = headers['Accept-Encoding'] || 'gzip';
                        if (!this.compressRequestData) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.gzipRequestBody(data, headers)];
                    case 8:
                        data = _c.sent();
                        _c.label = 9;
                    case 9:
                        requestParams = __assign({ url: url, method: method, headers: headers, params: qs, data: data, raxConfig: this.raxConfig, responseType: options.responseType || 'json', paramsSerializer: { serialize: function (params) { return (0, querystring_1.stringify)(params); } } }, axiosOptions);
                        return [2 /*return*/, this.axiosInstance(requestParams).then(function (res) {
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
                            }, function (err) {
                                // return another promise that rejects with 'err' to be handled in generated code
                                throw _this.formatError(err);
                            })];
                }
            });
        });
    };
    /**
     * Format error returned by axios
     * @param axiosError - the object returned by axios via rejection
     * @returns the Error object
     */
    RequestWrapper.prototype.formatError = function (axiosError) {
        // return an actual error object,
        // but make it flexible so we can add properties like 'body'
        var error = new Error();
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
            var errorBody = void 0;
            try {
                // try/catch to detect objects with circular references
                errorBody = JSON.stringify(axiosError.data);
            }
            catch (e) {
                logger_1.default.warn('Error field `result` contains circular reference(s)');
                logger_1.default.debug("Failed to stringify error response body: ".concat(e));
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
                    "The connection failed because the SSL certificate is not valid. " +
                        "To use a self-signed certificate, set the `disableSslVerification` parameter in the constructor options.";
            }
        }
        else {
            // Something happened in setting up the request that triggered an Error
            error.message = axiosError.message;
        }
        return error;
    };
    RequestWrapper.prototype.getHttpClient = function () {
        return this.axiosInstance;
    };
    RequestWrapper.getRaxConfig = function (axiosInstance, retryOptions) {
        var config = {
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
    };
    RequestWrapper.prototype.enableRetries = function (retryOptions) {
        // avoid attaching the same interceptor multiple times
        // to protect against user error and ensure disableRetries() always disables retries
        if (typeof this.retryInterceptorId === 'number') {
            this.disableRetries();
        }
        this.raxConfig = RequestWrapper.getRaxConfig(this.axiosInstance, retryOptions);
        this.retryInterceptorId = rax.attach(this.axiosInstance);
        logger_1.default.debug("Enabled retries; maxRetries=".concat(this.raxConfig.retry, ", maxRetryInterval=").concat(this.raxConfig.maxRetryDelay));
    };
    RequestWrapper.prototype.disableRetries = function () {
        if (typeof this.retryInterceptorId === 'number') {
            rax.detach(this.retryInterceptorId, this.axiosInstance);
            delete this.retryInterceptorId;
            delete this.raxConfig;
            logger_1.default.debug('Disabled retries');
        }
    };
    /**
     * Returns true iff the previously-failed request contained in "error" should be retried.
     * @param error - an AxiosError instance that contains a previously-failed request
     * @returns true iff the request should be retried
     */
    RequestWrapper.retryPolicy = function (error) {
        if (logger_1.default.debug.enabled) {
            var details = [];
            if (error.response) {
                var statusText = error.response.statusText || "";
                details.push("status_code=".concat(error.response.status, " (").concat(statusText, ")"));
            }
            if (error.config) {
                if (error.config.method) {
                    details.push("method=".concat(error.config.method.toUpperCase()));
                }
                if (error.config.url) {
                    details.push("url=".concat(error.config.url));
                }
            }
            logger_1.default.debug("Considering retry attempt; ".concat(details.join(', ')));
        }
        // Delegate to the default function defined by retry-axios.
        var shouldRetry = rax.shouldRetryRequest(error);
        logger_1.default.debug("Retry will ".concat(shouldRetry ? '' : 'not ', "be attempted"));
        return shouldRetry;
    };
    RequestWrapper.prototype.gzipRequestBody = function (data, headers) {
        return __awaiter(this, void 0, void 0, function () {
            var contentSetToGzip, reqBuffer, streamData, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        contentSetToGzip = headers['Content-Encoding'] && headers['Content-Encoding'].toString().includes('gzip');
                        if (!data || contentSetToGzip) {
                            return [2 /*return*/, data];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        if (!(0, isstream_1.default)(data)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, stream_to_promise_1.streamToPromise)(data)];
                    case 2:
                        streamData = _a.sent();
                        reqBuffer = Buffer.isBuffer(streamData) ? streamData : Buffer.from(streamData);
                        return [3 /*break*/, 4];
                    case 3:
                        if (Buffer.isBuffer(data)) {
                            reqBuffer = data;
                        }
                        else if (data.toString && data.toString() !== '[object Object]' && !Array.isArray(data)) {
                            // this handles pretty much any primitive that isnt a JSON object or array
                            reqBuffer = Buffer.from(data.toString());
                        }
                        else {
                            reqBuffer = Buffer.from(JSON.stringify(data));
                        }
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        err_1 = _a.sent();
                        logger_1.default.error('Error converting request body to a buffer - data will not be compressed.');
                        logger_1.default.debug(err_1);
                        return [2 /*return*/, data];
                    case 6:
                        try {
                            data = (0, zlib_1.gzipSync)(reqBuffer);
                            // update the headers by reference - only if the data was actually compressed
                            headers['Content-Encoding'] = 'gzip';
                        }
                        catch (err) {
                            // if an exception is caught, `data` will still be in its original form
                            // we can just proceed with the request uncompressed
                            logger_1.default.error('Error compressing request body - data will not be compressed.');
                            logger_1.default.debug(err);
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    return RequestWrapper;
}());
exports.RequestWrapper = RequestWrapper;
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
    return Object.keys(params).reduce(function (parsedPath, param) {
        var value = encodeURIComponent(params[param]);
        return parsedPath.replace(new RegExp("{".concat(param, "}")), value);
    }, path);
}
/**
 * Determine if the error is due to bad credentials
 * @param error - error object returned from axios
 * @returns true if error is due to authentication
 */
function isAuthenticationError(error) {
    var isAuthErr = false;
    var code = error.status || null;
    var body = error.data || {};
    // handle specific error from iam service, should be relevant across platforms
    var isIamServiceError = body.context && body.context.url && body.context.url.indexOf('iam') > -1;
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
    var result = false;
    var sslCode = 'DEPTH_ZERO_SELF_SIGNED_CERT';
    var sslMessage = 'self signed certificate';
    var hasSslCode = error.code === sslCode;
    var hasSslMessage = hasStringProperty(error, 'message') && error.message.includes(sslMessage);
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
    var message;
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
    logger_1.default.info("Parsing service error message: ".concat(message));
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
        !(0, helper_1.isJsonMimeType)(response.headers['content-type'])) {
        return response.data;
    }
    // If the content is supposed to be JSON but axios gave us a string, it is most
    // likely due to the fact that the service sent malformed JSON, which is an error.
    //
    // We'll try to parse the string and return a proper object to the user but if
    // it fails, we'll log an error and raise an exception.
    var dataAsObject = response.data;
    try {
        dataAsObject = JSON.parse(response.data);
    }
    catch (e) {
        logger_1.default.verbose('Response body was supposed to have JSON content but JSON parsing failed.');
        logger_1.default.verbose("Malformed JSON string: ".concat(response.data));
        throw (0, chain_error_1.chainError)(new Error('Error processing HTTP response:'), e);
    }
    return dataAsObject;
}
