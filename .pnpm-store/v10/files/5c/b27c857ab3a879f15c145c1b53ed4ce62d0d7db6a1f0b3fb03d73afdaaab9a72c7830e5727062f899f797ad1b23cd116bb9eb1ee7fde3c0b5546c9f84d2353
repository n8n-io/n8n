/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { GetAccountResult } from "./get_account/auth_flow/result/GetAccountResult.js";
import { SignInResult } from "./sign_in/auth_flow/result/SignInResult.js";
import { SignUpResult } from "./sign_up/auth_flow/result/SignUpResult.js";
import { ICustomAuthStandardController } from "./controller/ICustomAuthStandardController.js";
import { CustomAuthStandardController } from "./controller/CustomAuthStandardController.js";
import { ICustomAuthPublicClientApplication } from "./ICustomAuthPublicClientApplication.js";
import {
    AccountRetrievalInputs,
    SignInInputs,
    SignUpInputs,
    ResetPasswordInputs,
} from "./CustomAuthActionInputs.js";
import { CustomAuthConfiguration } from "./configuration/CustomAuthConfiguration.js";
import { CustomAuthOperatingContext } from "./operating_context/CustomAuthOperatingContext.js";
import { ResetPasswordStartResult } from "./reset_password/auth_flow/result/ResetPasswordStartResult.js";
import { InvalidConfigurationError } from "./core/error/InvalidConfigurationError.js";
import { ChallengeType } from "./CustomAuthConstants.js";
import { PublicClientApplication } from "../app/PublicClientApplication.js";
import {
    InvalidAuthority,
    InvalidChallengeType,
    MissingConfiguration,
} from "./core/error/InvalidConfigurationErrorCodes.js";

export class CustomAuthPublicClientApplication
    extends PublicClientApplication
    implements ICustomAuthPublicClientApplication
{
    private readonly customAuthController: ICustomAuthStandardController;

    /**
     * Creates a new instance of a PublicClientApplication with the given configuration and controller to start Native authentication flows
     * @param {CustomAuthConfiguration} config - A configuration object for the PublicClientApplication instance
     * @returns {Promise<ICustomAuthPublicClientApplication>} - A promise that resolves to a CustomAuthPublicClientApplication instance
     */
    static async create(
        config: CustomAuthConfiguration
    ): Promise<ICustomAuthPublicClientApplication> {
        CustomAuthPublicClientApplication.validateConfig(config);

        const customAuthController = new CustomAuthStandardController(
            new CustomAuthOperatingContext(config)
        );

        await customAuthController.initialize();

        const app = new CustomAuthPublicClientApplication(
            config,
            customAuthController
        );

        return app;
    }

    private constructor(
        config: CustomAuthConfiguration,
        controller: ICustomAuthStandardController
    ) {
        super(config, controller);

        this.customAuthController = controller;
    }

    /**
     * Gets the current account from the browser cache.
     * @param {AccountRetrievalInputs} accountRetrievalInputs?:AccountRetrievalInputs
     * @returns {GetAccountResult} - The result of the get account operation
     */
    getCurrentAccount(
        accountRetrievalInputs?: AccountRetrievalInputs
    ): GetAccountResult {
        return this.customAuthController.getCurrentAccount(
            accountRetrievalInputs
        );
    }

    /**
     * Initiates the sign-in flow.
     * This method results in sign-in completion, or extra actions (password, code, etc.) required to complete the sign-in.
     * Create result with error details if any exception thrown.
     * @param {SignInInputs} signInInputs - Inputs for the sign-in flow
     * @returns {Promise<SignInResult>} - A promise that resolves to SignInResult
     */
    signIn(signInInputs: SignInInputs): Promise<SignInResult> {
        return this.customAuthController.signIn(signInInputs);
    }

    /**
     * Initiates the sign-up flow.
     * This method results in sign-up completion, or extra actions (password, code, etc.) required to complete the sign-up.
     * Create result with error details if any exception thrown.
     * @param {SignUpInputs} signUpInputs
     * @returns {Promise<SignUpResult>} - A promise that resolves to SignUpResult
     */
    signUp(signUpInputs: SignUpInputs): Promise<SignUpResult> {
        return this.customAuthController.signUp(signUpInputs);
    }

    /**
     * Initiates the reset password flow.
     * This method results in triggering extra action (submit code) to complete the reset password.
     * Create result with error details if any exception thrown.
     * @param {ResetPasswordInputs} resetPasswordInputs - Inputs for the reset password flow
     * @returns {Promise<ResetPasswordStartResult>} - A promise that resolves to ResetPasswordStartResult
     */
    resetPassword(
        resetPasswordInputs: ResetPasswordInputs
    ): Promise<ResetPasswordStartResult> {
        return this.customAuthController.resetPassword(resetPasswordInputs);
    }

    /**
     * Validates the configuration to ensure it is a valid CustomAuthConfiguration object.
     * @param {CustomAuthConfiguration} config - The configuration object for the PublicClientApplication.
     * @returns {void}
     */
    private static validateConfig(config: CustomAuthConfiguration): void {
        // Ensure the configuration object has a valid CIAM authority URL.
        if (!config) {
            throw new InvalidConfigurationError(
                MissingConfiguration,
                "The configuration is missing."
            );
        }

        if (!config.auth?.authority) {
            throw new InvalidConfigurationError(
                InvalidAuthority,
                `The authority URL '${config.auth?.authority}' is not set.`
            );
        }

        const challengeTypes = config.customAuth.challengeTypes;

        if (!!challengeTypes && challengeTypes.length > 0) {
            challengeTypes.forEach((challengeType) => {
                const lowerCaseChallengeType = challengeType.toLowerCase();
                if (
                    lowerCaseChallengeType !== ChallengeType.PASSWORD &&
                    lowerCaseChallengeType !== ChallengeType.OOB &&
                    lowerCaseChallengeType !== ChallengeType.REDIRECT
                ) {
                    throw new InvalidConfigurationError(
                        InvalidChallengeType,
                        `Challenge type ${challengeType} in the configuration are not valid. Supported challenge types are ${Object.values(
                            ChallengeType
                        )}`
                    );
                }
            });
        }
    }
}
