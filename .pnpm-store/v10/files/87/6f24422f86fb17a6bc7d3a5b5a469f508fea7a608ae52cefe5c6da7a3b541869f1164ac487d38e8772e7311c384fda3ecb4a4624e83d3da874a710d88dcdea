import { AwsSdkSigV4AuthInputConfig, AwsSdkSigV4AuthResolvedConfig, AwsSdkSigV4PreviouslyResolved } from "@aws-sdk/core";
import { HandlerExecutionContext, HttpAuthScheme, HttpAuthSchemeParameters, HttpAuthSchemeParametersProvider, HttpAuthSchemeProvider, Provider, TokenIdentity, TokenIdentityProvider } from "@smithy/types";
import { BedrockRuntimeClientResolvedConfig } from "../BedrockRuntimeClient";
/**
 * @internal
 */
export interface BedrockRuntimeHttpAuthSchemeParameters extends HttpAuthSchemeParameters {
    region?: string;
}
/**
 * @internal
 */
export interface BedrockRuntimeHttpAuthSchemeParametersProvider extends HttpAuthSchemeParametersProvider<BedrockRuntimeClientResolvedConfig, HandlerExecutionContext, BedrockRuntimeHttpAuthSchemeParameters, object> {
}
/**
 * @internal
 */
export declare const defaultBedrockRuntimeHttpAuthSchemeParametersProvider: (config: BedrockRuntimeClientResolvedConfig, context: HandlerExecutionContext, input: object) => Promise<BedrockRuntimeHttpAuthSchemeParameters>;
/**
 * @internal
 */
export interface BedrockRuntimeHttpAuthSchemeProvider extends HttpAuthSchemeProvider<BedrockRuntimeHttpAuthSchemeParameters> {
}
/**
 * @internal
 */
export declare const defaultBedrockRuntimeHttpAuthSchemeProvider: BedrockRuntimeHttpAuthSchemeProvider;
/**
 * @public
 */
export interface HttpAuthSchemeInputConfig extends AwsSdkSigV4AuthInputConfig {
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
    httpAuthSchemeProvider?: BedrockRuntimeHttpAuthSchemeProvider;
    /**
     * The token used to authenticate requests.
     */
    token?: TokenIdentity | TokenIdentityProvider;
}
/**
 * @internal
 */
export interface HttpAuthSchemeResolvedConfig extends AwsSdkSigV4AuthResolvedConfig {
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
    readonly httpAuthSchemeProvider: BedrockRuntimeHttpAuthSchemeProvider;
    /**
     * The token used to authenticate requests.
     */
    readonly token?: TokenIdentityProvider;
}
/**
 * @internal
 */
export declare const resolveHttpAuthSchemeConfig: <T>(config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved) => T & HttpAuthSchemeResolvedConfig;
