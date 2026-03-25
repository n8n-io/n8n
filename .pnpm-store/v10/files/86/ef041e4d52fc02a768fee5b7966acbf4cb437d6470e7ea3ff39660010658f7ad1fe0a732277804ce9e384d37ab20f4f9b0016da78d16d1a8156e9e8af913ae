// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Helper function to convert OperationOptions to RequestParameters
 * @param options - the options that are used by Modular layer to send the request
 * @returns the result of the conversion in RequestParameters of RLC layer
 */
export function operationOptionsToRequestParameters(options) {
    return {
        allowInsecureConnection: options.requestOptions?.allowInsecureConnection,
        timeout: options.requestOptions?.timeout,
        skipUrlEncoding: options.requestOptions?.skipUrlEncoding,
        abortSignal: options.abortSignal,
        onUploadProgress: options.requestOptions?.onUploadProgress,
        onDownloadProgress: options.requestOptions?.onDownloadProgress,
        headers: { ...options.requestOptions?.headers },
        onResponse: options.onResponse,
    };
}
//# sourceMappingURL=operationOptionHelpers.js.map