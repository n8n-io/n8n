import {
  AwsSdkSigV4AAuthInputConfig,
  AwsSdkSigV4AAuthResolvedConfig,
  AwsSdkSigV4APreviouslyResolved,
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
import { EndpointParameters } from "../endpoint/EndpointParameters";
import { SESv2ClientResolvedConfig } from "../SESv2Client";
interface _SESv2HttpAuthSchemeParameters extends HttpAuthSchemeParameters {
  region?: string;
}
export interface SESv2HttpAuthSchemeParameters
  extends _SESv2HttpAuthSchemeParameters,
    EndpointParameters {
  region?: string;
}
export interface SESv2HttpAuthSchemeParametersProvider
  extends HttpAuthSchemeParametersProvider<
    SESv2ClientResolvedConfig,
    HandlerExecutionContext,
    SESv2HttpAuthSchemeParameters,
    object
  > {}
export declare const defaultSESv2HttpAuthSchemeParametersProvider: SESv2HttpAuthSchemeParametersProvider;
export interface SESv2HttpAuthSchemeProvider
  extends HttpAuthSchemeProvider<SESv2HttpAuthSchemeParameters> {}
export declare const defaultSESv2HttpAuthSchemeProvider: SESv2HttpAuthSchemeProvider;
export interface HttpAuthSchemeInputConfig
  extends AwsSdkSigV4AuthInputConfig,
    AwsSdkSigV4AAuthInputConfig {
  authSchemePreference?: string[] | Provider<string[]>;
  httpAuthSchemes?: HttpAuthScheme[];
  httpAuthSchemeProvider?: SESv2HttpAuthSchemeProvider;
}
export interface HttpAuthSchemeResolvedConfig
  extends AwsSdkSigV4AuthResolvedConfig,
    AwsSdkSigV4AAuthResolvedConfig {
  readonly authSchemePreference: Provider<string[]>;
  readonly httpAuthSchemes: HttpAuthScheme[];
  readonly httpAuthSchemeProvider: SESv2HttpAuthSchemeProvider;
}
export declare const resolveHttpAuthSchemeConfig: <T>(
  config: T &
    HttpAuthSchemeInputConfig &
    AwsSdkSigV4PreviouslyResolved &
    AwsSdkSigV4APreviouslyResolved
) => T & HttpAuthSchemeResolvedConfig;
export {};
