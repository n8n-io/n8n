import { AwsSdkSigV4AuthInputConfig, AwsSdkSigV4AuthResolvedConfig, AwsSdkSigV4PreviouslyResolved } from "@aws-sdk/core";
import { HandlerExecutionContext, HttpAuthScheme, HttpAuthSchemeParameters, HttpAuthSchemeParametersProvider, HttpAuthSchemeProvider, Provider } from "@smithy/types";
import { BedrockAgentRuntimeClientResolvedConfig } from "../BedrockAgentRuntimeClient";
/**
 * @internal
 */
export interface BedrockAgentRuntimeHttpAuthSchemeParameters extends HttpAuthSchemeParameters {
    region?: string;
}
/**
 * @internal
 */
export interface BedrockAgentRuntimeHttpAuthSchemeParametersProvider extends HttpAuthSchemeParametersProvider<BedrockAgentRuntimeClientResolvedConfig, HandlerExecutionContext, BedrockAgentRuntimeHttpAuthSchemeParameters, object> {
}
/**
 * @internal
 */
export declare const defaultBedrockAgentRuntimeHttpAuthSchemeParametersProvider: (config: BedrockAgentRuntimeClientResolvedConfig, context: HandlerExecutionContext, input: object) => Promise<BedrockAgentRuntimeHttpAuthSchemeParameters>;
/**
 * @internal
 */
export interface BedrockAgentRuntimeHttpAuthSchemeProvider extends HttpAuthSchemeProvider<BedrockAgentRuntimeHttpAuthSchemeParameters> {
}
/**
 * @internal
 */
export declare const defaultBedrockAgentRuntimeHttpAuthSchemeProvider: BedrockAgentRuntimeHttpAuthSchemeProvider;
/**
 * @internal
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
    httpAuthSchemeProvider?: BedrockAgentRuntimeHttpAuthSchemeProvider;
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
    readonly httpAuthSchemeProvider: BedrockAgentRuntimeHttpAuthSchemeProvider;
}
/**
 * @internal
 */
export declare const resolveHttpAuthSchemeConfig: <T>(config: T & HttpAuthSchemeInputConfig & AwsSdkSigV4PreviouslyResolved) => T & HttpAuthSchemeResolvedConfig;
