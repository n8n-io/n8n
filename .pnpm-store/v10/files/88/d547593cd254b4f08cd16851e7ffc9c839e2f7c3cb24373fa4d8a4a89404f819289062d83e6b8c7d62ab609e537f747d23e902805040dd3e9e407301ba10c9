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
import { SSOOIDCClientResolvedConfig } from "../SSOOIDCClient";
export interface SSOOIDCHttpAuthSchemeParameters
  extends HttpAuthSchemeParameters {
  region?: string;
}
export interface SSOOIDCHttpAuthSchemeParametersProvider
  extends HttpAuthSchemeParametersProvider<
    SSOOIDCClientResolvedConfig,
    HandlerExecutionContext,
    SSOOIDCHttpAuthSchemeParameters,
    object
  > {}
export declare const defaultSSOOIDCHttpAuthSchemeParametersProvider: (
  config: SSOOIDCClientResolvedConfig,
  context: HandlerExecutionContext,
  input: object
) => Promise<SSOOIDCHttpAuthSchemeParameters>;
export interface SSOOIDCHttpAuthSchemeProvider
  extends HttpAuthSchemeProvider<SSOOIDCHttpAuthSchemeParameters> {}
export declare const defaultSSOOIDCHttpAuthSchemeProvider: SSOOIDCHttpAuthSchemeProvider;
export interface HttpAuthSchemeInputConfig extends AwsSdkSigV4AuthInputConfig {
  authSchemePreference?: string[] | Provider<string[]>;
  httpAuthSchemes?: HttpAuthScheme[];
  httpAuthSchemeProvider?: SSOOIDCHttpAuthSchemeProvider;
}
export interface HttpAuthSchemeResolvedConfig
  extends AwsSdkSigV4AuthResolvedConfig {
  readonly authSchemePreference: Provider<string[]>;
  readonly httpAuthSchemes: HttpAuthScheme[];
  readonly httpAuthSchemeProvider: SSOOIDCHttpAuthSchemeProvider;
}
export declare const resolveHttpAuthSchemeConfig: <T>(
  config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved
) => T & HttpAuthSchemeResolvedConfig;
