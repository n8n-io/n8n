import { type HttpAuthScheme, AwsCredentialIdentity, AwsCredentialIdentityProvider, TokenIdentity, TokenIdentityProvider } from "@smithy/types";
import type { BedrockRuntimeHttpAuthSchemeProvider } from "./httpAuthSchemeProvider";
/**
 * @internal
 */
export interface HttpAuthExtensionConfiguration {
    setHttpAuthScheme(httpAuthScheme: HttpAuthScheme): void;
    httpAuthSchemes(): HttpAuthScheme[];
    setHttpAuthSchemeProvider(httpAuthSchemeProvider: BedrockRuntimeHttpAuthSchemeProvider): void;
    httpAuthSchemeProvider(): BedrockRuntimeHttpAuthSchemeProvider;
    setCredentials(credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider): void;
    credentials(): AwsCredentialIdentity | AwsCredentialIdentityProvider | undefined;
    setToken(token: TokenIdentity | TokenIdentityProvider): void;
    token(): TokenIdentity | TokenIdentityProvider | undefined;
}
/**
 * @internal
 */
export type HttpAuthRuntimeConfig = Partial<{
    httpAuthSchemes: HttpAuthScheme[];
    httpAuthSchemeProvider: BedrockRuntimeHttpAuthSchemeProvider;
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    token: TokenIdentity | TokenIdentityProvider;
}>;
/**
 * @internal
 */
export declare const getHttpAuthExtensionConfiguration: (runtimeConfig: HttpAuthRuntimeConfig) => HttpAuthExtensionConfiguration;
/**
 * @internal
 */
export declare const resolveHttpAuthRuntimeConfig: (config: HttpAuthExtensionConfiguration) => HttpAuthRuntimeConfig;
