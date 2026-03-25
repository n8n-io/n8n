/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowErrorBase } from "../../../core/auth_flow/AuthFlowErrorBase.js";

/**
 * The error class for get account errors.
 */
export class GetAccountError extends AuthFlowErrorBase {
    /**
     * Checks if the error is due to no cached account found.
     * @returns true if the error is due to no cached account found, false otherwise.
     */
    isCurrentAccountNotFound(): boolean {
        return this.isNoCachedAccountFoundError();
    }
}

/**
 * The error class for sign-out errors.
 */
export class SignOutError extends AuthFlowErrorBase {
    /**
     * Checks if the error is due to the user is not signed in.
     * @returns true if the error is due to the user is not signed in, false otherwise.
     */
    isUserNotSignedIn(): boolean {
        return this.isNoCachedAccountFoundError();
    }
}

/**
 * The error class for getting the current account access token errors.
 */
export class GetCurrentAccountAccessTokenError extends AuthFlowErrorBase {
    /**
     * Checks if the error is due to no cached account found.
     * @returns true if the error is due to no cached account found, false otherwise.
     */
    isCurrentAccountNotFound(): boolean {
        return this.isNoCachedAccountFoundError();
    }
}
