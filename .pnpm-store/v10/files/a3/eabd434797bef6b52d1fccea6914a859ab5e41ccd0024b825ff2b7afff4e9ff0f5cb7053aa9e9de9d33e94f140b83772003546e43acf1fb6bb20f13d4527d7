import { AwsCredentialIdentity, AwsCredentialIdentityProvider, HttpAuthScheme } from "@smithy/types";
import { SageMakerHttpAuthSchemeProvider } from "./httpAuthSchemeProvider";
/**
 * @internal
 */
export interface HttpAuthExtensionConfiguration {
    setHttpAuthScheme(httpAuthScheme: HttpAuthScheme): void;
    httpAuthSchemes(): HttpAuthScheme[];
    setHttpAuthSchemeProvider(httpAuthSchemeProvider: SageMakerHttpAuthSchemeProvider): void;
    httpAuthSchemeProvider(): SageMakerHttpAuthSchemeProvider;
    setCredentials(credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider): void;
    credentials(): AwsCredentialIdentity | AwsCredentialIdentityProvider | undefined;
}
/**
 * @internal
 */
export type HttpAuthRuntimeConfig = Partial<{
    httpAuthSchemes: HttpAuthScheme[];
    httpAuthSchemeProvider: SageMakerHttpAuthSchemeProvider;
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
}>;
/**
 * @internal
 */
export declare const getHttpAuthExtensionConfiguration: (runtimeConfig: HttpAuthRuntimeConfig) => HttpAuthExtensionConfiguration;
/**
 * @internal
 */
export declare const resolveHttpAuthRuntimeConfig: (config: HttpAuthExtensionConfiguration) => HttpAuthRuntimeConfig;
