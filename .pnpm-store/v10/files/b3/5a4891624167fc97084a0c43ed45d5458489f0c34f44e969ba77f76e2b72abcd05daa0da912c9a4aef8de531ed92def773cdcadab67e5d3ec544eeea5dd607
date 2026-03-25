/**
 * Represents OAuth2 Authorization Code flow configuration.
 */
export interface AuthorizationCodeFlow {
    /** Type of OAuth2 flow */
    kind: "authorizationCode";
    /** Authorization endpoint */
    authorizationUrl: string;
    /** Token endpoint */
    tokenUrl: string;
    /** Refresh token endpoint */
    refreshUrl?: string;
    /** OAuth2 scopes */
    scopes?: string[];
}
/**
 * Represents OAuth2 Client Credentials flow configuration.
 */
export interface ClientCredentialsFlow {
    /** Type of OAuth2 flow */
    kind: "clientCredentials";
    /** Token endpoint */
    tokenUrl: string;
    /** Refresh token endpoints */
    refreshUrl?: string[];
    /** OAuth2 scopes */
    scopes?: string[];
}
/**
 * Represents OAuth2 Implicit flow configuration.
 */
export interface ImplicitFlow {
    /** Type of OAuth2 flow */
    kind: "implicit";
    /** Authorization endpoint */
    authorizationUrl: string;
    /** Refresh token endpoint */
    refreshUrl?: string;
    /** OAuth2 scopes */
    scopes?: string[];
}
/**
 * Represents OAuth2 Password flow configuration.
 */
export interface PasswordFlow {
    /** Type of OAuth2 flow */
    kind: "password";
    /** Token endpoint */
    tokenUrl: string;
    /** Refresh token endpoint */
    refreshUrl?: string;
    /** OAuth2 scopes */
    scopes?: string[];
}
/** Union type of all supported OAuth2 flows */
export type OAuth2Flow = AuthorizationCodeFlow | ClientCredentialsFlow | ImplicitFlow | PasswordFlow;
//# sourceMappingURL=oauth2Flows.d.ts.map