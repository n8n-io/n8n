import { CredentialProviderOptions, RuntimeConfigIdentityProvider, TokenIdentity } from "@aws-sdk/types";
import { SourceProfileInit } from "@smithy/shared-ini-file-loader";
export interface FromSsoInit extends SourceProfileInit, CredentialProviderOptions {
    /**
     * @see SSOOIDCClientConfig in \@aws-sdk/client-sso-oidc.
     */
    clientConfig?: any;
}
/**
 * Creates a token provider that will read from SSO token cache or ssoOidc.createToken() call.
 */
export declare const fromSso: (_init?: FromSsoInit) => RuntimeConfigIdentityProvider<TokenIdentity>;
