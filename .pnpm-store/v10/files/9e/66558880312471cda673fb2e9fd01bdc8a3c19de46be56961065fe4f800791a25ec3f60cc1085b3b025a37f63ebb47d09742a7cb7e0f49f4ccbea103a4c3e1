import { AwsSdkSigV4AAuthInputConfig, AwsSdkSigV4AAuthResolvedConfig, AwsSdkSigV4APreviouslyResolved, AwsSdkSigV4AuthInputConfig, AwsSdkSigV4AuthResolvedConfig, AwsSdkSigV4PreviouslyResolved } from "@aws-sdk/core";
import { HandlerExecutionContext, HttpAuthScheme, HttpAuthSchemeParameters, HttpAuthSchemeParametersProvider, HttpAuthSchemeProvider, Provider } from "@smithy/types";
import { EndpointParameters } from "../endpoint/EndpointParameters";
import { SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @internal
 */
interface _SESv2HttpAuthSchemeParameters extends HttpAuthSchemeParameters {
    region?: string;
}
/**
 * @internal
 */
export interface SESv2HttpAuthSchemeParameters extends _SESv2HttpAuthSchemeParameters, EndpointParameters {
    region?: string;
}
/**
 * @internal
 */
export interface SESv2HttpAuthSchemeParametersProvider extends HttpAuthSchemeParametersProvider<SESv2ClientResolvedConfig, HandlerExecutionContext, SESv2HttpAuthSchemeParameters, object> {
}
/**
 * @internal
 */
export declare const defaultSESv2HttpAuthSchemeParametersProvider: SESv2HttpAuthSchemeParametersProvider;
/**
 * @internal
 */
export interface SESv2HttpAuthSchemeProvider extends HttpAuthSchemeProvider<SESv2HttpAuthSchemeParameters> {
}
/**
 * @internal
 */
export declare const defaultSESv2HttpAuthSchemeProvider: SESv2HttpAuthSchemeProvider;
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
    httpAuthSchemeProvider?: SESv2HttpAuthSchemeProvider;
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
    readonly httpAuthSchemeProvider: SESv2HttpAuthSchemeProvider;
}
/**
 * @internal
 */
export declare const resolveHttpAuthSchemeConfig: <T>(config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved & AwsSdkSigV4APreviouslyResolved) => T & HttpAuthSchemeResolvedConfig;
export {};
