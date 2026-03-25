// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const AcceptHeaderName = "Accept";
const odataMetadataPolicy = "OdataMetadataPolicy";
/**
 * A policy factory for setting the Accept header to ignore odata metadata
 * @internal
 */
export function createOdataMetadataPolicy(metadataLevel) {
    return {
        name: odataMetadataPolicy,
        async sendRequest(request, next) {
            request.headers.set(AcceptHeaderName, `application/json;odata.metadata=${metadataLevel}`);
            return next(request);
        },
    };
}
//# sourceMappingURL=odataMetadataPolicy.js.map