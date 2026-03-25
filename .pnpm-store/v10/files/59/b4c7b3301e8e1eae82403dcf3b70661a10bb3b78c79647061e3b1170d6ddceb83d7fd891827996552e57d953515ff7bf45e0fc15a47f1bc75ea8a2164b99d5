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
import { SageMakerClientResolvedConfig } from "../SageMakerClient";
export interface SageMakerHttpAuthSchemeParameters
  extends HttpAuthSchemeParameters {
  region?: string;
}
export interface SageMakerHttpAuthSchemeParametersProvider
  extends HttpAuthSchemeParametersProvider<
    SageMakerClientResolvedConfig,
    HandlerExecutionContext,
    SageMakerHttpAuthSchemeParameters,
    object
  > {}
export declare const defaultSageMakerHttpAuthSchemeParametersProvider: (
  config: SageMakerClientResolvedConfig,
  context: HandlerExecutionContext,
  input: object
) => Promise<SageMakerHttpAuthSchemeParameters>;
export interface SageMakerHttpAuthSchemeProvider
  extends HttpAuthSchemeProvider<SageMakerHttpAuthSchemeParameters> {}
export declare const defaultSageMakerHttpAuthSchemeProvider: SageMakerHttpAuthSchemeProvider;
export interface HttpAuthSchemeInputConfig extends AwsSdkSigV4AuthInputConfig {
  authSchemePreference?: string[] | Provider<string[]>;
  httpAuthSchemes?: HttpAuthScheme[];
  httpAuthSchemeProvider?: SageMakerHttpAuthSchemeProvider;
}
export interface HttpAuthSchemeResolvedConfig
  extends AwsSdkSigV4AuthResolvedConfig {
  readonly authSchemePreference: Provider<string[]>;
  readonly httpAuthSchemes: HttpAuthScheme[];
  readonly httpAuthSchemeProvider: SageMakerHttpAuthSchemeProvider;
}
export declare const resolveHttpAuthSchemeConfig: <T>(
  config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved
) => T & HttpAuthSchemeResolvedConfig;
