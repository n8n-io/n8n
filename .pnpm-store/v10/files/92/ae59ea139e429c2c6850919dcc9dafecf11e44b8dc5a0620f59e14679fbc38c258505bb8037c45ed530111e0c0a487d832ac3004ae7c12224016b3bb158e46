/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SignInContinuationTokenParams } from "../../interaction_client/parameter/SignInParams.js";
import { SignInResult } from "../result/SignInResult.js";
import { SignInWithContinuationTokenInputs } from "../../../CustomAuthActionInputs.js";
import { SignInContinuationStateParameters } from "./SignInStateParameters.js";
import { SignInState } from "./SignInState.js";
import * as ArgumentValidator from "../../../core/utils/ArgumentValidator.js";
import { SIGN_IN_CONTINUATION_STATE_TYPE } from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Sign-in continuation state.
 */
export class SignInContinuationState extends SignInState<SignInContinuationStateParameters> {
    /**
     * The type of the state.
     */
    stateType = SIGN_IN_CONTINUATION_STATE_TYPE;

    /**
     * Initiates the sign-in flow with continuation token.
     * @param {SignInWithContinuationTokenInputs} signInWithContinuationTokenInputs - The result of the operation.
     * @returns {Promise<SignInResult>} The result of the operation.
     */
    async signIn(
        signInWithContinuationTokenInputs?: SignInWithContinuationTokenInputs
    ): Promise<SignInResult> {
        try {
            if (signInWithContinuationTokenInputs?.claims) {
                ArgumentValidator.ensureArgumentIsJSONString(
                    "signInWithContinuationTokenInputs.claims",
                    signInWithContinuationTokenInputs.claims,
                    this.stateParameters.correlationId
                );
            }

            const continuationTokenParams: SignInContinuationTokenParams = {
                clientId: this.stateParameters.config.auth.clientId,
                correlationId: this.stateParameters.correlationId,
                challengeType:
                    this.stateParameters.config.customAuth.challengeTypes ?? [],
                scopes: signInWithContinuationTokenInputs?.scopes ?? [],
                continuationToken: this.stateParameters.continuationToken ?? "",
                username: this.stateParameters.username,
                signInScenario: this.stateParameters.signInScenario,
                claims: signInWithContinuationTokenInputs?.claims,
            };

            this.stateParameters.logger.verbose(
                "Signing in with continuation token.",
                this.stateParameters.correlationId
            );

            const signInResult =
                await this.stateParameters.signInClient.signInWithContinuationToken(
                    continuationTokenParams
                );

            this.stateParameters.logger.verbose(
                "Signed in with continuation token.",
                this.stateParameters.correlationId
            );

            const nextState = this.handleSignInResult(
                signInResult,
                signInWithContinuationTokenInputs?.scopes
            );

            if (nextState.error) {
                return SignInResult.createWithError(nextState.error);
            }

            return new SignInResult(nextState.state, nextState.accountInfo);
        } catch (error) {
            this.stateParameters.logger.errorPii(
                `Failed to sign in with continuation token. Error: ${error}.`,
                this.stateParameters.correlationId
            );

            return SignInResult.createWithError(error);
        }
    }
}
