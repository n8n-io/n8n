/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AccountInfo, AccountFilter, Logger } from "@azure/msal-common/browser";
import { BrowserCacheManager } from "./BrowserCacheManager.js";

/**
 * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
 * @param accountFilter - (Optional) filter to narrow down the accounts returned
 * @returns Array of AccountInfo objects in cache
 */
export function getAllAccounts(
    logger: Logger,
    browserStorage: BrowserCacheManager,
    isInBrowser: boolean,
    correlationId: string,
    accountFilter?: AccountFilter
): AccountInfo[] {
    logger.verbose("getAllAccounts called");
    return isInBrowser
        ? browserStorage.getAllAccounts(accountFilter || {}, correlationId)
        : [];
}

/**
 * Returns the first account found in the cache that matches the account filter passed in.
 * @param accountFilter
 * @returns The first account found in the cache matching the provided filter or null if no account could be found.
 */
export function getAccount(
    accountFilter: AccountFilter,
    logger: Logger,
    browserStorage: BrowserCacheManager,
    correlationId: string
): AccountInfo | null {
    const account: AccountInfo | null = browserStorage.getAccountInfoFilteredBy(
        accountFilter,
        correlationId
    );

    if (account) {
        logger.verbose(
            "getAccount: Account matching provided filter found, returning"
        );
        return account;
    } else {
        logger.verbose("getAccount: No matching account found, returning null");
        return null;
    }
}

/**
 * Returns the signed in account matching username.
 * (the account object is created at the time of successful login)
 * or null when no matching account is found.
 * This API is provided for convenience but getAccountById should be used for best reliability
 * @param username
 * @returns The account object stored in MSAL
 */
export function getAccountByUsername(
    username: string,
    logger: Logger,
    browserStorage: BrowserCacheManager,
    correlationId: string
): AccountInfo | null {
    logger.trace("getAccountByUsername called");
    if (!username) {
        logger.warning("getAccountByUsername: No username provided");
        return null;
    }

    const account = browserStorage.getAccountInfoFilteredBy(
        {
            username,
        },
        correlationId
    );
    if (account) {
        logger.verbose(
            "getAccountByUsername: Account matching username found, returning"
        );
        logger.verbosePii(
            `getAccountByUsername: Returning signed-in accounts matching username: ${username}`
        );
        return account;
    } else {
        logger.verbose(
            "getAccountByUsername: No matching account found, returning null"
        );
        return null;
    }
}

/**
 * Returns the signed in account matching homeAccountId.
 * (the account object is created at the time of successful login)
 * or null when no matching account is found
 * @param homeAccountId
 * @returns The account object stored in MSAL
 */
export function getAccountByHomeId(
    homeAccountId: string,
    logger: Logger,
    browserStorage: BrowserCacheManager,
    correlationId: string
): AccountInfo | null {
    logger.trace("getAccountByHomeId called");
    if (!homeAccountId) {
        logger.warning("getAccountByHomeId: No homeAccountId provided");
        return null;
    }

    const account = browserStorage.getAccountInfoFilteredBy(
        {
            homeAccountId,
        },
        correlationId
    );
    if (account) {
        logger.verbose(
            "getAccountByHomeId: Account matching homeAccountId found, returning"
        );
        logger.verbosePii(
            `getAccountByHomeId: Returning signed-in accounts matching homeAccountId: ${homeAccountId}`
        );
        return account;
    } else {
        logger.verbose(
            "getAccountByHomeId: No matching account found, returning null"
        );
        return null;
    }
}

/**
 * Returns the signed in account matching localAccountId.
 * (the account object is created at the time of successful login)
 * or null when no matching account is found
 * @param localAccountId
 * @returns The account object stored in MSAL
 */
export function getAccountByLocalId(
    localAccountId: string,
    logger: Logger,
    browserStorage: BrowserCacheManager,
    correlationId: string
): AccountInfo | null {
    logger.trace("getAccountByLocalId called");
    if (!localAccountId) {
        logger.warning("getAccountByLocalId: No localAccountId provided");
        return null;
    }

    const account = browserStorage.getAccountInfoFilteredBy(
        {
            localAccountId,
        },
        correlationId
    );
    if (account) {
        logger.verbose(
            "getAccountByLocalId: Account matching localAccountId found, returning"
        );
        logger.verbosePii(
            `getAccountByLocalId: Returning signed-in accounts matching localAccountId: ${localAccountId}`
        );
        return account;
    } else {
        logger.verbose(
            "getAccountByLocalId: No matching account found, returning null"
        );
        return null;
    }
}

/**
 * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
 * @param account
 */
export function setActiveAccount(
    account: AccountInfo | null,
    browserStorage: BrowserCacheManager,
    correlationId: string
): void {
    browserStorage.setActiveAccount(account, correlationId);
}

/**
 * Gets the currently active account
 */
export function getActiveAccount(
    browserStorage: BrowserCacheManager,
    correlationId: string
): AccountInfo | null {
    return browserStorage.getActiveAccount(correlationId);
}
