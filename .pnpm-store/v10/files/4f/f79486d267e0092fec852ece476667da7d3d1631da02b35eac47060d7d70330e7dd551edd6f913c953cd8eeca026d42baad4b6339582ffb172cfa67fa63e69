/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SignInSubmitPasswordParams } from "../../interaction_client/parameter/SignInParams.js";
import { SignInSubmitPasswordResult } from "../result/SignInSubmitPasswordResult.js";
import { SignInState } from "./SignInState.js";
import { SignInPasswordRequiredStateParameters } from "./SignInStateParameters.js";
import { SIGN_IN_PASSWORD_REQUIRED_STATE_TYPE } from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Sign-in password required state.
 */
export class SignInPasswordRequiredState extends SignInState<SignInPasswordRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType = SIGN_IN_PASSWORD_REQUIRED_STATE_TYPE;

    /**
     * Once user configures email with password as a authentication method in Microsoft Entra, user submits a password to continue sign-in flow.
     * @param {string} password - The password to submit.
     * @returns {Promise<SignInSubmitPasswordResult>} The result of the operation.
     */
    async submitPassword(
        password: string
    ): Promise<SignInSubmitPasswordResult> {
        try {
            this.ensurePasswordIsNotEmpty(password);

            const submitPasswordParams: SignInSubmitPasswordParams = {
                clientId: this.stateParameters.config.auth.clientId,
                correlationId: this.stateParameters.correlationId,
                challengeType:
                    this.stateParameters.config.customAuth.challengeTypes ?? [],
                scopes: this.stateParameters.scopes ?? [],
                continuationToken: this.stateParameters.continuationToken ?? "",
                password: password,
                username: this.stateParameters.username,
                claims: this.stateParameters.claims,
            };

            this.stateParameters.logger.verbose(
                "Submitting password for sign-in.",
                this.stateParameters.correlationId
            );

            const submitPasswordResult =
                await this.stateParameters.signInClient.submitPassword(
                    submitPasswordParams
                );

            this.stateParameters.logger.verbose(
                "Password submitted for sign-in.",
                this.stateParameters.correlationId
            );

            const nextState = this.handleSignInResult(
                submitPasswordResult,
                this.stateParameters.scopes
            );

            if (nextState.error) {
                return SignInSubmitPasswordResult.createWithError(
                    nextState.error
                );
            }

            return new SignInSubmitPasswordResult(
                nextState.state,
                nextState.accountInfo
            );
        } catch (error) {
            this.stateParameters.logger.errorPii(
                `Failed to sign in after submitting password. Error: ${error}.`,
                this.stateParameters.correlationId
            );

            return SignInSubmitPasswordResult.createWithError(error);
        }
    }

    /**
     * Gets the scopes to request.
     * @returns {string[] | undefined} The scopes to request.
     */
    getScopes(): string[] | undefined {
        return this.stateParameters.scopes;
    }
}
