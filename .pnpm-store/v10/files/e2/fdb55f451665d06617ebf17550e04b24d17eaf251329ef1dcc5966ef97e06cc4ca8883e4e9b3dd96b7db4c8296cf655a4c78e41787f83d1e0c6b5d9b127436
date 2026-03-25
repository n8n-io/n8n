"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
var extend_1 = __importDefault(require("extend"));
var auth_1 = require("../auth");
var helper_1 = require("./helper");
var logger_1 = __importDefault(require("./logger"));
var request_wrapper_1 = require("./request-wrapper");
var build_user_agent_1 = require("./build-user-agent");
/**
 * Common functionality shared by generated service classes.
 *
 * The base service authenticates requests via its authenticator, and sends
 * them to the service endpoint.
 */
var BaseService = /** @class */ (function () {
    /**
     * Configuration values for a service.
     *
     * @param userOptions - the configuration options to set on the service instance.
     * This should be an object with the following fields:
     * - authenticator: (required) an Object used to authenticate requests to the service.
     * - serviceUrl: (optional) the base url to use when contacting the service.
     *   The base url may differ between IBM Cloud regions.
     * - headers: (optional) a set of HTTP headers that should be included with every request sent to the service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the server's SSL certificate should be
     *   disabled or not.
     */
    function BaseService(userOptions) {
        if (!(this instanceof BaseService)) {
            var err = 'the "new" keyword is required to create service instances';
            logger_1.default.error("Error creating an instance of BaseService: ".concat(err));
            throw new Error(err);
        }
        var baseServiceOptions = {};
        var options = __assign({}, userOptions);
        // for compatibility
        if (options.url && !options.serviceUrl) {
            options.serviceUrl = options.url;
        }
        if (options.serviceUrl) {
            baseServiceOptions.serviceUrl = (0, helper_1.stripTrailingSlash)(options.serviceUrl);
        }
        // check serviceUrl for common user errors
        var credentialProblems = (0, auth_1.checkCredentials)(options, ['serviceUrl']);
        if (credentialProblems) {
            logger_1.default.error(credentialProblems.message);
            throw credentialProblems;
        }
        // if disableSslVerification is not explicity set to the boolean value `true`,
        // force it to be false
        if (options.disableSslVerification !== true) {
            options.disableSslVerification = false;
        }
        var serviceClass = this.constructor;
        this.baseOptions = __assign(__assign({ qs: {}, serviceUrl: serviceClass.DEFAULT_SERVICE_URL }, options), baseServiceOptions);
        this.requestWrapperInstance = new request_wrapper_1.RequestWrapper(this.baseOptions);
        // enforce that an authenticator is set
        if (!options.authenticator) {
            throw new Error('Authenticator must be set.');
        }
        this.authenticator = options.authenticator;
        this.defaultUserAgent = (0, build_user_agent_1.buildUserAgent)();
    }
    /**
     * Get the instance of the authenticator set on the service.
     *
     * @returns the Authenticator instance
     */
    BaseService.prototype.getAuthenticator = function () {
        return this.authenticator;
    };
    /**
     * Set the service URL to send requests to.
     *
     * @param url - the base URL for the service.
     */
    BaseService.prototype.setServiceUrl = function (url) {
        if (url) {
            this.baseOptions.serviceUrl = (0, helper_1.stripTrailingSlash)(url);
            logger_1.default.debug("Set service URL: ".concat(this.baseOptions.serviceUrl));
        }
    };
    /**
     * Set the HTTP headers to be sent in every request.
     *
     * @param headers - the map of headers to include in requests.
     */
    BaseService.prototype.setDefaultHeaders = function (headers) {
        if (typeof headers !== 'object') {
            // do nothing, for now
            return;
        }
        this.baseOptions.headers = headers;
    };
    /**
     * Turn request body compression on or off.
     *
     * @param setting - Will turn it on if 'true', off if 'false'.
     */
    BaseService.prototype.setEnableGzipCompression = function (setting) {
        this.requestWrapperInstance.setCompressRequestData(setting);
        // persist setting so that baseOptions accurately reflects the state of the flag
        this.baseOptions.enableGzipCompression = setting;
    };
    /**
     * Get the Axios instance set on the service.
     * All requests will be made using this instance.
     */
    BaseService.prototype.getHttpClient = function () {
        return this.requestWrapperInstance.getHttpClient();
    };
    /**
     * Enable retries for unfulfilled requests.
     *
     * @param retryOptions - the configuration for retries
     */
    BaseService.prototype.enableRetries = function (retryOptions) {
        this.requestWrapperInstance.enableRetries(retryOptions);
    };
    /**
     * Disables retries.
     */
    BaseService.prototype.disableRetries = function () {
        this.requestWrapperInstance.disableRetries();
    };
    /**
     * Applies a given modifier function on a model object.
     * Since the model object can be a map, or an array, or a model,
     * these types needs different handling.
     * Considering whether the input object is a map happens with an explicit parameter.
     * @param input - the input model object
     * @param converterFn - the function that is applied on the input object
     * @param isMap - is `true` when the input object should be handled as a map
     */
    BaseService.convertModel = function (input, converterFn, isMap) {
        if (input == null || typeof input === 'string') {
            // no need for conversation
            return input;
        }
        if (Array.isArray(input)) {
            return BaseService.convertArray(input, converterFn, isMap);
        }
        else if (isMap === true) {
            return BaseService.convertMap(input, converterFn);
        }
        return converterFn(input);
    };
    /**
     * Configure the service using external configuration
     *
     * @param serviceName - the name of the service. This will be used to read from external
     * configuration.
     */
    BaseService.prototype.configureService = function (serviceName) {
        logger_1.default.debug("Configuring BaseService instance with service name: ".concat(serviceName));
        if (!serviceName) {
            var err = 'Error configuring service. Service name is required.';
            logger_1.default.error(err);
            throw new Error(err);
        }
        Object.assign(this.baseOptions, this.readOptionsFromExternalConfig(serviceName));
        // overwrite the requestWrapperInstance with the new base options if applicable
        this.requestWrapperInstance = new request_wrapper_1.RequestWrapper(this.baseOptions);
    };
    /**
     * Wrapper around `sendRequest` that enforces the request will be authenticated.
     *
     * @param parameters - Service request options passed in by user.
     * This should be an object with the following fields:
     * - options.method: the http method
     * - options.url: the path portion of the URL to be appended to the serviceUrl
     * - options.path: the path parameters to be inserted into the URL
     * - options.qs: the querystring to be included in the URL
     * - options.body: the data to be sent as the request body
     * - options.form: an object containing the key/value pairs for a www-form-urlencoded request.
     * - options.formData: an object containing the contents for a multipart/form-data request
     *   The following processing is performed on formData values:
     *     - string: no special processing -- the value is sent as is
     *     - object: the value is converted to a JSON string before insertion into the form body
     *     - NodeJS.ReadableStream|Buffer|FileWithMetadata: sent as a file, with any associated metadata
     *     - array: each element of the array is sent as a separate form part using any special processing as described above
     * - defaultOptions.serviceUrl: the base URL of the service
     * - defaultOptions.headers: additional HTTP headers to be sent with the request
     * @returns a Promise
     */
    BaseService.prototype.createRequest = function (parameters) {
        var _this = this;
        // validate serviceUrl parameter has been set
        var serviceUrl = parameters.defaultOptions && parameters.defaultOptions.serviceUrl;
        if (!serviceUrl || typeof serviceUrl !== 'string') {
            return Promise.reject(new Error('The service URL is required'));
        }
        // make sure the outbound request contains a User-Agent header
        var userAgent = {
            'User-Agent': this.defaultUserAgent,
        };
        parameters.defaultOptions.headers = (0, extend_1.default)(true, {}, userAgent, parameters.defaultOptions.headers);
        return this.authenticator.authenticate(parameters.defaultOptions).then(function () {
            // resolve() handles rejection as well, so resolving the result of sendRequest should allow for proper handling later
            return _this.requestWrapperInstance.sendRequest(parameters);
        });
    };
    /**
     * Wrapper around `createRequest` that enforces arrived response to be deserialized.
     * @param parameters - see `parameters` in `createRequest`
     * @param deserializerFn - the deserializer function that is applied on the response object
     * @param isMap - is `true` when the response object should be handled as a map
     * @returns a Promise
     */
    BaseService.prototype.createRequestAndDeserializeResponse = function (parameters, deserializerFn, isMap) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.createRequest(parameters)
                .then(function (r) {
                if (r !== undefined && r.result !== undefined) {
                    r.result = BaseService.convertModel(r.result, deserializerFn, isMap);
                }
                resolve(r);
            })
                .catch(function (err) { return reject(err); });
        });
    };
    // eslint-disable-next-line class-methods-use-this
    BaseService.prototype.readOptionsFromExternalConfig = function (serviceName) {
        var results = {};
        var properties = (0, auth_1.readExternalSources)(serviceName);
        if (properties !== null) {
            // the user can define the following client-level variables in the credentials file:
            // - url
            // - disableSsl
            // - enableGzip
            var url = properties.url, disableSsl = properties.disableSsl, enableGzip = properties.enableGzip, enableRetries = properties.enableRetries, maxRetries = properties.maxRetries, retryInterval = properties.retryInterval;
            if (url) {
                results.serviceUrl = (0, helper_1.stripTrailingSlash)(url);
            }
            if (disableSsl === true) {
                results.disableSslVerification = disableSsl;
            }
            if (enableGzip === true) {
                results.enableGzipCompression = enableGzip;
            }
            if (enableRetries !== undefined) {
                results.enableRetries = enableRetries;
            }
            if (maxRetries !== undefined) {
                results.maxRetries = maxRetries;
            }
            if (retryInterval !== undefined) {
                results.retryInterval = retryInterval;
            }
        }
        return results;
    };
    BaseService.convertArray = function (arrayInput, converterFn, isMap) {
        var _this = this;
        var serializedList = [];
        arrayInput.forEach(function (element) {
            serializedList.push(_this.convertModel(element, converterFn, isMap));
        });
        return serializedList;
    };
    BaseService.convertMap = function (mapInput, converterFn) {
        var serializedMap = {};
        Object.keys(mapInput).forEach(function (key) {
            serializedMap[key] = BaseService.convertModel(mapInput[key], converterFn);
        });
        return serializedMap;
    };
    return BaseService;
}());
exports.BaseService = BaseService;
