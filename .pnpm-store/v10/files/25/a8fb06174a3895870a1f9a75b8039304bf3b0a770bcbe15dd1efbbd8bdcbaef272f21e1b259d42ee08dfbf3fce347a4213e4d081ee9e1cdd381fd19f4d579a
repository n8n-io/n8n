/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { GetAccountResult } from "./get_account/auth_flow/result/GetAccountResult.js";
import { SignInResult } from "./sign_in/auth_flow/result/SignInResult.js";
import { SignUpResult } from "./sign_up/auth_flow/result/SignUpResult.js";
import {
    AccountRetrievalInputs,
    ResetPasswordInputs,
    SignInInputs,
    SignUpInputs,
} from "./CustomAuthActionInputs.js";
import { ResetPasswordStartResult } from "./reset_password/auth_flow/result/ResetPasswordStartResult.js";
import { IPublicClientApplication } from "../app/IPublicClientApplication.js";

export interface ICustomAuthPublicClientApplication
    extends IPublicClientApplication {
    /**
     * Gets the current account from the cache.
     * @param {AccountRetrievalInputs} accountRetrievalInputs - Inputs for getting the current cached account
     * @returns {GetAccountResult} The result of the operation
     */
    getCurrentAccount(
        accountRetrievalInputs?: AccountRetrievalInputs
    ): GetAccountResult;

    /**
     * Initiates the sign-in flow.
     * @param {SignInInputs} signInInputs - Inputs for the sign-in flow
     * @returns {Promise<SignInResult>} A promise that resolves to SignInResult
     */
    signIn(signInInputs: SignInInputs): Promise<SignInResult>;

    /**
     * Initiates the sign-up flow.
     * @param {SignUpInputs} signUpInputs - Inputs for the sign-up flow
     * @returns {Promise<SignUpResult>} A promise that resolves to SignUpResult
     */
    signUp(signUpInputs: SignUpInputs): Promise<SignUpResult>;

    /**
     * Initiates the reset password flow.
     * @param {ResetPasswordInputs} resetPasswordInputs - Inputs for the reset password flow
     * @returns {Promise<ResetPasswordStartResult>} A promise that resolves to ResetPasswordStartResult
     */
    resetPassword(
        resetPasswordInputs: ResetPasswordInputs
    ): Promise<ResetPasswordStartResult>;
}
