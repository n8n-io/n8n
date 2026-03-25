/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { RequestParameterBuilder, UrlUtils, UrlString } from '@azure/msal-common/node';
import { DefaultManagedIdentityRetryPolicy } from '../retry/DefaultManagedIdentityRetryPolicy.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class ManagedIdentityRequestParameters {
    constructor(httpMethod, endpoint, retryPolicy) {
        this.httpMethod = httpMethod;
        this._baseEndpoint = endpoint;
        this.headers = {};
        this.bodyParameters = {};
        this.queryParameters = {};
        this.retryPolicy =
            retryPolicy || new DefaultManagedIdentityRetryPolicy();
    }
    computeUri() {
        const parameters = new Map();
        if (this.queryParameters) {
            RequestParameterBuilder.addExtraQueryParameters(parameters, this.queryParameters);
        }
        const queryParametersString = UrlUtils.mapToQueryString(parameters);
        return UrlString.appendQueryString(this._baseEndpoint, queryParametersString);
    }
    computeParametersBodyString() {
        const parameters = new Map();
        if (this.bodyParameters) {
            RequestParameterBuilder.addExtraQueryParameters(parameters, this.bodyParameters);
        }
        return UrlUtils.mapToQueryString(parameters);
    }
}

export { ManagedIdentityRequestParameters };
//# sourceMappingURL=ManagedIdentityRequestParameters.mjs.map
