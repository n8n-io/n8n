import type { Endpoint, EndpointParameters, EndpointV2, Logger, Provider } from "@smithy/types";
/**
 * This is an additional config resolver layer for clients using the default
 * AWS regional endpoints ruleset. It makes the *resolved* config guarantee the presence of an
 * endpoint provider function. This differs from the base behavior of the Endpoint
 * config resolver, which only normalizes config.endpoint IFF one is provided by the caller.
 *
 * This is not used by AWS SDK clients, but rather
 * generated clients that have the aws.api#service trait. This includes protocol tests
 * and other customers.
 *
 * This resolver is MUTUALLY EXCLUSIVE with the EndpointRequired config resolver from
 * |@smithy/middleware-endpoint.
 *
 * It must be placed after the `resolveEndpointConfig`
 * resolver. This replaces the endpoints.json-based default endpoint provider.
 *
 * @public
 */
export type DefaultAwsRegionalEndpointsInputConfig = {
    endpoint?: unknown;
};
type PreviouslyResolved = {
    logger?: Logger;
    region?: undefined | string | Provider<string | undefined>;
    useFipsEndpoint?: undefined | boolean | Provider<string | boolean>;
    useDualstackEndpoint?: undefined | boolean | Provider<string | boolean>;
    endpointProvider: (endpointParams: EndpointParameters | DefaultRegionalEndpointParameters, context?: {
        logger?: Logger;
    }) => EndpointV2;
};
/**
 * @internal
 */
type DefaultRegionalEndpointParameters = {
    Region?: string | undefined;
    UseDualStack?: boolean | undefined;
    UseFIPS?: boolean | undefined;
};
/**
 * @internal
 */
export interface DefaultAwsRegionalEndpointsResolvedConfig {
    endpoint: Provider<Endpoint>;
}
/**
 * MUST resolve after `\@smithy/middleware-endpoint`::`resolveEndpointConfig`.
 *
 * @internal
 */
export declare const resolveDefaultAwsRegionalEndpointsConfig: <T>(input: T & DefaultAwsRegionalEndpointsInputConfig & PreviouslyResolved) => T & DefaultAwsRegionalEndpointsResolvedConfig;
/**
 * @internal
 */
export declare const toEndpointV1: (endpoint: EndpointV2) => Endpoint;
export {};
