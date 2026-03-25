/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    SignInResendCodeParams,
    SignInSubmitCodeParams,
} from "../../interaction_client/parameter/SignInParams.js";
import { SignInResendCodeResult } from "../result/SignInResendCodeResult.js";
import { SignInSubmitCodeResult } from "../result/SignInSubmitCodeResult.js";
import { SignInCodeRequiredStateParameters } from "./SignInStateParameters.js";
import { SignInState } from "./SignInState.js";
import { SIGN_IN_CODE_REQUIRED_STATE_TYPE } from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Sign-in code required state.
 */
export class SignInCodeRequiredState extends SignInState<SignInCodeRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType = SIGN_IN_CODE_REQUIRED_STATE_TYPE;

    /**
     * Once user configures email one-time passcode as a authentication method in Microsoft Entra, a one-time passcode will be sent to the user’s email.
     * Submit this one-time passcode to continue sign-in flow.
     * @param {string} code - The code to submit.
     * @returns {Promise<SignInSubmitCodeResult>} The result of the operation.
     */
    async submitCode(code: string): Promise<SignInSubmitCodeResult> {
        try {
            this.ensureCodeIsValid(code, this.stateParameters.codeLength);

            const submitCodeParams: SignInSubmitCodeParams = {
                clientId: this.stateParameters.config.auth.clientId,
                correlationId: this.stateParameters.correlationId,
                challengeType:
                    this.stateParameters.config.customAuth.challengeTypes ?? [],
                scopes: this.stateParameters.scopes ?? [],
                continuationToken: this.stateParameters.continuationToken ?? "",
                code: code,
                username: this.stateParameters.username,
                claims: this.stateParameters.claims,
            };

            this.stateParameters.logger.verbose(
                "Submitting code for sign-in.",
                this.stateParameters.correlationId
            );

            const submitCodeResult =
                await this.stateParameters.signInClient.submitCode(
                    submitCodeParams
                );

            this.stateParameters.logger.verbose(
                "Code submitted for sign-in.",
                this.stateParameters.correlationId
            );

            const nextState = this.handleSignInResult(
                submitCodeResult,
                this.stateParameters.scopes
            );

            if (nextState.error) {
                return SignInSubmitCodeResult.createWithError(nextState.error);
            }

            return new SignInSubmitCodeResult(
                nextState.state,
                nextState.accountInfo
            );
        } catch (error) {
            this.stateParameters.logger.errorPii(
                `Failed to submit code for sign-in. Error: ${error}.`,
                this.stateParameters.correlationId
            );

            return SignInSubmitCodeResult.createWithError(error);
        }
    }

    /**
     * Resends the another one-time passcode for sign-in flow if the previous one hasn't been verified.
     * @returns {Promise<SignInResendCodeResult>} The result of the operation.
     */
    async resendCode(): Promise<SignInResendCodeResult> {
        try {
            const submitCodeParams: SignInResendCodeParams = {
                clientId: this.stateParameters.config.auth.clientId,
                correlationId: this.stateParameters.correlationId,
                challengeType:
                    this.stateParameters.config.customAuth.challengeTypes ?? [],
                continuationToken: this.stateParameters.continuationToken ?? "",
                username: this.stateParameters.username,
            };

            this.stateParameters.logger.verbose(
                "Resending code for sign-in.",
                this.stateParameters.correlationId
            );

            const result = await this.stateParameters.signInClient.resendCode(
                submitCodeParams
            );

            this.stateParameters.logger.verbose(
                "Code resent for sign-in.",
                this.stateParameters.correlationId
            );

            return new SignInResendCodeResult(
                new SignInCodeRequiredState({
                    correlationId: result.correlationId,
                    continuationToken: result.continuationToken,
                    logger: this.stateParameters.logger,
                    config: this.stateParameters.config,
                    signInClient: this.stateParameters.signInClient,
                    cacheClient: this.stateParameters.cacheClient,
                    jitClient: this.stateParameters.jitClient,
                    mfaClient: this.stateParameters.mfaClient,
                    username: this.stateParameters.username,
                    codeLength: result.codeLength,
                    scopes: this.stateParameters.scopes,
                })
            );
        } catch (error) {
            return SignInResendCodeResult.createWithError(error);
        }
    }

    /**
     * Gets the sent code length.
     * @returns {number} The length of the code.
     */
    getCodeLength(): number {
        return this.stateParameters.codeLength;
    }

    /**
     * Gets the scopes to request.
     * @returns {string[] | undefined} The scopes to request.
     */
    getScopes(): string[] | undefined {
        return this.stateParameters.scopes;
    }
}
