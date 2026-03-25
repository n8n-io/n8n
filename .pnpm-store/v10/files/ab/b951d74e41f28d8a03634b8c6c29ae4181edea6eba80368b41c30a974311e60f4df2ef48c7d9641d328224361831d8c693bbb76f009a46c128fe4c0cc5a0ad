/**
 * @module
 * Bearer Auth Middleware for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
type MessageFunction = (c: Context) => string | object | Promise<string | object>;
type CustomizedErrorResponseOptions = {
    wwwAuthenticateHeader?: string | object | MessageFunction;
    message?: string | object | MessageFunction;
};
type BearerAuthOptions = {
    token: string | string[];
    realm?: string;
    prefix?: string;
    headerName?: string;
    hashFunction?: Function;
    /**
     * @deprecated Use noAuthenticationHeader.message instead
     */
    noAuthenticationHeaderMessage?: string | object | MessageFunction;
    noAuthenticationHeader?: CustomizedErrorResponseOptions;
    /**
     * @deprecated Use invalidAuthenticationHeader.message instead
     */
    invalidAuthenticationHeaderMessage?: string | object | MessageFunction;
    invalidAuthenticationHeader?: CustomizedErrorResponseOptions;
    /**
     * @deprecated Use invalidToken.message instead
     */
    invalidTokenMessage?: string | object | MessageFunction;
    invalidToken?: CustomizedErrorResponseOptions;
} | {
    realm?: string;
    prefix?: string;
    headerName?: string;
    verifyToken: (token: string, c: Context) => boolean | Promise<boolean>;
    hashFunction?: Function;
    /**
     * @deprecated Use noAuthenticationHeader.message instead
     */
    noAuthenticationHeaderMessage?: string | object | MessageFunction;
    noAuthenticationHeader?: CustomizedErrorResponseOptions;
    /**
     * @deprecated Use invalidAuthenticationHeader.message instead
     */
    invalidAuthenticationHeaderMessage?: string | object | MessageFunction;
    invalidAuthenticationHeader?: CustomizedErrorResponseOptions;
    /**
     * @deprecated Use invalidToken.message instead
     */
    invalidTokenMessage?: string | object | MessageFunction;
    invalidToken?: CustomizedErrorResponseOptions;
};
/**
 * Bearer Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/bearer-auth}
 *
 * @param {BearerAuthOptions} options - The options for the bearer authentication middleware.
 * @param {string | string[]} [options.token] - The string or array of strings to validate the incoming bearer token against.
 * @param {Function} [options.verifyToken] - The function to verify the token.
 * @param {string} [options.realm=""] - The domain name of the realm, as part of the returned WWW-Authenticate challenge header.
 * @param {string} [options.prefix="Bearer"] - The prefix (or known as `schema`) for the Authorization header value. If set to the empty string, no prefix is expected.
 * @param {string} [options.headerName=Authorization] - The header name.
 * @param {Function} [options.hashFunction] - A function to handle hashing for safe comparison of authentication tokens.
 * @param {string | object | MessageFunction} [options.noAuthenticationHeader.message="Unauthorized"] - The no authentication header message.
 * @param {string | object | MessageFunction} [options.noAuthenticationHeader.wwwAuthenticateHeader="Bearer realm=\"\""] - The response header value for the WWW-Authenticate header when no authentication header is provided.
 * @param {string | object | MessageFunction} [options.invalidAuthenticationHeader.message="Bad Request"] - The invalid authentication header message.
 * @param {string | object | MessageFunction} [options.invalidAuthenticationHeader.wwwAuthenticateHeader="Bearer error=\"invalid_request\""] - The response header value for the WWW-Authenticate header when authentication header is invalid.
 * @param {string | object | MessageFunction} [options.invalidToken.message="Unauthorized"] - The invalid token message.
 * @param {string | object | MessageFunction} [options.invalidToken.wwwAuthenticateHeader="Bearer error=\"invalid_token\""] - The response header value for the WWW-Authenticate header when token is invalid.
 * @returns {MiddlewareHandler} The middleware handler function.
 * @throws {Error} If neither "token" nor "verifyToken" options are provided.
 * @throws {HTTPException} If authentication fails, with 401 status code for missing or invalid token, or 400 status code for invalid request.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * const token = 'honoishot'
 *
 * app.use('/api/*', bearerAuth({ token }))
 *
 * app.get('/api/page', (c) => {
 *   return c.json({ message: 'You are authorized' })
 * })
 * ```
 */
export declare const bearerAuth: (options: BearerAuthOptions) => MiddlewareHandler;
export {};
