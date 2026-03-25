import { InitializeHandlerOptions, InitializeMiddleware, Pluggable, Provider } from "@smithy/types";
/**
 * @internal
 */
export interface PreviouslyResolved {
    region: Provider<string>;
    followRegionRedirects: boolean;
}
/**
 * @internal
 */
export declare function regionRedirectMiddleware(clientConfig: PreviouslyResolved): InitializeMiddleware<any, any>;
/**
 * @internal
 */
export declare const regionRedirectMiddlewareOptions: InitializeHandlerOptions;
/**
 * @internal
 */
export declare const getRegionRedirectMiddlewarePlugin: (clientConfig: PreviouslyResolved) => Pluggable<any, any>;
