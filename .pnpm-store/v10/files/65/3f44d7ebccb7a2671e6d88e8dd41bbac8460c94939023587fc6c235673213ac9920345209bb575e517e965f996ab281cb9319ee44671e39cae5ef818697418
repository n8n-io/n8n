/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { HttpHeaderKeys, DefaultPackageInfo, ChallengeType } from '../../../CustomAuthConstants.mjs';
import { HTTP_REQUEST_FAILED, CONTINUATION_TOKEN_MISSING, INVALID_RESPONSE_BODY } from './types/ApiErrorCodes.mjs';
import { parseUrl, buildUrl } from '../../utils/UrlUtils.mjs';
import { CustomAuthApiError, RedirectError } from '../../error/CustomAuthApiError.mjs';
import { AADServerParamKeys } from '@azure/msal-common/browser';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class BaseApiClient {
    constructor(baseUrl, clientId, httpClient, customAuthApiQueryParams) {
        this.clientId = clientId;
        this.httpClient = httpClient;
        this.customAuthApiQueryParams = customAuthApiQueryParams;
        this.baseRequestUrl = parseUrl(!baseUrl.endsWith("/") ? `${baseUrl}/` : baseUrl);
    }
    async request(endpoint, data, telemetryManager, correlationId) {
        const formData = new URLSearchParams({
            client_id: this.clientId,
            ...data,
        });
        const headers = this.getCommonHeaders(correlationId, telemetryManager);
        const url = buildUrl(this.baseRequestUrl.href, endpoint, this.customAuthApiQueryParams);
        let response;
        try {
            response = await this.httpClient.post(url, formData, headers);
        }
        catch (e) {
            throw new CustomAuthApiError(HTTP_REQUEST_FAILED, `Failed to perform '${endpoint}' request: ${e}`, correlationId);
        }
        return this.handleApiResponse(response, correlationId);
    }
    ensureContinuationTokenIsValid(continuationToken, correlationId) {
        if (!continuationToken) {
            throw new CustomAuthApiError(CONTINUATION_TOKEN_MISSING, "Continuation token is missing in the response body", correlationId);
        }
    }
    readResponseCorrelationId(response, requestCorrelationId) {
        return (response.headers.get(HttpHeaderKeys.X_MS_REQUEST_ID) ||
            requestCorrelationId);
    }
    getCommonHeaders(correlationId, telemetryManager) {
        return {
            [HttpHeaderKeys.CONTENT_TYPE]: "application/x-www-form-urlencoded",
            [AADServerParamKeys.X_CLIENT_SKU]: DefaultPackageInfo.SKU,
            [AADServerParamKeys.X_CLIENT_VER]: DefaultPackageInfo.VERSION,
            [AADServerParamKeys.X_CLIENT_OS]: DefaultPackageInfo.OS,
            [AADServerParamKeys.X_CLIENT_CPU]: DefaultPackageInfo.CPU,
            [AADServerParamKeys.X_CLIENT_CURR_TELEM]: telemetryManager.generateCurrentRequestHeaderValue(),
            [AADServerParamKeys.X_CLIENT_LAST_TELEM]: telemetryManager.generateLastRequestHeaderValue(),
            [AADServerParamKeys.CLIENT_REQUEST_ID]: correlationId,
        };
    }
    async handleApiResponse(response, requestCorrelationId) {
        if (!response) {
            throw new CustomAuthApiError("empty_response", "Response is empty", requestCorrelationId);
        }
        const correlationId = this.readResponseCorrelationId(response, requestCorrelationId);
        const responseData = await response.json();
        if (response.ok) {
            // Ensure the response doesn't have redirect challenge type
            if (typeof responseData === "object" &&
                responseData.challenge_type === ChallengeType.REDIRECT) {
                throw new RedirectError(correlationId, responseData.redirect_reason);
            }
            return {
                ...responseData,
                correlation_id: correlationId,
            };
        }
        const responseError = responseData;
        if (!responseError) {
            throw new CustomAuthApiError(INVALID_RESPONSE_BODY, "Response error body is empty or invalid", correlationId);
        }
        const attributes = !!responseError.required_attributes &&
            responseError.required_attributes.length > 0
            ? responseError.required_attributes
            : responseError.invalid_attributes ?? [];
        throw new CustomAuthApiError(responseError.error, responseError.error_description, responseError.correlation_id, responseError.error_codes, responseError.suberror, attributes, responseError.continuation_token, responseError.trace_id, responseError.timestamp);
    }
}

export { BaseApiClient };
//# sourceMappingURL=BaseApiClient.mjs.map
