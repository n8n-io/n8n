import type { EndpointOptions } from "./EndpointOptions.js";
import type { OctokitResponse } from "./OctokitResponse.js";
import type { RequestInterface } from "./RequestInterface.js";
import type { RequestParameters } from "./RequestParameters.js";
import type { Route } from "./Route.js";
/**
 * Interface to implement complex authentication strategies for Octokit.
 * An object Implementing the AuthInterface can directly be passed as the
 * `auth` option in the Octokit constructor.
 *
 * For the official implementations of the most common authentication
 * strategies, see https://github.com/octokit/auth.js
 */
export interface AuthInterface<AuthOptions extends any[], Authentication extends any> {
    (...args: AuthOptions): Promise<Authentication>;
    hook: {
        /**
         * Sends a request using the passed `request` instance
         *
         * @param {object} endpoint Must set `method` and `url`. Plus URL, query or body parameters, as well as `headers`, `mediaType.{format|previews}`, `request`, or `baseUrl`.
         */
        <T = any>(request: RequestInterface, options: EndpointOptions): Promise<OctokitResponse<T>>;
        /**
         * Sends a request using the passed `request` instance
         *
         * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
         * @param {object} [parameters] URL, query or body parameters, as well as `headers`, `mediaType.{format|previews}`, `request`, or `baseUrl`.
         */
        <T = any>(request: RequestInterface, route: Route, parameters?: RequestParameters): Promise<OctokitResponse<T>>;
    };
}
