// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Helper function to convert OperationOptions to RequestParameters
 * @param options - the options that are used by Modular layer to send the request
 * @returns the result of the conversion in RequestParameters of RLC layer
 */
export function operationOptionsToRequestParameters(options) {
    var _a, _b, _c, _d, _e, _f;
    return {
        allowInsecureConnection: (_a = options.requestOptions) === null || _a === void 0 ? void 0 : _a.allowInsecureConnection,
        timeout: (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.timeout,
        skipUrlEncoding: (_c = options.requestOptions) === null || _c === void 0 ? void 0 : _c.skipUrlEncoding,
        abortSignal: options.abortSignal,
        onUploadProgress: (_d = options.requestOptions) === null || _d === void 0 ? void 0 : _d.onUploadProgress,
        onDownloadProgress: (_e = options.requestOptions) === null || _e === void 0 ? void 0 : _e.onDownloadProgress,
        headers: Object.assign({}, (_f = options.requestOptions) === null || _f === void 0 ? void 0 : _f.headers),
        onResponse: options.onResponse,
    };
}
//# sourceMappingURL=operationOptionHelpers.js.map