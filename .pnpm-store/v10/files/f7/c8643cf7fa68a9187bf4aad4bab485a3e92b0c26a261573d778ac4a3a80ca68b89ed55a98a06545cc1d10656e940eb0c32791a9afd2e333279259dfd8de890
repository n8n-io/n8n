import {
  HttpAuthScheme,
  AwsCredentialIdentity,
  AwsCredentialIdentityProvider,
  TokenIdentity,
  TokenIdentityProvider,
} from "@smithy/types";
import { BedrockRuntimeHttpAuthSchemeProvider } from "./httpAuthSchemeProvider";
export interface HttpAuthExtensionConfiguration {
  setHttpAuthScheme(httpAuthScheme: HttpAuthScheme): void;
  httpAuthSchemes(): HttpAuthScheme[];
  setHttpAuthSchemeProvider(
    httpAuthSchemeProvider: BedrockRuntimeHttpAuthSchemeProvider
  ): void;
  httpAuthSchemeProvider(): BedrockRuntimeHttpAuthSchemeProvider;
  setCredentials(
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
  ): void;
  credentials():
    | AwsCredentialIdentity
    | AwsCredentialIdentityProvider
    | undefined;
  setToken(token: TokenIdentity | TokenIdentityProvider): void;
  token(): TokenIdentity | TokenIdentityProvider | undefined;
}
export type HttpAuthRuntimeConfig = Partial<{
  httpAuthSchemes: HttpAuthScheme[];
  httpAuthSchemeProvider: BedrockRuntimeHttpAuthSchemeProvider;
  credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
  token: TokenIdentity | TokenIdentityProvider;
}>;
export declare const getHttpAuthExtensionConfiguration: (
  runtimeConfig: HttpAuthRuntimeConfig
) => HttpAuthExtensionConfiguration;
export declare const resolveHttpAuthRuntimeConfig: (
  config: HttpAuthExtensionConfiguration
) => HttpAuthRuntimeConfig;
