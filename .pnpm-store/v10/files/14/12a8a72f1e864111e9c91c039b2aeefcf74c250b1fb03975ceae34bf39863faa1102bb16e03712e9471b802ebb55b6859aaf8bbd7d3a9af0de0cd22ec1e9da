import type { SigninClientConfig } from "@aws-sdk/nested-clients/signin";
import type { CredentialProviderOptions } from "@aws-sdk/types";
import type { SharedConfigInit } from "@smithy/shared-ini-file-loader";
/**
 * Configuration options for the Login credential provider
 * @public
 */
export interface FromLoginCredentialsInit extends CredentialProviderOptions, SharedConfigInit {
    /**
     * Profile name to use for Login credentials
     */
    profile?: string;
    /**
     * Login client configuration for token refresh operations
     */
    clientConfig?: SigninClientConfig;
}
/**
 * Login token structure stored on disk
 * @internal
 */
export interface LoginToken {
    accessToken: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken: string;
        accountId?: string;
        expiresAt: string;
    };
    tokenType: string;
    clientId: string;
    refreshToken: string;
    idToken: string;
    dpopKey: string;
}
/**
 * DPoP header structure for OAuth 2.0 Demonstrating Proof of Possession
 * @internal
 */
export interface DpopHeader {
    typ: "dpop+jwt";
    alg: "ES256";
    jwk: {
        kty: "EC";
        crv: "P-256";
        x: string;
        y: string;
    };
}
/**
 * DPoP payload structure
 * @internal
 */
export interface DpopPayload {
    jti: string;
    htm: string;
    htu: string;
    iat: number;
}
