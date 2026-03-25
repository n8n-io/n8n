import { TokenClaims } from "./TokenClaims.js";
export type DataBoundary = "EU" | "None";
/**
 * Account object with the following signature:
 * - homeAccountId          - Home account identifier for this account object
 * - environment            - Entity which issued the token represented by the domain of the issuer (e.g. login.microsoftonline.com)
 * - tenantId               - Full tenant or organizational id that this account belongs to
 * - username               - preferred_username claim of the id_token that represents this account
 * - localAccountId         - Local, tenant-specific account identifer for this account object, usually used in legacy cases
 * - name                   - Full name for the account, including given name and family name
 * - idToken                - raw ID token
 * - idTokenClaims          - Object contains claims from ID token
 * - nativeAccountId        - The user's native account ID
 * - tenantProfiles         - Map of tenant profile objects for each tenant that the account has authenticated with in the browser
 * - dataBoundary           - Data boundary extracted from clientInfo
 */
export type AccountInfo = {
    homeAccountId: string;
    environment: string;
    tenantId: string;
    username: string;
    localAccountId: string;
    loginHint?: string;
    name?: string;
    idToken?: string;
    idTokenClaims?: TokenClaims & {
        [key: string]: string | number | string[] | object | undefined | unknown;
    };
    nativeAccountId?: string;
    authorityType?: string;
    tenantProfiles?: Map<string, TenantProfile>;
    dataBoundary?: DataBoundary;
};
/**
 * Account details that vary across tenants for the same user
 */
export type TenantProfile = Pick<AccountInfo, "tenantId" | "localAccountId" | "name" | "username" | "loginHint"> & {
    /**
     * - isHomeTenant           - True if this is the home tenant profile of the account, false if it's a guest tenant profile
     */
    isHomeTenant?: boolean;
};
export type ActiveAccountFilters = {
    homeAccountId: string;
    localAccountId: string;
    tenantId?: string;
    lastUpdatedAt?: string;
};
/**
 * Returns true if tenantId matches the utid portion of homeAccountId
 * @param tenantId
 * @param homeAccountId
 * @returns
 */
export declare function tenantIdMatchesHomeTenant(tenantId?: string, homeAccountId?: string): boolean;
/**
 * Build tenant profile
 * @param homeAccountId - Home account identifier for this account object
 * @param localAccountId - Local account identifer for this account object
 * @param tenantId - Full tenant or organizational id that this account belongs to
 * @param idTokenClaims - Claims from the ID token
 * @returns
 */
export declare function buildTenantProfile(homeAccountId: string, localAccountId: string, tenantId: string, idTokenClaims?: TokenClaims): TenantProfile;
/**
 * Replaces account info that varies by tenant profile sourced from the ID token claims passed in with the tenant-specific account info
 * @param baseAccountInfo
 * @param idTokenClaims
 * @returns
 */
export declare function updateAccountTenantProfileData(baseAccountInfo: AccountInfo, tenantProfile?: TenantProfile, idTokenClaims?: TokenClaims, idTokenSecret?: string): AccountInfo;
//# sourceMappingURL=AccountInfo.d.ts.map