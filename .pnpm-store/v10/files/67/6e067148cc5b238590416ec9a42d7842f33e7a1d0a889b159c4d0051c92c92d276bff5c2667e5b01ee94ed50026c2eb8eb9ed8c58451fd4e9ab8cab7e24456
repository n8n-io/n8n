/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AuthMethodRegistrationStateParameters,
    AuthMethodRegistrationRequiredStateParameters,
    AuthMethodVerificationRequiredStateParameters,
} from "./AuthMethodRegistrationStateParameters.js";
import { AuthMethodDetails } from "../AuthMethodDetails.js";
import {
    JitChallengeAuthMethodParams,
    JitSubmitChallengeParams,
} from "../../../interaction_client/jit/parameter/JitParams.js";
import { CustomAuthAccountData } from "../../../../get_account/auth_flow/CustomAuthAccountData.js";
import {
    JIT_VERIFICATION_REQUIRED_RESULT_TYPE,
    JIT_COMPLETED_RESULT_TYPE,
} from "../../../interaction_client/jit/result/JitActionResult.js";
import { UnexpectedError } from "../../../error/UnexpectedError.js";
import { AuthenticationMethod } from "../../../network_client/custom_auth_api/types/ApiResponseTypes.js";
import { AuthFlowActionRequiredStateBase } from "../../AuthFlowState.js";
import { GrantType } from "../../../../CustomAuthConstants.js";
import { AuthMethodRegistrationChallengeMethodResult } from "../result/AuthMethodRegistrationChallengeMethodResult.js";
import { AuthMethodRegistrationSubmitChallengeResult } from "../result/AuthMethodRegistrationSubmitChallengeResult.js";
import { AuthMethodRegistrationCompletedState } from "./AuthMethodRegistrationCompletedState.js";
import {
    AUTH_METHOD_REGISTRATION_REQUIRED_STATE_TYPE,
    AUTH_METHOD_VERIFICATION_REQUIRED_STATE_TYPE,
} from "../../AuthFlowStateTypes.js";

/**
 * Abstract base class for authentication method registration states.
 */
abstract class AuthMethodRegistrationState<
    TParameters extends AuthMethodRegistrationStateParameters
> extends AuthFlowActionRequiredStateBase<TParameters> {
    /**
     * Internal method to challenge an authentication method.
     * @param authMethodDetails The authentication method details to challenge.
     * @returns Promise that resolves to AuthMethodRegistrationChallengeMethodResult.
     */
    protected async challengeAuthMethodInternal(
        authMethodDetails: AuthMethodDetails
    ): Promise<AuthMethodRegistrationChallengeMethodResult> {
        try {
            this.stateParameters.logger.verbose(
                `Challenging authentication method - '${authMethodDetails.authMethodType.id}' for auth method registration.`,
                this.stateParameters.correlationId
            );

            const challengeParams: JitChallengeAuthMethodParams = {
                correlationId: this.stateParameters.correlationId,
                continuationToken: this.stateParameters.continuationToken ?? "",
                authMethod: authMethodDetails.authMethodType,
                verificationContact: authMethodDetails.verificationContact,
                scopes: this.stateParameters.scopes ?? [],
                username: this.stateParameters.username,
                claims: this.stateParameters.claims,
            };

            const result =
                await this.stateParameters.jitClient.challengeAuthMethod(
                    challengeParams
                );

            this.stateParameters.logger.verbose(
                "Authentication method challenged successfully for auth method registration.",
                this.stateParameters.correlationId
            );

            if (result.type === JIT_VERIFICATION_REQUIRED_RESULT_TYPE) {
                // Verification required
                this.stateParameters.logger.verbose(
                    "Auth method verification required.",
                    this.stateParameters.correlationId
                );

                return new AuthMethodRegistrationChallengeMethodResult(
                    new AuthMethodVerificationRequiredState({
                        correlationId: result.correlationId,
                        continuationToken: result.continuationToken,
                        config: this.stateParameters.config,
                        logger: this.stateParameters.logger,
                        jitClient: this.stateParameters.jitClient,
                        cacheClient: this.stateParameters.cacheClient,
                        challengeChannel: result.challengeChannel,
                        challengeTargetLabel: result.challengeTargetLabel,
                        codeLength: result.codeLength,
                        scopes: this.stateParameters.scopes ?? [],
                        username: this.stateParameters.username,
                        claims: this.stateParameters.claims,
                    })
                );
            } else if (result.type === JIT_COMPLETED_RESULT_TYPE) {
                // Registration completed (fast-pass scenario)
                this.stateParameters.logger.verbose(
                    "Auth method registration completed via fast-pass.",
                    this.stateParameters.correlationId
                );

                const accountInfo = new CustomAuthAccountData(
                    result.authenticationResult.account,
                    this.stateParameters.config,
                    this.stateParameters.cacheClient,
                    this.stateParameters.logger,
                    this.stateParameters.correlationId
                );

                return new AuthMethodRegistrationChallengeMethodResult(
                    new AuthMethodRegistrationCompletedState(),
                    accountInfo
                );
            } else {
                // Handle unexpected result type with proper typing
                this.stateParameters.logger.error(
                    "Unexpected result type from auth challenge method",
                    this.stateParameters.correlationId
                );
                throw new UnexpectedError(
                    "Unexpected result type from auth challenge method"
                );
            }
        } catch (error) {
            this.stateParameters.logger.errorPii(
                `Failed to challenge authentication method for auth method registration. Error: ${error}.`,
                this.stateParameters.correlationId
            );
            return AuthMethodRegistrationChallengeMethodResult.createWithError(
                error
            );
        }
    }
}

/**
 * State indicating that authentication method registration is required.
 */
export class AuthMethodRegistrationRequiredState extends AuthMethodRegistrationState<AuthMethodRegistrationRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType = AUTH_METHOD_REGISTRATION_REQUIRED_STATE_TYPE;

    /**
     * Gets the available authentication methods for registration.
     * @returns Array of available authentication methods.
     */
    getAuthMethods(): AuthenticationMethod[] {
        return this.stateParameters.authMethods;
    }

    /**
     * Challenges an authentication method for registration.
     * @param authMethodDetails The authentication method details to challenge.
     * @returns Promise that resolves to AuthMethodRegistrationChallengeMethodResult.
     */
    async challengeAuthMethod(
        authMethodDetails: AuthMethodDetails
    ): Promise<AuthMethodRegistrationChallengeMethodResult> {
        return this.challengeAuthMethodInternal(authMethodDetails);
    }
}

/**
 * State indicating that verification is required for the challenged authentication method.
 */
export class AuthMethodVerificationRequiredState extends AuthMethodRegistrationState<AuthMethodVerificationRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType = AUTH_METHOD_VERIFICATION_REQUIRED_STATE_TYPE;

    /**
     * Gets the length of the expected verification code.
     * @returns The code length.
     */
    getCodeLength(): number {
        return this.stateParameters.codeLength;
    }

    /**
     * Gets the channel through which the challenge was sent.
     * @returns The challenge channel (e.g., "email").
     */
    getChannel(): string {
        return this.stateParameters.challengeChannel;
    }

    /**
     * Gets the target label indicating where the challenge was sent.
     * @returns The challenge target label (e.g., masked email address).
     */
    getSentTo(): string {
        return this.stateParameters.challengeTargetLabel;
    }

    /**
     * Submits the verification challenge to complete the authentication method registration.
     * @param code The verification code entered by the user.
     * @returns Promise that resolves to AuthMethodRegistrationSubmitChallengeResult.
     */
    async submitChallenge(
        code: string
    ): Promise<AuthMethodRegistrationSubmitChallengeResult> {
        try {
            this.ensureCodeIsValid(code, this.getCodeLength());

            this.stateParameters.logger.verbose(
                "Submitting auth method challenge.",
                this.stateParameters.correlationId
            );

            const submitParams: JitSubmitChallengeParams = {
                correlationId: this.stateParameters.correlationId,
                continuationToken: this.stateParameters.continuationToken ?? "",
                scopes: this.stateParameters.scopes ?? [],
                grantType: GrantType.OOB,
                challenge: code,
                username: this.stateParameters.username,
                claims: this.stateParameters.claims,
            };

            const result = await this.stateParameters.jitClient.submitChallenge(
                submitParams
            );

            this.stateParameters.logger.verbose(
                "Auth method challenge submitted successfully.",
                this.stateParameters.correlationId
            );

            const accountInfo = new CustomAuthAccountData(
                result.authenticationResult.account,
                this.stateParameters.config,
                this.stateParameters.cacheClient,
                this.stateParameters.logger,
                this.stateParameters.correlationId
            );

            return new AuthMethodRegistrationSubmitChallengeResult(
                new AuthMethodRegistrationCompletedState(),
                accountInfo
            );
        } catch (error) {
            this.stateParameters.logger.errorPii(
                `Failed to submit auth method challenge. Error: ${error}.`,
                this.stateParameters.correlationId
            );
            return AuthMethodRegistrationSubmitChallengeResult.createWithError(
                error
            );
        }
    }

    /**
     * Challenges a different authentication method for registration.
     * @param authMethodDetails The authentication method details to challenge.
     * @returns Promise that resolves to AuthMethodRegistrationChallengeMethodResult.
     */
    async challengeAuthMethod(
        authMethodDetails: AuthMethodDetails
    ): Promise<AuthMethodRegistrationChallengeMethodResult> {
        return this.challengeAuthMethodInternal(authMethodDetails);
    }
}
