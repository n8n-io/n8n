/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    RequestParameterBuilder,
    UrlString,
    UrlUtils,
} from "@azure/msal-common/node";
import { DefaultManagedIdentityRetryPolicy } from "../retry/DefaultManagedIdentityRetryPolicy.js";
import { HttpMethod, RetryPolicies } from "../utils/Constants.js";

export class ManagedIdentityRequestParameters {
    private _baseEndpoint: string;
    public httpMethod: HttpMethod;
    public headers: Record<string, string>;
    public bodyParameters: Record<string, string>;
    public queryParameters: Record<string, string>;
    public retryPolicy: RetryPolicies;

    constructor(
        httpMethod: HttpMethod,
        endpoint: string,
        retryPolicy?: RetryPolicies
    ) {
        this.httpMethod = httpMethod;
        this._baseEndpoint = endpoint;
        this.headers = {} as Record<string, string>;
        this.bodyParameters = {} as Record<string, string>;
        this.queryParameters = {} as Record<string, string>;

        this.retryPolicy =
            retryPolicy || new DefaultManagedIdentityRetryPolicy();
    }

    public computeUri(): string {
        const parameters = new Map<string, string>();

        if (this.queryParameters) {
            RequestParameterBuilder.addExtraQueryParameters(
                parameters,
                this.queryParameters
            );
        }

        const queryParametersString = UrlUtils.mapToQueryString(parameters);

        return UrlString.appendQueryString(
            this._baseEndpoint,
            queryParametersString
        );
    }

    public computeParametersBodyString(): string {
        const parameters = new Map<string, string>();

        if (this.bodyParameters) {
            RequestParameterBuilder.addExtraQueryParameters(
                parameters,
                this.bodyParameters
            );
        }

        return UrlUtils.mapToQueryString(parameters);
    }
}
