import {
  InitializeHandlerOptions,
  InitializeMiddleware,
  Pluggable,
  Provider,
} from "@smithy/types";
export interface PreviouslyResolved {
  region: Provider<string>;
  followRegionRedirects: boolean;
}
export declare function regionRedirectMiddleware(
  clientConfig: PreviouslyResolved
): InitializeMiddleware<any, any>;
export declare const regionRedirectMiddlewareOptions: InitializeHandlerOptions;
export declare const getRegionRedirectMiddlewarePlugin: (
  clientConfig: PreviouslyResolved
) => Pluggable<any, any>;
