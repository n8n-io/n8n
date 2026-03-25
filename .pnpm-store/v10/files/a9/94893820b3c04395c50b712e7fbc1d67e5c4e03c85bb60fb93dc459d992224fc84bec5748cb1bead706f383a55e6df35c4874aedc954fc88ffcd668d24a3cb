"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPipelineRequest = createPipelineRequest;
const httpHeaders_js_1 = require("./httpHeaders.js");
const uuidUtils_js_1 = require("./util/uuidUtils.js");
class PipelineRequestImpl {
    url;
    method;
    headers;
    timeout;
    withCredentials;
    body;
    multipartBody;
    formData;
    streamResponseStatusCodes;
    enableBrowserStreams;
    proxySettings;
    disableKeepAlive;
    abortSignal;
    requestId;
    allowInsecureConnection;
    onUploadProgress;
    onDownloadProgress;
    requestOverrides;
    authSchemes;
    constructor(options) {
        this.url = options.url;
        this.body = options.body;
        this.headers = options.headers ?? (0, httpHeaders_js_1.createHttpHeaders)();
        this.method = options.method ?? "GET";
        this.timeout = options.timeout ?? 0;
        this.multipartBody = options.multipartBody;
        this.formData = options.formData;
        this.disableKeepAlive = options.disableKeepAlive ?? false;
        this.proxySettings = options.proxySettings;
        this.streamResponseStatusCodes = options.streamResponseStatusCodes;
        this.withCredentials = options.withCredentials ?? false;
        this.abortSignal = options.abortSignal;
        this.onUploadProgress = options.onUploadProgress;
        this.onDownloadProgress = options.onDownloadProgress;
        this.requestId = options.requestId || (0, uuidUtils_js_1.randomUUID)();
        this.allowInsecureConnection = options.allowInsecureConnection ?? false;
        this.enableBrowserStreams = options.enableBrowserStreams ?? false;
        this.requestOverrides = options.requestOverrides;
        this.authSchemes = options.authSchemes;
    }
}
/**
 * Creates a new pipeline request with the given options.
 * This method is to allow for the easy setting of default values and not required.
 * @param options - The options to create the request with.
 */
function createPipelineRequest(options) {
    return new PipelineRequestImpl(options);
}
//# sourceMappingURL=pipelineRequest.js.map