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
import { KendraClientResolvedConfig } from "../KendraClient";
export interface KendraHttpAuthSchemeParameters
  extends HttpAuthSchemeParameters {
  region?: string;
}
export interface KendraHttpAuthSchemeParametersProvider
  extends HttpAuthSchemeParametersProvider<
    KendraClientResolvedConfig,
    HandlerExecutionContext,
    KendraHttpAuthSchemeParameters,
    object
  > {}
export declare const defaultKendraHttpAuthSchemeParametersProvider: (
  config: KendraClientResolvedConfig,
  context: HandlerExecutionContext,
  input: object
) => Promise<KendraHttpAuthSchemeParameters>;
export interface KendraHttpAuthSchemeProvider
  extends HttpAuthSchemeProvider<KendraHttpAuthSchemeParameters> {}
export declare const defaultKendraHttpAuthSchemeProvider: KendraHttpAuthSchemeProvider;
export interface HttpAuthSchemeInputConfig extends AwsSdkSigV4AuthInputConfig {
  authSchemePreference?: string[] | Provider<string[]>;
  httpAuthSchemes?: HttpAuthScheme[];
  httpAuthSchemeProvider?: KendraHttpAuthSchemeProvider;
}
export interface HttpAuthSchemeResolvedConfig
  extends AwsSdkSigV4AuthResolvedConfig {
  readonly authSchemePreference: Provider<string[]>;
  readonly httpAuthSchemes: HttpAuthScheme[];
  readonly httpAuthSchemeProvider: KendraHttpAuthSchemeProvider;
}
export declare const resolveHttpAuthSchemeConfig: <T>(
  config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved
) => T & HttpAuthSchemeResolvedConfig;
