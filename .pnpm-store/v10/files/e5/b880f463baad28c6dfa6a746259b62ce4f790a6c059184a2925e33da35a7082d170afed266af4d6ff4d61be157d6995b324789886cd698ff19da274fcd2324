/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { GrantType, ChallengeType, DefaultCustomAuthApiCodeLength } from '../../CustomAuthConstants.mjs';
import { CustomAuthApiError } from '../../core/error/CustomAuthApiError.mjs';
import { UNSUPPORTED_CHALLENGE_TYPE } from '../../core/network_client/custom_auth_api/types/ApiErrorCodes.mjs';
import { REGISTRATION_REQUIRED, MFA_REQUIRED } from '../../core/network_client/custom_auth_api/types/ApiSuberrors.mjs';
import { CustomAuthInteractionClientBase } from '../../core/interaction_client/CustomAuthInteractionClientBase.mjs';
import { SIGN_IN_PASSWORD_REQUIRED_RESULT_TYPE, createSignInCompleteResult, createSignInCodeSendResult, createSignInPasswordRequiredResult, createSignInJitRequiredResult, createSignInMfaRequiredResult } from './result/SignInActionResult.mjs';
import { SIGN_IN_WITH_CODE_START, SIGN_IN_WITH_PASSWORD_START, SIGN_IN_RESEND_CODE, SIGN_IN_SUBMIT_CODE, SIGN_IN_SUBMIT_PASSWORD, SIGN_IN_AFTER_PASSWORD_RESET, SIGN_IN_AFTER_SIGN_UP } from '../../core/telemetry/PublicApiId.mjs';
import { SignInScenario } from '../auth_flow/SignInScenario.mjs';
import { UnexpectedError } from '../../core/error/UnexpectedError.mjs';
import { ensureArgumentIsNotEmptyString } from '../../core/utils/ArgumentValidator.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SignInClient extends CustomAuthInteractionClientBase {
    /**
     * Starts the signin flow.
     * @param parameters The parameters required to start the sign-in flow.
     * @returns The result of the sign-in start operation.
     */
    async start(parameters) {
        const apiId = !parameters.password
            ? SIGN_IN_WITH_CODE_START
            : SIGN_IN_WITH_PASSWORD_START;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        this.logger.verbose("Calling initiate endpoint for sign in.", parameters.correlationId);
        const initReq = {
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            username: parameters.username,
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
        };
        const initiateResponse = await this.customAuthApiClient.signInApi.initiate(initReq);
        this.logger.verbose("Initiate endpoint called for sign in.", parameters.correlationId);
        const challengeReq = {
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            continuation_token: initiateResponse.continuation_token ?? "",
            correlationId: initiateResponse.correlation_id,
            telemetryManager: telemetryManager,
        };
        return this.performChallengeRequest(challengeReq);
    }
    /**
     * Resends the code for sign-in flow.
     * @param parameters The parameters required to resend the code.
     * @returns The result of the sign-in resend code action.
     */
    async resendCode(parameters) {
        const apiId = SIGN_IN_RESEND_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const challengeReq = {
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            continuation_token: parameters.continuationToken ?? "",
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
        };
        const result = await this.performChallengeRequest(challengeReq);
        if (result.type === SIGN_IN_PASSWORD_REQUIRED_RESULT_TYPE) {
            this.logger.error("Resend code operation failed due to the challenge type 'password' is not supported.", parameters.correlationId);
            throw new CustomAuthApiError(UNSUPPORTED_CHALLENGE_TYPE, "Unsupported challenge type 'password'.", result.correlationId);
        }
        return result;
    }
    /**
     * Submits the code for sign-in flow.
     * @param parameters The parameters required to submit the code.
     * @returns The result of the sign-in submit code action.
     */
    async submitCode(parameters) {
        ensureArgumentIsNotEmptyString("parameters.code", parameters.code, parameters.correlationId);
        const apiId = SIGN_IN_SUBMIT_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const scopes = this.getScopes(parameters.scopes);
        const request = {
            continuation_token: parameters.continuationToken,
            oob: parameters.code,
            grant_type: GrantType.OOB,
            scope: scopes.join(" "),
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
            ...(parameters.claims && {
                claims: parameters.claims,
            }),
        };
        return this.performTokenRequest(() => this.customAuthApiClient.signInApi.requestTokensWithOob(request), scopes, parameters.correlationId, telemetryManager);
    }
    /**
     * Submits the password for sign-in flow.
     * @param parameters The parameters required to submit the password.
     * @returns The result of the sign-in submit password action.
     */
    async submitPassword(parameters) {
        ensureArgumentIsNotEmptyString("parameters.password", parameters.password, parameters.correlationId);
        const apiId = SIGN_IN_SUBMIT_PASSWORD;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const scopes = this.getScopes(parameters.scopes);
        const request = {
            continuation_token: parameters.continuationToken,
            password: parameters.password,
            scope: scopes.join(" "),
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
            ...(parameters.claims && {
                claims: parameters.claims,
            }),
        };
        return this.performTokenRequest(() => this.customAuthApiClient.signInApi.requestTokensWithPassword(request), scopes, parameters.correlationId, telemetryManager);
    }
    /**
     * Signs in with continuation token.
     * @param parameters The parameters required to sign in with continuation token.
     * @returns The result of the sign-in complete action.
     */
    async signInWithContinuationToken(parameters) {
        const apiId = this.getPublicApiIdBySignInScenario(parameters.signInScenario, parameters.correlationId);
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const scopes = this.getScopes(parameters.scopes);
        // Create token request.
        const request = {
            continuation_token: parameters.continuationToken,
            username: parameters.username,
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
            scope: scopes.join(" "),
            ...(parameters.claims && {
                claims: parameters.claims,
            }),
        };
        // Call token endpoint.
        return this.performTokenRequest(() => this.customAuthApiClient.signInApi.requestTokenWithContinuationToken(request), scopes, parameters.correlationId, telemetryManager);
    }
    /**
     * Common method to handle token endpoint calls and create sign-in results.
     * @param tokenEndpointCaller Function that calls the specific token endpoint
     * @param scopes Scopes for the token request
     * @param correlationId Correlation ID for logging and result
     * @param telemetryManager Telemetry manager for telemetry logging
     * @returns SignInCompletedResult | SignInJitRequiredResult | SignInMfaRequiredResult with authentication result
     */
    async performTokenRequest(tokenEndpointCaller, scopes, correlationId, telemetryManager) {
        this.logger.verbose("Calling token endpoint for sign in.", correlationId);
        try {
            const tokenResponse = await tokenEndpointCaller();
            this.logger.verbose("Token endpoint response received for sign in.", correlationId);
            const authResult = await this.handleTokenResponse(tokenResponse, scopes, correlationId);
            return createSignInCompleteResult({
                correlationId: tokenResponse.correlation_id ?? correlationId,
                authenticationResult: authResult,
            });
        }
        catch (error) {
            if (error instanceof CustomAuthApiError &&
                error.subError === REGISTRATION_REQUIRED) {
                return this.handleJitRequiredError(error, telemetryManager, correlationId);
            }
            else if (error instanceof CustomAuthApiError &&
                error.subError === MFA_REQUIRED) {
                return this.handleMfaRequiredError(error, telemetryManager, correlationId);
            }
            // Re-throw any other errors or JIT errors when handleJit is false
            throw error;
        }
    }
    async performChallengeRequest(request) {
        this.logger.verbose("Calling challenge endpoint for sign in.", request.correlationId);
        const challengeResponse = await this.customAuthApiClient.signInApi.requestChallenge(request);
        this.logger.verbose("Challenge endpoint called for sign in.", request.correlationId);
        if (challengeResponse.challenge_type === ChallengeType.OOB) {
            // Code is required
            this.logger.verbose("Challenge type is oob for sign in.", request.correlationId);
            return createSignInCodeSendResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
                challengeChannel: challengeResponse.challenge_channel ?? "",
                challengeTargetLabel: challengeResponse.challenge_target_label ?? "",
                codeLength: challengeResponse.code_length ??
                    DefaultCustomAuthApiCodeLength,
                bindingMethod: challengeResponse.binding_method ?? "",
            });
        }
        if (challengeResponse.challenge_type === ChallengeType.PASSWORD) {
            // Password is required
            this.logger.verbose("Challenge type is password for sign in.", request.correlationId);
            return createSignInPasswordRequiredResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
            });
        }
        this.logger.error(`Unsupported challenge type '${challengeResponse.challenge_type}' for sign in.`, request.correlationId);
        throw new CustomAuthApiError(UNSUPPORTED_CHALLENGE_TYPE, `Unsupported challenge type '${challengeResponse.challenge_type}'.`, challengeResponse.correlation_id);
    }
    getPublicApiIdBySignInScenario(scenario, correlationId) {
        switch (scenario) {
            case SignInScenario.SignInAfterSignUp:
                return SIGN_IN_AFTER_SIGN_UP;
            case SignInScenario.SignInAfterPasswordReset:
                return SIGN_IN_AFTER_PASSWORD_RESET;
            default:
                throw new UnexpectedError(`Unsupported sign-in scenario '${scenario}'.`, correlationId);
        }
    }
    async handleJitRequiredError(error, telemetryManager, correlationId) {
        this.logger.verbose("Auth method registration required for sign in.", correlationId);
        // Call register introspect endpoint to get available authentication methods
        const introspectRequest = {
            continuation_token: error.continuationToken ?? "",
            correlationId: error.correlationId ?? correlationId,
            telemetryManager,
        };
        this.logger.verbose("Calling introspect endpoint for getting auth methods.", correlationId);
        const introspectResponse = await this.customAuthApiClient.registerApi.introspect(introspectRequest);
        this.logger.verbose("Introspect endpoint called for getting auth methods.", introspectResponse.correlation_id ?? correlationId);
        return createSignInJitRequiredResult({
            correlationId: introspectResponse.correlation_id ?? correlationId,
            continuationToken: introspectResponse.continuation_token ?? "",
            authMethods: introspectResponse.methods,
        });
    }
    async handleMfaRequiredError(error, telemetryManager, correlationId) {
        this.logger.verbose("MFA required for sign in.", correlationId);
        // Call sign-in introspect endpoint to get available MFA methods
        const introspectRequest = {
            continuation_token: error.continuationToken ?? "",
            correlationId: error.correlationId ?? correlationId,
            telemetryManager,
        };
        this.logger.verbose("Calling introspect endpoint for MFA auth methods.", correlationId);
        const introspectResponse = await this.customAuthApiClient.signInApi.requestAuthMethods(introspectRequest);
        this.logger.verbose("Introspect endpoint called for MFA auth methods.", introspectResponse.correlation_id ?? correlationId);
        return createSignInMfaRequiredResult({
            correlationId: introspectResponse.correlation_id ?? correlationId,
            continuationToken: introspectResponse.continuation_token ?? "",
            authMethods: introspectResponse.methods,
        });
    }
}

export { SignInClient };
//# sourceMappingURL=SignInClient.mjs.map
