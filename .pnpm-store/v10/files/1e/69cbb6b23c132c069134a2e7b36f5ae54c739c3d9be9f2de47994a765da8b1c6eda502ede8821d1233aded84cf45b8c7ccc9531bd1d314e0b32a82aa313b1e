// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { isKeyCredential, isTokenCredential } from "@azure/core-auth";
import { createDefaultPipeline } from "./clientHelpers.js";
import { getClient as tspGetClient, } from "@typespec/ts-http-runtime";
/**
 * Function to wrap RequestParameters so that we get the legacy onResponse behavior in core-client-rest
 */
function wrapRequestParameters(parameters) {
    if (parameters.onResponse) {
        return {
            ...parameters,
            onResponse(rawResponse, error) {
                parameters.onResponse?.(rawResponse, error, error);
            },
        };
    }
    return parameters;
}
export function getClient(endpoint, credentialsOrPipelineOptions, clientOptions = {}) {
    let credentials;
    if (credentialsOrPipelineOptions) {
        if (isCredential(credentialsOrPipelineOptions)) {
            credentials = credentialsOrPipelineOptions;
        }
        else {
            clientOptions = credentialsOrPipelineOptions ?? {};
        }
    }
    const pipeline = createDefaultPipeline(endpoint, credentials, clientOptions);
    const tspClient = tspGetClient(endpoint, {
        ...clientOptions,
        pipeline,
    });
    const client = (path, ...args) => {
        return {
            get: (requestOptions = {}) => {
                return tspClient.path(path, ...args).get(wrapRequestParameters(requestOptions));
            },
            post: (requestOptions = {}) => {
                return tspClient.path(path, ...args).post(wrapRequestParameters(requestOptions));
            },
            put: (requestOptions = {}) => {
                return tspClient.path(path, ...args).put(wrapRequestParameters(requestOptions));
            },
            patch: (requestOptions = {}) => {
                return tspClient.path(path, ...args).patch(wrapRequestParameters(requestOptions));
            },
            delete: (requestOptions = {}) => {
                return tspClient.path(path, ...args).delete(wrapRequestParameters(requestOptions));
            },
            head: (requestOptions = {}) => {
                return tspClient.path(path, ...args).head(wrapRequestParameters(requestOptions));
            },
            options: (requestOptions = {}) => {
                return tspClient.path(path, ...args).options(wrapRequestParameters(requestOptions));
            },
            trace: (requestOptions = {}) => {
                return tspClient.path(path, ...args).trace(wrapRequestParameters(requestOptions));
            },
        };
    };
    return {
        path: client,
        pathUnchecked: client,
        pipeline: tspClient.pipeline,
    };
}
function isCredential(param) {
    return isKeyCredential(param) || isTokenCredential(param);
}
//# sourceMappingURL=getClient.js.map