/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthApiError } from "../../core/error/CustomAuthApiError.js";
import * as CustomAuthApiErrorCode from "../../core/network_client/custom_auth_api/types/ApiErrorCodes.js";
import { UnexpectedError } from "../../core/error/UnexpectedError.js";
import { CustomAuthInteractionClientBase } from "../../core/interaction_client/CustomAuthInteractionClientBase.js";
import * as PublicApiId from "../../core/telemetry/PublicApiId.js";
import {
    ChallengeType,
    DefaultCustomAuthApiCodeLength,
    DefaultCustomAuthApiCodeResendIntervalInSec,
} from "../../CustomAuthConstants.js";
import {
    SignUpParamsBase,
    SignUpResendCodeParams,
    SignUpStartParams,
    SignUpSubmitCodeParams,
    SignUpSubmitPasswordParams,
    SignUpSubmitUserAttributesParams,
} from "./parameter/SignUpParams.js";
import {
    createSignUpAttributesRequiredResult,
    createSignUpCodeRequiredResult,
    createSignUpCompletedResult,
    createSignUpPasswordRequiredResult,
    SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE,
    SIGN_UP_CODE_REQUIRED_RESULT_TYPE,
    SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE,
    SignUpAttributesRequiredResult,
    SignUpCodeRequiredResult,
    SignUpCompletedResult,
    SignUpPasswordRequiredResult,
} from "./result/SignUpActionResult.js";
import {
    SignUpChallengeRequest,
    SignUpContinueWithAttributesRequest,
    SignUpContinueWithOobRequest,
    SignUpContinueWithPasswordRequest,
    SignUpStartRequest,
} from "../../core/network_client/custom_auth_api/types/ApiRequestTypes.js";
import { SignUpContinueResponse } from "../../core/network_client/custom_auth_api/types/ApiResponseTypes.js";
import { ServerTelemetryManager } from "@azure/msal-common/browser";

export class SignUpClient extends CustomAuthInteractionClientBase {
    /**
     * Starts the sign up flow.
     * @param parameters The parameters for the sign up start action.
     * @returns The result of the sign up start action.
     */
    async start(
        parameters: SignUpStartParams
    ): Promise<SignUpPasswordRequiredResult | SignUpCodeRequiredResult> {
        const apiId = !parameters.password
            ? PublicApiId.SIGN_UP_START
            : PublicApiId.SIGN_UP_WITH_PASSWORD_START;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);

        const startRequest: SignUpStartRequest = {
            username: parameters.username,
            password: parameters.password,
            attributes: parameters.attributes,
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            telemetryManager,
            correlationId: parameters.correlationId,
        };

        this.logger.verbose(
            "Calling start endpoint for sign up.",
            parameters.correlationId
        );

        const startResponse = await this.customAuthApiClient.signUpApi.start(
            startRequest
        );

        this.logger.verbose(
            "Start endpoint called for sign up.",
            parameters.correlationId
        );

        const challengeRequest: SignUpChallengeRequest = {
            continuation_token: startResponse.continuation_token ?? "",
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            telemetryManager,
            correlationId: startResponse.correlation_id,
        };

        return this.performChallengeRequest(challengeRequest);
    }

    /**
     * Submits the code for the sign up flow.
     * @param parameters The parameters for the sign up submit code action.
     * @returns The result of the sign up submit code action.
     */
    async submitCode(
        parameters: SignUpSubmitCodeParams
    ): Promise<
        | SignUpCompletedResult
        | SignUpPasswordRequiredResult
        | SignUpAttributesRequiredResult
    > {
        const apiId = PublicApiId.SIGN_UP_SUBMIT_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);

        const requestSubmitCode: SignUpContinueWithOobRequest = {
            continuation_token: parameters.continuationToken,
            oob: parameters.code,
            telemetryManager,
            correlationId: parameters.correlationId,
        };

        const result = await this.performContinueRequest(
            "SignUpClient.submitCode",
            parameters,
            telemetryManager,
            () =>
                this.customAuthApiClient.signUpApi.continueWithCode(
                    requestSubmitCode
                ),
            parameters.correlationId
        );

        if (result.type === SIGN_UP_CODE_REQUIRED_RESULT_TYPE) {
            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.UNSUPPORTED_CHALLENGE_TYPE,
                "The challenge type 'oob' is invalid after submtting code for sign up.",
                parameters.correlationId
            );
        }

        return result;
    }

    /**
     * Submits the password for the sign up flow.
     * @param parameter The parameters for the sign up submit password action.
     * @returns The result of the sign up submit password action.
     */
    async submitPassword(
        parameter: SignUpSubmitPasswordParams
    ): Promise<
        | SignUpCompletedResult
        | SignUpCodeRequiredResult
        | SignUpAttributesRequiredResult
    > {
        const apiId = PublicApiId.SIGN_UP_SUBMIT_PASSWORD;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);

        const requestSubmitPwd: SignUpContinueWithPasswordRequest = {
            continuation_token: parameter.continuationToken,
            password: parameter.password,
            telemetryManager,
            correlationId: parameter.correlationId,
        };

        const result = await this.performContinueRequest(
            "SignUpClient.submitPassword",
            parameter,
            telemetryManager,
            () =>
                this.customAuthApiClient.signUpApi.continueWithPassword(
                    requestSubmitPwd
                ),
            parameter.correlationId
        );

        if (result.type === SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE) {
            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.UNSUPPORTED_CHALLENGE_TYPE,
                "The challenge type 'password' is invalid after submtting password for sign up.",
                parameter.correlationId
            );
        }

        return result;
    }

    /**
     * Submits the attributes for the sign up flow.
     * @param parameter The parameters for the sign up submit attributes action.
     * @returns The result of the sign up submit attributes action.
     */
    async submitAttributes(
        parameter: SignUpSubmitUserAttributesParams
    ): Promise<
        | SignUpCompletedResult
        | SignUpPasswordRequiredResult
        | SignUpCodeRequiredResult
    > {
        const apiId = PublicApiId.SIGN_UP_SUBMIT_ATTRIBUTES;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const reqWithAttr: SignUpContinueWithAttributesRequest = {
            continuation_token: parameter.continuationToken,
            attributes: parameter.attributes,
            telemetryManager,
            correlationId: parameter.correlationId,
        };

        const result = await this.performContinueRequest(
            "SignUpClient.submitAttributes",
            parameter,
            telemetryManager,
            () =>
                this.customAuthApiClient.signUpApi.continueWithAttributes(
                    reqWithAttr
                ),
            parameter.correlationId
        );

        if (result.type === SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE) {
            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.ATTRIBUTES_REQUIRED,
                "User attributes required",
                parameter.correlationId,
                [],
                "",
                result.requiredAttributes,
                result.continuationToken
            );
        }

        return result;
    }

    /**
     * Resends the code for the sign up flow.
     * @param parameters The parameters for the sign up resend code action.
     * @returns The result of the sign up resend code action.
     */
    async resendCode(
        parameters: SignUpResendCodeParams
    ): Promise<SignUpCodeRequiredResult> {
        const apiId = PublicApiId.SIGN_UP_RESEND_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);

        const challengeRequest: SignUpChallengeRequest = {
            continuation_token: parameters.continuationToken ?? "",
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            telemetryManager,
            correlationId: parameters.correlationId,
        };

        const result = await this.performChallengeRequest(challengeRequest);

        if (result.type === SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE) {
            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.UNSUPPORTED_CHALLENGE_TYPE,
                "The challenge type 'password' is invalid after resending code for sign up.",
                parameters.correlationId
            );
        }

        return result;
    }

    private async performChallengeRequest(
        request: SignUpChallengeRequest
    ): Promise<SignUpPasswordRequiredResult | SignUpCodeRequiredResult> {
        this.logger.verbose(
            "Calling challenge endpoint for sign up.",
            request.correlationId
        );

        const challengeResponse =
            await this.customAuthApiClient.signUpApi.requestChallenge(request);

        this.logger.verbose(
            "Challenge endpoint called for sign up.",
            request.correlationId
        );

        if (challengeResponse.challenge_type === ChallengeType.OOB) {
            // Code is required
            this.logger.verbose(
                "Challenge type is oob for sign up.",
                request.correlationId
            );

            return createSignUpCodeRequiredResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
                challengeChannel: challengeResponse.challenge_channel ?? "",
                challengeTargetLabel:
                    challengeResponse.challenge_target_label ?? "",
                codeLength:
                    challengeResponse.code_length ??
                    DefaultCustomAuthApiCodeLength,
                interval:
                    challengeResponse.interval ??
                    DefaultCustomAuthApiCodeResendIntervalInSec,
                bindingMethod: challengeResponse.binding_method ?? "",
            });
        }

        if (challengeResponse.challenge_type === ChallengeType.PASSWORD) {
            // Password is required
            this.logger.verbose(
                "Challenge type is password for sign up.",
                request.correlationId
            );

            return createSignUpPasswordRequiredResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
            });
        }

        this.logger.error(
            `Unsupported challenge type '${challengeResponse.challenge_type}' for sign up.`,
            request.correlationId
        );

        throw new CustomAuthApiError(
            CustomAuthApiErrorCode.UNSUPPORTED_CHALLENGE_TYPE,
            `Unsupported challenge type '${challengeResponse.challenge_type}'.`,
            request.correlationId
        );
    }

    private async performContinueRequest(
        callerName: string,
        requestParams: SignUpParamsBase,
        telemetryManager: ServerTelemetryManager,
        responseGetter: () => Promise<SignUpContinueResponse>,
        requestCorrelationId: string
    ): Promise<
        | SignUpCompletedResult
        | SignUpPasswordRequiredResult
        | SignUpCodeRequiredResult
        | SignUpAttributesRequiredResult
    > {
        this.logger.verbose(
            `${callerName} is calling continue endpoint for sign up.`,
            requestCorrelationId
        );

        try {
            const response = await responseGetter();

            this.logger.verbose(
                `Continue endpoint called by ${callerName} for sign up.`,
                requestCorrelationId
            );

            return createSignUpCompletedResult({
                correlationId: requestCorrelationId,
                continuationToken: response.continuation_token ?? "",
            });
        } catch (error) {
            if (error instanceof CustomAuthApiError) {
                return this.handleContinueResponseError(
                    error,
                    error.correlationId ?? requestCorrelationId,
                    requestParams,
                    telemetryManager
                );
            } else {
                this.logger.errorPii(
                    `${callerName} is failed to call continue endpoint for sign up. Error: ${error}`,
                    requestCorrelationId
                );

                throw new UnexpectedError(error, requestCorrelationId);
            }
        }
    }

    private async handleContinueResponseError(
        responseError: CustomAuthApiError,
        correlationId: string,
        requestParams: SignUpParamsBase,
        telemetryManager: ServerTelemetryManager
    ): Promise<
        | SignUpPasswordRequiredResult
        | SignUpCodeRequiredResult
        | SignUpAttributesRequiredResult
    > {
        if (
            responseError.error ===
                CustomAuthApiErrorCode.CREDENTIAL_REQUIRED &&
            !!responseError.errorCodes &&
            responseError.errorCodes.includes(55103)
        ) {
            // Credential is required
            this.logger.verbose(
                "The credential is required in the sign up flow.",
                correlationId
            );

            const continuationToken =
                this.readContinuationTokenFromResponeError(responseError);

            // Call the challenge endpoint to ensure the password challenge type is supported.
            const challengeRequest: SignUpChallengeRequest = {
                continuation_token: continuationToken,
                challenge_type: this.getChallengeTypes(
                    requestParams.challengeType
                ),
                telemetryManager,
                correlationId,
            };

            const challengeResult = await this.performChallengeRequest(
                challengeRequest
            );

            if (
                challengeResult.type === SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE
            ) {
                return createSignUpPasswordRequiredResult({
                    correlationId: correlationId,
                    continuationToken: challengeResult.continuationToken,
                });
            }

            if (challengeResult.type === SIGN_UP_CODE_REQUIRED_RESULT_TYPE) {
                return createSignUpCodeRequiredResult({
                    correlationId: challengeResult.correlationId,
                    continuationToken: challengeResult.continuationToken,
                    challengeChannel: challengeResult.challengeChannel,
                    challengeTargetLabel: challengeResult.challengeTargetLabel,
                    codeLength: challengeResult.codeLength,
                    interval: challengeResult.interval,
                    bindingMethod: challengeResult.bindingMethod,
                });
            }

            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.UNSUPPORTED_CHALLENGE_TYPE,
                "The challenge type is not supported.",
                correlationId
            );
        }

        if (this.isAttributesRequiredError(responseError, correlationId)) {
            // Attributes are required
            this.logger.verbose(
                "Attributes are required in the sign up flow.",
                correlationId
            );

            const continuationToken =
                this.readContinuationTokenFromResponeError(responseError);

            return createSignUpAttributesRequiredResult({
                correlationId: correlationId,
                continuationToken: continuationToken,
                requiredAttributes: responseError.attributes ?? [],
            });
        }

        throw responseError;
    }

    private isAttributesRequiredError(
        responseError: CustomAuthApiError,
        correlationId: string
    ): boolean {
        if (
            responseError.error === CustomAuthApiErrorCode.ATTRIBUTES_REQUIRED
        ) {
            if (
                !responseError.attributes ||
                responseError.attributes.length === 0
            ) {
                throw new CustomAuthApiError(
                    CustomAuthApiErrorCode.INVALID_RESPONSE_BODY,
                    "Attributes are required but required_attributes field is missing in the response body.",
                    correlationId
                );
            }

            return true;
        }

        return false;
    }

    private readContinuationTokenFromResponeError(
        responseError: CustomAuthApiError
    ): string {
        if (!responseError.continuationToken) {
            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.CONTINUATION_TOKEN_MISSING,
                "Continuation token is missing in the response body",
                responseError.correlationId
            );
        }

        return responseError.continuationToken;
    }
}
