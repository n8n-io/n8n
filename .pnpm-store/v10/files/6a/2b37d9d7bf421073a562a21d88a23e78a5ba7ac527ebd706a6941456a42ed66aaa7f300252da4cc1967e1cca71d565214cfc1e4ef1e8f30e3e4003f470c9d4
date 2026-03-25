/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CustomAuthApiError } from '../../core/error/CustomAuthApiError.mjs';
import { CustomAuthInteractionClientBase } from '../../core/interaction_client/CustomAuthInteractionClientBase.mjs';
import { UNSUPPORTED_CHALLENGE_TYPE, PASSWORD_CHANGE_FAILED, PASSWORD_RESET_TIMEOUT } from '../../core/network_client/custom_auth_api/types/ApiErrorCodes.mjs';
import { PASSWORD_RESET_START, PASSWORD_RESET_SUBMIT_CODE, PASSWORD_RESET_RESEND_CODE, PASSWORD_RESET_SUBMIT_PASSWORD } from '../../core/telemetry/PublicApiId.mjs';
import { ChallengeType, DefaultCustomAuthApiCodeLength, PasswordResetPollingTimeoutInMs, ResetPasswordPollStatus } from '../../CustomAuthConstants.mjs';
import { ensureArgumentIsNotEmptyString } from '../../core/utils/ArgumentValidator.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class ResetPasswordClient extends CustomAuthInteractionClientBase {
    /**
     * Starts the password reset flow.
     * @param parameters The parameters for starting the password reset flow.
     * @returns The result of password reset start operation.
     */
    async start(parameters) {
        const correlationId = parameters.correlationId;
        const apiId = PASSWORD_RESET_START;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const startRequest = {
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            username: parameters.username,
            correlationId: correlationId,
            telemetryManager: telemetryManager,
        };
        this.logger.verbose("Calling start endpoint for password reset flow.", correlationId);
        const startResponse = await this.customAuthApiClient.resetPasswordApi.start(startRequest);
        this.logger.verbose("Start endpoint for password reset returned successfully.", correlationId);
        const challengeRequest = {
            continuation_token: startResponse.continuation_token ?? "",
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            correlationId: correlationId,
            telemetryManager: telemetryManager,
        };
        return this.performChallengeRequest(challengeRequest);
    }
    /**
     * Submits the code for password reset.
     * @param parameters The parameters for submitting the code for password reset.
     * @returns The result of submitting the code for password reset.
     */
    async submitCode(parameters) {
        const correlationId = parameters.correlationId;
        ensureArgumentIsNotEmptyString("parameters.code", parameters.code, correlationId);
        const apiId = PASSWORD_RESET_SUBMIT_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const continueRequest = {
            continuation_token: parameters.continuationToken,
            oob: parameters.code,
            correlationId: correlationId,
            telemetryManager: telemetryManager,
        };
        this.logger.verbose("Calling continue endpoint with code for password reset.", correlationId);
        const response = await this.customAuthApiClient.resetPasswordApi.continueWithCode(continueRequest);
        this.logger.verbose("Continue endpoint called successfully with code for password reset.", response.correlation_id);
        return {
            correlationId: response.correlation_id,
            continuationToken: response.continuation_token ?? "",
        };
    }
    /**
     * Resends the another one-time passcode if the previous one hasn't been verified
     * @param parameters The parameters for resending the code for password reset.
     * @returns The result of resending the code for password reset.
     */
    async resendCode(parameters) {
        const apiId = PASSWORD_RESET_RESEND_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const challengeRequest = {
            continuation_token: parameters.continuationToken,
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
        };
        return this.performChallengeRequest(challengeRequest);
    }
    /**
     * Submits the new password for password reset.
     * @param parameters The parameters for submitting the new password for password reset.
     * @returns The result of submitting the new password for password reset.
     */
    async submitNewPassword(parameters) {
        const correlationId = parameters.correlationId;
        ensureArgumentIsNotEmptyString("parameters.newPassword", parameters.newPassword, correlationId);
        const apiId = PASSWORD_RESET_SUBMIT_PASSWORD;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const submitRequest = {
            continuation_token: parameters.continuationToken,
            new_password: parameters.newPassword,
            correlationId: correlationId,
            telemetryManager: telemetryManager,
        };
        this.logger.verbose("Calling submit endpoint with new password for password reset.", correlationId);
        const submitResponse = await this.customAuthApiClient.resetPasswordApi.submitNewPassword(submitRequest);
        this.logger.verbose("Submit endpoint called successfully with new password for password reset.", correlationId);
        return this.performPollCompletionRequest(submitResponse.continuation_token ?? "", submitResponse.poll_interval, correlationId, telemetryManager);
    }
    async performChallengeRequest(request) {
        const correlationId = request.correlationId;
        this.logger.verbose("Calling challenge endpoint for password reset flow.", correlationId);
        const response = await this.customAuthApiClient.resetPasswordApi.requestChallenge(request);
        this.logger.verbose("Challenge endpoint for password reset returned successfully.", correlationId);
        if (response.challenge_type === ChallengeType.OOB) {
            // Code is required
            this.logger.verbose("Code is required for password reset flow.", correlationId);
            return {
                correlationId: response.correlation_id,
                continuationToken: response.continuation_token ?? "",
                challengeChannel: response.challenge_channel ?? "",
                challengeTargetLabel: response.challenge_target_label ?? "",
                codeLength: response.code_length ?? DefaultCustomAuthApiCodeLength,
                bindingMethod: response.binding_method ?? "",
            };
        }
        this.logger.error(`Unsupported challenge type '${response.challenge_type}' returned from challenge endpoint for password reset.`, correlationId);
        throw new CustomAuthApiError(UNSUPPORTED_CHALLENGE_TYPE, `Unsupported challenge type '${response.challenge_type}'.`, correlationId);
    }
    async performPollCompletionRequest(continuationToken, pollInterval, correlationId, telemetryManager) {
        const startTime = performance.now();
        while (performance.now() - startTime <
            PasswordResetPollingTimeoutInMs) {
            const pollRequest = {
                continuation_token: continuationToken,
                correlationId: correlationId,
                telemetryManager: telemetryManager,
            };
            this.logger.verbose("Calling the poll completion endpoint for password reset flow.", correlationId);
            const pollResponse = await this.customAuthApiClient.resetPasswordApi.pollCompletion(pollRequest);
            this.logger.verbose("Poll completion endpoint for password reset returned successfully.", correlationId);
            if (pollResponse.status === ResetPasswordPollStatus.SUCCEEDED) {
                return {
                    correlationId: pollResponse.correlation_id,
                    continuationToken: pollResponse.continuation_token ?? "",
                };
            }
            else if (pollResponse.status === ResetPasswordPollStatus.FAILED) {
                throw new CustomAuthApiError(PASSWORD_CHANGE_FAILED, "Password is failed to be reset.", pollResponse.correlation_id);
            }
            this.logger.verbose(`Poll completion endpoint for password reset is not started or in progress, waiting ${pollInterval} seconds for next check.`, correlationId);
            await this.delay(pollInterval * 1000);
        }
        this.logger.error("Password reset flow has timed out.", correlationId);
        throw new CustomAuthApiError(PASSWORD_RESET_TIMEOUT, "Password reset flow has timed out.", correlationId);
    }
    async delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export { ResetPasswordClient };
//# sourceMappingURL=ResetPasswordClient.mjs.map
