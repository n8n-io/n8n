import { AccountInfo } from "@azure/msal-common/node";
/**
 * Token cache interface for the client, giving access to cache APIs
 * @public
 */
export interface ITokenCache {
    /** API that retrieves all accounts currently in cache to the user */
    getAllAccounts(): Promise<AccountInfo[]>;
    /** Returns the signed in account matching homeAccountId */
    getAccountByHomeId(homeAccountId: string): Promise<AccountInfo | null>;
    /** Returns the signed in account matching localAccountId */
    getAccountByLocalId(localAccountId: string): Promise<AccountInfo | null>;
    /** API to remove a specific account and the relevant data from cache */
    removeAccount(account: AccountInfo): Promise<void>;
}
//# sourceMappingURL=ITokenCache.d.ts.map