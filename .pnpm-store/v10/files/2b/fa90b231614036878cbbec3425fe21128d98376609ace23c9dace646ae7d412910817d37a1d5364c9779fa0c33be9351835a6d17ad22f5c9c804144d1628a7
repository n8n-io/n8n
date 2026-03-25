/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { UnexpectedError } from '../../../core/error/UnexpectedError.mjs';
import { SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE, SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE, SIGN_UP_COMPLETED_RESULT_TYPE } from '../../interaction_client/result/SignUpActionResult.mjs';
import { SignUpResendCodeResult } from '../result/SignUpResendCodeResult.mjs';
import { SignUpSubmitCodeResult } from '../result/SignUpSubmitCodeResult.mjs';
import { SignUpState } from './SignUpState.mjs';
import { SignUpPasswordRequiredState } from './SignUpPasswordRequiredState.mjs';
import { SignUpAttributesRequiredState } from './SignUpAttributesRequiredState.mjs';
import { SignUpCompletedState } from './SignUpCompletedState.mjs';
import { SignInScenario } from '../../../sign_in/auth_flow/SignInScenario.mjs';
import { SIGN_UP_CODE_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Sign-up code required state.
 */
class SignUpCodeRequiredState extends SignUpState {
    constructor() {
        super(...arguments);
        /**
         * The type of the state.
         */
        this.stateType = SIGN_UP_CODE_REQUIRED_STATE_TYPE;
    }
    /**
     * Submit one-time passcode to continue sign-up flow.
     * @param {string} code - The code to submit.
     * @returns {Promise<SignUpSubmitCodeResult>} The result of the operation.
     */
    async submitCode(code) {
        try {
            this.ensureCodeIsValid(code, this.stateParameters.codeLength);
            this.stateParameters.logger.verbose("Submitting code for sign-up.", this.stateParameters.correlationId);
            const result = await this.stateParameters.signUpClient.submitCode({
                clientId: this.stateParameters.config.auth.clientId,
                correlationId: this.stateParameters.correlationId,
                challengeType: this.stateParameters.config.customAuth.challengeTypes ?? [],
                continuationToken: this.stateParameters.continuationToken ?? "",
                code: code,
                username: this.stateParameters.username,
            });
            this.stateParameters.logger.verbose("Code submitted for sign-up.", this.stateParameters.correlationId);
            if (result.type === SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE) {
                // Password required
                this.stateParameters.logger.verbose("Password required for sign-up.", this.stateParameters.correlationId);
                return new SignUpSubmitCodeResult(new SignUpPasswordRequiredState({
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
                }));
            }
            else if (result.type === SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE) {
                // Attributes required
                this.stateParameters.logger.verbose("Attributes required for sign-up.", this.stateParameters.correlationId);
                return new SignUpSubmitCodeResult(new SignUpAttributesRequiredState({
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
                }));
            }
            else if (result.type === SIGN_UP_COMPLETED_RESULT_TYPE) {
                // Sign-up completed
                this.stateParameters.logger.verbose("Sign-up completed.", this.stateParameters.correlationId);
                return new SignUpSubmitCodeResult(new SignUpCompletedState({
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
                }));
            }
            return SignUpSubmitCodeResult.createWithError(new UnexpectedError("Unknown sign-up result type.", this.stateParameters.correlationId));
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to submit code for sign up. Error: ${error}.`, this.stateParameters.correlationId);
            return SignUpSubmitCodeResult.createWithError(error);
        }
    }
    /**
     * Resends the another one-time passcode for sign-up flow if the previous one hasn't been verified.
     * @returns {Promise<SignUpResendCodeResult>} The result of the operation.
     */
    async resendCode() {
        try {
            this.stateParameters.logger.verbose("Resending code for sign-up.", this.stateParameters.correlationId);
            const result = await this.stateParameters.signUpClient.resendCode({
                clientId: this.stateParameters.config.auth.clientId,
                challengeType: this.stateParameters.config.customAuth.challengeTypes ?? [],
                username: this.stateParameters.username,
                correlationId: this.stateParameters.correlationId,
                continuationToken: this.stateParameters.continuationToken ?? "",
            });
            this.stateParameters.logger.verbose("Code resent for sign-up.", this.stateParameters.correlationId);
            return new SignUpResendCodeResult(new SignUpCodeRequiredState({
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
                codeLength: result.codeLength,
                codeResendInterval: result.interval,
            }));
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to resend code for sign up. Error: ${error}.`, this.stateParameters.correlationId);
            return SignUpResendCodeResult.createWithError(error);
        }
    }
    /**
     * Gets the sent code length.
     * @returns {number} The length of the code.
     */
    getCodeLength() {
        return this.stateParameters.codeLength;
    }
    /**
     * Gets the interval in seconds for the code to be resent.
     * @returns {number} The interval in seconds for the code to be resent.
     */
    getCodeResendInterval() {
        return this.stateParameters.codeResendInterval;
    }
}

export { SignUpCodeRequiredState };
//# sourceMappingURL=SignUpCodeRequiredState.mjs.map
