import type { CredentialProviderOptions, TokenIdentityProvider } from "@aws-sdk/types";
/**
 * @public
 */
export interface FromEnvSigningNameInit extends CredentialProviderOptions {
    signingName?: string;
}
/**
 * Creates a TokenIdentityProvider that retrieves bearer token from environment variable
 *
 * @param options - Configuration options for the token provider
 * @param options.logger - Optional logger for debug messages
 * @param options.signingName - Service signing name used to determine environment variable key
 * @returns TokenIdentityProvider that provides bearer token from environment variable
 *
 * @public
 */
export declare const fromEnvSigningName: ({ logger, signingName }?: FromEnvSigningNameInit) => TokenIdentityProvider;
