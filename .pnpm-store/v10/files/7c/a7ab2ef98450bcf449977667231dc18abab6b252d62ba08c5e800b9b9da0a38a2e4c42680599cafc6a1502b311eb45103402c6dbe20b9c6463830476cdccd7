/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ChallengeType,
    DefaultPackageInfo,
    HttpHeaderKeys,
} from "../../../CustomAuthConstants.js";
import { IHttpClient } from "../http_client/IHttpClient.js";
import * as CustomAuthApiErrorCode from "./types/ApiErrorCodes.js";
import { buildUrl, parseUrl } from "../../utils/UrlUtils.js";
import {
    CustomAuthApiError,
    RedirectError,
} from "../../error/CustomAuthApiError.js";
import {
    AADServerParamKeys,
    ServerTelemetryManager,
} from "@azure/msal-common/browser";
import { ApiErrorResponse } from "./types/ApiErrorResponseTypes.js";

export abstract class BaseApiClient {
    private readonly baseRequestUrl: URL;

    constructor(
        baseUrl: string,
        private readonly clientId: string,
        private httpClient: IHttpClient,
        private customAuthApiQueryParams?: Record<string, string>
    ) {
        this.baseRequestUrl = parseUrl(
            !baseUrl.endsWith("/") ? `${baseUrl}/` : baseUrl
        );
    }

    protected async request<T>(
        endpoint: string,
        data: Record<string, string | boolean>,
        telemetryManager: ServerTelemetryManager,
        correlationId: string
    ): Promise<T> {
        const formData = new URLSearchParams({
            client_id: this.clientId,
            ...data,
        });
        const headers = this.getCommonHeaders(correlationId, telemetryManager);
        const url = buildUrl(
            this.baseRequestUrl.href,
            endpoint,
            this.customAuthApiQueryParams
        );

        let response: Response;

        try {
            response = await this.httpClient.post(url, formData, headers);
        } catch (e) {
            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.HTTP_REQUEST_FAILED,
                `Failed to perform '${endpoint}' request: ${e}`,
                correlationId
            );
        }

        return this.handleApiResponse(response, correlationId);
    }

    protected ensureContinuationTokenIsValid(
        continuationToken: string | undefined,
        correlationId: string
    ): void {
        if (!continuationToken) {
            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.CONTINUATION_TOKEN_MISSING,
                "Continuation token is missing in the response body",
                correlationId
            );
        }
    }

    private readResponseCorrelationId(
        response: Response,
        requestCorrelationId: string
    ): string {
        return (
            response.headers.get(HttpHeaderKeys.X_MS_REQUEST_ID) ||
            requestCorrelationId
        );
    }

    private getCommonHeaders(
        correlationId: string,
        telemetryManager: ServerTelemetryManager
    ): Record<string, string> {
        return {
            [HttpHeaderKeys.CONTENT_TYPE]: "application/x-www-form-urlencoded",
            [AADServerParamKeys.X_CLIENT_SKU]: DefaultPackageInfo.SKU,
            [AADServerParamKeys.X_CLIENT_VER]: DefaultPackageInfo.VERSION,
            [AADServerParamKeys.X_CLIENT_OS]: DefaultPackageInfo.OS,
            [AADServerParamKeys.X_CLIENT_CPU]: DefaultPackageInfo.CPU,
            [AADServerParamKeys.X_CLIENT_CURR_TELEM]:
                telemetryManager.generateCurrentRequestHeaderValue(),
            [AADServerParamKeys.X_CLIENT_LAST_TELEM]:
                telemetryManager.generateLastRequestHeaderValue(),
            [AADServerParamKeys.CLIENT_REQUEST_ID]: correlationId,
        };
    }

    private async handleApiResponse<T>(
        response: Response | undefined,
        requestCorrelationId: string
    ): Promise<T> {
        if (!response) {
            throw new CustomAuthApiError(
                "empty_response",
                "Response is empty",
                requestCorrelationId
            );
        }

        const correlationId = this.readResponseCorrelationId(
            response,
            requestCorrelationId
        );

        const responseData = await response.json();

        if (response.ok) {
            // Ensure the response doesn't have redirect challenge type
            if (
                typeof responseData === "object" &&
                responseData.challenge_type === ChallengeType.REDIRECT
            ) {
                throw new RedirectError(
                    correlationId,
                    responseData.redirect_reason
                );
            }

            return {
                ...responseData,
                correlation_id: correlationId,
            };
        }

        const responseError = responseData as ApiErrorResponse;

        if (!responseError) {
            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.INVALID_RESPONSE_BODY,
                "Response error body is empty or invalid",
                correlationId
            );
        }

        const attributes =
            !!responseError.required_attributes &&
            responseError.required_attributes.length > 0
                ? responseError.required_attributes
                : responseError.invalid_attributes ?? [];

        throw new CustomAuthApiError(
            responseError.error,
            responseError.error_description,
            responseError.correlation_id,
            responseError.error_codes,
            responseError.suberror,
            attributes,
            responseError.continuation_token,
            responseError.trace_id,
            responseError.timestamp
        );
    }
}
