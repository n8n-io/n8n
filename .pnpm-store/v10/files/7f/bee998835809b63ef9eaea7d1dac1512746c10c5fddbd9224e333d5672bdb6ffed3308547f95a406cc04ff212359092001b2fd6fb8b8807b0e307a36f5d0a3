/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowErrorBase } from '../../../core/auth_flow/AuthFlowErrorBase.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * The error class for get account errors.
 */
class GetAccountError extends AuthFlowErrorBase {
    /**
     * Checks if the error is due to no cached account found.
     * @returns true if the error is due to no cached account found, false otherwise.
     */
    isCurrentAccountNotFound() {
        return this.isNoCachedAccountFoundError();
    }
}
/**
 * The error class for sign-out errors.
 */
class SignOutError extends AuthFlowErrorBase {
    /**
     * Checks if the error is due to the user is not signed in.
     * @returns true if the error is due to the user is not signed in, false otherwise.
     */
    isUserNotSignedIn() {
        return this.isNoCachedAccountFoundError();
    }
}
/**
 * The error class for getting the current account access token errors.
 */
class GetCurrentAccountAccessTokenError extends AuthFlowErrorBase {
    /**
     * Checks if the error is due to no cached account found.
     * @returns true if the error is due to no cached account found, false otherwise.
     */
    isCurrentAccountNotFound() {
        return this.isNoCachedAccountFoundError();
    }
}

export { GetAccountError, GetCurrentAccountAccessTokenError, SignOutError };
//# sourceMappingURL=GetAccountError.mjs.map
