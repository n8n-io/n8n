/**
 * @ignore
 */
export type CryptoKey = Extract<Awaited<ReturnType<typeof crypto.subtle.generateKey>>, {
    type: string;
}>;
export interface CryptoKeyPair {
    privateKey: CryptoKey;
    publicKey: CryptoKey;
}
/**
 * JSON Object
 */
export type JsonObject = {
    [Key in string]?: JsonValue;
};
/**
 * JSON Array
 */
export type JsonArray = JsonValue[];
/**
 * JSON Primitives
 */
export type JsonPrimitive = string | number | boolean | null;
/**
 * JSON Values
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface ModifyAssertionFunction {
    (
    /**
     * JWS Header to modify right before it is signed.
     */
    header: Record<string, JsonValue | undefined>, 
    /**
     * JWT Claims Set to modify right before it is signed.
     */
    payload: Record<string, JsonValue | undefined>): void;
}
/**
 * Interface to pass an asymmetric private key and, optionally, its associated JWK Key ID to be
 * added as a `kid` JOSE Header Parameter.
 */
export interface PrivateKey {
    /**
     * An asymmetric private CryptoKey.
     *
     * Its algorithm must be compatible with a supported {@link JWSAlgorithm JWS Algorithm}.
     */
    key: CryptoKey;
    /**
     * JWK Key ID to add to JOSE headers when this key is used. When not provided no `kid` (JWK Key
     * ID) will be added to the JOSE Header.
     */
    kid?: string;
}
/**
 * JWS `alg` Algorithm identifiers from the
 * {@link https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms JSON Web Signature and Encryption Algorithms IANA registry}
 * for which Digital Signature validation is implemented.
 */
export type JWSAlgorithm = 'PS256' | 'ES256' | 'RS256' | 'Ed25519' | 'ES384' | 'PS384' | 'RS384' | 'ES512' | 'PS512' | 'RS512' | 'EdDSA';
export interface JWK {
    readonly kty?: string;
    readonly kid?: string;
    readonly alg?: string;
    readonly use?: string;
    readonly key_ops?: string[];
    readonly e?: string;
    readonly n?: string;
    readonly crv?: string;
    readonly x?: string;
    readonly y?: string;
    readonly [parameter: string]: JsonValue | undefined;
}
/**
 * By default the module only allows interactions with HTTPS endpoints. Setting this option to
 * `true` removes that restriction.
 *
 * @deprecated To make it stand out as something you shouldn't use, possibly only for local
 *   development and testing against non-TLS secured environments.
 */
export declare const allowInsecureRequests: unique symbol;
/**
 * Use to adjust the assumed current time. Positive and negative finite values representing seconds
 * are allowed. Default is `0` (Date.now() + 0 seconds is used).
 *
 * @example
 *
 * When the local clock is mistakenly 1 hour in the past
 *
 * ```ts
 * let client: oauth.Client = {
 *   client_id: 'abc4ba37-4ab8-49b5-99d4-9441ba35d428',
 *   // ... other metadata
 *   [oauth.clockSkew]: +(60 * 60),
 * }
 * ```
 *
 * @example
 *
 * When the local clock is mistakenly 1 hour in the future
 *
 * ```ts
 * let client: oauth.Client = {
 *   client_id: 'abc4ba37-4ab8-49b5-99d4-9441ba35d428',
 *   // ... other metadata
 *   [oauth.clockSkew]: -(60 * 60),
 * }
 * ```
 */
export declare const clockSkew: unique symbol;
/**
 * Use to set allowed clock tolerance when checking DateTime JWT Claims. Only positive finite values
 * representing seconds are allowed. Default is `30` (30 seconds).
 *
 * @example
 *
 * Tolerate 30 seconds clock skew when validating JWT claims like exp or nbf.
 *
 * ```ts
 * let client: oauth.Client = {
 *   client_id: 'abc4ba37-4ab8-49b5-99d4-9441ba35d428',
 *   // ... other metadata
 *   [oauth.clockTolerance]: 30,
 * }
 * ```
 */
export declare const clockTolerance: unique symbol;
/**
 * When configured on an interface that extends {@link HttpRequestOptions}, this applies to `options`
 * parameter for functions that may trigger HTTP requests, this replaces the use of global fetch. As
 * a fetch replacement the arguments and expected return are the same as fetch.
 *
 * In theory any module that claims to be compatible with the Fetch API can be used but your mileage
 * may vary. No workarounds to allow use of non-conform {@link !Response}s will be considered.
 *
 * If you only need to update the {@link !Request} properties you do not need to use a Fetch API
 * module, just change what you need and pass it to globalThis.fetch just like this module would
 * normally do.
 *
 * Its intended use cases are:
 *
 * - {@link !Request}/{@link !Response} tracing and logging
 * - Custom caching strategies for responses of Authorization Server Metadata and JSON Web Key Set
 *   (JWKS) endpoints
 * - Changing the {@link !Request} properties like headers, body, credentials, mode before it is passed
 *   to fetch
 *
 * Known caveats:
 *
 * - Expect Type-related issues when passing the inputs through to fetch-like modules, they hardly
 *   ever get their typings inline with actual fetch, you should `@ts-expect-error` them.
 * - Returning self-constructed {@link !Response} instances prohibits AS/RS-signalled DPoP Nonce
 *   caching.
 *
 * @example
 *
 * Using [sindresorhus/ky](https://github.com/sindresorhus/ky) for retries and its hooks feature for
 * logging outgoing requests and their responses.
 *
 * ```js
 * import ky from 'ky'
 *
 * // example use
 * await oauth.discoveryRequest(new URL('https://as.example.com'), {
 *   [oauth.customFetch]: (...args) =>
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
 * @example
 *
 * Using [nodejs/undici](https://github.com/nodejs/undici) to detect and use HTTP proxies.
 *
 * ```ts
 * import * as undici from 'undici'
 *
 * // see https://undici.nodejs.org/#/docs/api/EnvHttpProxyAgent
 * let envHttpProxyAgent = new undici.EnvHttpProxyAgent()
 *
 * // example use
 * await oauth.discoveryRequest(new URL('https://as.example.com'), {
 *   // @ts-ignore
 *   [oauth.customFetch](...args) {
 *     return undici.fetch(args[0], { ...args[1], dispatcher: envHttpProxyAgent }) // prettier-ignore
 *   },
 * })
 * ```
 *
 * @example
 *
 * Using [nodejs/undici](https://github.com/nodejs/undici) to automatically retry network errors.
 *
 * ```ts
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
 * // example use
 * await oauth.discoveryRequest(new URL('https://as.example.com'), {
 *   // @ts-ignore
 *   [oauth.customFetch](...args) {
 *     return undici.fetch(args[0], { ...args[1], dispatcher: retryAgent }) // prettier-ignore
 *   },
 * })
 * ```
 *
 * @example
 *
 * Using [nodejs/undici](https://github.com/nodejs/undici) to mock responses in tests.
 *
 * ```ts
 * import * as undici from 'undici'
 *
 * // see https://undici.nodejs.org/#/docs/api/MockAgent
 * let mockAgent = new undici.MockAgent()
 * mockAgent.disableNetConnect()
 *
 * // example use
 * await oauth.discoveryRequest(new URL('https://as.example.com'), {
 *   // @ts-ignore
 *   [oauth.customFetch](...args) {
 *     return undici.fetch(args[0], { ...args[1], dispatcher: mockAgent }) // prettier-ignore
 *   },
 * })
 * ```
 */
export declare const customFetch: unique symbol;
/**
 * Use to mutate JWT header and payload before they are signed. Its intended use is working around
 * non-conform server behaviours, such as modifying JWT "aud" (audience) claims, or otherwise
 * changing fixed claims used by this library.
 *
 * @example
 *
 * Changing the `alg: "Ed25519"` back to `alg: "EdDSA"`
 *
 * ```ts
 * let as!: oauth.AuthorizationServer
 * let client!: oauth.Client
 * let parameters!: URLSearchParams
 * let key!: oauth.CryptoKey | oauth.PrivateKey
 * let keyPair!: oauth.CryptoKeyPair
 *
 * let remapEd25519: oauth.ModifyAssertionOptions = {
 *   [oauth.modifyAssertion]: (header, _payload) => {
 *     if (header.alg === 'Ed25519') {
 *       header.alg = 'EdDSA'
 *     }
 *   },
 * }
 *
 * // For JAR
 * oauth.issueRequestObject(as, client, parameters, key, remapEd25519)
 *
 * // For Private Key JWT
 * oauth.PrivateKeyJwt(key, remapEd25519)
 *
 * // For DPoP
 * oauth.DPoP(client, keyPair, remapEd25519)
 * ```
 */
export declare const modifyAssertion: unique symbol;
/**
 * Use to add support for decrypting JWEs the client encounters, namely
 *
 * - Encrypted ID Tokens returned by the Token Endpoint
 * - Encrypted ID Tokens returned as part of FAPI 1.0 Advanced Detached Signature authorization
 *   responses
 * - Encrypted JWT UserInfo responses
 * - Encrypted JWT Introspection responses
 * - Encrypted JARM Responses
 *
 * @example
 *
 * Decrypting JARM responses
 *
 * ```ts
 * import * as jose from 'jose'
 *
 * let as!: oauth.AuthorizationServer
 * let client!: oauth.Client
 * let key!: oauth.CryptoKey
 * let alg!: string
 * let enc!: string
 * let currentUrl!: URL
 * let state!: string | undefined
 *
 * let decoder = new TextDecoder()
 * let jweDecrypt: oauth.JweDecryptFunction = async (jwe) => {
 *   const { plaintext } = await jose
 *     .compactDecrypt(jwe, key, {
 *       keyManagementAlgorithms: [alg],
 *       contentEncryptionAlgorithms: [enc],
 *     })
 *     .catch((cause: unknown) => {
 *       throw new oauth.OperationProcessingError('decryption failed', { cause })
 *     })
 *
 *   return decoder.decode(plaintext)
 * }
 *
 * let params = await oauth.validateJwtAuthResponse(as, client, currentUrl, state, {
 *   [oauth.jweDecrypt]: jweDecrypt,
 * })
 * ```
 */
export declare const jweDecrypt: unique symbol;
/**
 * DANGER ZONE - This option has security implications that must be understood, assessed for
 * applicability, and accepted before use. It is critical that the JSON Web Key Set cache only be
 * writable by your own code.
 *
 * This option is intended for cloud computing runtimes that cannot keep an in memory cache between
 * their code's invocations. Use in runtimes where an in memory cache between requests is available
 * is not desirable.
 *
 * When configured on an interface that extends {@link JWKSCacheOptions}, this applies to `options`
 * parameter for functions that may trigger HTTP requests to
 * {@link AuthorizationServer.jwks_uri `as.jwks_uri`}, this allows the passed in object to:
 *
 * - Serve as an initial value for the JSON Web Key Set that the module would otherwise need to
 *   trigger an HTTP request for
 * - Have the JSON Web Key Set the function optionally ended up triggering an HTTP request for
 *   assigned to it as properties
 *
 * The intended use pattern is:
 *
 * - Before executing a function with {@link JWKSCacheOptions} in its `options` parameter you pull the
 *   previously cached object from a low-latency key-value store offered by the cloud computing
 *   runtime it is executed on;
 * - Default to an empty object `{}` instead when there's no previously cached value;
 * - Pass it into the options interfaces that extend {@link JWKSCacheOptions};
 * - Afterwards, update the key-value storage if the {@link ExportedJWKSCache.uat `uat`} property of
 *   the object has changed.
 *
 * @example
 *
 * ```ts
 * let as!: oauth.AuthorizationServer
 * let request!: Request
 * let expectedAudience!: string
 * let getPreviouslyCachedJWKS!: () => Promise<oauth.ExportedJWKSCache>
 * let storeNewJWKScache!: (cache: oauth.ExportedJWKSCache) => Promise<void>
 *
 * // Load JSON Web Key Set cache
 * let jwksCache: oauth.JWKSCacheInput = (await getPreviouslyCachedJWKS()) || {}
 * let { uat } = jwksCache
 *
 * // Use JSON Web Key Set cache
 * let accessTokenClaims = await oauth.validateJwtAccessToken(as, request, expectedAudience, {
 *   [oauth.jwksCache]: jwksCache,
 * })
 *
 * if (uat !== jwksCache.uat) {
 *   // Update JSON Web Key Set cache
 *   await storeNewJWKScache(jwksCache)
 * }
 * ```
 */
export declare const jwksCache: unique symbol;
/**
 * Authorization Server Metadata
 *
 * @group Authorization Server Metadata
 *
 * @see [IANA OAuth Authorization Server Metadata registry](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#authorization-server-metadata)
 */
export interface AuthorizationServer {
    /**
     * Authorization server's Issuer Identifier URL.
     */
    readonly issuer: string;
    /**
     * URL of the authorization server's authorization endpoint.
     */
    readonly authorization_endpoint?: string;
    /**
     * URL of the authorization server's token endpoint.
     */
    readonly token_endpoint?: string;
    /**
     * URL of the authorization server's JWK Set document.
     */
    readonly jwks_uri?: string;
    /**
     * URL of the authorization server's Dynamic Client Registration Endpoint.
     */
    readonly registration_endpoint?: string;
    /**
     * JSON array containing a list of the `scope` values that this authorization server supports.
     */
    readonly scopes_supported?: string[];
    /**
     * JSON array containing a list of the `response_type` values that this authorization server
     * supports.
     */
    readonly response_types_supported?: string[];
    /**
     * JSON array containing a list of the `response_mode` values that this authorization server
     * supports.
     */
    readonly response_modes_supported?: string[];
    /**
     * JSON array containing a list of the `grant_type` values that this authorization server
     * supports.
     */
    readonly grant_types_supported?: string[];
    /**
     * JSON array containing a list of client authentication methods supported by this token endpoint.
     */
    readonly token_endpoint_auth_methods_supported?: string[];
    /**
     * JSON array containing a list of the JWS signing algorithms supported by the token endpoint for
     * the signature on the JWT used to authenticate the client at the token endpoint.
     */
    readonly token_endpoint_auth_signing_alg_values_supported?: string[];
    /**
     * URL of a page containing human-readable information that developers might want or need to know
     * when using the authorization server.
     */
    readonly service_documentation?: string;
    /**
     * Languages and scripts supported for the user interface, represented as a JSON array of language
     * tag values from RFC 5646.
     */
    readonly ui_locales_supported?: string[];
    /**
     * URL that the authorization server provides to the person registering the client to read about
     * the authorization server's requirements on how the client can use the data provided by the
     * authorization server.
     */
    readonly op_policy_uri?: string;
    /**
     * URL that the authorization server provides to the person registering the client to read about
     * the authorization server's terms of service.
     */
    readonly op_tos_uri?: string;
    /**
     * URL of the authorization server's revocation endpoint.
     */
    readonly revocation_endpoint?: string;
    /**
     * JSON array containing a list of client authentication methods supported by this revocation
     * endpoint.
     */
    readonly revocation_endpoint_auth_methods_supported?: string[];
    /**
     * JSON array containing a list of the JWS signing algorithms supported by the revocation endpoint
     * for the signature on the JWT used to authenticate the client at the revocation endpoint.
     */
    readonly revocation_endpoint_auth_signing_alg_values_supported?: string[];
    /**
     * URL of the authorization server's introspection endpoint.
     */
    readonly introspection_endpoint?: string;
    /**
     * JSON array containing a list of client authentication methods supported by this introspection
     * endpoint.
     */
    readonly introspection_endpoint_auth_methods_supported?: string[];
    /**
     * JSON array containing a list of the JWS signing algorithms supported by the introspection
     * endpoint for the signature on the JWT used to authenticate the client at the introspection
     * endpoint.
     */
    readonly introspection_endpoint_auth_signing_alg_values_supported?: string[];
    /**
     * PKCE code challenge methods supported by this authorization server.
     */
    readonly code_challenge_methods_supported?: string[];
    /**
     * Signed JWT containing metadata values about the authorization server as claims.
     */
    readonly signed_metadata?: string;
    /**
     * URL of the authorization server's device authorization endpoint.
     */
    readonly device_authorization_endpoint?: string;
    /**
     * Indicates authorization server support for mutual-TLS client certificate-bound access tokens.
     */
    readonly tls_client_certificate_bound_access_tokens?: boolean;
    /**
     * JSON object containing alternative authorization server endpoints, which a client intending to
     * do mutual TLS will use in preference to the conventional endpoints.
     */
    readonly mtls_endpoint_aliases?: MTLSEndpointAliases;
    /**
     * URL of the authorization server's UserInfo Endpoint.
     */
    readonly userinfo_endpoint?: string;
    /**
     * JSON array containing a list of the Authentication Context Class References that this
     * authorization server supports.
     */
    readonly acr_values_supported?: string[];
    /**
     * JSON array containing a list of the Subject Identifier types that this authorization server
     * supports.
     */
    readonly subject_types_supported?: string[];
    /**
     * JSON array containing a list of the JWS `alg` values supported by the authorization server for
     * the ID Token.
     */
    readonly id_token_signing_alg_values_supported?: string[];
    /**
     * JSON array containing a list of the JWE `alg` values supported by the authorization server for
     * the ID Token.
     */
    readonly id_token_encryption_alg_values_supported?: string[];
    /**
     * JSON array containing a list of the JWE `enc` values supported by the authorization server for
     * the ID Token.
     */
    readonly id_token_encryption_enc_values_supported?: string[];
    /**
     * JSON array containing a list of the JWS `alg` values supported by the UserInfo Endpoint.
     */
    readonly userinfo_signing_alg_values_supported?: string[];
    /**
     * JSON array containing a list of the JWE `alg` values supported by the UserInfo Endpoint.
     */
    readonly userinfo_encryption_alg_values_supported?: string[];
    /**
     * JSON array containing a list of the JWE `enc` values supported by the UserInfo Endpoint.
     */
    readonly userinfo_encryption_enc_values_supported?: string[];
    /**
     * JSON array containing a list of the JWS `alg` values supported by the authorization server for
     * Request Objects.
     */
    readonly request_object_signing_alg_values_supported?: string[];
    /**
     * JSON array containing a list of the JWE `alg` values supported by the authorization server for
     * Request Objects.
     */
    readonly request_object_encryption_alg_values_supported?: string[];
    /**
     * JSON array containing a list of the JWE `enc` values supported by the authorization server for
     * Request Objects.
     */
    readonly request_object_encryption_enc_values_supported?: string[];
    /**
     * JSON array containing a list of the `display` parameter values that the authorization server
     * supports.
     */
    readonly display_values_supported?: string[];
    /**
     * JSON array containing a list of the Claim Types that the authorization server supports.
     */
    readonly claim_types_supported?: string[];
    /**
     * JSON array containing a list of the Claim Names of the Claims that the authorization server MAY
     * be able to supply values for.
     */
    readonly claims_supported?: string[];
    /**
     * Languages and scripts supported for values in Claims being returned, represented as a JSON
     * array of RFC 5646 language tag values.
     */
    readonly claims_locales_supported?: string[];
    /**
     * Boolean value specifying whether the authorization server supports use of the `claims`
     * parameter.
     */
    readonly claims_parameter_supported?: boolean;
    /**
     * Boolean value specifying whether the authorization server supports use of the `request`
     * parameter.
     */
    readonly request_parameter_supported?: boolean;
    /**
     * Boolean value specifying whether the authorization server supports use of the `request_uri`
     * parameter.
     */
    readonly request_uri_parameter_supported?: boolean;
    /**
     * Boolean value specifying whether the authorization server requires any `request_uri` values
     * used to be pre-registered.
     */
    readonly require_request_uri_registration?: boolean;
    /**
     * Indicates where authorization request needs to be protected as Request Object and provided
     * through either `request` or `request_uri` parameter.
     */
    readonly require_signed_request_object?: boolean;
    /**
     * URL of the authorization server's pushed authorization request endpoint.
     */
    readonly pushed_authorization_request_endpoint?: string;
    /**
     * Indicates whether the authorization server accepts authorization requests only via PAR.
     */
    readonly require_pushed_authorization_requests?: boolean;
    /**
     * JSON array containing a list of algorithms supported by the authorization server for
     * introspection response signing.
     */
    readonly introspection_signing_alg_values_supported?: string[];
    /**
     * JSON array containing a list of algorithms supported by the authorization server for
     * introspection response content key encryption (`alg` value).
     */
    readonly introspection_encryption_alg_values_supported?: string[];
    /**
     * JSON array containing a list of algorithms supported by the authorization server for
     * introspection response content encryption (`enc` value).
     */
    readonly introspection_encryption_enc_values_supported?: string[];
    /**
     * Boolean value indicating whether the authorization server provides the `iss` parameter in the
     * authorization response.
     */
    readonly authorization_response_iss_parameter_supported?: boolean;
    /**
     * JSON array containing a list of algorithms supported by the authorization server for
     * introspection response signing.
     */
    readonly authorization_signing_alg_values_supported?: string[];
    /**
     * JSON array containing a list of algorithms supported by the authorization server for
     * introspection response encryption (`alg` value).
     */
    readonly authorization_encryption_alg_values_supported?: string[];
    /**
     * JSON array containing a list of algorithms supported by the authorization server for
     * introspection response encryption (`enc` value).
     */
    readonly authorization_encryption_enc_values_supported?: string[];
    /**
     * CIBA Backchannel Authentication Endpoint.
     */
    readonly backchannel_authentication_endpoint?: string;
    /**
     * JSON array containing a list of the JWS signing algorithms supported for validation of signed
     * CIBA authentication requests.
     */
    readonly backchannel_authentication_request_signing_alg_values_supported?: string[];
    /**
     * Supported CIBA authentication result delivery modes.
     */
    readonly backchannel_token_delivery_modes_supported?: string[];
    /**
     * Indicates whether the authorization server supports the use of the CIBA `user_code` parameter.
     */
    readonly backchannel_user_code_parameter_supported?: boolean;
    /**
     * URL of an authorization server iframe that supports cross-origin communications for session
     * state information with the RP Client, using the HTML5 postMessage API.
     */
    readonly check_session_iframe?: string;
    /**
     * JSON array containing a list of the JWS algorithms supported for DPoP Proof JWTs.
     */
    readonly dpop_signing_alg_values_supported?: string[];
    /**
     * URL at the authorization server to which an RP can perform a redirect to request that the
     * End-User be logged out at the authorization server.
     */
    readonly end_session_endpoint?: string;
    /**
     * Boolean value specifying whether the authorization server can pass `iss` (issuer) and `sid`
     * (session ID) query parameters to identify the RP session with the authorization server when the
     * `frontchannel_logout_uri` is used.
     */
    readonly frontchannel_logout_session_supported?: boolean;
    /**
     * Boolean value specifying whether the authorization server supports HTTP-based logout.
     */
    readonly frontchannel_logout_supported?: boolean;
    /**
     * Boolean value specifying whether the authorization server can pass a `sid` (session ID) Claim
     * in the Logout Token to identify the RP session with the OP.
     */
    readonly backchannel_logout_session_supported?: boolean;
    /**
     * Boolean value specifying whether the authorization server supports back-channel logout.
     */
    readonly backchannel_logout_supported?: boolean;
    /**
     * JSON array containing a list of resource identifiers for OAuth protected resources.
     */
    readonly protected_resources?: string[];
    readonly [metadata: string]: JsonValue | undefined;
}
export interface MTLSEndpointAliases extends Pick<AuthorizationServer, 'backchannel_authentication_endpoint' | 'device_authorization_endpoint' | 'introspection_endpoint' | 'pushed_authorization_request_endpoint' | 'revocation_endpoint' | 'token_endpoint' | 'userinfo_endpoint'> {
    readonly [metadata: string]: string | undefined;
}
/**
 * Recognized Client Metadata that have an effect on the exposed functionality.
 *
 * @see [IANA OAuth Client Registration Metadata registry](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#client-metadata)
 */
export interface Client {
    /**
     * Client identifier.
     */
    client_id: string;
    /**
     * JWS `alg` algorithm required for signing the ID Token issued to this Client. When not
     * configured the default is to allow only algorithms listed in
     * {@link AuthorizationServer.id_token_signing_alg_values_supported `as.id_token_signing_alg_values_supported`}
     * and fall back to `RS256` when the authorization server metadata is not set.
     */
    id_token_signed_response_alg?: string;
    /**
     * JWS `alg` algorithm required for signing authorization responses. When not configured the
     * default is to allow only algorithms listed in
     * {@link AuthorizationServer.authorization_signing_alg_values_supported `as.authorization_signing_alg_values_supported`}
     * and fall back to `RS256` when the authorization server metadata is not set.
     */
    authorization_signed_response_alg?: string;
    /**
     * Boolean value specifying whether the {@link IDToken.auth_time `auth_time`} Claim in the ID Token
     * is REQUIRED. Default is `false`.
     */
    require_auth_time?: boolean;
    /**
     * JWS `alg` algorithm REQUIRED for signing UserInfo Responses. When not configured the default is
     * to allow only algorithms listed in
     * {@link AuthorizationServer.userinfo_signing_alg_values_supported `as.userinfo_signing_alg_values_supported`}
     * and fail otherwise.
     */
    userinfo_signed_response_alg?: string;
    /**
     * JWS `alg` algorithm REQUIRED for signed introspection responses. When not configured the
     * default is to allow only algorithms listed in
     * {@link AuthorizationServer.introspection_signing_alg_values_supported `as.introspection_signing_alg_values_supported`}
     * and fall back to `RS256` when the authorization server metadata is not set.
     */
    introspection_signed_response_alg?: string;
    /**
     * Default Maximum Authentication Age.
     */
    default_max_age?: number;
    /**
     * Indicates the requirement for a client to use mutual TLS endpoint aliases defined by the AS
     * where present. Default is `false`.
     *
     * When combined with {@link customFetch} (to use a Fetch API implementation that supports client
     * certificates) this can be used to target security profiles that utilize Mutual-TLS for either
     * client authentication or sender constraining.
     *
     * @example
     *
     * (Node.js) Using [nodejs/undici](https://github.com/nodejs/undici) for Mutual-TLS Client
     * Authentication and Certificate-Bound Access Tokens support.
     *
     * ```ts
     * import * as undici from 'undici'
     *
     * let as!: oauth.AuthorizationServer
     * let client!: oauth.Client & { use_mtls_endpoint_aliases: true }
     * let params!: URLSearchParams
     * let key!: string // PEM-encoded key
     * let cert!: string // PEM-encoded certificate
     *
     * let clientAuth = oauth.TlsClientAuth()
     * let agent = new undici.Agent({ connect: { key, cert } })
     *
     * let response = await oauth.pushedAuthorizationRequest(as, client, clientAuth, params, {
     *   // @ts-ignore
     *   [oauth.customFetch]: (...args) =>
     *     undici.fetch(args[0], { ...args[1], dispatcher: agent }),
     * })
     * ```
     *
     * @example
     *
     * (Deno) Using Deno.createHttpClient API for Mutual-TLS Client Authentication and
     * Certificate-Bound Access Tokens support.
     *
     * ```ts
     * let as!: oauth.AuthorizationServer
     * let client!: oauth.Client & { use_mtls_endpoint_aliases: true }
     * let params!: URLSearchParams
     * let key!: string // PEM-encoded key
     * let cert!: string // PEM-encoded certificate
     *
     * let clientAuth = oauth.TlsClientAuth()
     * // @ts-ignore
     * let agent = Deno.createHttpClient({ key, cert })
     *
     * let response = await oauth.pushedAuthorizationRequest(as, client, clientAuth, params, {
     *   // @ts-ignore
     *   [oauth.customFetch]: (...args) => fetch(args[0], { ...args[1], client: agent }),
     * })
     * ```
     *
     * @see [RFC 8705 - OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens](https://www.rfc-editor.org/rfc/rfc8705.html)
     */
    use_mtls_endpoint_aliases?: boolean;
    /**
     * See {@link clockSkew}.
     */
    [clockSkew]?: number;
    /**
     * See {@link clockTolerance}.
     */
    [clockTolerance]?: number;
    [metadata: string]: JsonValue | undefined;
}
/**
 * @group Errors
 */
export declare class UnsupportedOperationError extends Error {
    code: string;
    /**
     * @ignore
     */
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 * @group Errors
 */
export declare class OperationProcessingError extends Error {
    code?: string;
    /**
     * @ignore
     */
    constructor(message: string, options?: {
        cause?: unknown;
        code?: string;
    });
}
export interface JWKSCacheOptions {
    /**
     * See {@link jwksCache}.
     */
    [jwksCache]?: JWKSCacheInput;
}
export interface CustomFetchOptions<Method, BodyType = undefined> {
    /**
     * The request body content to send to the server
     */
    body: BodyType;
    /**
     * HTTP Headers
     */
    headers: Record<string, string>;
    /**
     * The {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods request method}
     */
    method: Method;
    /**
     * See {@link !Request.redirect}
     */
    redirect: 'manual';
    /**
     * Depending on whether {@link HttpRequestOptions.signal} was used, if so, it is the value passed,
     * otherwise undefined
     */
    signal?: AbortSignal;
}
export interface HttpRequestOptions<Method, BodyType = undefined> {
    /**
     * An AbortSignal instance, or a factory returning one, to abort the HTTP request(s) triggered by
     * this function's invocation.
     *
     * @example
     *
     * A 5000ms timeout AbortSignal for every request
     *
     * ```js
     * let signal = () => AbortSignal.timeout(5_000) // Note: AbortSignal.timeout may not yet be available in all runtimes.
     * ```
     */
    signal?: (() => AbortSignal) | AbortSignal;
    /**
     * Headers to additionally send with the HTTP request(s) triggered by this function's invocation.
     */
    headers?: [string, string][] | Record<string, string> | Headers;
    /**
     * See {@link customFetch}.
     */
    [customFetch]?: (
    /**
     * URL the request is being made sent to {@link !fetch} as the `resource` argument
     */
    url: string, 
    /**
     * Options otherwise sent to {@link !fetch} as the `options` argument
     */
    options: CustomFetchOptions<Method, BodyType>) => Promise<Response>;
    /**
     * See {@link allowInsecureRequests}.
     *
     * @deprecated
     */
    [allowInsecureRequests]?: boolean;
}
export interface DiscoveryRequestOptions extends HttpRequestOptions<'GET'> {
    /**
     * The issuer transformation algorithm to use.
     */
    algorithm?: 'oidc' | 'oauth2';
}
/**
 * Performs an authorization server metadata discovery using one of two
 * {@link DiscoveryRequestOptions.algorithm transformation algorithms} applied to the
 * `issuerIdentifier` argument.
 *
 * - `oidc` (default) as defined by OpenID Connect Discovery 1.0.
 * - `oauth2` as defined by RFC 8414.
 *
 * @param issuerIdentifier Issuer Identifier to resolve the well-known discovery URI for.
 *
 * @returns Resolves with a {@link !Response} to then invoke {@link processDiscoveryResponse} with
 *
 * @group Authorization Server Metadata
 * @group OpenID Connect (OIDC) Discovery
 *
 * @see [RFC 8414 - OAuth 2.0 Authorization Server Metadata](https://www.rfc-editor.org/rfc/rfc8414.html#section-3)
 * @see [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0-errata2.html#ProviderConfig)
 */
export declare function discoveryRequest(issuerIdentifier: URL, options?: DiscoveryRequestOptions): Promise<Response>;
/**
 * Validates {@link !Response} instance to be one coming from the authorization server's well-known
 * discovery endpoint.
 *
 * @param expectedIssuerIdentifier Expected Issuer Identifier value.
 * @param response Resolved value from {@link discoveryRequest}.
 *
 * @returns Resolves with the discovered Authorization Server Metadata.
 *
 * @group Authorization Server Metadata
 * @group OpenID Connect (OIDC) Discovery
 *
 * @see [RFC 8414 - OAuth 2.0 Authorization Server Metadata](https://www.rfc-editor.org/rfc/rfc8414.html#section-3)
 * @see [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0-errata2.html#ProviderConfig)
 */
export declare function processDiscoveryResponse(expectedIssuerIdentifier: URL, response: Response): Promise<AuthorizationServer>;
/**
 * Generate random `code_verifier` value.
 *
 * @group Utilities
 * @group Authorization Code Grant
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 * @group Proof Key for Code Exchange (PKCE)
 *
 * @see [RFC 7636 - Proof Key for Code Exchange (PKCE)](https://www.rfc-editor.org/rfc/rfc7636.html#section-4)
 */
export declare function generateRandomCodeVerifier(): string;
/**
 * Generate random `state` value.
 *
 * @group Utilities
 *
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.1)
 */
export declare function generateRandomState(): string;
/**
 * Generate random `nonce` value.
 *
 * @group Utilities
 *
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#IDToken)
 */
export declare function generateRandomNonce(): string;
/**
 * Calculates the PKCE `code_challenge` value to send with an authorization request using the S256
 * PKCE Code Challenge Method transformation.
 *
 * @param codeVerifier `code_verifier` value generated e.g. from {@link generateRandomCodeVerifier}.
 *
 * @group Authorization Code Grant
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 * @group Proof Key for Code Exchange (PKCE)
 *
 * @see [RFC 7636 - Proof Key for Code Exchange (PKCE)](https://www.rfc-editor.org/rfc/rfc7636.html#section-4)
 */
export declare function calculatePKCECodeChallenge(codeVerifier: string): Promise<string>;
export interface DPoPRequestOptions {
    /**
     * DPoP handle, obtained from {@link DPoP}
     */
    DPoP?: DPoPHandle;
}
export interface PushedAuthorizationRequestOptions extends HttpRequestOptions<'POST', URLSearchParams>, DPoPRequestOptions {
}
/**
 * Implementation of the Client's Authentication Method at the Authorization Server.
 *
 * @see {@link ClientSecretPost}
 * @see {@link ClientSecretBasic}
 * @see {@link PrivateKeyJwt}
 * @see {@link None}
 * @see {@link TlsClientAuth}
 * @see [OAuth Token Endpoint Authentication Methods](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method)
 */
export type ClientAuth = (as: AuthorizationServer, client: Client, body: URLSearchParams, headers: Headers) => void | Promise<void>;
/**
 * **`client_secret_post`** uses the HTTP request body to send `client_id` and `client_secret` as
 * `application/x-www-form-urlencoded` body parameters
 *
 * @example
 *
 * ```ts
 * let clientSecret!: string
 *
 * let clientAuth = oauth.ClientSecretPost(clientSecret)
 * ```
 *
 * @param clientSecret
 *
 * @group Client Authentication
 *
 * @see [OAuth Token Endpoint Authentication Methods](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method)
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-2.3)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#ClientAuthentication)
 */
export declare function ClientSecretPost(clientSecret: string): ClientAuth;
/**
 * **`client_secret_basic`** uses the HTTP `Basic` authentication scheme to send `client_id` and
 * `client_secret` in an `Authorization` HTTP Header.
 *
 * @example
 *
 * ```ts
 * let clientSecret!: string
 *
 * let clientAuth = oauth.ClientSecretBasic(clientSecret)
 * ```
 *
 * @param clientSecret
 *
 * @group Client Authentication
 *
 * @see [OAuth Token Endpoint Authentication Methods](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method)
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-2.3)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#ClientAuthentication)
 */
export declare function ClientSecretBasic(clientSecret: string): ClientAuth;
export interface ModifyAssertionOptions {
    /**
     * Use to modify a JWT assertion payload or header right before it is signed.
     *
     * @see {@link modifyAssertion}
     */
    [modifyAssertion]?: ModifyAssertionFunction;
}
/**
 * **`private_key_jwt`** uses the HTTP request body to send `client_id`, `client_assertion_type`,
 * and `client_assertion` as `application/x-www-form-urlencoded` body parameters. Digital signature
 * is used for the assertion's authenticity and integrity.
 *
 * @example
 *
 * ```ts
 * let key!: oauth.CryptoKey | oauth.PrivateKey
 *
 * let clientAuth = oauth.PrivateKeyJwt(key)
 * ```
 *
 * @param clientPrivateKey
 *
 * @group Client Authentication
 *
 * @see [OAuth Token Endpoint Authentication Methods](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#ClientAuthentication)
 */
export declare function PrivateKeyJwt(clientPrivateKey: CryptoKey | PrivateKey, options?: ModifyAssertionOptions): ClientAuth;
/**
 * **`client_secret_jwt`** uses the HTTP request body to send `client_id`, `client_assertion_type`,
 * and `client_assertion` as `application/x-www-form-urlencoded` body parameters. HMAC is used for
 * the assertion's authenticity and integrity.
 *
 * @example
 *
 * ```ts
 * let clientSecret!: string
 *
 * let clientAuth = oauth.ClientSecretJwt(clientSecret)
 * ```
 *
 * @param clientSecret
 * @param options
 *
 * @group Client Authentication
 *
 * @see [OAuth Token Endpoint Authentication Methods](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#ClientAuthentication)
 */
export declare function ClientSecretJwt(clientSecret: string, options?: ModifyAssertionOptions): ClientAuth;
/**
 * **`none`** (public client) uses the HTTP request body to send only `client_id` as
 * `application/x-www-form-urlencoded` body parameter.
 *
 * ```ts
 * let clientAuth = oauth.None()
 * ```
 *
 * @group Client Authentication
 *
 * @see [OAuth Token Endpoint Authentication Methods](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#ClientAuthentication)
 */
export declare function None(): ClientAuth;
/**
 * **`tls_client_auth`** uses the HTTP request body to send only `client_id` as
 * `application/x-www-form-urlencoded` body parameter and the mTLS key and certificate is configured
 * through {@link customFetch}.
 *
 * ```ts
 * let clientAuth = oauth.TlsClientAuth()
 * ```
 *
 * @group Client Authentication
 *
 * @see [OAuth Token Endpoint Authentication Methods](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method)
 * @see [RFC 8705 - OAuth 2.0 Mutual-TLS Client Authentication (PKI Mutual-TLS Method)](https://www.rfc-editor.org/rfc/rfc8705.html#name-pki-mutual-tls-method)
 */
export declare function TlsClientAuth(): ClientAuth;
/**
 * Generates a signed JWT-Secured Authorization Request (JAR).
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param privateKey Private key to sign the Request Object with.
 *
 * @group Authorization Code Grant
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 * @group JWT-Secured Authorization Request (JAR)
 *
 * @see [RFC 9101 - The OAuth 2.0 Authorization Framework: JWT-Secured Authorization Request (JAR)](https://www.rfc-editor.org/rfc/rfc9101.html#name-request-object-2)
 */
export declare function issueRequestObject(as: AuthorizationServer, client: Client, parameters: URLSearchParams | Record<string, string> | string[][], privateKey: CryptoKey | PrivateKey, options?: ModifyAssertionOptions): Promise<string>;
/**
 * @ignore
 */
export declare function checkProtocol(url: URL, enforceHttps: boolean | undefined): void;
/**
 * Performs a Pushed Authorization Request at the
 * {@link AuthorizationServer.pushed_authorization_request_endpoint `as.pushed_authorization_request_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param parameters Authorization Request parameters.
 *
 * @returns Resolves with a {@link !Response} to then invoke
 *   {@link processPushedAuthorizationResponse} with
 *
 * @group Pushed Authorization Requests (PAR)
 *
 * @see [RFC 9126 - OAuth 2.0 Pushed Authorization Requests (PAR)](https://www.rfc-editor.org/rfc/rfc9126.html#name-pushed-authorization-reques)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-dpop-with-pushed-authorizat)
 */
export declare function pushedAuthorizationRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, parameters: URLSearchParams | Record<string, string> | string[][], options?: PushedAuthorizationRequestOptions): Promise<Response>;
/**
 * DPoP handle, obtained from {@link DPoP}
 */
export interface DPoPHandle {
    /**
     * Calculates the JWK Thumbprint of the DPoP public key using the SHA-256 hash function for use as
     * the optional `dpop_jkt` authorization request parameter.
     *
     * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-authorization-code-binding-)
     */
    calculateThumbprint(): Promise<string>;
}
/**
 * Used to determine if a rejected error indicates the need to retry the request due to an
 * expired/missing nonce.
 *
 * @group DPoP
 */
export declare function isDPoPNonceError(err: unknown): boolean;
/**
 * Returns a wrapper / handle around a {@link CryptoKeyPair} that is used for negotiating and proving
 * proof-of-possession to sender-constrain OAuth 2.0 tokens via DPoP at the Authorization Server and
 * Resource Server.
 *
 * This wrapper / handle also keeps track of server-issued nonces, allowing requests to be retried
 * with a fresh nonce when the server indicates the need to use one. {@link isDPoPNonceError} can be
 * used to determine if a rejected error indicates the need to retry the request due to an
 * expired/missing nonce.
 *
 * @example
 *
 * ```ts
 * let client!: oauth.Client
 * let keyPair!: oauth.CryptoKeyPair
 *
 * let DPoP = oauth.DPoP(client, keyPair)
 * ```
 *
 * @param keyPair Public/private key pair to sign the DPoP Proof JWT with
 *
 * @group DPoP
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9449.html RFC 9449 - OAuth 2.0 Demonstrating Proof of Possession (DPoP)}
 */
export declare function DPoP(client: Pick<Client, typeof clockSkew>, keyPair: CryptoKeyPair, options?: ModifyAssertionOptions): DPoPHandle;
export interface PushedAuthorizationResponse {
    readonly request_uri: string;
    readonly expires_in: number;
    readonly [parameter: string]: JsonValue | undefined;
}
export interface OAuth2Error {
    readonly error: string;
    readonly error_description?: string;
    readonly error_uri?: string;
    readonly algs?: string;
    readonly scope?: string;
    readonly [parameter: string]: JsonValue | undefined;
}
/**
 * Throw when a server responds with an "OAuth-style" error JSON body
 *
 * @example
 *
 * ```http
 * HTTP/1.1 400 Bad Request
 * Content-Type: application/json;charset=UTF-8
 * Cache-Control: no-store
 * Pragma: no-cache
 *
 * {
 *   "error": "invalid_request"
 * }
 * ```
 *
 * @group Errors
 */
export declare class ResponseBodyError extends Error {
    /**
     * The parsed JSON response body
     */
    cause: Record<string, JsonValue | undefined>;
    code: typeof RESPONSE_BODY_ERROR;
    /**
     * Error code given in the JSON response
     */
    error: string;
    /**
     * HTTP Status Code of the response
     */
    status: number;
    /**
     * Human-readable text providing additional information, used to assist the developer in
     * understanding the error that occurred, given in the JSON response
     */
    error_description?: string;
    /**
     * The "OAuth-style" error {@link !Response}, its {@link !Response.bodyUsed} is `true` and the JSON
     * body is available in {@link ResponseBodyError.cause}
     */
    response: Response;
    /**
     * @ignore
     */
    constructor(message: string, options: {
        cause: OAuth2Error;
        response: Response;
    });
}
/**
 * Thrown when OAuth 2.0 Authorization Error Response is encountered.
 *
 * @example
 *
 * ```http
 * HTTP/1.1 302 Found
 * Location: https://client.example.com/cb?error=access_denied&state=xyz
 * ```
 *
 * @group Errors
 */
export declare class AuthorizationResponseError extends Error {
    /**
     * Authorization Response parameters as {@link !URLSearchParams}
     */
    cause: URLSearchParams;
    code: typeof AUTHORIZATION_RESPONSE_ERROR;
    /**
     * Error code given in the Authorization Response
     */
    error: string;
    /**
     * Human-readable text providing additional information, used to assist the developer in
     * understanding the error that occurred, given in the Authorization Response
     */
    error_description?: string;
    /**
     * @ignore
     */
    constructor(message: string, options: {
        cause: URLSearchParams;
    });
}
/**
 * Thrown when a server responds with a parseable WWW-Authenticate challenges, typically because of
 * expired tokens, or bad client authentication
 *
 * @example
 *
 * ```http
 * HTTP/1.1 401 Unauthorized
 * WWW-Authenticate: Bearer error="invalid_token", error_description="The access token expired"
 * ```
 *
 * @group Errors
 */
export declare class WWWAuthenticateChallengeError extends Error {
    /**
     * The parsed WWW-Authenticate HTTP Header challenges
     */
    cause: WWWAuthenticateChallenge[];
    code: typeof WWW_AUTHENTICATE_CHALLENGE;
    /**
     * The {@link !Response} that included a WWW-Authenticate HTTP Header challenges, its
     * {@link !Response.bodyUsed} is `false`
     */
    response: Response;
    /**
     * HTTP Status Code of the response
     */
    status: number;
    /**
     * @ignore
     */
    constructor(message: string, options: {
        cause: WWWAuthenticateChallenge[];
        response: Response;
    });
}
/**
 * WWW-Authenticate challenge auth-param dictionary with known and unknown parameter names
 */
export interface WWWAuthenticateChallengeParameters {
    /**
     * Identifies the protection space
     */
    readonly realm?: string;
    /**
     * A machine-readable error code value
     */
    readonly error?: string;
    /**
     * Human-readable ASCII text providing additional information, used to assist the client developer
     * in understanding the error that occurred
     */
    readonly error_description?: string;
    /**
     * A URI identifying a human-readable web page with information about the error, used to provide
     * the client developer with additional information about the error
     */
    readonly error_uri?: string;
    /**
     * A space-delimited list of supported algorithms, used in
     * {@link https://www.rfc-editor.org/rfc/rfc9449.html RFC 9449 - OAuth 2.0 Demonstrating Proof of Possession (DPoP)}
     * challenges
     */
    readonly algs?: string;
    /**
     * The scope necessary to access the protected resource, used with `insufficient_scope` error code
     */
    readonly scope?: string;
    /**
     * The URL of the protected resource metadata
     */
    readonly resource_metadata?: string;
    /**
     * NOTE: because the parameter names are case insensitive they are always returned lowercased
     */
    readonly [parameter: Lowercase<string>]: string | undefined;
}
/**
 * Parsed WWW-Authenticate challenge
 */
export interface WWWAuthenticateChallenge {
    /**
     * Parsed WWW-Authenticate challenge auth-scheme
     *
     * NOTE: because the value is case insensitive it is always returned lowercased
     */
    readonly scheme: Lowercase<string>;
    /**
     * Parsed WWW-Authenticate challenge auth-param dictionary (always present but will be empty when
     * {@link WWWAuthenticateChallenge.token68 token68} is present)
     */
    readonly parameters: WWWAuthenticateChallengeParameters;
    /**
     * Parsed WWW-Authenticate challenge token68
     */
    readonly token68?: string;
}
/**
 * Validates {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.pushed_authorization_request_endpoint `as.pushed_authorization_request_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link pushedAuthorizationRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Pushed Authorization Requests (PAR)
 *
 * @see [RFC 9126 - OAuth 2.0 Pushed Authorization Requests (PAR)](https://www.rfc-editor.org/rfc/rfc9126.html#name-pushed-authorization-reques)
 */
export declare function processPushedAuthorizationResponse(as: AuthorizationServer, client: Client, response: Response): Promise<PushedAuthorizationResponse>;
export type ProtectedResourceRequestBody = ArrayBuffer | null | ReadableStream | string | Uint8Array | undefined | URLSearchParams;
export interface ProtectedResourceRequestOptions extends Omit<HttpRequestOptions<string, ProtectedResourceRequestBody>, 'headers'>, DPoPRequestOptions {
}
/**
 * Performs a protected resource request at an arbitrary URL.
 *
 * Authorization Header is used to transmit the Access Token value.
 *
 * @param accessToken The Access Token for the request.
 * @param method The HTTP method for the request.
 * @param url Target URL for the request.
 * @param headers Headers for the request.
 * @param body Request body compatible with the Fetch API and the request's method.
 *
 * @returns Resolves with a {@link !Response} instance. WWW-Authenticate HTTP Header challenges are
 *   rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Accessing Protected Resources
 *
 * @see [RFC 6750 - The OAuth 2.0 Authorization Framework: Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750.html#section-2.1)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-protected-resource-access)
 */
export declare function protectedResourceRequest(accessToken: string, method: string, url: URL, headers?: Headers, body?: ProtectedResourceRequestBody, options?: ProtectedResourceRequestOptions): Promise<Response>;
export interface UserInfoRequestOptions extends HttpRequestOptions<'GET'>, DPoPRequestOptions {
}
/**
 * Performs a UserInfo Request at the
 * {@link AuthorizationServer.userinfo_endpoint `as.userinfo_endpoint`}.
 *
 * Authorization Header is used to transmit the Access Token value.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param accessToken Access Token value.
 *
 * @returns Resolves with a {@link !Response} to then invoke {@link processUserInfoResponse} with
 *
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 * @group OpenID Connect (OIDC) UserInfo
 * @group Accessing Protected Resources
 *
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#UserInfo)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-protected-resource-access)
 */
export declare function userInfoRequest(as: AuthorizationServer, client: Client, accessToken: string, options?: UserInfoRequestOptions): Promise<Response>;
export interface UserInfoAddress {
    readonly formatted?: string;
    readonly street_address?: string;
    readonly locality?: string;
    readonly region?: string;
    readonly postal_code?: string;
    readonly country?: string;
    readonly [claim: string]: JsonValue | undefined;
}
export interface UserInfoResponse {
    readonly sub: string;
    readonly name?: string;
    readonly given_name?: string;
    readonly family_name?: string;
    readonly middle_name?: string;
    readonly nickname?: string;
    readonly preferred_username?: string;
    readonly profile?: string;
    readonly picture?: string;
    readonly website?: string;
    readonly email?: string;
    readonly email_verified?: boolean;
    readonly gender?: string;
    readonly birthdate?: string;
    readonly zoneinfo?: string;
    readonly locale?: string;
    readonly phone_number?: string;
    readonly updated_at?: number;
    readonly address?: UserInfoAddress;
    readonly [claim: string]: JsonValue | undefined;
}
export interface ExportedJWKSCache {
    jwks: JWKS;
    uat: number;
}
export type JWKSCacheInput = ExportedJWKSCache | Record<string, never>;
/**
 * DANGER ZONE - This option has security implications that must be understood, assessed for
 * applicability, and accepted before use.
 *
 * Use this as a value to {@link processUserInfoResponse} `expectedSubject` parameter to skip the
 * `sub` claim value check.
 *
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#UserInfoResponse)
 */
export declare const skipSubjectCheck: unique symbol;
export interface JWEDecryptOptions {
    /**
     * See {@link jweDecrypt}.
     */
    [jweDecrypt]?: JweDecryptFunction;
}
/**
 * Validates {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.userinfo_endpoint `as.userinfo_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param expectedSubject Expected `sub` claim value. In response to OpenID Connect authentication
 *   requests, the expected subject is the one from the ID Token claims retrieved from
 *   {@link getValidatedIdTokenClaims}.
 * @param response Resolved value from {@link userInfoRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. WWW-Authenticate
 *   HTTP Header challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 * @group OpenID Connect (OIDC) UserInfo
 * @group Accessing Protected Resources
 *
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#UserInfo)
 */
export declare function processUserInfoResponse(as: AuthorizationServer, client: Client, expectedSubject: string | typeof skipSubjectCheck, response: Response, options?: JWEDecryptOptions): Promise<UserInfoResponse>;
export interface TokenEndpointRequestOptions extends HttpRequestOptions<'POST', URLSearchParams>, DPoPRequestOptions {
    /**
     * Any additional parameters to send. This cannot override existing parameter values.
     */
    additionalParameters?: URLSearchParams | Record<string, string> | string[][];
}
/**
 * Performs a Refresh Token Grant request at the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param refreshToken Refresh Token value.
 *
 * @returns Resolves with a {@link !Response} to then invoke {@link processRefreshTokenResponse} with
 *
 * @group Refreshing an Access Token
 *
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-6)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#RefreshTokens)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-dpop-access-token-request)
 */
export declare function refreshTokenGrantRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, refreshToken: string, options?: TokenEndpointRequestOptions): Promise<Response>;
/**
 * Returns ID Token Claims Set from a {@link TokenEndpointResponse} processed by e.g.
 * {@link processAuthorizationCodeResponse}. To optionally validate the ID Token Signature use
 * {@link validateApplicationLevelSignature}.
 *
 * @param ref {@link TokenEndpointResponse} previously resolved from e.g.
 *   {@link processAuthorizationCodeResponse}
 *
 * @returns JWT Claims Set from an ID Token, or undefined if there is no ID Token in `ref`.
 *
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 * @group Client-Initiated Backchannel Authentication (CIBA)
 * @group Device Authorization Grant
 */
export declare function getValidatedIdTokenClaims(ref: TokenEndpointResponse): IDToken | undefined;
export interface ValidateSignatureOptions extends HttpRequestOptions<'GET'>, JWKSCacheOptions {
}
/**
 * Validates the JWS Signature of either a JWT {@link !Response.body} or
 * {@link TokenEndpointResponse.id_token} of a processed {@link !Response}
 *
 * Note: Validating signatures of JWTs received via direct communication between the Client and a
 * TLS-secured Endpoint (which it is here) is not mandatory since the TLS server validation is used
 * to validate the issuer instead of checking the token signature. You only need to use this method
 * for non-repudiation purposes.
 *
 * Note: Supports only digital signatures.
 *
 * @param as Authorization Server Metadata.
 * @param ref Response previously processed by this module that contained an ID Token or its
 *   response body was a JWT
 *
 * @returns Resolves if the signature validates, rejects otherwise.
 *
 * @group FAPI 1.0 Advanced
 * @group FAPI 2.0 Message Signing
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 * @group OpenID Connect (OIDC) UserInfo
 * @group Token Introspection
 *
 * @see [RFC 9701 - JWT Response for OAuth Token Introspection](https://www.rfc-editor.org/rfc/rfc9701.html#section-5)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#UserInfo)
 */
export declare function validateApplicationLevelSignature(as: AuthorizationServer, ref: Response, options?: ValidateSignatureOptions): Promise<void>;
/**
 * Validates Refresh Token Grant {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link refreshTokenGrantRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Refreshing an Access Token
 *
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-6)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#RefreshTokens)
 */
export declare function processRefreshTokenResponse(as: AuthorizationServer, client: Client, response: Response, options?: JWEDecryptOptions): Promise<TokenEndpointResponse>;
/**
 * Performs an Authorization Code grant request at the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param callbackParameters Parameters obtained from the callback to redirect_uri, this is returned
 *   from {@link validateAuthResponse}, or {@link validateJwtAuthResponse}.
 * @param redirectUri `redirect_uri` value used in the authorization request.
 * @param codeVerifier PKCE `code_verifier` to send to the token endpoint.
 *
 * @returns Resolves with a {@link !Response} to then invoke {@link processAuthorizationCodeResponse}
 *   with
 *
 * @group Authorization Code Grant
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 *
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#CodeFlowAuth)
 * @see [RFC 7636 - Proof Key for Code Exchange (PKCE)](https://www.rfc-editor.org/rfc/rfc7636.html#section-4)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-dpop-access-token-request)
 */
export declare function authorizationCodeGrantRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, callbackParameters: URLSearchParams, redirectUri: string, codeVerifier: string, options?: TokenEndpointRequestOptions): Promise<Response>;
interface JWTPayload {
    readonly iss?: string;
    readonly sub?: string;
    readonly aud?: string | string[];
    readonly jti?: string;
    readonly nbf?: number;
    readonly exp?: number;
    readonly iat?: number;
    readonly cnf?: ConfirmationClaims;
    readonly [claim: string]: JsonValue | undefined;
}
export interface IDToken extends JWTPayload {
    readonly iss: string;
    readonly sub: string;
    readonly aud: string | string[];
    readonly iat: number;
    readonly exp: number;
    readonly nonce?: string;
    readonly auth_time?: number;
    readonly azp?: string;
    readonly [claim: string]: JsonValue | undefined;
}
export interface AuthorizationDetails {
    readonly type: string;
    readonly locations?: string[];
    readonly actions?: string[];
    readonly datatypes?: string[];
    readonly privileges?: string[];
    readonly identifier?: string;
    readonly [parameter: string]: JsonValue | undefined;
}
export interface TokenEndpointResponse {
    readonly access_token: string;
    readonly expires_in?: number;
    readonly id_token?: string;
    readonly refresh_token?: string;
    readonly scope?: string;
    readonly authorization_details?: AuthorizationDetails[];
    /**
     * NOTE: because the value is case insensitive it is always returned lowercased
     */
    readonly token_type: 'bearer' | 'dpop' | Lowercase<string>;
    readonly [parameter: string]: JsonValue | undefined;
}
/**
 * Use this as a value to {@link processAuthorizationCodeResponse} `oidc.expectedNonce` parameter to
 * indicate no `nonce` ID Token claim value is expected, i.e. no `nonce` parameter value was sent
 * with the authorization request.
 */
export declare const expectNoNonce: unique symbol;
/**
 * Use this as a value to {@link processAuthorizationCodeResponse} `oidc.maxAge` parameter to
 * indicate no `auth_time` ID Token claim value check should be performed.
 */
export declare const skipAuthTimeCheck: unique symbol;
export interface ProcessAuthorizationCodeResponseOptions extends JWEDecryptOptions {
    /**
     * Expected ID Token `nonce` claim value. Default is {@link expectNoNonce}.
     */
    expectedNonce?: string | typeof expectNoNonce;
    /**
     * ID Token {@link IDToken.auth_time `auth_time`} claim value will be checked to be present and
     * conform to the `maxAge` value. Use of this option is required if you sent a `max_age` parameter
     * in an authorization request. Default is {@link Client.default_max_age `client.default_max_age`}
     * and falls back to {@link skipAuthTimeCheck}.
     */
    maxAge?: number | typeof skipAuthTimeCheck;
    /**
     * When true this requires {@link TokenEndpointResponse.id_token} to be present
     */
    requireIdToken?: boolean;
}
/**
 * Validates Authorization Code Grant {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link authorizationCodeGrantRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Authorization Code Grant
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 *
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#CodeFlowAuth)
 */
export declare function processAuthorizationCodeResponse(as: AuthorizationServer, client: Client, response: Response, options?: ProcessAuthorizationCodeResponseOptions): Promise<TokenEndpointResponse>;
/**
 * @group Error Codes
 *
 * @see {@link WWWAuthenticateChallengeError}
 */
export declare const WWW_AUTHENTICATE_CHALLENGE = "OAUTH_WWW_AUTHENTICATE_CHALLENGE";
/**
 * @group Error Codes
 *
 * @see {@link ResponseBodyError}
 */
export declare const RESPONSE_BODY_ERROR = "OAUTH_RESPONSE_BODY_ERROR";
/**
 * @group Error Codes
 *
 * @see {@link UnsupportedOperationError}
 */
export declare const UNSUPPORTED_OPERATION = "OAUTH_UNSUPPORTED_OPERATION";
/**
 * @group Error Codes
 *
 * @see {@link AuthorizationResponseError}
 */
export declare const AUTHORIZATION_RESPONSE_ERROR = "OAUTH_AUTHORIZATION_RESPONSE_ERROR";
/**
 * Assigned as {@link OperationProcessingError.code} when a JWT UserInfo Response was expected but a
 * regular JSON one was given instead.
 *
 * @group Error Codes
 */
export declare const JWT_USERINFO_EXPECTED = "OAUTH_JWT_USERINFO_EXPECTED";
/**
 * Assigned as {@link OperationProcessingError.code} when the following fails to parse as JSON
 *
 * - JWS/JWE Headers
 * - JSON response bodies
 * - "claims" authorization request parameters
 * - "authorization_details" authorization request parameters
 *
 * @group Error Codes
 */
export declare const PARSE_ERROR = "OAUTH_PARSE_ERROR";
/**
 * Assigned as {@link OperationProcessingError.code} when authorization server responses are invalid.
 *
 * @group Error Codes
 */
export declare const INVALID_RESPONSE = "OAUTH_INVALID_RESPONSE";
/**
 * Assigned as {@link OperationProcessingError.code} during {@link validateJwtAccessToken} when the
 * request or its contents are invalid.
 *
 * @group Error Codes
 */
export declare const INVALID_REQUEST = "OAUTH_INVALID_REQUEST";
/**
 * Assigned as {@link OperationProcessingError.code} when a {@link !Response} does not have the
 * expected `application/json` response-type HTTP Header.
 *
 * @group Error Codes
 */
export declare const RESPONSE_IS_NOT_JSON = "OAUTH_RESPONSE_IS_NOT_JSON";
/**
 * Assigned as {@link OperationProcessingError.code} when a {@link !Response} does not have the
 * expected success HTTP Status Code as defined by its specification.
 *
 * @group Error Codes
 */
export declare const RESPONSE_IS_NOT_CONFORM = "OAUTH_RESPONSE_IS_NOT_CONFORM";
/**
 * Assigned as {@link OperationProcessingError.code} when a request is about to made to a non-TLS
 * secured HTTP endpoint and {@link allowInsecureRequests} is not provided.
 *
 * @group Error Codes
 */
export declare const HTTP_REQUEST_FORBIDDEN = "OAUTH_HTTP_REQUEST_FORBIDDEN";
/**
 * Assigned as {@link OperationProcessingError.code} when a request is about to made to a non-HTTP(S)
 * endpoint.
 *
 * @group Error Codes
 */
export declare const REQUEST_PROTOCOL_FORBIDDEN = "OAUTH_REQUEST_PROTOCOL_FORBIDDEN";
/**
 * Assigned as {@link OperationProcessingError.code} when a JWT NumericDate comparison with the
 * current timestamp fails.
 *
 * @group Error Codes
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc7519.html#section-2 JSON Web Token (JWT)}
 */
export declare const JWT_TIMESTAMP_CHECK = "OAUTH_JWT_TIMESTAMP_CHECK_FAILED";
/**
 * Assigned as {@link OperationProcessingError.code} when a JWT claim is not of a given expected
 * value.
 *
 * @group Error Codes
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc7519.html#section-2 JSON Web Token (JWT)}
 */
export declare const JWT_CLAIM_COMPARISON = "OAUTH_JWT_CLAIM_COMPARISON_FAILED";
/**
 * Assigned as {@link OperationProcessingError.code} when a {@link !Response} JSON body attribute is
 * not of a given expected value.
 *
 * @group Error Codes
 */
export declare const JSON_ATTRIBUTE_COMPARISON = "OAUTH_JSON_ATTRIBUTE_COMPARISON_FAILED";
/**
 * Assigned as {@link OperationProcessingError.code} when a JWT signature validation fails to select
 * an applicable key.
 *
 * @group Error Codes
 */
export declare const KEY_SELECTION = "OAUTH_KEY_SELECTION_FAILED";
/**
 * Assigned as {@link OperationProcessingError.code} when the AS configuration is missing metadata.
 *
 * @group Error Codes
 */
export declare const MISSING_SERVER_METADATA = "OAUTH_MISSING_SERVER_METADATA";
/**
 * Assigned as {@link OperationProcessingError.code} when the AS configuration has invalid metadata.
 *
 * @group Error Codes
 */
export declare const INVALID_SERVER_METADATA = "OAUTH_INVALID_SERVER_METADATA";
export interface ClientCredentialsGrantRequestOptions extends HttpRequestOptions<'POST', URLSearchParams>, DPoPRequestOptions {
}
/**
 * Performs a Client Credentials Grant request at the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 *
 * @returns Resolves with a {@link !Response} to then invoke {@link processClientCredentialsResponse}
 *   with
 *
 * @group Client Credentials Grant
 *
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-dpop-access-token-request)
 */
export declare function clientCredentialsGrantRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, parameters: URLSearchParams | Record<string, string> | string[][], options?: ClientCredentialsGrantRequestOptions): Promise<Response>;
/**
 * Performs any Grant request at the {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 * The purpose is to be able to execute grant requests such as Token Exchange Grant Type, JWT Bearer
 * Token Grant Type, or SAML 2.0 Bearer Assertion Grant Type.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param grantType Grant Type.
 *
 * @returns Resolves with a {@link !Response} to then invoke
 *   {@link processGenericTokenEndpointResponse} with
 *
 * @group JWT Bearer Token Grant Type
 * @group SAML 2.0 Bearer Assertion Grant Type
 * @group Token Exchange Grant Type
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8693.html Token Exchange Grant Type}
 * @see {@link https://www.rfc-editor.org/rfc/rfc7523.html#section-2.1 JWT Bearer Token Grant Type}
 * @see {@link https://www.rfc-editor.org/rfc/rfc7522.html#section-2.1 SAML 2.0 Bearer Assertion Grant Type}
 */
export declare function genericTokenEndpointRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, grantType: string, parameters: URLSearchParams | Record<string, string> | string[][], options?: Omit<TokenEndpointRequestOptions, 'additionalParameters'>): Promise<Response>;
/**
 * Validates Token Endpoint {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link genericTokenEndpointRequest}.
 *
 * @group JWT Bearer Token Grant Type
 * @group SAML 2.0 Bearer Assertion Grant Type
 * @group Token Exchange Grant Type
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8693.html Token Exchange Grant Type}
 * @see {@link https://www.rfc-editor.org/rfc/rfc7523.html#section-2.1 JWT Bearer Token Grant Type}
 * @see {@link https://www.rfc-editor.org/rfc/rfc7522.html#section-2.1 SAML 2.0 Bearer Assertion Grant Type}
 */
export declare function processGenericTokenEndpointResponse(as: AuthorizationServer, client: Client, response: Response, options?: JWEDecryptOptions): Promise<TokenEndpointResponse>;
/**
 * Validates Client Credentials Grant {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link clientCredentialsGrantRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Client Credentials Grant
 *
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4)
 */
export declare function processClientCredentialsResponse(as: AuthorizationServer, client: Client, response: Response, options?: JWEDecryptOptions): Promise<TokenEndpointResponse>;
export interface RevocationRequestOptions extends HttpRequestOptions<'POST', URLSearchParams> {
    /**
     * Any additional parameters to send. This cannot override existing parameter values.
     */
    additionalParameters?: URLSearchParams | Record<string, string> | string[][];
}
/**
 * Performs a Revocation Request at the
 * {@link AuthorizationServer.revocation_endpoint `as.revocation_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param token Token to revoke. You can provide the `token_type_hint` parameter via
 *   {@link RevocationRequestOptions.additionalParameters options}.
 *
 * @returns Resolves with a {@link !Response} to then invoke {@link processRevocationResponse} with
 *
 * @group Token Revocation
 *
 * @see [RFC 7009 - OAuth 2.0 Token Revocation](https://www.rfc-editor.org/rfc/rfc7009.html#section-2)
 */
export declare function revocationRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, token: string, options?: RevocationRequestOptions): Promise<Response>;
/**
 * Validates {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.revocation_endpoint `as.revocation_endpoint`}.
 *
 * @param response Resolved value from {@link revocationRequest}.
 *
 * @returns Resolves with `undefined` when the request was successful, or an object representing an
 *   OAuth 2.0 protocol style error.
 *
 * @group Token Revocation
 *
 * @see [RFC 7009 - OAuth 2.0 Token Revocation](https://www.rfc-editor.org/rfc/rfc7009.html#section-2)
 */
export declare function processRevocationResponse(response: Response): Promise<undefined>;
export interface IntrospectionRequestOptions extends HttpRequestOptions<'POST', URLSearchParams> {
    /**
     * Any additional parameters to send. This cannot override existing parameter values.
     */
    additionalParameters?: URLSearchParams | Record<string, string> | string[][];
    /**
     * Request a JWT Response from the
     * {@link AuthorizationServer.introspection_endpoint `as.introspection_endpoint`}. Default is
     *
     * - True when
     *   {@link Client.introspection_signed_response_alg `client.introspection_signed_response_alg`} is
     *   set
     * - False otherwise
     */
    requestJwtResponse?: boolean;
}
/**
 * Performs an Introspection Request at the
 * {@link AuthorizationServer.introspection_endpoint `as.introspection_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param token Token to introspect. You can provide the `token_type_hint` parameter via
 *   {@link IntrospectionRequestOptions.additionalParameters options}.
 *
 * @returns Resolves with a {@link !Response} to then invoke {@link processIntrospectionResponse} with
 *
 * @group Token Introspection
 *
 * @see [RFC 7662 - OAuth 2.0 Token Introspection](https://www.rfc-editor.org/rfc/rfc7662.html#section-2)
 * @see [RFC 9701 - JWT Response for OAuth Token Introspection](https://www.rfc-editor.org/rfc/rfc9701.html#section-4)
 */
export declare function introspectionRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, token: string, options?: IntrospectionRequestOptions): Promise<Response>;
export interface ConfirmationClaims {
    readonly 'x5t#S256'?: string;
    readonly jkt?: string;
    readonly [claim: string]: JsonValue | undefined;
}
export interface IntrospectionResponse {
    readonly active: boolean;
    readonly client_id?: string;
    readonly exp?: number;
    readonly iat?: number;
    readonly sid?: string;
    readonly iss?: string;
    readonly jti?: string;
    readonly username?: string;
    readonly aud?: string | string[];
    readonly scope?: string;
    readonly sub?: string;
    readonly nbf?: number;
    readonly token_type?: string;
    readonly cnf?: ConfirmationClaims;
    readonly authorization_details?: AuthorizationDetails[];
    readonly [claim: string]: JsonValue | undefined;
}
/**
 * Validates {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.introspection_endpoint `as.introspection_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link introspectionRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Token Introspection
 *
 * @see [RFC 7662 - OAuth 2.0 Token Introspection](https://www.rfc-editor.org/rfc/rfc7662.html#section-2)
 * @see [RFC 9701 - JWT Response for OAuth Token Introspection](https://www.rfc-editor.org/rfc/rfc9701.html#section-5)
 */
export declare function processIntrospectionResponse(as: AuthorizationServer, client: Client, response: Response, options?: JWEDecryptOptions): Promise<IntrospectionResponse>;
export interface JWKS {
    readonly keys: JWK[];
}
export type JweDecryptFunction = (jwe: string) => Promise<string>;
/**
 * Same as {@link validateAuthResponse} but for signed JARM responses.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param parameters JARM authorization response.
 * @param expectedState Expected `state` parameter value. Default is {@link expectNoState}.
 *
 * @returns Validated Authorization Response parameters. Authorization Error Responses are rejected
 *   using {@link AuthorizationResponseError}.
 *
 * @group Authorization Code Grant
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 * @group JWT Secured Authorization Response Mode for OAuth 2.0 (JARM)
 * @group FAPI 2.0 Message Signing
 * @group FAPI 1.0 Advanced
 *
 * @see [JWT Secured Authorization Response Mode for OAuth 2.0 (JARM)](https://openid.net/specs/openid-financial-api-jarm-final.html)
 */
export declare function validateJwtAuthResponse(as: AuthorizationServer, client: Client, parameters: URLSearchParams | URL, expectedState?: string | typeof expectNoState | typeof skipStateCheck, options?: ValidateSignatureOptions & JWEDecryptOptions): Promise<URLSearchParams>;
/**
 * Same as {@link validateAuthResponse} but for FAPI 1.0 Advanced Detached Signature authorization
 * responses.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param parameters Authorization Response parameters as URLSearchParams, instance of URL with
 *   parameters in a fragment/hash, or a `form_post` Request instance.
 * @param expectedNonce Expected ID Token `nonce` claim value.
 * @param expectedState Expected `state` parameter value. Default is {@link expectNoState}.
 * @param maxAge ID Token {@link IDToken.auth_time `auth_time`} claim value will be checked to be
 *   present and conform to the `maxAge` value. Use of this option is required if you sent a
 *   `max_age` parameter in an authorization request. Default is
 *   {@link Client.default_max_age `client.default_max_age`} and falls back to
 *   {@link skipAuthTimeCheck}.
 *
 * @returns Validated Authorization Response parameters. Authorization Error Responses are rejected
 *   using {@link AuthorizationResponseError}.
 *
 * @group FAPI 1.0 Advanced
 *
 * @see [Financial-grade API Security Profile 1.0 - Part 2: Advanced](https://openid.net/specs/openid-financial-api-part-2-1_0-final.html#id-token-as-detached-signature)
 */
export declare function validateDetachedSignatureResponse(as: AuthorizationServer, client: Client, parameters: URLSearchParams | URL | Request, expectedNonce: string, expectedState?: string | typeof expectNoState, maxAge?: number | typeof skipAuthTimeCheck, options?: ValidateSignatureOptions & JWEDecryptOptions): Promise<URLSearchParams>;
/**
 * Same as {@link validateAuthResponse} but for `code id_token` authorization responses.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param parameters Authorization Response parameters as URLSearchParams, instance of URL with
 *   parameters in a fragment/hash, or a `form_post` Request instance.
 * @param expectedNonce Expected ID Token `nonce` claim value.
 * @param expectedState Expected `state` parameter value. Default is {@link expectNoState}.
 * @param maxAge ID Token {@link IDToken.auth_time `auth_time`} claim value will be checked to be
 *   present and conform to the `maxAge` value. Use of this option is required if you sent a
 *   `max_age` parameter in an authorization request. Default is
 *   {@link Client.default_max_age `client.default_max_age`} and falls back to
 *   {@link skipAuthTimeCheck}.
 *
 * @returns Validated Authorization Response parameters. Authorization Error Responses are rejected
 *   using {@link AuthorizationResponseError}.
 *
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 *
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.2)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#HybridFlowAuth)
 */
export declare function validateCodeIdTokenResponse(as: AuthorizationServer, client: Client, parameters: URLSearchParams | URL | Request, expectedNonce: string, expectedState?: string | typeof expectNoState, maxAge?: number | typeof skipAuthTimeCheck, options?: ValidateSignatureOptions & JWEDecryptOptions): Promise<URLSearchParams>;
/**
 * DANGER ZONE - This option has security implications that must be understood, assessed for
 * applicability, and accepted before use.
 *
 * Use this as a value to {@link validateAuthResponse} `expectedState` parameter to skip the `state`
 * value check when you'll be validating such `state` value yourself instead. This should only be
 * done if you use a `state` parameter value that is integrity protected and bound to the browsing
 * session. One such mechanism to do so is described in an I-D
 * [draft-bradley-oauth-jwt-encoded-state-09](https://datatracker.ietf.org/doc/html/draft-bradley-oauth-jwt-encoded-state-09).
 */
export declare const skipStateCheck: unique symbol;
/**
 * Use this as a value to {@link validateAuthResponse} `expectedState` parameter to indicate no
 * `state` parameter value is expected, i.e. no `state` parameter value was sent with the
 * authorization request.
 */
export declare const expectNoState: unique symbol;
/**
 * Validates an OAuth 2.0 Authorization Response or Authorization Error Response message returned
 * from the authorization server's
 * {@link AuthorizationServer.authorization_endpoint `as.authorization_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param parameters Authorization response.
 * @param expectedState Expected `state` parameter value. Default is {@link expectNoState}.
 *
 * @returns Validated Authorization Response parameters. Authorization Error Responses throw
 *   {@link AuthorizationResponseError}.
 *
 * @group Authorization Code Grant
 * @group Authorization Code Grant w/ OpenID Connect (OIDC)
 *
 * @see [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.2)
 * @see [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-errata2.html#CodeFlowAuth)
 * @see [RFC 9207 - OAuth 2.0 Authorization Server Issuer Identification](https://www.rfc-editor.org/rfc/rfc9207.html)
 */
export declare function validateAuthResponse(as: AuthorizationServer, client: Client, parameters: URLSearchParams | URL, expectedState?: string | typeof expectNoState | typeof skipStateCheck): URLSearchParams;
export interface DeviceAuthorizationRequestOptions extends HttpRequestOptions<'POST', URLSearchParams> {
}
/**
 * Performs a Device Authorization Request at the
 * {@link AuthorizationServer.device_authorization_endpoint `as.device_authorization_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param parameters Device Authorization Request parameters.
 *
 * @returns Resolves with a {@link !Response} to then invoke
 *   {@link processDeviceAuthorizationResponse} with
 *
 * @group Device Authorization Grant
 *
 * @see [RFC 8628 - OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628.html#section-3.1)
 */
export declare function deviceAuthorizationRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, parameters: URLSearchParams | Record<string, string> | string[][], options?: DeviceAuthorizationRequestOptions): Promise<Response>;
export interface DeviceAuthorizationResponse {
    /**
     * The device verification code
     */
    readonly device_code: string;
    /**
     * The end-user verification code
     */
    readonly user_code: string;
    /**
     * The end-user verification URI on the authorization server. The URI should be short and easy to
     * remember as end users will be asked to manually type it into their user agent.
     */
    readonly verification_uri: string;
    /**
     * The lifetime in seconds of the "device_code" and "user_code"
     */
    readonly expires_in: number;
    /**
     * A verification URI that includes the "user_code" (or other information with the same function
     * as the "user_code"), which is designed for non-textual transmission
     */
    readonly verification_uri_complete?: string;
    /**
     * The minimum amount of time in seconds that the client should wait between polling requests to
     * the token endpoint.
     */
    readonly interval?: number;
    readonly [parameter: string]: JsonValue | undefined;
}
/**
 * Validates {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.device_authorization_endpoint `as.device_authorization_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link deviceAuthorizationRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Device Authorization Grant
 *
 * @see [RFC 8628 - OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628.html#section-3.1)
 */
export declare function processDeviceAuthorizationResponse(as: AuthorizationServer, client: Client, response: Response): Promise<DeviceAuthorizationResponse>;
/**
 * Performs a Device Authorization Grant request at the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param deviceCode Device Code. This is the
 *   {@link DeviceAuthorizationResponse.device_code `device_code`} retrieved from
 *   {@link processDeviceAuthorizationResponse}.
 *
 * @returns Resolves with a {@link !Response} to then invoke {@link processDeviceCodeResponse} with
 *
 * @group Device Authorization Grant
 *
 * @see [RFC 8628 - OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628.html#section-3.4)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-dpop-access-token-request)
 */
export declare function deviceCodeGrantRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, deviceCode: string, options?: TokenEndpointRequestOptions): Promise<Response>;
/**
 * Validates Device Authorization Grant {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link deviceCodeGrantRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Device Authorization Grant
 *
 * @see [RFC 8628 - OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628.html#section-3.4)
 */
export declare function processDeviceCodeResponse(as: AuthorizationServer, client: Client, response: Response, options?: JWEDecryptOptions): Promise<TokenEndpointResponse>;
export interface GenerateKeyPairOptions {
    /**
     * Indicates whether or not the private key may be exported. Default is `false`.
     */
    extractable?: boolean;
    /**
     * (RSA algorithms only) The length, in bits, of the RSA modulus. Default is `2048`.
     */
    modulusLength?: number;
}
/**
 * Generates a {@link CryptoKeyPair} for a given JWS `alg` Algorithm identifier.
 *
 * @param alg Supported JWS `alg` Algorithm identifier. Must be a
 *   {@link JWSAlgorithm supported JWS Algorithm}.
 *
 * @group Utilities
 */
export declare function generateKeyPair(alg: string, options?: GenerateKeyPairOptions): Promise<CryptoKeyPair>;
export interface JWTAccessTokenClaims extends JWTPayload {
    readonly iss: string;
    readonly exp: number;
    readonly aud: string | string[];
    readonly sub: string;
    readonly iat: number;
    readonly jti: string;
    readonly client_id: string;
    readonly authorization_details?: AuthorizationDetails[];
    readonly scope?: string;
    readonly [claim: string]: JsonValue | undefined;
}
export interface ValidateJWTAccessTokenOptions extends HttpRequestOptions<'GET'>, JWKSCacheOptions {
    /**
     * Indicates whether DPoP use is required.
     */
    requireDPoP?: boolean;
    /**
     * See {@link clockSkew}.
     */
    [clockSkew]?: number;
    /**
     * See {@link clockTolerance}.
     */
    [clockTolerance]?: number;
    /**
     * Supported (or expected) JWT "alg" header parameter values for the JWT Access Token (and DPoP
     * Proof JWTs). Default is all {@link JWSAlgorithm supported JWS Algorithms}.
     */
    signingAlgorithms?: string[];
}
/**
 * Validates use of JSON Web Token (JWT) OAuth 2.0 Access Tokens for a given {@link !Request} as per
 * RFC 6750, RFC 9068, and RFC 9449.
 *
 * The only supported means of sending access tokens is via the Authorization Request Header Field
 * method.
 *
 * This does validate the presence and type of all required claims as well as the values of the
 * {@link JWTAccessTokenClaims.iss `iss`}, {@link JWTAccessTokenClaims.exp `exp`},
 * {@link JWTAccessTokenClaims.aud `aud`} claims.
 *
 * This does NOT validate the {@link JWTAccessTokenClaims.sub `sub`},
 * {@link JWTAccessTokenClaims.jti `jti`}, and {@link JWTAccessTokenClaims.client_id `client_id`}
 * claims beyond just checking that they're present and that their type is a string. If you need to
 * validate these values further you would do so after this function's execution.
 *
 * This does NOT validate the DPoP Proof JWT nonce. If your server indicates RS-provided nonces to
 * clients you would check these after this function's execution.
 *
 * This does NOT validate authorization claims such as `scope` either, you would do so after this
 * function's execution.
 *
 * @param as Authorization Server to accept JWT Access Tokens from.
 * @param expectedAudience Audience identifier the resource server expects for itself.
 *
 * @group JWT Access Tokens
 *
 * @see [RFC 6750 - OAuth 2.0 Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750.html)
 * @see [RFC 9068 - JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068.html)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html)
 */
export declare function validateJwtAccessToken(as: AuthorizationServer, request: Request, expectedAudience: string, options?: ValidateJWTAccessTokenOptions): Promise<JWTAccessTokenClaims>;
export interface BackchannelAuthenticationRequestOptions extends HttpRequestOptions<'POST', URLSearchParams> {
}
/**
 * Performs a Backchannel Authentication Request at the
 * {@link AuthorizationServer.backchannel_authentication_endpoint `as.backchannel_authentication_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param parameters Backchannel Authentication Request parameters.
 *
 * @returns Resolves with a {@link !Response} to then invoke
 *   {@link processBackchannelAuthenticationResponse} with
 *
 * @group Client-Initiated Backchannel Authentication (CIBA)
 *
 * @see [OpenID Connect Client-Initiated Backchannel Authentication](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0-final.html#auth_request)
 */
export declare function backchannelAuthenticationRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, parameters: URLSearchParams | Record<string, string> | string[][], options?: BackchannelAuthenticationRequestOptions): Promise<Response>;
export interface BackchannelAuthenticationResponse {
    /**
     * Unique identifier to identify the authentication request.
     */
    readonly auth_req_id: string;
    /**
     * The lifetime in seconds of the "auth_req_id".
     */
    readonly expires_in: number;
    /**
     * The minimum amount of time in seconds that the client should wait between polling requests to
     * the token endpoint.
     */
    readonly interval?: number;
    readonly [parameter: string]: JsonValue | undefined;
}
/**
 * Validates {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.backchannel_authentication_endpoint `as.backchannel_authentication_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link backchannelAuthenticationRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Client-Initiated Backchannel Authentication (CIBA)
 *
 * @see [OpenID Connect Client-Initiated Backchannel Authentication](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0-final.html#auth_request)
 */
export declare function processBackchannelAuthenticationResponse(as: AuthorizationServer, client: Client, response: Response): Promise<BackchannelAuthenticationResponse>;
/**
 * Performs a Backchannel Authentication Grant request at the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param clientAuthentication Client Authentication Method.
 * @param authReqId Unique identifier to identify the authentication request. This is the
 *   {@link BackchannelAuthenticationResponse.auth_req_id `auth_req_id`} retrieved from
 *   {@link processBackchannelAuthenticationResponse}.
 *
 * @returns Resolves with a {@link !Response} to then invoke
 *   {@link processBackchannelAuthenticationGrantResponse} with
 *
 * @group Client-Initiated Backchannel Authentication (CIBA)
 *
 * @see [OpenID Connect Client-Initiated Backchannel Authentication](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0-final.html#token_request)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-dpop-access-token-request)
 */
export declare function backchannelAuthenticationGrantRequest(as: AuthorizationServer, client: Client, clientAuthentication: ClientAuth, authReqId: string, options?: TokenEndpointRequestOptions): Promise<Response>;
/**
 * Validates Backchannel Authentication Grant {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.token_endpoint `as.token_endpoint`}.
 *
 * @param as Authorization Server Metadata.
 * @param client Client Metadata.
 * @param response Resolved value from {@link backchannelAuthenticationGrantRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Client-Initiated Backchannel Authentication (CIBA)
 *
 * @see [OpenID Connect Client-Initiated Backchannel Authentication](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0-final.html#token_request)
 */
export declare function processBackchannelAuthenticationGrantResponse(as: AuthorizationServer, client: Client, response: Response, options?: JWEDecryptOptions): Promise<TokenEndpointResponse>;
/**
 * Removes all Symbol properties from a type
 */
export type OmitSymbolProperties<T> = {
    [K in keyof T as K extends symbol ? never : K]: T[K];
};
export interface DynamicClientRegistrationRequestOptions extends HttpRequestOptions<'POST', string>, DPoPRequestOptions {
    /**
     * Access token optionally issued by an authorization server used to authorize calls to the client
     * registration endpoint.
     */
    initialAccessToken?: string;
}
/**
 * Performs a Dynamic Client Registration at the
 * {@link AuthorizationServer.registration_endpoint `as.registration_endpoint`} using the provided
 * client metadata.
 *
 * @param as Authorization Server Metadata.
 * @param metadata Requested Client Metadata.
 * @param options
 *
 * @returns Resolves with a {@link !Response} to then invoke
 *   {@link processDynamicClientRegistrationResponse} with
 *
 * @group Dynamic Client Registration (DCR)
 *
 * @see [RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol (DCR)](https://www.rfc-editor.org/rfc/rfc7591.html#section-3.1)
 * @see [OpenID Connect Dynamic Client Registration 1.0 (DCR)](https://openid.net/specs/openid-connect-registration-1_0-errata2.html#RegistrationRequest)
 * @see [RFC 9449 - OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)](https://www.rfc-editor.org/rfc/rfc9449.html#name-protected-resource-access)
 */
export declare function dynamicClientRegistrationRequest(as: AuthorizationServer, metadata: Partial<OmitSymbolProperties<Client>>, options?: DynamicClientRegistrationRequestOptions): Promise<Response>;
/**
 * Validates {@link !Response} instance to be one coming from the
 * {@link AuthorizationServer.registration_endpoint `as.registration_endpoint`}.
 *
 * @param response Resolved value from {@link dynamicClientRegistrationRequest}.
 *
 * @returns Resolves with an object representing the parsed successful response. OAuth 2.0 protocol
 *   style errors are rejected using {@link ResponseBodyError}. WWW-Authenticate HTTP Header
 *   challenges are rejected with {@link WWWAuthenticateChallengeError}.
 *
 * @group Dynamic Client Registration (DCR)
 *
 * @see [RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol (DCR)](https://www.rfc-editor.org/rfc/rfc7591.html#section-3.2)
 * @see [OpenID Connect Dynamic Client Registration 1.0 (DCR)](https://openid.net/specs/openid-connect-registration-1_0-errata2.html#RegistrationResponse)
 */
export declare function processDynamicClientRegistrationResponse(response: Response): Promise<OmitSymbolProperties<Client>>;
/**
 * Protected Resource Server Metadata
 *
 * @group Resource Server Metadata
 *
 * @see [IANA OAuth Protected Resource Server Metadata registry](https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#protected-resource-metadata)
 */
export interface ResourceServer {
    /**
     * Resource server's Resource Identifier URL.
     */
    readonly resource: string;
    /**
     * JSON array containing a list of OAuth authorization server issuer identifiers
     */
    readonly authorization_servers?: string[];
    /**
     * URL of the protected resource's JWK Set document
     */
    readonly jwks_uri?: string;
    /**
     * JSON array containing a list of the OAuth 2.0 scope values that are used in authorization
     * requests to request access to this protected resource
     */
    readonly scopes_supported?: string[];
    /**
     * JSON array containing a list of the OAuth 2.0 Bearer Token presentation methods that this
     * protected resource supports
     */
    readonly bearer_methods_supported?: string[];
    /**
     * JSON array containing a list of the JWS signing algorithms (alg values) supported by the
     * protected resource for signed content
     */
    readonly resource_signing_alg_values_supported?: string[];
    /**
     * Human-readable name of the protected resource
     */
    readonly resource_name?: string;
    /**
     * URL of a page containing human-readable information that developers might want or need to know
     * when using the protected resource
     */
    readonly resource_documentation?: string;
    /**
     * URL of a page containing human-readable information about the protected resource's requirements
     * on how the client can use the data provided by the protected resource
     */
    readonly resource_policy_uri?: string;
    /**
     * URL of a page containing human-readable information about the protected resource's terms of
     * service
     */
    readonly resource_tos_uri?: string;
    /**
     * Boolean value indicating protected resource support for mutual-TLS client certificate-bound
     * access tokens
     */
    readonly tls_client_certificate_bound_access_tokens?: boolean;
    /**
     * JSON array containing a list of the authorization details type values supported by the resource
     * server when the authorization_details request parameter is used
     */
    readonly authorization_details_types_supported?: boolean;
    /**
     * JSON array containing a list of the JWS alg values supported by the resource server for
     * validating DPoP proof JWTs
     */
    readonly dpop_signing_alg_values_supported?: boolean;
    /**
     * Boolean value specifying whether the protected resource always requires the use of DPoP-bound
     * access tokens
     */
    readonly dpop_bound_access_tokens_required?: boolean;
    /**
     * Signed JWT containing metadata parameters about the protected resource as claims
     */
    readonly signed_metadata?: string;
    readonly [metadata: string]: JsonValue | undefined;
}
/**
 * Performs a protected resource metadata discovery.
 *
 * @param resourceIdentifier Protected resource's resource identifier to resolve the well-known
 *   discovery URI for
 *
 * @returns Resolves with a {@link !Response} to then invoke {@link processResourceDiscoveryResponse}
 *   with
 *
 * @group Resource Server Metadata
 *
 * @see [RFC 9728 - OAuth 2.0 Protected Resource Metadata](https://www.rfc-editor.org/rfc/rfc9728.html#name-protected-resource-metadata-)
 */
export declare function resourceDiscoveryRequest(resourceIdentifier: URL, options?: HttpRequestOptions<'GET'>): Promise<Response>;
/**
 * Validates {@link !Response} instance to be one coming from the resource server's well-known
 * discovery endpoint.
 *
 * @param expectedResourceIdentifier Expected Resource Identifier value.
 * @param response Resolved value from {@link resourceDiscoveryRequest} or from a general
 *   {@link !fetch} following {@link WWWAuthenticateChallengeParameters.resource_metadata}.
 *
 * @returns Resolves with the discovered Resource Server Metadata.
 *
 * @group Resource Server Metadata
 *
 * @see [RFC 9728 - OAuth 2.0 Protected Resource Metadata](https://www.rfc-editor.org/rfc/rfc9728.html#name-protected-resource-metadata-r)
 */
export declare function processResourceDiscoveryResponse(expectedResourceIdentifier: URL, response: Response): Promise<ResourceServer>;
export {};
