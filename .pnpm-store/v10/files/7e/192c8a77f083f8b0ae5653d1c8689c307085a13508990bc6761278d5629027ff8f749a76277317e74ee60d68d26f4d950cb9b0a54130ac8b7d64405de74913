/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowActionRequiredStateBase } from "../../../core/auth_flow/AuthFlowState.js";
import { AuthMethodRegistrationRequiredState } from "../../../core/auth_flow/jit/state/AuthMethodRegistrationState.js";
import { MfaAwaitingState } from "../../../core/auth_flow/mfa/state/MfaState.js";
import { ensureArgumentIsNotEmptyString } from "../../../core/utils/ArgumentValidator.js";
import { CustomAuthAccountData } from "../../../get_account/auth_flow/CustomAuthAccountData.js";
import {
    SIGN_IN_COMPLETED_RESULT_TYPE,
    SIGN_IN_JIT_REQUIRED_RESULT_TYPE,
    SIGN_IN_MFA_REQUIRED_RESULT_TYPE,
    SignInCompletedResult,
    SignInJitRequiredResult,
    SignInMfaRequiredResult,
} from "../../interaction_client/result/SignInActionResult.js";
import { SignInCompletedState } from "./SignInCompletedState.js";
import { SignInFailedState } from "./SignInFailedState.js";
import { SignInStateParameters } from "./SignInStateParameters.js";

/*
 * Base state handler for sign-in flow.
 */
export abstract class SignInState<
    TParameters extends SignInStateParameters
> extends AuthFlowActionRequiredStateBase<TParameters> {
    /*
     * Creates a new SignInState.
     * @param stateParameters - The state parameters for sign-in.
     */
    constructor(stateParameters: TParameters) {
        super(stateParameters);

        ensureArgumentIsNotEmptyString(
            "username",
            stateParameters.username,
            stateParameters.correlationId
        );
        ensureArgumentIsNotEmptyString(
            "continuationToken",
            stateParameters.continuationToken,
            stateParameters.correlationId
        );
    }

    /**
     * Handles the result of a sign-in attempt.
     * @param result - The result of the sign-in attempt.
     * @param scopes - The scopes requested for the sign-in.
     * @returns An object containing the next state and account information, if applicable.
     */
    protected handleSignInResult(
        result:
            | SignInCompletedResult
            | SignInJitRequiredResult
            | SignInMfaRequiredResult,
        scopes?: string[]
    ): {
        state:
            | SignInCompletedState
            | AuthMethodRegistrationRequiredState
            | MfaAwaitingState;
        accountInfo?: CustomAuthAccountData;
        error?: Error;
    } {
        const correlationId =
            result.correlationId || this.stateParameters.correlationId;

        if (result.type === SIGN_IN_COMPLETED_RESULT_TYPE) {
            // Sign-in completed - return SignInCompletedState
            this.stateParameters.logger.verbose(
                "Sign-in completed successfully.",
                correlationId
            );

            const accountInfo = new CustomAuthAccountData(
                result.authenticationResult.account,
                this.stateParameters.config,
                this.stateParameters.cacheClient,
                this.stateParameters.logger,
                correlationId
            );

            return {
                state: new SignInCompletedState(),
                accountInfo: accountInfo,
            };
        } else if (result.type === SIGN_IN_JIT_REQUIRED_RESULT_TYPE) {
            // JIT is required - return AuthMethodRegistrationRequiredState
            this.stateParameters.logger.verbose(
                "Authentication method registration is required during sign-in.",
                correlationId
            );

            return {
                state: new AuthMethodRegistrationRequiredState({
                    correlationId: correlationId,
                    continuationToken: result.continuationToken,
                    logger: this.stateParameters.logger,
                    config: this.stateParameters.config,
                    jitClient: this.stateParameters.jitClient,
                    cacheClient: this.stateParameters.cacheClient,
                    authMethods: result.authMethods,
                    username: this.stateParameters.username,
                    scopes: scopes ?? [],
                    claims: this.stateParameters.claims,
                }),
            };
        } else if (result.type === SIGN_IN_MFA_REQUIRED_RESULT_TYPE) {
            // MFA is required - return MfaAwaitingState
            this.stateParameters.logger.verbose(
                "MFA is required during the sign-in.",
                correlationId
            );

            return {
                state: new MfaAwaitingState({
                    correlationId: correlationId,
                    continuationToken: result.continuationToken,
                    logger: this.stateParameters.logger,
                    config: this.stateParameters.config,
                    mfaClient: this.stateParameters.mfaClient,
                    cacheClient: this.stateParameters.cacheClient,
                    scopes: scopes ?? [],
                    authMethods: result.authMethods ?? [],
                }),
            };
        } else {
            // Unexpected result type
            const unexpectedResult = result as { type: string };
            const error = new Error(
                `Unexpected result type: ${unexpectedResult.type}`
            );
            return {
                state: new SignInFailedState(),
                error: error,
            };
        }
    }
}
