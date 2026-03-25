import { AwsSdkSigV4AAuthInputConfig, AwsSdkSigV4AAuthResolvedConfig, AwsSdkSigV4APreviouslyResolved, AwsSdkSigV4AuthInputConfig, AwsSdkSigV4AuthResolvedConfig, AwsSdkSigV4PreviouslyResolved } from "@aws-sdk/core";
import { HandlerExecutionContext, HttpAuthScheme, HttpAuthSchemeParameters, HttpAuthSchemeParametersProvider, HttpAuthSchemeProvider, Provider } from "@smithy/types";
import { EndpointParameters } from "../endpoint/EndpointParameters";
import { S3ClientResolvedConfig } from "../S3Client";
/**
 * @internal
 */
interface _S3HttpAuthSchemeParameters extends HttpAuthSchemeParameters {
    region?: string;
}
/**
 * @internal
 */
export interface S3HttpAuthSchemeParameters extends _S3HttpAuthSchemeParameters, EndpointParameters {
    region?: string;
}
/**
 * @internal
 */
export interface S3HttpAuthSchemeParametersProvider extends HttpAuthSchemeParametersProvider<S3ClientResolvedConfig, HandlerExecutionContext, S3HttpAuthSchemeParameters, object> {
}
/**
 * @internal
 */
export declare const defaultS3HttpAuthSchemeParametersProvider: S3HttpAuthSchemeParametersProvider;
/**
 * @internal
 */
export interface S3HttpAuthSchemeProvider extends HttpAuthSchemeProvider<S3HttpAuthSchemeParameters> {
}
/**
 * @internal
 */
export declare const defaultS3HttpAuthSchemeProvider: S3HttpAuthSchemeProvider;
/**
 * @internal
 */
export interface HttpAuthSchemeInputConfig extends AwsSdkSigV4AuthInputConfig, AwsSdkSigV4AAuthInputConfig {
    /**
     * A comma-separated list of case-sensitive auth scheme names.
     * An auth scheme name is a fully qualified auth scheme ID with the namespace prefix trimmed.
     * For example, the auth scheme with ID aws.auth#sigv4 is named sigv4.
     * @public
     */
    authSchemePreference?: string[] | Provider<string[]>;
    /**
     * Configuration of HttpAuthSchemes for a client which provides default identity providers and signers per auth scheme.
     * @internal
     */
    httpAuthSchemes?: HttpAuthScheme[];
    /**
     * Configuration of an HttpAuthSchemeProvider for a client which resolves which HttpAuthScheme to use.
     * @internal
     */
    httpAuthSchemeProvider?: S3HttpAuthSchemeProvider;
}
/**
 * @internal
 */
export interface HttpAuthSchemeResolvedConfig extends AwsSdkSigV4AuthResolvedConfig, AwsSdkSigV4AAuthResolvedConfig {
    /**
     * A comma-separated list of case-sensitive auth scheme names.
     * An auth scheme name is a fully qualified auth scheme ID with the namespace prefix trimmed.
     * For example, the auth scheme with ID aws.auth#sigv4 is named sigv4.
     * @public
     */
    readonly authSchemePreference: Provider<string[]>;
    /**
     * Configuration of HttpAuthSchemes for a client which provides default identity providers and signers per auth scheme.
     * @internal
     */
    readonly httpAuthSchemes: HttpAuthScheme[];
    /**
     * Configuration of an HttpAuthSchemeProvider for a client which resolves which HttpAuthScheme to use.
     * @internal
     */
    readonly httpAuthSchemeProvider: S3HttpAuthSchemeProvider;
}
/**
 * @internal
 */
export declare const resolveHttpAuthSchemeConfig: <T>(config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved & AwsSdkSigV4APreviouslyResolved) => T & HttpAuthSchemeResolvedConfig;
export {};
