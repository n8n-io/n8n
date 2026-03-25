import { AccountInfo, AccountFilter, Logger } from "@azure/msal-common/browser";
import { BrowserCacheManager } from "./BrowserCacheManager.js";
/**
 * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
 * @param accountFilter - (Optional) filter to narrow down the accounts returned
 * @returns Array of AccountInfo objects in cache
 */
export declare function getAllAccounts(logger: Logger, browserStorage: BrowserCacheManager, isInBrowser: boolean, correlationId: string, accountFilter?: AccountFilter): AccountInfo[];
/**
 * Returns the first account found in the cache that matches the account filter passed in.
 * @param accountFilter
 * @returns The first account found in the cache matching the provided filter or null if no account could be found.
 */
export declare function getAccount(accountFilter: AccountFilter, logger: Logger, browserStorage: BrowserCacheManager, correlationId: string): AccountInfo | null;
/**
 * Returns the signed in account matching username.
 * (the account object is created at the time of successful login)
 * or null when no matching account is found.
 * This API is provided for convenience but getAccountById should be used for best reliability
 * @param username
 * @returns The account object stored in MSAL
 */
export declare function getAccountByUsername(username: string, logger: Logger, browserStorage: BrowserCacheManager, correlationId: string): AccountInfo | null;
/**
 * Returns the signed in account matching homeAccountId.
 * (the account object is created at the time of successful login)
 * or null when no matching account is found
 * @param homeAccountId
 * @returns The account object stored in MSAL
 */
export declare function getAccountByHomeId(homeAccountId: string, logger: Logger, browserStorage: BrowserCacheManager, correlationId: string): AccountInfo | null;
/**
 * Returns the signed in account matching localAccountId.
 * (the account object is created at the time of successful login)
 * or null when no matching account is found
 * @param localAccountId
 * @returns The account object stored in MSAL
 */
export declare function getAccountByLocalId(localAccountId: string, logger: Logger, browserStorage: BrowserCacheManager, correlationId: string): AccountInfo | null;
/**
 * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
 * @param account
 */
export declare function setActiveAccount(account: AccountInfo | null, browserStorage: BrowserCacheManager, correlationId: string): void;
/**
 * Gets the currently active account
 */
export declare function getActiveAccount(browserStorage: BrowserCacheManager, correlationId: string): AccountInfo | null;
//# sourceMappingURL=AccountManager.d.ts.map