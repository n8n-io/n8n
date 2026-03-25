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
import { CognitoIdentityClientResolvedConfig } from "../CognitoIdentityClient";
export interface CognitoIdentityHttpAuthSchemeParameters
  extends HttpAuthSchemeParameters {
  region?: string;
}
export interface CognitoIdentityHttpAuthSchemeParametersProvider
  extends HttpAuthSchemeParametersProvider<
    CognitoIdentityClientResolvedConfig,
    HandlerExecutionContext,
    CognitoIdentityHttpAuthSchemeParameters,
    object
  > {}
export declare const defaultCognitoIdentityHttpAuthSchemeParametersProvider: (
  config: CognitoIdentityClientResolvedConfig,
  context: HandlerExecutionContext,
  input: object
) => Promise<CognitoIdentityHttpAuthSchemeParameters>;
export interface CognitoIdentityHttpAuthSchemeProvider
  extends HttpAuthSchemeProvider<CognitoIdentityHttpAuthSchemeParameters> {}
export declare const defaultCognitoIdentityHttpAuthSchemeProvider: CognitoIdentityHttpAuthSchemeProvider;
export interface HttpAuthSchemeInputConfig extends AwsSdkSigV4AuthInputConfig {
  authSchemePreference?: string[] | Provider<string[]>;
  httpAuthSchemes?: HttpAuthScheme[];
  httpAuthSchemeProvider?: CognitoIdentityHttpAuthSchemeProvider;
}
export interface HttpAuthSchemeResolvedConfig
  extends AwsSdkSigV4AuthResolvedConfig {
  readonly authSchemePreference: Provider<string[]>;
  readonly httpAuthSchemes: HttpAuthScheme[];
  readonly httpAuthSchemeProvider: CognitoIdentityHttpAuthSchemeProvider;
}
export declare const resolveHttpAuthSchemeConfig: <T>(
  config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved
) => T & HttpAuthSchemeResolvedConfig;
