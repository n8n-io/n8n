/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CustomAuthApiError } from '../../core/error/CustomAuthApiError.mjs';
import { UNSUPPORTED_CHALLENGE_TYPE, ATTRIBUTES_REQUIRED, CREDENTIAL_REQUIRED, INVALID_RESPONSE_BODY, CONTINUATION_TOKEN_MISSING } from '../../core/network_client/custom_auth_api/types/ApiErrorCodes.mjs';
import { UnexpectedError } from '../../core/error/UnexpectedError.mjs';
import { CustomAuthInteractionClientBase } from '../../core/interaction_client/CustomAuthInteractionClientBase.mjs';
import { SIGN_UP_START, SIGN_UP_WITH_PASSWORD_START, SIGN_UP_SUBMIT_CODE, SIGN_UP_SUBMIT_PASSWORD, SIGN_UP_SUBMIT_ATTRIBUTES, SIGN_UP_RESEND_CODE } from '../../core/telemetry/PublicApiId.mjs';
import { ChallengeType, DefaultCustomAuthApiCodeResendIntervalInSec, DefaultCustomAuthApiCodeLength } from '../../CustomAuthConstants.mjs';
import { SIGN_UP_CODE_REQUIRED_RESULT_TYPE, SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE, SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE, createSignUpCodeRequiredResult, createSignUpPasswordRequiredResult, createSignUpCompletedResult, createSignUpAttributesRequiredResult } from './result/SignUpActionResult.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SignUpClient extends CustomAuthInteractionClientBase {
    /**
     * Starts the sign up flow.
     * @param parameters The parameters for the sign up start action.
     * @returns The result of the sign up start action.
     */
    async start(parameters) {
        const apiId = !parameters.password
            ? SIGN_UP_START
            : SIGN_UP_WITH_PASSWORD_START;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const startRequest = {
            username: parameters.username,
            password: parameters.password,
            attributes: parameters.attributes,
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            telemetryManager,
            correlationId: parameters.correlationId,
        };
        this.logger.verbose("Calling start endpoint for sign up.", parameters.correlationId);
        const startResponse = await this.customAuthApiClient.signUpApi.start(startRequest);
        this.logger.verbose("Start endpoint called for sign up.", parameters.correlationId);
        const challengeRequest = {
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
    async submitCode(parameters) {
        const apiId = SIGN_UP_SUBMIT_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const requestSubmitCode = {
            continuation_token: parameters.continuationToken,
            oob: parameters.code,
            telemetryManager,
            correlationId: parameters.correlationId,
        };
        const result = await this.performContinueRequest("SignUpClient.submitCode", parameters, telemetryManager, () => this.customAuthApiClient.signUpApi.continueWithCode(requestSubmitCode), parameters.correlationId);
        if (result.type === SIGN_UP_CODE_REQUIRED_RESULT_TYPE) {
            throw new CustomAuthApiError(UNSUPPORTED_CHALLENGE_TYPE, "The challenge type 'oob' is invalid after submtting code for sign up.", parameters.correlationId);
        }
        return result;
    }
    /**
     * Submits the password for the sign up flow.
     * @param parameter The parameters for the sign up submit password action.
     * @returns The result of the sign up submit password action.
     */
    async submitPassword(parameter) {
        const apiId = SIGN_UP_SUBMIT_PASSWORD;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const requestSubmitPwd = {
            continuation_token: parameter.continuationToken,
            password: parameter.password,
            telemetryManager,
            correlationId: parameter.correlationId,
        };
        const result = await this.performContinueRequest("SignUpClient.submitPassword", parameter, telemetryManager, () => this.customAuthApiClient.signUpApi.continueWithPassword(requestSubmitPwd), parameter.correlationId);
        if (result.type === SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE) {
            throw new CustomAuthApiError(UNSUPPORTED_CHALLENGE_TYPE, "The challenge type 'password' is invalid after submtting password for sign up.", parameter.correlationId);
        }
        return result;
    }
    /**
     * Submits the attributes for the sign up flow.
     * @param parameter The parameters for the sign up submit attributes action.
     * @returns The result of the sign up submit attributes action.
     */
    async submitAttributes(parameter) {
        const apiId = SIGN_UP_SUBMIT_ATTRIBUTES;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const reqWithAttr = {
            continuation_token: parameter.continuationToken,
            attributes: parameter.attributes,
            telemetryManager,
            correlationId: parameter.correlationId,
        };
        const result = await this.performContinueRequest("SignUpClient.submitAttributes", parameter, telemetryManager, () => this.customAuthApiClient.signUpApi.continueWithAttributes(reqWithAttr), parameter.correlationId);
        if (result.type === SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE) {
            throw new CustomAuthApiError(ATTRIBUTES_REQUIRED, "User attributes required", parameter.correlationId, [], "", result.requiredAttributes, result.continuationToken);
        }
        return result;
    }
    /**
     * Resends the code for the sign up flow.
     * @param parameters The parameters for the sign up resend code action.
     * @returns The result of the sign up resend code action.
     */
    async resendCode(parameters) {
        const apiId = SIGN_UP_RESEND_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const challengeRequest = {
            continuation_token: parameters.continuationToken ?? "",
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            telemetryManager,
            correlationId: parameters.correlationId,
        };
        const result = await this.performChallengeRequest(challengeRequest);
        if (result.type === SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE) {
            throw new CustomAuthApiError(UNSUPPORTED_CHALLENGE_TYPE, "The challenge type 'password' is invalid after resending code for sign up.", parameters.correlationId);
        }
        return result;
    }
    async performChallengeRequest(request) {
        this.logger.verbose("Calling challenge endpoint for sign up.", request.correlationId);
        const challengeResponse = await this.customAuthApiClient.signUpApi.requestChallenge(request);
        this.logger.verbose("Challenge endpoint called for sign up.", request.correlationId);
        if (challengeResponse.challenge_type === ChallengeType.OOB) {
            // Code is required
            this.logger.verbose("Challenge type is oob for sign up.", request.correlationId);
            return createSignUpCodeRequiredResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
                challengeChannel: challengeResponse.challenge_channel ?? "",
                challengeTargetLabel: challengeResponse.challenge_target_label ?? "",
                codeLength: challengeResponse.code_length ??
                    DefaultCustomAuthApiCodeLength,
                interval: challengeResponse.interval ??
                    DefaultCustomAuthApiCodeResendIntervalInSec,
                bindingMethod: challengeResponse.binding_method ?? "",
            });
        }
        if (challengeResponse.challenge_type === ChallengeType.PASSWORD) {
            // Password is required
            this.logger.verbose("Challenge type is password for sign up.", request.correlationId);
            return createSignUpPasswordRequiredResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
            });
        }
        this.logger.error(`Unsupported challenge type '${challengeResponse.challenge_type}' for sign up.`, request.correlationId);
        throw new CustomAuthApiError(UNSUPPORTED_CHALLENGE_TYPE, `Unsupported challenge type '${challengeResponse.challenge_type}'.`, request.correlationId);
    }
    async performContinueRequest(callerName, requestParams, telemetryManager, responseGetter, requestCorrelationId) {
        this.logger.verbose(`${callerName} is calling continue endpoint for sign up.`, requestCorrelationId);
        try {
            const response = await responseGetter();
            this.logger.verbose(`Continue endpoint called by ${callerName} for sign up.`, requestCorrelationId);
            return createSignUpCompletedResult({
                correlationId: requestCorrelationId,
                continuationToken: response.continuation_token ?? "",
            });
        }
        catch (error) {
            if (error instanceof CustomAuthApiError) {
                return this.handleContinueResponseError(error, error.correlationId ?? requestCorrelationId, requestParams, telemetryManager);
            }
            else {
                this.logger.errorPii(`${callerName} is failed to call continue endpoint for sign up. Error: ${error}`, requestCorrelationId);
                throw new UnexpectedError(error, requestCorrelationId);
            }
        }
    }
    async handleContinueResponseError(responseError, correlationId, requestParams, telemetryManager) {
        if (responseError.error ===
            CREDENTIAL_REQUIRED &&
            !!responseError.errorCodes &&
            responseError.errorCodes.includes(55103)) {
            // Credential is required
            this.logger.verbose("The credential is required in the sign up flow.", correlationId);
            const continuationToken = this.readContinuationTokenFromResponeError(responseError);
            // Call the challenge endpoint to ensure the password challenge type is supported.
            const challengeRequest = {
                continuation_token: continuationToken,
                challenge_type: this.getChallengeTypes(requestParams.challengeType),
                telemetryManager,
                correlationId,
            };
            const challengeResult = await this.performChallengeRequest(challengeRequest);
            if (challengeResult.type === SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE) {
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
            throw new CustomAuthApiError(UNSUPPORTED_CHALLENGE_TYPE, "The challenge type is not supported.", correlationId);
        }
        if (this.isAttributesRequiredError(responseError, correlationId)) {
            // Attributes are required
            this.logger.verbose("Attributes are required in the sign up flow.", correlationId);
            const continuationToken = this.readContinuationTokenFromResponeError(responseError);
            return createSignUpAttributesRequiredResult({
                correlationId: correlationId,
                continuationToken: continuationToken,
                requiredAttributes: responseError.attributes ?? [],
            });
        }
        throw responseError;
    }
    isAttributesRequiredError(responseError, correlationId) {
        if (responseError.error === ATTRIBUTES_REQUIRED) {
            if (!responseError.attributes ||
                responseError.attributes.length === 0) {
                throw new CustomAuthApiError(INVALID_RESPONSE_BODY, "Attributes are required but required_attributes field is missing in the response body.", correlationId);
            }
            return true;
        }
        return false;
    }
    readContinuationTokenFromResponeError(responseError) {
        if (!responseError.continuationToken) {
            throw new CustomAuthApiError(CONTINUATION_TOKEN_MISSING, "Continuation token is missing in the response body", responseError.correlationId);
        }
        return responseError.continuationToken;
    }
}

export { SignUpClient };
//# sourceMappingURL=SignUpClient.mjs.map
