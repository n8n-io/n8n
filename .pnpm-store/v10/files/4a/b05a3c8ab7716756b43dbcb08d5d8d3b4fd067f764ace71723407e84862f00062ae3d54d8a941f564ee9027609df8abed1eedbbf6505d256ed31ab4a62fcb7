import { Endpoint, Provider, UrlParser } from "@smithy/types";
import { EndpointsInputConfig, EndpointsResolvedConfig } from "./resolveEndpointsConfig";
/**
 * @public
 * @deprecated superseded by default endpointRuleSet generation.
 */
export interface CustomEndpointsInputConfig extends EndpointsInputConfig {
    /**
     * The fully qualified endpoint of the webservice.
     */
    endpoint: string | Endpoint | Provider<Endpoint>;
}
/**
 * @internal
 * @deprecated superseded by default endpointRuleSet generation.
 */
interface PreviouslyResolved {
    urlParser: UrlParser;
}
/**
 * @internal
 * @deprecated superseded by default endpointRuleSet generation.
 */
export interface CustomEndpointsResolvedConfig extends EndpointsResolvedConfig {
    /**
     * Whether the endpoint is specified by caller.
     * @internal
     */
    isCustomEndpoint: true;
}
/**
 * @internal
 *
 * @deprecated superseded by default endpointRuleSet generation.
 */
export declare const resolveCustomEndpointsConfig: <T>(input: T & CustomEndpointsInputConfig & PreviouslyResolved) => T & CustomEndpointsResolvedConfig;
export {};
