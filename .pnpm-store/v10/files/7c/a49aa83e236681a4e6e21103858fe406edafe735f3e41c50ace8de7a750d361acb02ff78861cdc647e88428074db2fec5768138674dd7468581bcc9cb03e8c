import { AccountInfo } from "../account/AccountInfo.js";
/**
 * Result returned from the authority's token endpoint.
 * - uniqueId               - `oid` or `sub` claim from ID token
 * - tenantId               - `tid` claim from ID token
 * - scopes                 - Scopes that are validated for the respective token
 * - account                - An account object representation of the currently signed-in user
 * - idToken                - Id token received as part of the response
 * - idTokenClaims          - MSAL-relevant ID token claims
 * - accessToken            - Access token or SSH certificate received as part of the response
 * - fromCache              - Boolean denoting whether token came from cache
 * - expiresOn              - Javascript Date object representing relative expiration of access token
 * - extExpiresOn           - Javascript Date object representing extended relative expiration of access token in case of server outage
 * - refreshOn              - Javascript Date object representing relative time until an access token must be refreshed
 * - state                  - Value passed in by user in request
 * - familyId               - Family ID identifier, usually only used for refresh tokens
 * - requestId              - Request ID returned as part of the response
 */
export type AuthenticationResult = {
    authority: string;
    uniqueId: string;
    tenantId: string;
    scopes: Array<string>;
    account: AccountInfo | null;
    idToken: string;
    idTokenClaims: object;
    accessToken: string;
    fromCache: boolean;
    expiresOn: Date | null;
    extExpiresOn?: Date;
    refreshOn?: Date;
    tokenType: string;
    correlationId: string;
    requestId?: string;
    state?: string;
    familyId?: string;
    cloudGraphHostName?: string;
    msGraphHost?: string;
    code?: string;
    fromNativeBroker?: boolean;
};
//# sourceMappingURL=AuthenticationResult.d.ts.map