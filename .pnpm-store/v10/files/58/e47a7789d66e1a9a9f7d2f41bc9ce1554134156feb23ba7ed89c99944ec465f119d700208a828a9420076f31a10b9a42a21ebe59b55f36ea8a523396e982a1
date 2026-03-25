import { GaxiosResponse } from 'gaxios';
import { HeadersInit } from './authclient';
import { ClientAuthentication, OAuthClientAuthHandler, OAuthClientAuthHandlerOptions } from './oauth2common';
/**
 * Defines the interface needed to initialize an StsCredentials instance.
 * The interface does not directly map to the spec and instead is converted
 * to be compliant with the JavaScript style guide. This is because this is
 * instantiated internally.
 * StsCredentials implement the OAuth 2.0 token exchange based on
 * https://tools.ietf.org/html/rfc8693.
 * Request options are defined in
 * https://tools.ietf.org/html/rfc8693#section-2.1
 */
export interface StsCredentialsOptions {
    /**
     * REQUIRED. The value "urn:ietf:params:oauth:grant-type:token-exchange"
     * indicates that a token exchange is being performed.
     */
    grantType: string;
    /**
     * OPTIONAL. A URI that indicates the target service or resource where the
     * client intends to use the requested security token.
     */
    resource?: string;
    /**
     * OPTIONAL. The logical name of the target service where the client
     * intends to use the requested security token.  This serves a purpose
     * similar to the "resource" parameter but with the client providing a
     * logical name for the target service.
     */
    audience?: string;
    /**
     * OPTIONAL. A list of space-delimited, case-sensitive strings, as defined
     * in Section 3.3 of [RFC6749], that allow the client to specify the desired
     * scope of the requested security token in the context of the service or
     * resource where the token will be used.
     */
    scope?: string[];
    /**
     * OPTIONAL. An identifier, as described in Section 3 of [RFC8693], eg.
     * "urn:ietf:params:oauth:token-type:access_token" for the type of the
     * requested security token.
     */
    requestedTokenType?: string;
    /**
     * REQUIRED. A security token that represents the identity of the party on
     * behalf of whom the request is being made.
     */
    subjectToken: string;
    /**
     * REQUIRED. An identifier, as described in Section 3 of [RFC8693], that
     * indicates the type of the security token in the "subject_token" parameter.
     */
    subjectTokenType: string;
    actingParty?: {
        /**
         * OPTIONAL. A security token that represents the identity of the acting
         * party.  Typically, this will be the party that is authorized to use the
         * requested security token and act on behalf of the subject.
         */
        actorToken: string;
        /**
         * An identifier, as described in Section 3, that indicates the type of the
         * security token in the "actor_token" parameter. This is REQUIRED when the
         * "actor_token" parameter is present in the request but MUST NOT be
         * included otherwise.
         */
        actorTokenType: string;
    };
}
/**
 * Defines the OAuth 2.0 token exchange successful response based on
 * https://tools.ietf.org/html/rfc8693#section-2.2.1
 */
export interface StsSuccessfulResponse {
    access_token: string;
    issued_token_type: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    res?: GaxiosResponse | null;
}
export interface StsCredentialsConstructionOptions extends OAuthClientAuthHandlerOptions {
    /**
     * The client authentication credentials if available.
     */
    clientAuthentication?: ClientAuthentication;
    /**
     * The token exchange endpoint.
     */
    tokenExchangeEndpoint: string | URL;
}
/**
 * Implements the OAuth 2.0 token exchange based on
 * https://tools.ietf.org/html/rfc8693
 */
export declare class StsCredentials extends OAuthClientAuthHandler {
    #private;
    /**
     * Initializes an STS credentials instance.
     *
     * @param options The STS credentials instance options. Passing an `tokenExchangeEndpoint` directly is **@DEPRECATED**.
     * @param clientAuthentication **@DEPRECATED**. Provide a {@link StsCredentialsConstructionOptions `StsCredentialsConstructionOptions`} object in the first parameter instead.
     */
    constructor(options?: StsCredentialsConstructionOptions | string | URL, 
    /**
     * @deprecated - provide a {@link StsCredentialsConstructionOptions `StsCredentialsConstructionOptions`} object in the first parameter instead
     */
    clientAuthentication?: ClientAuthentication);
    /**
     * Exchanges the provided token for another type of token based on the
     * rfc8693 spec.
     * @param stsCredentialsOptions The token exchange options used to populate
     *   the token exchange request.
     * @param additionalHeaders Optional additional headers to pass along the
     *   request.
     * @param options Optional additional GCP-specific non-spec defined options
     *   to send with the request.
     *   Example: `&options=${encodeUriComponent(JSON.stringified(options))}`
     * @return A promise that resolves with the token exchange response containing
     *   the requested token and its expiration time.
     */
    exchangeToken(stsCredentialsOptions: StsCredentialsOptions, headers?: HeadersInit, options?: Parameters<JSON['stringify']>[0]): Promise<StsSuccessfulResponse>;
}
