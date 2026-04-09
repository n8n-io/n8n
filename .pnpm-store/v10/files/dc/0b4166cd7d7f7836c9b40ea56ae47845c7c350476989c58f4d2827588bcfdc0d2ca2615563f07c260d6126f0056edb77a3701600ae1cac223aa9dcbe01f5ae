/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ChallengeType,
    DefaultCustomAuthApiCodeLength,
    GrantType,
} from "../../CustomAuthConstants.js";
import { CustomAuthApiError } from "../../core/error/CustomAuthApiError.js";
import * as CustomAuthApiErrorCode from "../../core/network_client/custom_auth_api/types/ApiErrorCodes.js";
import {
    MFA_REQUIRED,
    REGISTRATION_REQUIRED,
} from "../../core/network_client/custom_auth_api/types/ApiSuberrors.js";

import { CustomAuthInteractionClientBase } from "../../core/interaction_client/CustomAuthInteractionClientBase.js";
import {
    SignInStartParams,
    SignInResendCodeParams,
    SignInSubmitCodeParams,
    SignInSubmitPasswordParams,
    SignInContinuationTokenParams,
} from "./parameter/SignInParams.js";
import {
    createSignInCodeSendResult,
    createSignInCompleteResult,
    createSignInPasswordRequiredResult,
    createSignInJitRequiredResult,
    SIGN_IN_PASSWORD_REQUIRED_RESULT_TYPE,
    SignInCodeSendResult,
    SignInCompletedResult,
    SignInPasswordRequiredResult,
    SignInJitRequiredResult,
    SignInMfaRequiredResult,
    createSignInMfaRequiredResult,
} from "./result/SignInActionResult.js";
import * as PublicApiId from "../../core/telemetry/PublicApiId.js";
import {
    SignInChallengeRequest,
    SignInContinuationTokenRequest,
    SignInInitiateRequest,
    SignInOobTokenRequest,
    SignInPasswordTokenRequest,
    RegisterIntrospectRequest,
    SignInIntrospectRequest,
} from "../../core/network_client/custom_auth_api/types/ApiRequestTypes.js";
import { SignInTokenResponse } from "../../core/network_client/custom_auth_api/types/ApiResponseTypes.js";
import {
    SignInScenario,
    SignInScenarioType,
} from "../auth_flow/SignInScenario.js";
import { UnexpectedError } from "../../core/error/UnexpectedError.js";
import { ensureArgumentIsNotEmptyString } from "../../core/utils/ArgumentValidator.js";
import { ServerTelemetryManager } from "@azure/msal-common/browser";

export class SignInClient extends CustomAuthInteractionClientBase {
    /**
     * Starts the signin flow.
     * @param parameters The parameters required to start the sign-in flow.
     * @returns The result of the sign-in start operation.
     */
    async start(
        parameters: SignInStartParams
    ): Promise<SignInPasswordRequiredResult | SignInCodeSendResult> {
        const apiId = !parameters.password
            ? PublicApiId.SIGN_IN_WITH_CODE_START
            : PublicApiId.SIGN_IN_WITH_PASSWORD_START;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);

        this.logger.verbose(
            "Calling initiate endpoint for sign in.",
            parameters.correlationId
        );

        const initReq: SignInInitiateRequest = {
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            username: parameters.username,
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
        };

        const initiateResponse =
            await this.customAuthApiClient.signInApi.initiate(initReq);

        this.logger.verbose(
            "Initiate endpoint called for sign in.",
            parameters.correlationId
        );

        const challengeReq: SignInChallengeRequest = {
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
    async resendCode(
        parameters: SignInResendCodeParams
    ): Promise<SignInCodeSendResult> {
        const apiId = PublicApiId.SIGN_IN_RESEND_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);

        const challengeReq: SignInChallengeRequest = {
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            continuation_token: parameters.continuationToken ?? "",
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
        };

        const result = await this.performChallengeRequest(challengeReq);

        if (result.type === SIGN_IN_PASSWORD_REQUIRED_RESULT_TYPE) {
            this.logger.error(
                "Resend code operation failed due to the challenge type 'password' is not supported.",
                parameters.correlationId
            );

            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.UNSUPPORTED_CHALLENGE_TYPE,
                "Unsupported challenge type 'password'.",
                result.correlationId
            );
        }

        return result;
    }

    /**
     * Submits the code for sign-in flow.
     * @param parameters The parameters required to submit the code.
     * @returns The result of the sign-in submit code action.
     */
    async submitCode(
        parameters: SignInSubmitCodeParams
    ): Promise<
        | SignInCompletedResult
        | SignInJitRequiredResult
        | SignInMfaRequiredResult
    > {
        ensureArgumentIsNotEmptyString(
            "parameters.code",
            parameters.code,
            parameters.correlationId
        );

        const apiId = PublicApiId.SIGN_IN_SUBMIT_CODE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const scopes = this.getScopes(parameters.scopes);

        const request: SignInOobTokenRequest = {
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

        return this.performTokenRequest(
            () =>
                this.customAuthApiClient.signInApi.requestTokensWithOob(
                    request
                ),
            scopes,
            parameters.correlationId,
            telemetryManager,
            apiId
        );
    }

    /**
     * Submits the password for sign-in flow.
     * @param parameters The parameters required to submit the password.
     * @returns The result of the sign-in submit password action.
     */
    async submitPassword(
        parameters: SignInSubmitPasswordParams
    ): Promise<
        | SignInCompletedResult
        | SignInJitRequiredResult
        | SignInMfaRequiredResult
    > {
        ensureArgumentIsNotEmptyString(
            "parameters.password",
            parameters.password,
            parameters.correlationId
        );

        const apiId = PublicApiId.SIGN_IN_SUBMIT_PASSWORD;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const scopes = this.getScopes(parameters.scopes);

        const request: SignInPasswordTokenRequest = {
            continuation_token: parameters.continuationToken,
            password: parameters.password,
            scope: scopes.join(" "),
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
            ...(parameters.claims && {
                claims: parameters.claims,
            }),
        };

        return this.performTokenRequest(
            () =>
                this.customAuthApiClient.signInApi.requestTokensWithPassword(
                    request
                ),
            scopes,
            parameters.correlationId,
            telemetryManager,
            apiId
        );
    }

    /**
     * Signs in with continuation token.
     * @param parameters The parameters required to sign in with continuation token.
     * @returns The result of the sign-in complete action.
     */
    async signInWithContinuationToken(
        parameters: SignInContinuationTokenParams
    ): Promise<
        | SignInCompletedResult
        | SignInJitRequiredResult
        | SignInMfaRequiredResult
    > {
        const apiId = this.getPublicApiIdBySignInScenario(
            parameters.signInScenario,
            parameters.correlationId
        );
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const scopes = this.getScopes(parameters.scopes);

        // Create token request.
        const request: SignInContinuationTokenRequest = {
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
        return this.performTokenRequest(
            () =>
                this.customAuthApiClient.signInApi.requestTokenWithContinuationToken(
                    request
                ),
            scopes,
            parameters.correlationId,
            telemetryManager,
            apiId
        );
    }

    /**
     * Common method to handle token endpoint calls and create sign-in results.
     * @param tokenEndpointCaller Function that calls the specific token endpoint
     * @param scopes Scopes for the token request
     * @param correlationId Correlation ID for logging and result
     * @param telemetryManager Telemetry manager for telemetry logging
     * @returns SignInCompletedResult | SignInJitRequiredResult | SignInMfaRequiredResult with authentication result
     */
    private async performTokenRequest(
        tokenEndpointCaller: () => Promise<SignInTokenResponse>,
        scopes: string[],
        correlationId: string,
        telemetryManager: ServerTelemetryManager,
        apiId: number
    ): Promise<
        | SignInCompletedResult
        | SignInJitRequiredResult
        | SignInMfaRequiredResult
    > {
        this.logger.verbose(
            "Calling token endpoint for sign in.",
            correlationId
        );

        try {
            const tokenResponse = await tokenEndpointCaller();

            this.logger.verbose(
                "Token endpoint response received for sign in.",
                correlationId
            );

            const authResult = await this.handleTokenResponse(
                tokenResponse,
                scopes,
                correlationId,
                apiId
            );

            return createSignInCompleteResult({
                correlationId: tokenResponse.correlation_id ?? correlationId,
                authenticationResult: authResult,
            });
        } catch (error) {
            if (
                error instanceof CustomAuthApiError &&
                error.subError === REGISTRATION_REQUIRED
            ) {
                return this.handleJitRequiredError(
                    error,
                    telemetryManager,
                    correlationId
                );
            } else if (
                error instanceof CustomAuthApiError &&
                error.subError === MFA_REQUIRED
            ) {
                return this.handleMfaRequiredError(
                    error,
                    telemetryManager,
                    correlationId
                );
            }

            // Re-throw any other errors or JIT errors when handleJit is false
            throw error;
        }
    }

    private async performChallengeRequest(
        request: SignInChallengeRequest
    ): Promise<SignInPasswordRequiredResult | SignInCodeSendResult> {
        this.logger.verbose(
            "Calling challenge endpoint for sign in.",
            request.correlationId
        );

        const challengeResponse =
            await this.customAuthApiClient.signInApi.requestChallenge(request);

        this.logger.verbose(
            "Challenge endpoint called for sign in.",
            request.correlationId
        );

        if (challengeResponse.challenge_type === ChallengeType.OOB) {
            // Code is required
            this.logger.verbose(
                "Challenge type is oob for sign in.",
                request.correlationId
            );

            return createSignInCodeSendResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
                challengeChannel: challengeResponse.challenge_channel ?? "",
                challengeTargetLabel:
                    challengeResponse.challenge_target_label ?? "",
                codeLength:
                    challengeResponse.code_length ??
                    DefaultCustomAuthApiCodeLength,
                bindingMethod: challengeResponse.binding_method ?? "",
            });
        }

        if (challengeResponse.challenge_type === ChallengeType.PASSWORD) {
            // Password is required
            this.logger.verbose(
                "Challenge type is password for sign in.",
                request.correlationId
            );

            return createSignInPasswordRequiredResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
            });
        }

        this.logger.error(
            `Unsupported challenge type '${challengeResponse.challenge_type}' for sign in.`,
            request.correlationId
        );

        throw new CustomAuthApiError(
            CustomAuthApiErrorCode.UNSUPPORTED_CHALLENGE_TYPE,
            `Unsupported challenge type '${challengeResponse.challenge_type}'.`,
            challengeResponse.correlation_id
        );
    }

    private getPublicApiIdBySignInScenario(
        scenario: SignInScenarioType,
        correlationId: string
    ): number {
        switch (scenario) {
            case SignInScenario.SignInAfterSignUp:
                return PublicApiId.SIGN_IN_AFTER_SIGN_UP;
            case SignInScenario.SignInAfterPasswordReset:
                return PublicApiId.SIGN_IN_AFTER_PASSWORD_RESET;
            default:
                throw new UnexpectedError(
                    `Unsupported sign-in scenario '${scenario}'.`,
                    correlationId
                );
        }
    }

    private async handleJitRequiredError(
        error: CustomAuthApiError,
        telemetryManager: ServerTelemetryManager,
        correlationId: string
    ): Promise<SignInJitRequiredResult> {
        this.logger.verbose(
            "Auth method registration required for sign in.",
            correlationId
        );

        // Call register introspect endpoint to get available authentication methods
        const introspectRequest: RegisterIntrospectRequest = {
            continuation_token: error.continuationToken ?? "",
            correlationId: error.correlationId ?? correlationId,
            telemetryManager,
        };

        this.logger.verbose(
            "Calling introspect endpoint for getting auth methods.",
            correlationId
        );

        const introspectResponse =
            await this.customAuthApiClient.registerApi.introspect(
                introspectRequest
            );

        this.logger.verbose(
            "Introspect endpoint called for getting auth methods.",
            introspectResponse.correlation_id ?? correlationId
        );

        return createSignInJitRequiredResult({
            correlationId: introspectResponse.correlation_id ?? correlationId,
            continuationToken: introspectResponse.continuation_token ?? "",
            authMethods: introspectResponse.methods,
        });
    }

    private async handleMfaRequiredError(
        error: CustomAuthApiError,
        telemetryManager: ServerTelemetryManager,
        correlationId: string
    ): Promise<SignInMfaRequiredResult> {
        this.logger.verbose("MFA required for sign in.", correlationId);

        // Call sign-in introspect endpoint to get available MFA methods
        const introspectRequest: SignInIntrospectRequest = {
            continuation_token: error.continuationToken ?? "",
            correlationId: error.correlationId ?? correlationId,
            telemetryManager,
        };

        this.logger.verbose(
            "Calling introspect endpoint for MFA auth methods.",
            correlationId
        );

        const introspectResponse =
            await this.customAuthApiClient.signInApi.requestAuthMethods(
                introspectRequest
            );

        this.logger.verbose(
            "Introspect endpoint called for MFA auth methods.",
            introspectResponse.correlation_id ?? correlationId
        );

        return createSignInMfaRequiredResult({
            correlationId: introspectResponse.correlation_id ?? correlationId,
            continuationToken: introspectResponse.continuation_token ?? "",
            authMethods: introspectResponse.methods,
        });
    }
}
