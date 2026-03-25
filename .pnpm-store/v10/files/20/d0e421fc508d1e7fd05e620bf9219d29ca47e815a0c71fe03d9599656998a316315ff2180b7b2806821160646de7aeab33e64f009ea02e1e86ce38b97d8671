import { CredentialEntity } from "./CredentialEntity.js";
import { AuthenticationScheme } from "../../utils/Constants.js";
/**
 * Access token cache type
 */
export type AccessTokenEntity = CredentialEntity & {
    /** Full tenant or organizational identifier that the account belongs to */
    realm: string;
    /** Permissions that are included in the token, or for refresh tokens, the resource identifier. */
    target: string;
    /** Absolute device time when entry was created in the cache. */
    cachedAt: string;
    /** Token expiry time, calculated based on current UTC time in seconds. Represented as a string. */
    expiresOn: string;
    /** Additional extended expiry time until when token is valid in case of server-side outage. Represented as string in UTC seconds. */
    extendedExpiresOn?: string;
    /** Used for proactive refresh */
    refreshOn?: string;
    /** Matches the authentication scheme for which the token was issued (i.e. Bearer or pop) */
    tokenType?: AuthenticationScheme;
    /** Stringified claims object */
    requestedClaims?: string;
    /** Matches the SHA 256 hash of the claims object included in the token request */
    requestedClaimsHash?: string;
};
//# sourceMappingURL=AccessTokenEntity.d.ts.map