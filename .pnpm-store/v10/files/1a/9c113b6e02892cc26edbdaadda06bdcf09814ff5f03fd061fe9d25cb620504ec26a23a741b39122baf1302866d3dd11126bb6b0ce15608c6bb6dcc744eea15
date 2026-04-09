import {
  HttpAuthScheme,
  AwsCredentialIdentity,
  AwsCredentialIdentityProvider,
} from "@smithy/types";
import { BedrockAgentRuntimeHttpAuthSchemeProvider } from "./httpAuthSchemeProvider";
export interface HttpAuthExtensionConfiguration {
  setHttpAuthScheme(httpAuthScheme: HttpAuthScheme): void;
  httpAuthSchemes(): HttpAuthScheme[];
  setHttpAuthSchemeProvider(
    httpAuthSchemeProvider: BedrockAgentRuntimeHttpAuthSchemeProvider
  ): void;
  httpAuthSchemeProvider(): BedrockAgentRuntimeHttpAuthSchemeProvider;
  setCredentials(
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
  ): void;
  credentials():
    | AwsCredentialIdentity
    | AwsCredentialIdentityProvider
    | undefined;
}
export type HttpAuthRuntimeConfig = Partial<{
  httpAuthSchemes: HttpAuthScheme[];
  httpAuthSchemeProvider: BedrockAgentRuntimeHttpAuthSchemeProvider;
  credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
}>;
export declare const getHttpAuthExtensionConfiguration: (
  runtimeConfig: HttpAuthRuntimeConfig
) => HttpAuthExtensionConfiguration;
export declare const resolveHttpAuthRuntimeConfig: (
  config: HttpAuthExtensionConfiguration
) => HttpAuthRuntimeConfig;
