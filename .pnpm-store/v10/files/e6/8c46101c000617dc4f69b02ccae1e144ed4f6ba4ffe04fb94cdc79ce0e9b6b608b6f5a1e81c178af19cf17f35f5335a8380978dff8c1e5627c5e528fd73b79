"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromHttp = void 0;
const fetch_http_handler_1 = require("@smithy/fetch-http-handler");
const property_provider_1 = require("@smithy/property-provider");
const checkUrl_1 = require("./checkUrl");
const requestHelpers_1 = require("./requestHelpers");
const retry_wrapper_1 = require("./retry-wrapper");
const fromHttp = (options = {}) => {
    options.logger?.debug("@aws-sdk/credential-provider-http - fromHttp");
    let host;
    const full = options.credentialsFullUri;
    if (full) {
        host = full;
    }
    else {
        throw new property_provider_1.CredentialsProviderError("No HTTP credential provider host provided.", { logger: options.logger });
    }
    const url = new URL(host);
    (0, checkUrl_1.checkUrl)(url, options.logger);
    const requestHandler = new fetch_http_handler_1.FetchHttpHandler();
    return (0, retry_wrapper_1.retryWrapper)(async () => {
        const request = (0, requestHelpers_1.createGetRequest)(url);
        if (options.authorizationToken) {
            request.headers.Authorization = options.authorizationToken;
        }
        const result = await requestHandler.handle(request);
        return (0, requestHelpers_1.getCredentials)(result.response);
    }, options.maxRetries ?? 3, options.timeout ?? 1000);
};
exports.fromHttp = fromHttp;
