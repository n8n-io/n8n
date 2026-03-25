import { AwsSdkSigV4AuthInputConfig, AwsSdkSigV4AuthResolvedConfig, AwsSdkSigV4PreviouslyResolved } from "@aws-sdk/core";
import { Client, HandlerExecutionContext, HttpAuthScheme, HttpAuthSchemeParameters, HttpAuthSchemeParametersProvider, HttpAuthSchemeProvider, Provider } from "@smithy/types";
import { STSClientResolvedConfig } from "../STSClient";
/**
 * @internal
 */
export interface STSHttpAuthSchemeParameters extends HttpAuthSchemeParameters {
    region?: string;
}
/**
 * @internal
 */
export interface STSHttpAuthSchemeParametersProvider extends HttpAuthSchemeParametersProvider<STSClientResolvedConfig, HandlerExecutionContext, STSHttpAuthSchemeParameters, object> {
}
/**
 * @internal
 */
export declare const defaultSTSHttpAuthSchemeParametersProvider: (config: STSClientResolvedConfig, context: HandlerExecutionContext, input: object) => Promise<STSHttpAuthSchemeParameters>;
/**
 * @internal
 */
export interface STSHttpAuthSchemeProvider extends HttpAuthSchemeProvider<STSHttpAuthSchemeParameters> {
}
/**
 * @internal
 */
export declare const defaultSTSHttpAuthSchemeProvider: STSHttpAuthSchemeProvider;
export interface StsAuthInputConfig {
}
export interface StsAuthResolvedConfig {
    /**
     * Reference to STSClient class constructor.
     * @internal
     */
    stsClientCtor: new (clientConfig: any) => Client<any, any, any>;
}
export declare const resolveStsAuthConfig: <T>(input: T & StsAuthInputConfig) => T & StsAuthResolvedConfig;
/**
 * @public
 */
export interface HttpAuthSchemeInputConfig extends StsAuthInputConfig, AwsSdkSigV4AuthInputConfig {
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
    httpAuthSchemeProvider?: STSHttpAuthSchemeProvider;
}
/**
 * @internal
 */
export interface HttpAuthSchemeResolvedConfig extends StsAuthResolvedConfig, AwsSdkSigV4AuthResolvedConfig {
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
    readonly httpAuthSchemeProvider: STSHttpAuthSchemeProvider;
}
/**
 * @internal
 */
export declare const resolveHttpAuthSchemeConfig: <T>(config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved) => T & HttpAuthSchemeResolvedConfig;
