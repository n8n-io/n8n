/**
 * Verification using a JSON Web Key Set (JWKS) available on an HTTP(S) URL
 *
 * @module
 */
import type * as types from '../types.d.ts';
/**
 * When passed to {@link jwks/remote.createRemoteJWKSet createRemoteJWKSet} this allows the resolver
 * to make use of advanced fetch configurations, HTTP Proxies, retry on network errors, etc.
 *
 * > [!NOTE]\
 * > Known caveat: Expect Type-related issues when passing the inputs through to fetch-like modules,
 * > they hardly ever get their typings inline with actual fetch, you should `@ts-expect-error` them.
 *
 * import ky from 'ky'
 *
 * let logRequest!: (request: Request) => void
 * let logResponse!: (request: Request, response: Response) => void
 * let logRetry!: (request: Request, error: Error, retryCount: number) => void
 *
 * const JWKS = jose.createRemoteJWKSet(url, {
 *   [jose.customFetch]: (...args) =>
 *     ky(args[0], {
 *       ...args[1],
 *       hooks: {
 *         beforeRequest: [
 *           (request) => {
 *             logRequest(request)
 *           },
 *         ],
 *         beforeRetry: [
 *           ({ request, error, retryCount }) => {
 *             logRetry(request, error, retryCount)
 *           },
 *         ],
 *         afterResponse: [
 *           (request, _, response) => {
 *             logResponse(request, response)
 *           },
 *         ],
 *       },
 *     }),
 * })
 * ```
 *
 * import * as undici from 'undici'
 *
 * // see https://undici.nodejs.org/#/docs/api/EnvHttpProxyAgent
 * let envHttpProxyAgent = new undici.EnvHttpProxyAgent()
 *
 * // @ts-ignore
 * const JWKS = jose.createRemoteJWKSet(url, {
 *   [jose.customFetch]: (...args) => {
 *     // @ts-ignore
 *     return undici.fetch(args[0], { ...args[1], dispatcher: envHttpProxyAgent }) // prettier-ignore
 *   },
 * })
 * ```
 *
 * import * as undici from 'undici'
 *
 * // see https://undici.nodejs.org/#/docs/api/RetryAgent
 * let retryAgent = new undici.RetryAgent(new undici.Agent(), {
 *   statusCodes: [],
 *   errorCodes: [
 *     'ECONNRESET',
 *     'ECONNREFUSED',
 *     'ENOTFOUND',
 *     'ENETDOWN',
 *     'ENETUNREACH',
 *     'EHOSTDOWN',
 *     'UND_ERR_SOCKET',
 *   ],
 * })
 *
 * // @ts-ignore
 * const JWKS = jose.createRemoteJWKSet(url, {
 *   [jose.customFetch]: (...args) => {
 *     // @ts-ignore
 *     return undici.fetch(args[0], { ...args[1], dispatcher: retryAgent }) // prettier-ignore
 *   },
 * })
 * ```
 *
 * import * as undici from 'undici'
 *
 * // see https://undici.nodejs.org/#/docs/api/MockAgent
 * let mockAgent = new undici.MockAgent()
 * mockAgent.disableNetConnect()
 *
 * // @ts-ignore
 * const JWKS = jose.createRemoteJWKSet(url, {
 *   [jose.customFetch]: (...args) => {
 *     // @ts-ignore
 *     return undici.fetch(args[0], { ...args[1], dispatcher: mockAgent }) // prettier-ignore
 *   },
 * })
 * ```
 */
export declare const customFetch: unique symbol;
/** See {@link customFetch}. */
export type FetchImplementation = (
/** URL the request is being made sent to {@link !fetch} as the `resource` argument */
url: string, 
/** Options otherwise sent to {@link !fetch} as the `options` argument */
options: {
    /** HTTP Headers */
    headers: Headers;
    /** The {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods request method} */
    method: 'GET';
    /** See {@link !Request.redirect} */
    redirect: 'manual';
    signal: AbortSignal;
}) => Promise<Response>;
/**
 * > [!WARNING]\
 * > This option has security implications that must be understood, assessed for applicability, and
 * > accepted before use. It is critical that the JSON Web Key Set cache only be writable by your own
 * > code.
 *
 * This option is intended for cloud computing runtimes that cannot keep an in memory cache between
 * their code's invocations. Use in runtimes where an in memory cache between requests is available
 * is not desirable.
 *
 * When passed to {@link jwks/remote.createRemoteJWKSet createRemoteJWKSet} this allows the passed in
 * object to:
 *
 * - Serve as an initial value for the JSON Web Key Set that the module would otherwise need to
 *   trigger an HTTP request for
 * - Have the JSON Web Key Set the function optionally ended up triggering an HTTP request for
 *   assigned to it as properties
 *
 * The intended use pattern is:
 *
 * - Before verifying with {@link jwks/remote.createRemoteJWKSet createRemoteJWKSet} you pull the
 *   previously cached object from a low-latency key-value store offered by the cloud computing
 *   runtime it is executed on;
 * - Default to an empty object `{}` instead when there's no previously cached value;
 * - Pass it in as {@link RemoteJWKSetOptions[jwksCache]};
 * - Afterwards, update the key-value storage if the {@link ExportedJWKSCache.uat `uat`} property of
 *   the object has changed.
 *
 * // Prerequisites
 * let url!: URL
 * let jwt!: string
 * let getPreviouslyCachedJWKS!: () => Promise<jose.ExportedJWKSCache>
 * let storeNewJWKScache!: (cache: jose.ExportedJWKSCache) => Promise<void>
 *
 * // Load JSON Web Key Set cache
 * const jwksCache: jose.JWKSCacheInput = (await getPreviouslyCachedJWKS()) || {}
 * const { uat } = jwksCache
 *
 * const JWKS = jose.createRemoteJWKSet(url, {
 *   [jose.jwksCache]: jwksCache,
 * })
 *
 * // Use JSON Web Key Set cache
 * await jose.jwtVerify(jwt, JWKS)
 *
 * if (uat !== jwksCache.uat) {
 *   // Update JSON Web Key Set cache
 *   await storeNewJWKScache(jwksCache)
 * }
 * ```
 */
export declare const jwksCache: unique symbol;
/** Options for the remote JSON Web Key Set. */
export interface RemoteJWKSetOptions {
    /**
     * Timeout (in milliseconds) for the HTTP request. When reached the request will be aborted and
     * the verification will fail. Default is 5000 (5 seconds).
     */
    timeoutDuration?: number;
    /**
     * Duration (in milliseconds) for which no more HTTP requests will be triggered after a previous
     * successful fetch. Default is 30000 (30 seconds).
     */
    cooldownDuration?: number;
    /**
     * Maximum time (in milliseconds) between successful HTTP requests. Default is 600000 (10
     * minutes).
     */
    cacheMaxAge?: number | typeof Infinity;
    /** Headers to be sent with the HTTP request. */
    headers?: Record<string, string>;
    /** See {@link jwksCache}. */
    [jwksCache]?: JWKSCacheInput;
    /** See {@link customFetch}. */
    [customFetch]?: FetchImplementation;
}
/** See {@link jwksCache}. */
export interface ExportedJWKSCache {
    /** Current cached JSON Web Key Set */
    jwks: types.JSONWebKeySet;
    /** Last updated at timestamp (seconds since epoch) */
    uat: number;
}
/** See {@link jwksCache}. */
export type JWKSCacheInput = ExportedJWKSCache | Record<string, never>;
/**
 * Returns a function that resolves a JWS JOSE Header to a public key object downloaded from a
 * remote endpoint returning a JSON Web Key Set, that is, for example, an OAuth 2.0 or OIDC
 * jwks_uri. The JSON Web Key Set is fetched when no key matches the selection process but only as
 * frequently as the `cooldownDuration` option allows to prevent abuse.
 *
 * It uses the "alg" (JWS Algorithm) Header Parameter to determine the right JWK "kty" (Key Type),
 * then proceeds to match the JWK "kid" (Key ID) with one found in the JWS Header Parameters (if
 * there is one) while also respecting the JWK "use" (Public Key Use) and JWK "key_ops" (Key
 * Operations) Parameters (if they are present on the JWK).
 *
 * Only a single public key must match the selection process. As shown in the example below when
 * multiple keys get matched it is possible to opt-in to iterate over the matched keys and attempt
 * verification in an iterative manner.
 *
 * > [!NOTE]\
 * > The function's purpose is to resolve public keys used for verifying signatures and will not work
 * > for public encryption keys.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwks/remote'`.
 *
 * @param url URL to fetch the JSON Web Key Set from.
 * @param options Options for the remote JSON Web Key Set.
 */
export declare function createRemoteJWKSet(url: URL, options?: RemoteJWKSetOptions): {
    (protectedHeader?: types.JWSHeaderParameters, token?: types.FlattenedJWSInput): Promise<types.CryptoKey>;
    /** @ignore */
    coolingDown: boolean;
    /** @ignore */
    fresh: boolean;
    /** @ignore */
    reloading: boolean;
    /** @ignore */
    reload: () => Promise<void>;
    /** @ignore */
    jwks: () => types.JSONWebKeySet | undefined;
};
