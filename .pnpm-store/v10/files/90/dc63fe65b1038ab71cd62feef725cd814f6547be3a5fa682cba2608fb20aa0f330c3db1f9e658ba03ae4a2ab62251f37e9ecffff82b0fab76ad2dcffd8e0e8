/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CustomAuthStandardController } from './controller/CustomAuthStandardController.mjs';
import { CustomAuthOperatingContext } from './operating_context/CustomAuthOperatingContext.mjs';
import { InvalidConfigurationError } from './core/error/InvalidConfigurationError.mjs';
import { ChallengeType } from './CustomAuthConstants.mjs';
import { PublicClientApplication } from '../app/PublicClientApplication.mjs';
import { MissingConfiguration, InvalidAuthority, InvalidChallengeType } from './core/error/InvalidConfigurationErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class CustomAuthPublicClientApplication extends PublicClientApplication {
    /**
     * Creates a new instance of a PublicClientApplication with the given configuration and controller to start Native authentication flows
     * @param {CustomAuthConfiguration} config - A configuration object for the PublicClientApplication instance
     * @returns {Promise<ICustomAuthPublicClientApplication>} - A promise that resolves to a CustomAuthPublicClientApplication instance
     */
    static async create(config) {
        CustomAuthPublicClientApplication.validateConfig(config);
        const customAuthController = new CustomAuthStandardController(new CustomAuthOperatingContext(config));
        await customAuthController.initialize();
        const app = new CustomAuthPublicClientApplication(config, customAuthController);
        return app;
    }
    constructor(config, controller) {
        super(config, controller);
        this.customAuthController = controller;
    }
    /**
     * Gets the current account from the browser cache.
     * @param {AccountRetrievalInputs} accountRetrievalInputs?:AccountRetrievalInputs
     * @returns {GetAccountResult} - The result of the get account operation
     */
    getCurrentAccount(accountRetrievalInputs) {
        return this.customAuthController.getCurrentAccount(accountRetrievalInputs);
    }
    /**
     * Initiates the sign-in flow.
     * This method results in sign-in completion, or extra actions (password, code, etc.) required to complete the sign-in.
     * Create result with error details if any exception thrown.
     * @param {SignInInputs} signInInputs - Inputs for the sign-in flow
     * @returns {Promise<SignInResult>} - A promise that resolves to SignInResult
     */
    signIn(signInInputs) {
        return this.customAuthController.signIn(signInInputs);
    }
    /**
     * Initiates the sign-up flow.
     * This method results in sign-up completion, or extra actions (password, code, etc.) required to complete the sign-up.
     * Create result with error details if any exception thrown.
     * @param {SignUpInputs} signUpInputs
     * @returns {Promise<SignUpResult>} - A promise that resolves to SignUpResult
     */
    signUp(signUpInputs) {
        return this.customAuthController.signUp(signUpInputs);
    }
    /**
     * Initiates the reset password flow.
     * This method results in triggering extra action (submit code) to complete the reset password.
     * Create result with error details if any exception thrown.
     * @param {ResetPasswordInputs} resetPasswordInputs - Inputs for the reset password flow
     * @returns {Promise<ResetPasswordStartResult>} - A promise that resolves to ResetPasswordStartResult
     */
    resetPassword(resetPasswordInputs) {
        return this.customAuthController.resetPassword(resetPasswordInputs);
    }
    /**
     * Validates the configuration to ensure it is a valid CustomAuthConfiguration object.
     * @param {CustomAuthConfiguration} config - The configuration object for the PublicClientApplication.
     * @returns {void}
     */
    static validateConfig(config) {
        // Ensure the configuration object has a valid CIAM authority URL.
        if (!config) {
            throw new InvalidConfigurationError(MissingConfiguration, "The configuration is missing.");
        }
        if (!config.auth?.authority) {
            throw new InvalidConfigurationError(InvalidAuthority, `The authority URL '${config.auth?.authority}' is not set.`);
        }
        const challengeTypes = config.customAuth.challengeTypes;
        if (!!challengeTypes && challengeTypes.length > 0) {
            challengeTypes.forEach((challengeType) => {
                const lowerCaseChallengeType = challengeType.toLowerCase();
                if (lowerCaseChallengeType !== ChallengeType.PASSWORD &&
                    lowerCaseChallengeType !== ChallengeType.OOB &&
                    lowerCaseChallengeType !== ChallengeType.REDIRECT) {
                    throw new InvalidConfigurationError(InvalidChallengeType, `Challenge type ${challengeType} in the configuration are not valid. Supported challenge types are ${Object.values(ChallengeType)}`);
                }
            });
        }
    }
}

export { CustomAuthPublicClientApplication };
//# sourceMappingURL=CustomAuthPublicClientApplication.mjs.map
