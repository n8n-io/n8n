"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceClient = void 0;
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const pipeline_js_1 = require("./pipeline.js");
const utils_js_1 = require("./utils.js");
const httpClientCache_js_1 = require("./httpClientCache.js");
const operationHelpers_js_1 = require("./operationHelpers.js");
const urlHelpers_js_1 = require("./urlHelpers.js");
const interfaceHelpers_js_1 = require("./interfaceHelpers.js");
const log_js_1 = require("./log.js");
/**
 * Initializes a new instance of the ServiceClient.
 */
class ServiceClient {
    /**
     * The ServiceClient constructor
     * @param credential - The credentials used for authentication with the service.
     * @param options - The service client options that govern the behavior of the client.
     */
    constructor(options = {}) {
        var _a, _b;
        this._requestContentType = options.requestContentType;
        this._endpoint = (_a = options.endpoint) !== null && _a !== void 0 ? _a : options.baseUri;
        if (options.baseUri) {
            log_js_1.logger.warning("The baseUri option for SDK Clients has been deprecated, please use endpoint instead.");
        }
        this._allowInsecureConnection = options.allowInsecureConnection;
        this._httpClient = options.httpClient || (0, httpClientCache_js_1.getCachedDefaultHttpClient)();
        this.pipeline = options.pipeline || createDefaultPipeline(options);
        if ((_b = options.additionalPolicies) === null || _b === void 0 ? void 0 : _b.length) {
            for (const { policy, position } of options.additionalPolicies) {
                // Sign happens after Retry and is commonly needed to occur
                // before policies that intercept post-retry.
                const afterPhase = position === "perRetry" ? "Sign" : undefined;
                this.pipeline.addPolicy(policy, {
                    afterPhase,
                });
            }
        }
    }
    /**
     * Send the provided httpRequest.
     */
    async sendRequest(request) {
        return this.pipeline.sendRequest(this._httpClient, request);
    }
    /**
     * Send an HTTP request that is populated using the provided OperationSpec.
     * @typeParam T - The typed result of the request, based on the OperationSpec.
     * @param operationArguments - The arguments that the HTTP request's templated values will be populated from.
     * @param operationSpec - The OperationSpec to use to populate the httpRequest.
     */
    async sendOperationRequest(operationArguments, operationSpec) {
        const endpoint = operationSpec.baseUrl || this._endpoint;
        if (!endpoint) {
            throw new Error("If operationSpec.baseUrl is not specified, then the ServiceClient must have a endpoint string property that contains the base URL to use.");
        }
        // Templatized URLs sometimes reference properties on the ServiceClient child class,
        // so we have to pass `this` below in order to search these properties if they're
        // not part of OperationArguments
        const url = (0, urlHelpers_js_1.getRequestUrl)(endpoint, operationSpec, operationArguments, this);
        const request = (0, core_rest_pipeline_1.createPipelineRequest)({
            url,
        });
        request.method = operationSpec.httpMethod;
        const operationInfo = (0, operationHelpers_js_1.getOperationRequestInfo)(request);
        operationInfo.operationSpec = operationSpec;
        operationInfo.operationArguments = operationArguments;
        const contentType = operationSpec.contentType || this._requestContentType;
        if (contentType && operationSpec.requestBody) {
            request.headers.set("Content-Type", contentType);
        }
        const options = operationArguments.options;
        if (options) {
            const requestOptions = options.requestOptions;
            if (requestOptions) {
                if (requestOptions.timeout) {
                    request.timeout = requestOptions.timeout;
                }
                if (requestOptions.onUploadProgress) {
                    request.onUploadProgress = requestOptions.onUploadProgress;
                }
                if (requestOptions.onDownloadProgress) {
                    request.onDownloadProgress = requestOptions.onDownloadProgress;
                }
                if (requestOptions.shouldDeserialize !== undefined) {
                    operationInfo.shouldDeserialize = requestOptions.shouldDeserialize;
                }
                if (requestOptions.allowInsecureConnection) {
                    request.allowInsecureConnection = true;
                }
            }
            if (options.abortSignal) {
                request.abortSignal = options.abortSignal;
            }
            if (options.tracingOptions) {
                request.tracingOptions = options.tracingOptions;
            }
        }
        if (this._allowInsecureConnection) {
            request.allowInsecureConnection = true;
        }
        if (request.streamResponseStatusCodes === undefined) {
            request.streamResponseStatusCodes = (0, interfaceHelpers_js_1.getStreamingResponseStatusCodes)(operationSpec);
        }
        try {
            const rawResponse = await this.sendRequest(request);
            const flatResponse = (0, utils_js_1.flattenResponse)(rawResponse, operationSpec.responses[rawResponse.status]);
            if (options === null || options === void 0 ? void 0 : options.onResponse) {
                options.onResponse(rawResponse, flatResponse);
            }
            return flatResponse;
        }
        catch (error) {
            if (typeof error === "object" && (error === null || error === void 0 ? void 0 : error.response)) {
                const rawResponse = error.response;
                const flatResponse = (0, utils_js_1.flattenResponse)(rawResponse, operationSpec.responses[error.statusCode] || operationSpec.responses["default"]);
                error.details = flatResponse;
                if (options === null || options === void 0 ? void 0 : options.onResponse) {
                    options.onResponse(rawResponse, flatResponse, error);
                }
            }
            throw error;
        }
    }
}
exports.ServiceClient = ServiceClient;
function createDefaultPipeline(options) {
    const credentialScopes = getCredentialScopes(options);
    const credentialOptions = options.credential && credentialScopes
        ? { credentialScopes, credential: options.credential }
        : undefined;
    return (0, pipeline_js_1.createClientPipeline)(Object.assign(Object.assign({}, options), { credentialOptions }));
}
function getCredentialScopes(options) {
    if (options.credentialScopes) {
        return options.credentialScopes;
    }
    if (options.endpoint) {
        return `${options.endpoint}/.default`;
    }
    if (options.baseUri) {
        return `${options.baseUri}/.default`;
    }
    if (options.credential && !options.credentialScopes) {
        throw new Error(`When using credentials, the ServiceClientOptions must contain either a endpoint or a credentialScopes. Unable to create a bearerTokenAuthenticationPolicy`);
    }
    return undefined;
}
//# sourceMappingURL=serviceClient.js.map