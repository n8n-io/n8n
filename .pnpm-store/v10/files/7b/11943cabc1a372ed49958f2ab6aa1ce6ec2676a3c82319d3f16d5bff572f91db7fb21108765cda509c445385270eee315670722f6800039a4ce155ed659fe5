import { AbortSignalLike } from '@azure/abort-controller';
import { HttpMethods } from '@azure/core-util';

/**
 * Represents an access token with an expiration time.
 */
export declare interface AccessToken {
    /**
     * The access token returned by the authentication service.
     */
    token: string;
    /**
     * The access token's expiration timestamp in milliseconds, UNIX epoch time.
     */
    expiresOnTimestamp: number;
    /**
     * The timestamp when the access token should be refreshed, in milliseconds, UNIX epoch time.
     */
    refreshAfterTimestamp?: number;
    /** Type of token - `Bearer` or `pop` */
    tokenType?: "Bearer" | "pop";
}

/**
 * A static-key-based credential that supports updating
 * the underlying key value.
 */
export declare class AzureKeyCredential implements KeyCredential {
    private _key;
    /**
     * The value of the key to be used in authentication
     */
    get key(): string;
    /**
     * Create an instance of an AzureKeyCredential for use
     * with a service client.
     *
     * @param key - The initial value of the key to use in authentication
     */
    constructor(key: string);
    /**
     * Change the value of the key.
     *
     * Updates will take effect upon the next request after
     * updating the key value.
     *
     * @param newKey - The new key value to be used
     */
    update(newKey: string): void;
}

/**
 * A static name/key-based credential that supports updating
 * the underlying name and key values.
 */
export declare class AzureNamedKeyCredential implements NamedKeyCredential {
    private _key;
    private _name;
    /**
     * The value of the key to be used in authentication.
     */
    get key(): string;
    /**
     * The value of the name to be used in authentication.
     */
    get name(): string;
    /**
     * Create an instance of an AzureNamedKeyCredential for use
     * with a service client.
     *
     * @param name - The initial value of the name to use in authentication.
     * @param key - The initial value of the key to use in authentication.
     */
    constructor(name: string, key: string);
    /**
     * Change the value of the key.
     *
     * Updates will take effect upon the next request after
     * updating the key value.
     *
     * @param newName - The new name value to be used.
     * @param newKey - The new key value to be used.
     */
    update(newName: string, newKey: string): void;
}

/**
 * A static-signature-based credential that supports updating
 * the underlying signature value.
 */
export declare class AzureSASCredential implements SASCredential {
    private _signature;
    /**
     * The value of the shared access signature to be used in authentication
     */
    get signature(): string;
    /**
     * Create an instance of an AzureSASCredential for use
     * with a service client.
     *
     * @param signature - The initial value of the shared access signature to use in authentication
     */
    constructor(signature: string);
    /**
     * Change the value of the signature.
     *
     * Updates will take effect upon the next request after
     * updating the signature value.
     *
     * @param newSignature - The new shared access signature value to be used
     */
    update(newSignature: string): void;
}

/**
 * Defines options for TokenCredential.getToken.
 */
export declare interface GetTokenOptions {
    /**
     * The signal which can be used to abort requests.
     */
    abortSignal?: AbortSignalLike;
    /**
     * Options used when creating and sending HTTP requests for this operation.
     */
    requestOptions?: {
        /**
         * The number of milliseconds a request can take before automatically being terminated.
         */
        timeout?: number;
    };
    /**
     * Options used when tracing is enabled.
     */
    tracingOptions?: {
        /**
         * Tracing Context for the current request.
         */
        tracingContext?: TracingContext;
    };
    /**
     * Claim details to perform the Continuous Access Evaluation authentication flow
     */
    claims?: string;
    /**
     * Indicates whether to enable the Continuous Access Evaluation authentication flow
     */
    enableCae?: boolean;
    /**
     * Allows specifying a tenantId. Useful to handle challenges that provide tenant Id hints.
     */
    tenantId?: string;
    /**
     * Options for Proof of Possession token requests
     */
    proofOfPossessionOptions?: {
        /**
         * The nonce value required for PoP token requests.
         * This is typically retrieved from the WWW-Authenticate header of a 401 challenge response.
         * This is used in combination with {@link resourceRequestUrl} and {@link resourceRequestMethod} to generate the PoP token.
         */
        nonce: string;
        /**
         * The HTTP method of the request.
         * This is used in combination with {@link resourceRequestUrl} and {@link nonce} to generate the PoP token.
         */
        resourceRequestMethod: HttpMethods;
        /**
         * The URL of the request.
         * This is used in combination with {@link resourceRequestMethod} and {@link nonce} to generate the PoP token.
         */
        resourceRequestUrl: string;
    };
}

export { HttpMethods }

/**
 * Tests an object to determine whether it implements KeyCredential.
 *
 * @param credential - The assumed KeyCredential to be tested.
 */
export declare function isKeyCredential(credential: unknown): credential is KeyCredential;

/**
 * Tests an object to determine whether it implements NamedKeyCredential.
 *
 * @param credential - The assumed NamedKeyCredential to be tested.
 */
export declare function isNamedKeyCredential(credential: unknown): credential is NamedKeyCredential;

/**
 * Tests an object to determine whether it implements SASCredential.
 *
 * @param credential - The assumed SASCredential to be tested.
 */
export declare function isSASCredential(credential: unknown): credential is SASCredential;

/**
 * Tests an object to determine whether it implements TokenCredential.
 *
 * @param credential - The assumed TokenCredential to be tested.
 */
export declare function isTokenCredential(credential: unknown): credential is TokenCredential;

/**
 * Represents a credential defined by a static API key.
 */
export declare interface KeyCredential {
    /**
     * The value of the API key represented as a string
     */
    readonly key: string;
}

/**
 * Represents a credential defined by a static API name and key.
 */
export declare interface NamedKeyCredential {
    /**
     * The value of the API key represented as a string
     */
    readonly key: string;
    /**
     * The value of the API name represented as a string.
     */
    readonly name: string;
}

/**
 * Represents a credential defined by a static shared access signature.
 */
export declare interface SASCredential {
    /**
     * The value of the shared access signature represented as a string
     */
    readonly signature: string;
}

/**
 * Represents a credential capable of providing an authentication token.
 */
export declare interface TokenCredential {
    /**
     * Gets the token provided by this credential.
     *
     * This method is called automatically by Azure SDK client libraries. You may call this method
     * directly, but you must also handle token caching and token refreshing.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null>;
}

/**
 * An interface structurally compatible with OpenTelemetry.
 */
export declare interface TracingContext {
    /**
     * Get a value from the context.
     *
     * @param key - key which identifies a context value
     */
    getValue(key: symbol): unknown;
    /**
     * Create a new context which inherits from this context and has
     * the given key set to the given value.
     *
     * @param key - context key for which to set the value
     * @param value - value to set for the given key
     */
    setValue(key: symbol, value: unknown): TracingContext;
    /**
     * Return a new context which inherits from this context but does
     * not contain a value for the given key.
     *
     * @param key - context key for which to clear a value
     */
    deleteValue(key: symbol): TracingContext;
}

export { }
