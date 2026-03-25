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
import { S3ClientResolvedConfig } from "../S3Client";
interface _S3HttpAuthSchemeParameters extends HttpAuthSchemeParameters {
  region?: string;
}
export interface S3HttpAuthSchemeParameters
  extends _S3HttpAuthSchemeParameters,
    EndpointParameters {
  region?: string;
}
export interface S3HttpAuthSchemeParametersProvider
  extends HttpAuthSchemeParametersProvider<
    S3ClientResolvedConfig,
    HandlerExecutionContext,
    S3HttpAuthSchemeParameters,
    object
  > {}
export declare const defaultS3HttpAuthSchemeParametersProvider: S3HttpAuthSchemeParametersProvider;
export interface S3HttpAuthSchemeProvider
  extends HttpAuthSchemeProvider<S3HttpAuthSchemeParameters> {}
export declare const defaultS3HttpAuthSchemeProvider: S3HttpAuthSchemeProvider;
export interface HttpAuthSchemeInputConfig
  extends AwsSdkSigV4AuthInputConfig,
    AwsSdkSigV4AAuthInputConfig {
  authSchemePreference?: string[] | Provider<string[]>;
  httpAuthSchemes?: HttpAuthScheme[];
  httpAuthSchemeProvider?: S3HttpAuthSchemeProvider;
}
export interface HttpAuthSchemeResolvedConfig
  extends AwsSdkSigV4AuthResolvedConfig,
    AwsSdkSigV4AAuthResolvedConfig {
  readonly authSchemePreference: Provider<string[]>;
  readonly httpAuthSchemes: HttpAuthScheme[];
  readonly httpAuthSchemeProvider: S3HttpAuthSchemeProvider;
}
export declare const resolveHttpAuthSchemeConfig: <T>(
  config: T &
    HttpAuthSchemeInputConfig &
    AwsSdkSigV4PreviouslyResolved &
    AwsSdkSigV4APreviouslyResolved
) => T & HttpAuthSchemeResolvedConfig;
export {};
