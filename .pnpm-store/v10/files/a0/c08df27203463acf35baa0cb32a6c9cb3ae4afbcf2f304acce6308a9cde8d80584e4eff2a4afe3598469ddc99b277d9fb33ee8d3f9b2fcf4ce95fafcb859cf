import type { Authority } from "../../authority/Authority.js";
import { ICrypto } from "../../crypto/ICrypto.js";
import { AccountInfo, TenantProfile, DataBoundary } from "../../account/AccountInfo.js";
import { AuthorityType } from "../../authority/AuthorityType.js";
import { Logger } from "../../logger/Logger.js";
import { TokenClaims } from "../../account/TokenClaims.js";
/**
 * Type that defines required and optional parameters for an Account field (based on universal cache schema implemented by all MSALs).
 *
 * Key : Value Schema
 *
 * Key: <home_account_id>-<environment>-<realm*>
 *
 * Value Schema:
 * {
 *      homeAccountId: home account identifier for the auth scheme,
 *      environment: entity that issued the token, represented as a full host
 *      realm: Full tenant or organizational identifier that the account belongs to
 *      localAccountId: Original tenant-specific accountID, usually used for legacy cases
 *      username: primary username that represents the user, usually corresponds to preferred_username in the v2 endpt
 *      authorityType: Accounts authority type as a string
 *      name: Full name for the account, including given name and family name,
 *      lastModificationTime: last time this entity was modified in the cache
 *      lastModificationApp:
 *      nativeAccountId: Account identifier on the native device
 *      tenantProfiles: Array of tenant profile objects for each tenant that the account has authenticated with in the browser
 * }
 * @internal
 */
export declare class AccountEntity {
    homeAccountId: string;
    environment: string;
    realm: string;
    localAccountId: string;
    username: string;
    authorityType: string;
    loginHint?: string;
    clientInfo?: string;
    name?: string;
    lastModificationTime?: string;
    lastModificationApp?: string;
    cloudGraphHostName?: string;
    msGraphHost?: string;
    nativeAccountId?: string;
    tenantProfiles?: Array<TenantProfile>;
    lastUpdatedAt: string;
    dataBoundary?: DataBoundary;
    /**
     * Returns the AccountInfo interface for this account.
     */
    static getAccountInfo(accountEntity: AccountEntity): AccountInfo;
    /**
     * Returns true if the account entity is in single tenant format (outdated), false otherwise
     */
    isSingleTenant(): boolean;
    /**
     * Build Account cache from IdToken, clientInfo and authority/policy. Associated with AAD.
     * @param accountDetails
     */
    static createAccount(accountDetails: {
        homeAccountId: string;
        idTokenClaims?: TokenClaims;
        clientInfo?: string;
        cloudGraphHostName?: string;
        msGraphHost?: string;
        environment?: string;
        nativeAccountId?: string;
        tenantProfiles?: Array<TenantProfile>;
    }, authority: Authority, base64Decode?: (input: string) => string): AccountEntity;
    /**
     * Creates an AccountEntity object from AccountInfo
     * @param accountInfo
     * @param cloudGraphHostName
     * @param msGraphHost
     * @returns
     */
    static createFromAccountInfo(accountInfo: AccountInfo, cloudGraphHostName?: string, msGraphHost?: string): AccountEntity;
    /**
     * Generate HomeAccountId from server response
     * @param serverClientInfo
     * @param authType
     */
    static generateHomeAccountId(serverClientInfo: string, authType: AuthorityType, logger: Logger, cryptoObj: ICrypto, idTokenClaims?: TokenClaims): string;
    /**
     * Validates an entity: checks for all expected params
     * @param entity
     */
    static isAccountEntity(entity: object): entity is AccountEntity;
    /**
     * Helper function to determine whether 2 accountInfo objects represent the same account
     * @param accountA
     * @param accountB
     * @param compareClaims - If set to true idTokenClaims will also be compared to determine account equality
     */
    static accountInfoIsEqual(accountA: AccountInfo | null, accountB: AccountInfo | null, compareClaims?: boolean): boolean;
}
//# sourceMappingURL=AccountEntity.d.ts.map