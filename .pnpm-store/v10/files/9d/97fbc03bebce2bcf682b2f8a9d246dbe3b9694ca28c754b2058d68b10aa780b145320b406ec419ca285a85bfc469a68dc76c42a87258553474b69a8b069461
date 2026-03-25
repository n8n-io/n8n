import {
  AwsSdkSigV4AuthInputConfig,
  AwsSdkSigV4AuthResolvedConfig,
  AwsSdkSigV4PreviouslyResolved,
} from "@aws-sdk/core";
import {
  HandlerExecutionContext,
  HttpAuthScheme,
  HttpAuthSchemeParameters,
  HttpAuthSchemeParametersProvider,
  HttpAuthSchemeProvider,
  Provider,
} from "@smithy/types";
import { SecretsManagerClientResolvedConfig } from "../SecretsManagerClient";
export interface SecretsManagerHttpAuthSchemeParameters
  extends HttpAuthSchemeParameters {
  region?: string;
}
export interface SecretsManagerHttpAuthSchemeParametersProvider
  extends HttpAuthSchemeParametersProvider<
    SecretsManagerClientResolvedConfig,
    HandlerExecutionContext,
    SecretsManagerHttpAuthSchemeParameters,
    object
  > {}
export declare const defaultSecretsManagerHttpAuthSchemeParametersProvider: (
  config: SecretsManagerClientResolvedConfig,
  context: HandlerExecutionContext,
  input: object
) => Promise<SecretsManagerHttpAuthSchemeParameters>;
export interface SecretsManagerHttpAuthSchemeProvider
  extends HttpAuthSchemeProvider<SecretsManagerHttpAuthSchemeParameters> {}
export declare const defaultSecretsManagerHttpAuthSchemeProvider: SecretsManagerHttpAuthSchemeProvider;
export interface HttpAuthSchemeInputConfig extends AwsSdkSigV4AuthInputConfig {
  authSchemePreference?: string[] | Provider<string[]>;
  httpAuthSchemes?: HttpAuthScheme[];
  httpAuthSchemeProvider?: SecretsManagerHttpAuthSchemeProvider;
}
export interface HttpAuthSchemeResolvedConfig
  extends AwsSdkSigV4AuthResolvedConfig {
  readonly authSchemePreference: Provider<string[]>;
  readonly httpAuthSchemes: HttpAuthScheme[];
  readonly httpAuthSchemeProvider: SecretsManagerHttpAuthSchemeProvider;
}
export declare const resolveHttpAuthSchemeConfig: <T>(
  config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved
) => T & HttpAuthSchemeResolvedConfig;
