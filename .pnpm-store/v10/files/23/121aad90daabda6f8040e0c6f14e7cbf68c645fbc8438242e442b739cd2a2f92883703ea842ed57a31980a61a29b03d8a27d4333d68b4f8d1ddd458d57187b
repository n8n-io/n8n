// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createHttpHeaders } from "./httpHeaders.js";
import { randomUUID } from "./util/uuidUtils.js";
class PipelineRequestImpl {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g;
        this.url = options.url;
        this.body = options.body;
        this.headers = (_a = options.headers) !== null && _a !== void 0 ? _a : createHttpHeaders();
        this.method = (_b = options.method) !== null && _b !== void 0 ? _b : "GET";
        this.timeout = (_c = options.timeout) !== null && _c !== void 0 ? _c : 0;
        this.multipartBody = options.multipartBody;
        this.formData = options.formData;
        this.disableKeepAlive = (_d = options.disableKeepAlive) !== null && _d !== void 0 ? _d : false;
        this.proxySettings = options.proxySettings;
        this.streamResponseStatusCodes = options.streamResponseStatusCodes;
        this.withCredentials = (_e = options.withCredentials) !== null && _e !== void 0 ? _e : false;
        this.abortSignal = options.abortSignal;
        this.onUploadProgress = options.onUploadProgress;
        this.onDownloadProgress = options.onDownloadProgress;
        this.requestId = options.requestId || randomUUID();
        this.allowInsecureConnection = (_f = options.allowInsecureConnection) !== null && _f !== void 0 ? _f : false;
        this.enableBrowserStreams = (_g = options.enableBrowserStreams) !== null && _g !== void 0 ? _g : false;
        this.requestOverrides = options.requestOverrides;
    }
}
/**
 * Creates a new pipeline request with the given options.
 * This method is to allow for the easy setting of default values and not required.
 * @param options - The options to create the request with.
 */
export function createPipelineRequest(options) {
    return new PipelineRequestImpl(options);
}
//# sourceMappingURL=pipelineRequest.js.map