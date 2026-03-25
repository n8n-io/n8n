/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { InvalidArgumentError } from "../../../core/error/InvalidArgumentError.js";
import { UnexpectedError } from "../../../core/error/UnexpectedError.js";
import { UserAccountAttributes } from "../../../UserAccountAttributes.js";
import { SIGN_UP_COMPLETED_RESULT_TYPE } from "../../interaction_client/result/SignUpActionResult.js";
import { SignUpSubmitAttributesResult } from "../result/SignUpSubmitAttributesResult.js";
import { SignUpState } from "./SignUpState.js";
import { SignUpAttributesRequiredStateParameters } from "./SignUpStateParameters.js";
import { UserAttribute } from "../../../core/network_client/custom_auth_api/types/ApiErrorResponseTypes.js";
import { SignUpCompletedState } from "./SignUpCompletedState.js";
import { SignInScenario } from "../../../sign_in/auth_flow/SignInScenario.js";
import { SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE } from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Sign-up attributes required state.
 */
export class SignUpAttributesRequiredState extends SignUpState<SignUpAttributesRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType = SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE;

    /**
     * Submits attributes to continue sign-up flow.
     * This methods is used to submit required attributes.
     * These attributes, built in or custom, were configured in the Microsoft Entra admin center by the tenant administrator.
     * @param {UserAccountAttributes} attributes - The attributes to submit.
     * @returns {Promise<SignUpSubmitAttributesResult>} The result of the operation.
     */
    async submitAttributes(
        attributes: UserAccountAttributes
    ): Promise<SignUpSubmitAttributesResult> {
        if (!attributes || Object.keys(attributes).length === 0) {
            this.stateParameters.logger.error(
                "Attributes are required for sign-up.",
                this.stateParameters.correlationId
            );

            return Promise.resolve(
                SignUpSubmitAttributesResult.createWithError(
                    new InvalidArgumentError(
                        "attributes",
                        this.stateParameters.correlationId
                    )
                )
            );
        }

        try {
            this.stateParameters.logger.verbose(
                "Submitting attributes for sign-up.",
                this.stateParameters.correlationId
            );

            const result =
                await this.stateParameters.signUpClient.submitAttributes({
                    clientId: this.stateParameters.config.auth.clientId,
                    correlationId: this.stateParameters.correlationId,
                    challengeType:
                        this.stateParameters.config.customAuth.challengeTypes ??
                        [],
                    continuationToken:
                        this.stateParameters.continuationToken ?? "",
                    attributes: attributes,
                    username: this.stateParameters.username,
                });

            this.stateParameters.logger.verbose(
                "Attributes submitted for sign-up.",
                this.stateParameters.correlationId
            );

            if (result.type === SIGN_UP_COMPLETED_RESULT_TYPE) {
                // Sign-up completed
                this.stateParameters.logger.verbose(
                    "Sign-up completed.",
                    this.stateParameters.correlationId
                );

                return new SignUpSubmitAttributesResult(
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

            return SignUpSubmitAttributesResult.createWithError(
                new UnexpectedError(
                    "Unknown sign-up result type.",
                    this.stateParameters.correlationId
                )
            );
        } catch (error) {
            this.stateParameters.logger.errorPii(
                `Failed to submit attributes for sign up. Error: ${error}.`,
                this.stateParameters.correlationId
            );

            return SignUpSubmitAttributesResult.createWithError(error);
        }
    }

    /**
     * Gets the required attributes for sign-up.
     * @returns {UserAttribute[]} The required attributes for sign-up.
     */
    getRequiredAttributes(): UserAttribute[] {
        return this.stateParameters.requiredAttributes;
    }
}
