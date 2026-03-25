/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { UnexpectedError } from "../../../core/error/UnexpectedError.js";
import { SignInScenario } from "../../../sign_in/auth_flow/SignInScenario.js";
import {
    SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE,
    SIGN_UP_COMPLETED_RESULT_TYPE,
} from "../../interaction_client/result/SignUpActionResult.js";
import { SignUpSubmitPasswordResult } from "../result/SignUpSubmitPasswordResult.js";
import { SignUpAttributesRequiredState } from "./SignUpAttributesRequiredState.js";
import { SignUpCompletedState } from "./SignUpCompletedState.js";
import { SignUpState } from "./SignUpState.js";
import { SignUpPasswordRequiredStateParameters } from "./SignUpStateParameters.js";
import { SIGN_UP_PASSWORD_REQUIRED_STATE_TYPE } from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Sign-up password required state.
 */
export class SignUpPasswordRequiredState extends SignUpState<SignUpPasswordRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType = SIGN_UP_PASSWORD_REQUIRED_STATE_TYPE;

    /**
     * Submits a password for sign-up.
     * @param {string} password - The password to submit.
     * @returns {Promise<SignUpSubmitPasswordResult>} The result of the operation.
     */
    async submitPassword(
        password: string
    ): Promise<SignUpSubmitPasswordResult> {
        try {
            this.ensurePasswordIsNotEmpty(password);

            this.stateParameters.logger.verbose(
                "Submitting password for sign-up.",
                this.stateParameters.correlationId
            );

            const result =
                await this.stateParameters.signUpClient.submitPassword({
                    clientId: this.stateParameters.config.auth.clientId,
                    correlationId: this.stateParameters.correlationId,
                    challengeType:
                        this.stateParameters.config.customAuth.challengeTypes ??
                        [],
                    continuationToken:
                        this.stateParameters.continuationToken ?? "",
                    password: password,
                    username: this.stateParameters.username,
                });

            this.stateParameters.logger.verbose(
                "Password submitted for sign-up.",
                this.stateParameters.correlationId
            );

            if (result.type === SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE) {
                // Attributes required
                this.stateParameters.logger.verbose(
                    "Attributes required for sign-up.",
                    this.stateParameters.correlationId
                );

                return new SignUpSubmitPasswordResult(
                    new SignUpAttributesRequiredState({
                        correlationId: result.correlationId,
                        continuationToken: result.continuationToken,
                        logger: this.stateParameters.logger,
                        config: this.stateParameters.config,
                        signInClient: this.stateParameters.signInClient,
                        signUpClient: this.stateParameters.signUpClient,
                        cacheClient: this.stateParameters.cacheClient,
                        jitClient: this.stateParameters.jitClient,
                        mfaClient: this.stateParameters.mfaClient,
                        username: this.stateParameters.username,
                        requiredAttributes: result.requiredAttributes,
                    })
                );
            } else if (result.type === SIGN_UP_COMPLETED_RESULT_TYPE) {
                // Sign-up completed
                this.stateParameters.logger.verbose(
                    "Sign-up completed.",
                    this.stateParameters.correlationId
                );

                return new SignUpSubmitPasswordResult(
                    new SignUpCompletedState({
                        correlationId: result.correlationId,
                        continuationToken: result.continuationToken,
                        logger: this.stateParameters.logger,
                        config: this.stateParameters.config,
                        signInClient: this.stateParameters.signInClient,
                        cacheClient: this.stateParameters.cacheClient,
                        jitClient: this.stateParameters.jitClient,
                        mfaClient: this.stateParameters.mfaClient,
                        username: this.stateParameters.username,
                        signInScenario: SignInScenario.SignInAfterSignUp,
                    })
                );
            }

            return SignUpSubmitPasswordResult.createWithError(
                new UnexpectedError(
                    "Unknown sign-up result type.",
                    this.stateParameters.correlationId
                )
            );
        } catch (error) {
            this.stateParameters.logger.errorPii(
                `Failed to submit password for sign up. Error: ${error}.`,
                this.stateParameters.correlationId
            );

            return SignUpSubmitPasswordResult.createWithError(error);
        }
    }
}
