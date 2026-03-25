import { GoogleToken } from 'gtoken';
import * as stream from 'stream';
import { CredentialBody, Credentials, JWTInput } from './credentials';
import { IdTokenProvider } from './idtokenclient';
import { GetTokenResponse, OAuth2Client, OAuth2ClientOptions, RequestMetadataResponse } from './oauth2client';
export interface JWTOptions extends OAuth2ClientOptions {
    /**
     * The service account email address.
     */
    email?: string;
    /**
     * The path to private key file. Not necessary if {@link JWTOptions.key} has been provided.
     */
    keyFile?: string;
    /**
     * The value of key. Not necessary if {@link JWTOptions.keyFile} has been provided.
     */
    key?: string;
    /**
     * The list of requested scopes or a single scope.
     */
    keyId?: string;
    /**
     * The impersonated account's email address.
     */
    scopes?: string | string[];
    /**
     * The ID of the key.
     */
    subject?: string;
    /**
     * Additional claims, such as target audience.
     *
     * @example
     * ```
     * {target_audience: 'targetAudience'}
     * ```
     */
    additionalClaims?: {};
}
export declare class JWT extends OAuth2Client implements IdTokenProvider {
    email?: string;
    keyFile?: string;
    key?: string;
    keyId?: string;
    defaultScopes?: string | string[];
    scopes?: string | string[];
    scope?: string;
    subject?: string;
    gtoken?: GoogleToken;
    additionalClaims?: {};
    useJWTAccessWithScope?: boolean;
    defaultServicePath?: string;
    private access?;
    /**
     * JWT service account credentials.
     *
     * Retrieve access token using gtoken.
     *
     * @param options the
     */
    constructor(options?: JWTOptions);
    /**
     * Creates a copy of the credential with the specified scopes.
     * @param scopes List of requested scopes or a single scope.
     * @return The cloned instance.
     */
    createScoped(scopes?: string | string[]): JWT;
    /**
     * Obtains the metadata to be sent with the request.
     *
     * @param url the URI being authorized.
     */
    protected getRequestMetadataAsync(url?: string | null): Promise<RequestMetadataResponse>;
    /**
     * Fetches an ID token.
     * @param targetAudience the audience for the fetched ID token.
     */
    fetchIdToken(targetAudience: string): Promise<string>;
    /**
     * Determine if there are currently scopes available.
     */
    private hasUserScopes;
    /**
     * Are there any default or user scopes defined.
     */
    private hasAnyScopes;
    /**
     * Get the initial access token using gToken.
     * @param callback Optional callback.
     * @returns Promise that resolves with credentials
     */
    authorize(): Promise<Credentials>;
    authorize(callback: (err: Error | null, result?: Credentials) => void): void;
    private authorizeAsync;
    /**
     * Refreshes the access token.
     * @param refreshToken ignored
     * @private
     */
    protected refreshTokenNoCache(): Promise<GetTokenResponse>;
    /**
     * Create a gToken if it doesn't already exist.
     */
    private createGToken;
    /**
     * Create a JWT credentials instance using the given input options.
     * @param json The input object.
     *
     * @remarks
     *
     * **Important**: If you accept a credential configuration (credential JSON/File/Stream) from an external source for authentication to Google Cloud, you must validate it before providing it to any Google API or library. Providing an unvalidated credential configuration to Google APIs can compromise the security of your systems and data. For more information, refer to {@link https://cloud.google.com/docs/authentication/external/externally-sourced-credentials Validate credential configurations from external sources}.
     */
    fromJSON(json: JWTInput): void;
    /**
     * Create a JWT credentials instance using the given input stream.
     * @param inputStream The input stream.
     * @param callback Optional callback.
     *
     * @remarks
     *
     * **Important**: If you accept a credential configuration (credential JSON/File/Stream) from an external source for authentication to Google Cloud, you must validate it before providing it to any Google API or library. Providing an unvalidated credential configuration to Google APIs can compromise the security of your systems and data. For more information, refer to {@link https://cloud.google.com/docs/authentication/external/externally-sourced-credentials Validate credential configurations from external sources}.
     */
    fromStream(inputStream: stream.Readable): Promise<void>;
    fromStream(inputStream: stream.Readable, callback: (err?: Error | null) => void): void;
    private fromStreamAsync;
    /**
     * Creates a JWT credentials instance using an API Key for authentication.
     * @param apiKey The API Key in string form.
     */
    fromAPIKey(apiKey: string): void;
    /**
     * Using the key or keyFile on the JWT client, obtain an object that contains
     * the key and the client email.
     */
    getCredentials(): Promise<CredentialBody>;
}
