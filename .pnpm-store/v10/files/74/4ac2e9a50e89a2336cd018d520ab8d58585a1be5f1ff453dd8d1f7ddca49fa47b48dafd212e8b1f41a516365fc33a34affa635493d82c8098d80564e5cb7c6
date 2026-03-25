import type { KeyLike, JWSHeaderParameters, FlattenedJWSInput } from '../types';
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
    /**
     * An instance of {@link https://nodejs.org/api/http.html#class-httpagent http.Agent} or
     * {@link https://nodejs.org/api/https.html#class-httpsagent https.Agent} to pass to the
     * {@link https://nodejs.org/api/http.html#httpgetoptions-callback http.get} or
     * {@link https://nodejs.org/api/https.html#httpsgetoptions-callback https.get} method's options.
     * Use when behind an http(s) proxy. This is a Node.js runtime specific option, it is ignored when
     * used outside of Node.js runtime.
     */
    agent?: any;
    /** Optional headers to be sent with the HTTP request. */
    headers?: Record<string, string>;
}
/**
 * Returns a function that resolves to a key object downloaded from a remote endpoint returning a
 * JSON Web Key Set, that is, for example, an OAuth 2.0 or OIDC jwks_uri. The JSON Web Key Set is
 * fetched when no key matches the selection process but only as frequently as the
 * `cooldownDuration` option allows to prevent abuse.
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
 * @param url URL to fetch the JSON Web Key Set from.
 * @param options Options for the remote JSON Web Key Set.
 */
export declare function createRemoteJWKSet<T extends KeyLike = KeyLike>(url: URL, options?: RemoteJWKSetOptions): (protectedHeader?: JWSHeaderParameters, token?: FlattenedJWSInput) => Promise<T>;
