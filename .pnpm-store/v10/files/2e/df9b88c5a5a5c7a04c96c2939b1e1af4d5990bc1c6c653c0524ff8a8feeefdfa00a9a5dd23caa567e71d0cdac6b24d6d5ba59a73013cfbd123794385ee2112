/**
 * @internal
 */
export type AppType = "public" | "confidential" | "publicFirst" | "confidentialFirst";
/**
 * The shape we use return the token (and the expiration date).
 * @internal
 */
export interface MsalToken {
    accessToken?: string;
    expiresOn: Date | null;
}
/**
 * Represents a valid (i.e. complete) MSAL token.
 */
export type ValidMsalToken = {
    [P in keyof MsalToken]-?: NonNullable<MsalToken[P]>;
};
/**
 * Internal representation of MSAL's Account information.
 * Helps us to disambiguate the MSAL classes accross environments.
 * @internal
 */
export interface MsalAccountInfo {
    homeAccountId: string;
    environment?: string;
    tenantId: string;
    username: string;
    localAccountId: string;
    name?: string;
    idTokenClaims?: object;
}
/**
 * Represents the common properties of any of the MSAL responses.
 * @internal
 */
export interface MsalResult {
    authority?: string;
    account: MsalAccountInfo | null;
    accessToken: string;
    expiresOn: Date | null;
    refreshOn?: Date | null;
}
/**
 * The record to use to find the cached tokens in the cache.
 */
export interface AuthenticationRecord {
    /**
     * Entity which issued the token represented by the domain of the issuer (e.g. login.microsoftonline.com)
     */
    authority: string;
    /**
     * The home account Id.
     */
    homeAccountId: string;
    /**
     * The associated client ID.
     */
    clientId: string;
    /**
     * The associated tenant ID.
     */
    tenantId: string;
    /**
     * The username of the logged in account.
     */
    username: string;
}
/**
 * Represents a parsed certificate
 * @internal
 */
export interface CertificateParts {
    /**
     * Hex encoded X.509 SHA-256 thumbprint of the certificate.
     */
    thumbprintSha256: string;
    /**
     * Hex encoded X.509 SHA-1 thumbprint of the certificate.
     * @deprecated Use thumbprintSha256 property instead. Thumbprint needs to be computed with SHA-256 algorithm.
     * SHA-1 is only needed for backwards compatibility with older versions of ADFS.
     */
    thumbprint: string;
    /**
     * The PEM encoded private key.
     */
    privateKey: string;
    /**
     * x5c header.
     */
    x5c?: string;
}
//# sourceMappingURL=types.d.ts.map