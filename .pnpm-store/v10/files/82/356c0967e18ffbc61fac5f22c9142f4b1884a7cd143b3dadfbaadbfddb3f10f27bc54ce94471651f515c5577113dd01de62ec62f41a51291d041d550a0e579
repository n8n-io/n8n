import type { EndpointDefaults } from "./EndpointDefaults";
import type { RequestOptions } from "./RequestOptions";
import type { RequestParameters } from "./RequestParameters";
import type { Route } from "./Route";
import type { Endpoints } from "./generated/Endpoints";
export interface EndpointInterface<D extends object = object> {
    /**
     * Transforms a GitHub REST API endpoint into generic request options
     *
     * @param {object} endpoint Must set `url` unless it's set defaults. Plus URL, query or body parameters, as well as `headers`, `mediaType.{format|previews}`, `request`, or `baseUrl`.
     */
    <O extends RequestParameters = RequestParameters>(options: O & {
        method?: string;
    } & ("url" extends keyof D ? {
        url?: string;
    } : {
        url: string;
    })): RequestOptions & Pick<D & O, keyof RequestOptions>;
    /**
     * Transforms a GitHub REST API endpoint into generic request options
     *
     * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
     * @param {object} [parameters] URL, query or body parameters, as well as `headers`, `mediaType.{format|previews}`, `request`, or `baseUrl`.
     */
    <R extends Route, P extends RequestParameters = R extends keyof Endpoints ? Endpoints[R]["parameters"] & RequestParameters : RequestParameters>(route: keyof Endpoints | R, parameters?: P): (R extends keyof Endpoints ? Endpoints[R]["request"] : RequestOptions) & Pick<P, keyof RequestOptions>;
    /**
     * Object with current default route and parameters
     */
    DEFAULTS: D & EndpointDefaults;
    /**
     * Returns a new `endpoint` interface with new defaults
     */
    defaults: <O extends RequestParameters = RequestParameters>(newDefaults: O) => EndpointInterface<D & O>;
    merge: {
        /**
         * Merges current endpoint defaults with passed route and parameters,
         * without transforming them into request options.
         *
         * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
         * @param {object} [parameters] URL, query or body parameters, as well as `headers`, `mediaType.{format|previews}`, `request`, or `baseUrl`.
         *
         */
        <R extends Route, P extends RequestParameters = R extends keyof Endpoints ? Endpoints[R]["parameters"] & RequestParameters : RequestParameters>(route: keyof Endpoints | R, parameters?: P): D & (R extends keyof Endpoints ? Endpoints[R]["request"] & Endpoints[R]["parameters"] : EndpointDefaults) & P;
        /**
         * Merges current endpoint defaults with passed route and parameters,
         * without transforming them into request options.
         *
         * @param {object} endpoint Must set `method` and `url`. Plus URL, query or body parameters, as well as `headers`, `mediaType.{format|previews}`, `request`, or `baseUrl`.
         */
        <P extends RequestParameters = RequestParameters>(options: P): EndpointDefaults & D & P;
        /**
         * Returns current default options.
         *
         * @deprecated use endpoint.DEFAULTS instead
         */
        (): D & EndpointDefaults;
    };
    /**
     * Stateless method to turn endpoint options into request options.
     * Calling `endpoint(options)` is the same as calling `endpoint.parse(endpoint.merge(options))`.
     *
     * @param {object} options `method`, `url`. Plus URL, query or body parameters, as well as `headers`, `mediaType.{format|previews}`, `request`, or `baseUrl`.
     */
    parse: <O extends EndpointDefaults = EndpointDefaults>(options: O) => RequestOptions & Pick<O, keyof RequestOptions>;
}
