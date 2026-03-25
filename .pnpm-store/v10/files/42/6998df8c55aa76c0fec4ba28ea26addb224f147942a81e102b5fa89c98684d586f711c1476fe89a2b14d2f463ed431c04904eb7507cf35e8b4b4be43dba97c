/**
 * @module
 * JWK Auth Middleware for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
import type { CookiePrefixOptions } from '../../utils/cookie';
import '../../context';
import type { AsymmetricAlgorithm } from '../../utils/jwt/jwa';
import type { HonoJsonWebKey } from '../../utils/jwt/jws';
import type { VerifyOptions } from '../../utils/jwt/jwt';
/**
 * JWK Auth Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/jwk}
 *
 * @param {object} options - The options for the JWK middleware.
 * @param {HonoJsonWebKey[] | ((ctx: Context) => Promise<HonoJsonWebKey[]> | HonoJsonWebKey[])} [options.keys] - The public keys used for JWK verification, or a function that returns them.
 * @param {string | ((ctx: Context) => Promise<string> | string)} [options.jwks_uri] - If set to a URI string or a function that returns a URI string, attempt to fetch JWKs from it. The response must be a JSON object containing a `keys` array, which will be merged with the `keys` option.
 * @param {boolean} [options.allow_anon] - If set to `true`, the middleware allows requests without a token to proceed without authentication.
 * @param {string} [options.cookie] - If set, the middleware attempts to retrieve the token from a cookie with these options (optionally signed) only if no token is found in the header.
 * @param {string} [options.headerName='Authorization'] - The name of the header to look for the JWT token. Default is 'Authorization'.
 * @param {AsymmetricAlgorithm[]} options.alg - An array of allowed asymmetric algorithms for JWT verification. Only tokens signed with these algorithms will be accepted.
 * @param {RequestInit} [init] - Optional init options for the `fetch` request when retrieving JWKS from a URI.
 * @param {VerifyOptions} [options.verification] - Additional options for JWK payload verification.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use("/auth/*", jwk({
 *   jwks_uri: (c) => `https://${c.env.authServer}/.well-known/jwks.json`,
 *   headerName: 'x-custom-auth-header', // Optional, default is 'Authorization'
 * }))
 *
 * app.get('/auth/page', (c) => {
 *   return c.text('You are authorized')
 * })
 * ```
 */
export declare const jwk: (options: {
    keys?: HonoJsonWebKey[] | ((ctx: Context) => Promise<HonoJsonWebKey[]> | HonoJsonWebKey[]);
    jwks_uri?: string | ((ctx: Context) => Promise<string> | string);
    allow_anon?: boolean;
    cookie?: string | {
        key: string;
        secret?: string | BufferSource;
        prefixOptions?: CookiePrefixOptions;
    };
    headerName?: string;
    alg: AsymmetricAlgorithm[];
    verification?: VerifyOptions;
}, init?: RequestInit) => MiddlewareHandler;
