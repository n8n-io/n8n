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
import { SigninClientResolvedConfig } from "../SigninClient";
export interface SigninHttpAuthSchemeParameters
  extends HttpAuthSchemeParameters {
  region?: string;
}
export interface SigninHttpAuthSchemeParametersProvider
  extends HttpAuthSchemeParametersProvider<
    SigninClientResolvedConfig,
    HandlerExecutionContext,
    SigninHttpAuthSchemeParameters,
    object
  > {}
export declare const defaultSigninHttpAuthSchemeParametersProvider: (
  config: SigninClientResolvedConfig,
  context: HandlerExecutionContext,
  input: object
) => Promise<SigninHttpAuthSchemeParameters>;
export interface SigninHttpAuthSchemeProvider
  extends HttpAuthSchemeProvider<SigninHttpAuthSchemeParameters> {}
export declare const defaultSigninHttpAuthSchemeProvider: SigninHttpAuthSchemeProvider;
export interface HttpAuthSchemeInputConfig extends AwsSdkSigV4AuthInputConfig {
  authSchemePreference?: string[] | Provider<string[]>;
  httpAuthSchemes?: HttpAuthScheme[];
  httpAuthSchemeProvider?: SigninHttpAuthSchemeProvider;
}
export interface HttpAuthSchemeResolvedConfig
  extends AwsSdkSigV4AuthResolvedConfig {
  readonly authSchemePreference: Provider<string[]>;
  readonly httpAuthSchemes: HttpAuthScheme[];
  readonly httpAuthSchemeProvider: SigninHttpAuthSchemeProvider;
}
export declare const resolveHttpAuthSchemeConfig: <T>(
  config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved
) => T & HttpAuthSchemeResolvedConfig;
