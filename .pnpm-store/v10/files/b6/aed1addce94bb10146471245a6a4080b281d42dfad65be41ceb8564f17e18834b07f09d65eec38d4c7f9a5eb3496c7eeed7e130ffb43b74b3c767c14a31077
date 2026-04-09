/// <reference types="node" />

import { GenericAbortSignal as AbortSignal_2 } from 'axios';
import { AxiosInstance } from 'axios';
import type { CookieJar } from 'tough-cookie';
import { Debugger } from 'debug';
import { OutgoingHttpHeaders } from 'http';
import { Stream } from 'stream';

export { AbortSignal_2 as AbortSignal }

/**
 * Checks for at least one of the given elements being defined.
 *
 * @param args - The spread of arguments to check
 * @returns true if one or more are defined; false if all are undefined
 */
export declare function atLeastOne(...args: any): boolean;

/**
 * Verifies that no more than one of the given elements are defined.
 * Returns true if one or none are defined, and false otherwise.
 *
 * @param args - The spread of arguments to check
 * @returns  false if more than one elements are defined, true otherwise
 */
export declare function atMostOne(...args: any): boolean;

/**
 * The request object containing the headers property that
 * authentication information will be added to.
 */
declare interface AuthenticateOptions {
    /**
     * Headers to augment with authentication information.
     */
    headers?: OutgoingHttpHeaders;
    [propName: string]: any;
}

/**
 * Base Authenticator class for other Authenticators to extend. Not intended
 * to be used as a stand-alone authenticator.
 */
export declare class Authenticator implements AuthenticatorInterface {
    /**
     * Constants that define the various authenticator types.
     */
    static AUTHTYPE_BASIC: string;
    static AUTHTYPE_BEARERTOKEN: string;
    static AUTHTYPE_IAM: string;
    static AUTHTYPE_IAM_ASSUME: string;
    static AUTHTYPE_CONTAINER: string;
    static AUTHTYPE_CP4D: string;
    static AUTHTYPE_NOAUTH: string;
    static AUTHTYPE_VPC: string;
    static AUTHTYPE_MCSP: string;
    static AUTHTYPE_MCSPV2: string;
    static AUTHTYPE_UNKNOWN: string;
    /**
     * Create a new Authenticator instance.
     *
     * @throws Error: the "new" keyword was not used to construct the authenticator.
     */
    constructor();
    /**
     * Augment the request with authentication information.
     *
     * @param requestOptions - The request to augment with authentication information.
     * @throws Error: The authenticate method was not implemented by a subclass.
     */
    authenticate(requestOptions: AuthenticateOptions): Promise<void>;
    /**
     * Retrieves the authenticator's type.
     * The returned value will be the same string that is used
     * when configuring an instance of the authenticator with the
     * \<service_name\>_AUTH_TYPE configuration property
     * (e.g. "basic", "iam", etc.).
     * This function should be overridden in each authenticator
     * implementation class that extends this class.
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

/**
 * This interface defines the common methods associated with an Authenticator
 * implementation.
 */
export declare interface AuthenticatorInterface {
    /**
     * Add authentication information to the specified request.
     *
     * @param requestOptions - The request to which authentication information is added
     * (in the headers field).
     */
    authenticate(requestOptions: AuthenticateOptions): Promise<void>;
    /**
     * Returns a string that indicates the authentication type.
     */
    authenticationType(): string;
}

/** Configuration options for token-based authentication. */
declare type BaseOptions = {
    /** Headers to be sent with every outbound HTTP requests to token services. */
    headers?: OutgoingHttpHeaders;
    /**
     * A flag that indicates whether verification of the token server's SSL
     * certificate should be disabled or not.
     */
    disableSslVerification?: boolean;
    /** Endpoint for HTTP token requests. */
    url?: string;
    /** Allow additional request config parameters */
    [propName: string]: any;
};

/**
 * Common functionality shared by generated service classes.
 *
 * The base service authenticates requests via its authenticator, and sends
 * them to the service endpoint.
 */
export declare class BaseService {
    static DEFAULT_SERVICE_URL: string;
    static DEFAULT_SERVICE_NAME: string;
    protected baseOptions: BaseServiceOptions;
    private authenticator;
    private requestWrapperInstance;
    private defaultUserAgent;
    /**
     * Configuration values for a service.
     *
     * @param userOptions - the configuration options to set on the service instance.
     * This should be an object with the following fields:
     * - authenticator: (required) an Object used to authenticate requests to the service.
     * - serviceUrl: (optional) the base url to use when contacting the service.
     *   The base url may differ between IBM Cloud regions.
     * - headers: (optional) a set of HTTP headers that should be included with every request sent to the service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the server's SSL certificate should be
     *   disabled or not.
     */
    constructor(userOptions: UserOptions);
    /**
     * Get the instance of the authenticator set on the service.
     *
     * @returns the Authenticator instance
     */
    getAuthenticator(): any;
    /**
     * Set the service URL to send requests to.
     *
     * @param url - the base URL for the service.
     */
    setServiceUrl(url: string): void;
    /**
     * Set the HTTP headers to be sent in every request.
     *
     * @param headers - the map of headers to include in requests.
     */
    setDefaultHeaders(headers: OutgoingHttpHeaders): void;
    /**
     * Turn request body compression on or off.
     *
     * @param setting - Will turn it on if 'true', off if 'false'.
     */
    setEnableGzipCompression(setting: boolean): void;
    /**
     * Get the Axios instance set on the service.
     * All requests will be made using this instance.
     */
    getHttpClient(): AxiosInstance;
    /**
     * Enable retries for unfulfilled requests.
     *
     * @param retryOptions - the configuration for retries
     */
    enableRetries(retryOptions?: RetryOptions): void;
    /**
     * Disables retries.
     */
    disableRetries(): void;
    /**
     * Applies a given modifier function on a model object.
     * Since the model object can be a map, or an array, or a model,
     * these types needs different handling.
     * Considering whether the input object is a map happens with an explicit parameter.
     * @param input - the input model object
     * @param converterFn - the function that is applied on the input object
     * @param isMap - is `true` when the input object should be handled as a map
     */
    static convertModel(input: any, converterFn: any, isMap?: boolean): any;
    /**
     * Configure the service using external configuration
     *
     * @param serviceName - the name of the service. This will be used to read from external
     * configuration.
     */
    protected configureService(serviceName: string): void;
    /**
     * Wrapper around `sendRequest` that enforces the request will be authenticated.
     *
     * @param parameters - Service request options passed in by user.
     * This should be an object with the following fields:
     * - options.method: the http method
     * - options.url: the path portion of the URL to be appended to the serviceUrl
     * - options.path: the path parameters to be inserted into the URL
     * - options.qs: the querystring to be included in the URL
     * - options.body: the data to be sent as the request body
     * - options.form: an object containing the key/value pairs for a www-form-urlencoded request.
     * - options.formData: an object containing the contents for a multipart/form-data request
     *   The following processing is performed on formData values:
     *     - string: no special processing -- the value is sent as is
     *     - object: the value is converted to a JSON string before insertion into the form body
     *     - NodeJS.ReadableStream|Buffer|FileWithMetadata: sent as a file, with any associated metadata
     *     - array: each element of the array is sent as a separate form part using any special processing as described above
     * - defaultOptions.serviceUrl: the base URL of the service
     * - defaultOptions.headers: additional HTTP headers to be sent with the request
     * @returns a Promise
     */
    protected createRequest(parameters: any): Promise<any>;
    /**
     * Wrapper around `createRequest` that enforces arrived response to be deserialized.
     * @param parameters - see `parameters` in `createRequest`
     * @param deserializerFn - the deserializer function that is applied on the response object
     * @param isMap - is `true` when the response object should be handled as a map
     * @returns a Promise
     */
    protected createRequestAndDeserializeResponse(parameters: any, deserializerFn: (any: any) => any, isMap?: boolean): Promise<any>;
    private readOptionsFromExternalConfig;
    private static convertArray;
    private static convertMap;
}

/**
 * Additional service configuration.
 */
declare interface BaseServiceOptions extends UserOptions {
    /** Querystring to be sent with every request. If not a string will be stringified. */
    qs?: any;
    enableRetries?: boolean;
    maxRetries?: number;
    retryInterval?: number;
}

/**
 * The BasicAuthenticator is used to add basic authentication information to
 *   requests.
 *
 * Basic Authorization will be sent as an Authorization header in the form:
 *
 *     Authorization: Basic \<encoded username and password\>
 *
 */
export declare class BasicAuthenticator extends Authenticator {
    protected requiredOptions: string[];
    protected authHeader: {
        Authorization: string;
    };
    /**
     * Create a new BasicAuthenticator instance.
     *
     * @param options - Configuration options for basic authentication.
     * This should be an object containing these fields:
     * - username: the username portion of basic authentication
     * - password: the password portion of basic authentication
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options: Options);
    /**
     * Add basic authentication information to `requestOptions`. The basic authentication information
     * will be set in the Authorization property of `requestOptions.headers` in the form:
     *
     *     Authorization: Basic \<encoded username and password\>
     *
     * @param requestOptions - The request to augment with authentication information.
     */
    authenticate(requestOptions: AuthenticateOptions): Promise<void>;
    /**
     * Returns the authenticator's type ('basic').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

/**
 * The BearerTokenAuthenticator will set a user-provided bearer token
 *   in requests.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export declare class BearerTokenAuthenticator extends Authenticator {
    protected requiredOptions: string[];
    private bearerToken;
    /**
     * Create a new BearerTokenAuthenticator instance.
     *
     * @param options - Configuration options for bearer authentication.
     * This should be an object containing the "bearerToken" field.
     *
     * @throws Error: the options.bearerToken field is not valid, or unspecified
     */
    constructor(options: Options_2);
    /**
     * Set a new bearer token to be sent in subsequent requests.
     *
     * @param bearerToken - The bearer token that will be sent in service
     *   requests.
     */
    setBearerToken(bearerToken: string): void;
    /**
     * Add a bearer token to `requestOptions`. The bearer token information
     * will be set in the Authorization property of "requestOptions.headers" in the form:
     *
     *      Authorization: Bearer \<bearer-token\>
     *
     * @param requestOptions - The request to augment with authentication information.
     */
    authenticate(requestOptions: AuthenticateOptions): Promise<void>;
    /**
     * Returns the authenticator's type ('bearertoken').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

/**
 * This function builds a `form-data` object for each file parameter.
 * @param fileParam - The FileWithMetadata instance that contains the file information
 * @returns the FileObject instance
 */
export declare function buildRequestFileObject(fileParam: FileWithMetadata): Promise<FileObject>;

/**
 * Checks credentials for common user mistakes of copying \{, \}, or \" characters from the documentation
 *
 * @param obj - the options object holding credentials
 * @param credsToCheck - an array containing the keys of the credentials to check for problems
 * @returns a string with the error message if there were problems, null if not
 */
export declare function checkCredentials(obj: any, credsToCheck: string[]): Error | null;

/**
 * The CloudPakForDataAuthenticator will either use a username/password pair or a username/apikey pair to obtain
 * a bearer token from a token server.  When the bearer token expires, a new token is obtained from the token server.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export declare class CloudPakForDataAuthenticator extends TokenRequestBasedAuthenticator {
    protected requiredOptions: string[];
    protected tokenManager: Cp4dTokenManager;
    private username;
    private password;
    private apikey;
    /**
     * Create a new CloudPakForDataAuthenticator instance.
     *
     * @param options - Configuration options for CloudPakForData authentication.
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service
     * - username: (required) the username used to obtain a bearer token
     * - password: (optional) the password used to obtain a bearer token (required if apikey is not specified)
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified)
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the username, password, and/or url are not valid, or unspecified, for Cloud Pak For Data token requests.
     */
    constructor(options: Options_4);
    /**
     * Returns the authenticator's type ('cp4d').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

/**
 * (C) Copyright IBM Corp. 2019, 2024.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Compute and return a Basic Authorization header from a username and password.
 *
 * @param username - The username or client id
 * @param password - The password or client secret
 * @returns a Basic Auth header with format "Basic <encoded-credentials>"
 */
export declare function computeBasicAuthHeader(username: string, password: string): string;

export declare function constructFilepath(filepath: string): string;

/**
 * Constructs a service URL by formatting a parameterized URL.
 *
 * @param parameterizedUrl - a URL that contains variable placeholders, e.g. '\{scheme\}://ibm.com'.
 * @param defaultUrlVariables - a Map of variable names to default values.
 *  Each variable in the parameterized URL must have a default value specified in this map.
 * @param providedUrlVariables - a Map of variable names to desired values.
 *  If a variable is not provided in this map, the default variable value will be used instead.
 * @returns the formatted URL with all variable placeholders replaced by values.
 */
export declare function constructServiceUrl(parameterizedUrl: string, defaultUrlVariables: Map<string, string>, providedUrlVariables: Map<string, string> | null): string;

/**
 * The ContainerAuthenticator will read a compute resource token from the file system
 * and use this value to obtain a bearer token from the IAM token server.  When the bearer
 * token expires, a new token is obtained from the token server.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export declare class ContainerAuthenticator extends IamRequestBasedAuthenticator {
    protected tokenManager: ContainerTokenManager;
    private crTokenFilename;
    private iamProfileName;
    private iamProfileId;
    /**
     *
     * Create a new ContainerAuthenticator instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - crTokenFilename: (optional) the file containing the compute resource token
     * - iamProfileName: (optional) the name of the IAM trusted profile associated with the compute resource token (required if iamProfileId is not specified)
     * - iamProfileId]: (optional) the ID of the IAM trusted profile associated with the compute resource token (required if iamProfileName is not specified)
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options: Options_8);
    /**
     * Setter for the filename of the compute resource token.
     * @param crTokenFilename - A string containing a path to the CR token file
     */
    setCrTokenFilename(crTokenFilename: string): void;
    /**
     * Setter for the "profile_name" parameter to use when fetching the bearer token from the IAM token server.
     * @param iamProfileName - the name of the IAM trusted profile
     */
    setIamProfileName(iamProfileName: string): void;
    /**
     * Setter for the "profile_id" parameter to use when fetching the bearer token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    setIamProfileId(iamProfileId: string): void;
    /**
     * Returns the authenticator's type ('container').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
    /**
     * Return the most recently stored refresh token.
     *
     * @returns the refresh token string
     */
    getRefreshToken(): string;
}

/**
 * The ContainerTokenManager retrieves a compute resource token from a file on the container. This token
 * is used to perform the necessary interactions with the IAM token service to obtain and store a suitable
 * bearer (access) token.
 */
export declare class ContainerTokenManager extends IamRequestBasedTokenManager {
    private crTokenFilename;
    private iamProfileName;
    private iamProfileId;
    /**
     *
     * Create a new ContainerTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service (default: "https://iam.cloud.ibm.com")
     * - crTokenFilename: (optional) the file containing the compute resource token (default: "/var/run/secrets/tokens/vault-token")
     * - iamProfileName: (optional) the name of the IAM trusted profile associated with the compute resource token (required if iamProfileId is not specified)
     * - iamProfileId]: (optional) the ID of the IAM trusted profile associated with the compute resource token (required if iamProfileName is not specified)
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     *
     * @throws Error: the configuration options were invalid
     */
    constructor(options: Options_7);
    /**
     * Sets the "crTokenFilename" field
     * @param crTokenFilename - the name of the file containing the CR token
     */
    setCrTokenFilename(crTokenFilename: string): void;
    /**
     * Sets the name of the IAM trusted profile to use when obtaining an access token from the IAM token server.
     * @param iamProfileName - the name of the IAM trusted profile
     */
    setIamProfileName(iamProfileName: string): void;
    /**
     * Sets the ID of the IAM trusted profile to use when obtaining an access token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    setIamProfileId(iamProfileId: string): void;
    /**
     * Returns the most recently stored refresh token.
     *
     * @returns the refresh token
     */
    getRefreshToken(): string;
    /**
     * Request an IAM token using a compute resource token.
     */
    protected requestToken(): Promise<any>;
    /**
     * Retrieves the CR token from a file using this search order:
     * 1. User-specified filename (if specified)
     * 2. Default file #1 (/var/run/secrets/tokens/vault-token)
     * 3. Default file #2 (/var/run/secrets/tokens/sa-token)
     * 4. Default file #3 (/var/run/secrets/codeengine.cloud.ibm.com/compute-resource-token/token)
     * First one found wins.
     *
     * @returns the CR token value as a string
     */
    protected getCrToken(): string;
}

export declare const contentType: {
    fromFilename: (file: String | File | FileObject | NodeJS.ReadableStream | Buffer) => string;
    fromHeader: (buffer: Buffer) => string;
};

/**
 * Token Manager of CloudPak for data.
 *
 * The Token Manager performs basic auth with a username and password
 * to acquire CP4D tokens.
 */
export declare class Cp4dTokenManager extends JwtTokenManager {
    protected requiredOptions: string[];
    private username;
    private password;
    private apikey;
    /**
     * Create a new Cp4dTokenManager instance.
     *
     * @param options - Configuration options
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service
     * - username: (required) the username used to obtain a bearer token
     * - password: (optional) the password used to obtain a bearer token (required if apikey is not specified)
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified)
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the configuration options were invalid.
     */
    constructor(options: Options_3);
    protected requestToken(): Promise<any>;
}

export declare function fileExistsAtPath(filepath: string): boolean;

/**
 * (C) Copyright IBM Corp. 2014, 2023.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
export declare interface FileObject {
    value: NodeJS.ReadableStream | Buffer | string;
    options?: FileOptions;
}

export declare interface FileOptions {
    filename?: string;
    contentType?: string;
}

export declare interface FileStream extends NodeJS.ReadableStream {
    path: string | Buffer;
}

export declare interface FileWithMetadata {
    data: NodeJS.ReadableStream | Buffer;
    filename: string;
    contentType: string;
}

/**
 * Look for external configuration of authenticator.
 *
 * Try to get authenticator from external sources, with the following priority:
 * 1. Credentials file (ibm-credentials.env)
 * 2. Environment variables
 * 3. VCAP Services (Cloud Foundry)
 *
 * @param serviceName - the service name prefix.
 *
 */
export declare function getAuthenticatorFromEnvironment(serviceName: string): Authenticator;

/**
 * This function retrieves the content type of the input.
 * @param inputData - The data to retrieve content type for.
 * @returns the content type of the input.
 */
export declare function getContentType(inputData: NodeJS.ReadableStream | Buffer): Promise<string>;

/**
 * Gets the current time.
 *
 * @returns the current time in seconds.
 */
export declare function getCurrentTime(): number;

/**
 * Returns the first match from formats that is key the params map
 * otherwise null
 * @param  params - The parameters.
 * @param  requires - The keys we want to check
 */
export declare function getFormat(params: {
    [key: string]: any;
}, formats: string[]): string;

/**
 * Validates that all required params are provided
 * @param params - the method parameters.
 * @param requires - the required parameter names.
 * @returns null if no errors found, otherwise an Error instance
 */
export declare function getMissingParams(params: {
    [key: string]: any;
}, requires: string[]): null | Error;

/**
 * Return a new logger, formatted with a particular name. The logging functions, in
 * order of increasing verbosity, are: `error`, `warn`, `info`, `verbose`, and `debug`.
 *
 * The logger will be an instance of the `debug` package and utilizes its support for
 * configuration with environment variables.
 *
 * Additionally, the logger will be turned on automatically if the "NODE_DEBUG"
 * environment variable is set to "axios".
 *
 * @param moduleName - the namespace for the logger. The name will appear in
 * the logs and it will be the name used for configuring the log level.
 *
 * @returns the new logger
 */
export declare function getNewLogger(moduleName: string): SDKLogger;

/**
 * Return a query parameter value from a URL
 *
 * @param urlStr - the url string.
 * @param param - the name of the query parameter whose value should be returned
 * @returns the value of the "param" query parameter
 */
export declare function getQueryParam(urlStr: string, param: string): string;

/**
 * The IamAssumeAuthenticator obtains an IAM access token using the IAM "get-token"
 * operation's "assume" grant type. The authenticator obtains an initial IAM access
 * token from a user-supplied apikey, then exchanges this initial IAM access token
 * for another IAM access token that has "assumed the identity" of the specified
 * trusted profile.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export declare class IamAssumeAuthenticator extends IamRequestBasedAuthenticatorImmutable {
    protected tokenManager: IamAssumeTokenManager;
    /**
     *
     * Create a new IamAssumeAuthenticator instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - apikey: (required) the IAM api key for initial token request
     * - iamProfileId: (optional) the ID of the trusted profile to use
     * - iamProfileCrn: (optional) the CRN of the trusted profile to use
     * - iamProfileName: (optional) the name of the trusted profile to use (must be specified with iamAccountId)
     * - iamAccountId: (optional) the ID of the account the trusted profile is in (must be specified with iamProfileName)
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options: Options_16);
    /**
     * Returns the authenticator's type ('iamAssume').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

/**
 * The IamAssumeTokenManager takes an api key, along with trusted profile information, and performs
 * the necessary interactions with the IAM token service to obtain and store a suitable bearer token
 * that "assumes" the identify of the trusted profile.
 */
export declare class IamAssumeTokenManager extends IamRequestBasedTokenManager {
    protected requiredOptions: string[];
    private iamProfileId;
    private iamProfileCrn;
    private iamProfileName;
    private iamAccountId;
    private iamDelegate;
    /**
     *
     * Create a new IamAssumeTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - apikey: (required) the IAM api key
     * - iamProfileId: (optional) the ID of the trusted profile to use
     * - iamProfileCrn: (optional) the CRN of the trusted profile to use
     * - iamProfileName: (optional) the name of the trusted profile to use (must be specified with iamAccountId)
     * - iamAccountId: (optional) the ID of the account the trusted profile is in (must be specified with iamProfileName)
     * - url: (optional) the endpoint URL for the IAM token service (default value: "https://iam.cloud.ibm.com")
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options: Options_15);
    /**
     * Request an IAM token using a standard access token and a trusted profile.
     */
    protected requestToken(): Promise<any>;
    /**
     * Extend this method from the parent class to erase the refresh token from
     * the class - we do not want to expose it for IAM Assume authentication.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    protected saveTokenInfo(tokenResponse: any): void;
    /**
     * Sets the IAM "scope" value.
     * This value is sent as the "scope" form parameter in the IAM delegate request.
     *
     * @param scope - a space-separated string that contains one or more scope names
     */
    setScope(scope: string): void;
    /**
     * Sets the IAM "clientId" and "clientSecret" values for the IAM delegate.
     *
     * @param clientId - the client id.
     * @param clientSecret - the client secret.
     */
    setClientIdAndSecret(clientId: string, clientSecret: string): void;
    /**
     * Sets the "disableSslVerification" property for the IAM delegate.
     *
     * @param value - the new value for the disableSslVerification property
     */
    setDisableSslVerification(value: boolean): void;
    /**
     * Sets the headers to be included in the IAM delegate's requests.
     *
     * @param headers - the set of headers to send with each request to the token server
     */
    setHeaders(headers: OutgoingHttpHeaders): void;
}

/**
 * The IamAuthenticator will use the user-supplied `apikey`
 * value to obtain a bearer token from a token server.  When the bearer token
 * expires, a new token is obtained from the token server. If specified, the
 * optional, mutually inclusive "clientId" and "clientSecret" pair can be used to
 * influence rate-limiting for requests to the IAM token server.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export declare class IamAuthenticator extends IamRequestBasedAuthenticator {
    protected requiredOptions: string[];
    protected tokenManager: IamTokenManager;
    private apikey;
    /**
     *
     * Create a new IamAuthenticator instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - apikey: (required) the IAM api key
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options: Options_6);
    /**
     * Returns the authenticator's type ('iam').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
    /**
     * Return the most recently stored refresh token.
     *
     * @returns the refresh token string
     */
    getRefreshToken(): string;
}

/**
 * The IamRequestBasedAuthenticator provides shared configuration and functionality
 * for authenticators that interact with the IAM token service. This authenticator
 * is not meant for use on its own.
 */
export declare class IamRequestBasedAuthenticator extends IamRequestBasedAuthenticatorImmutable {
    /**
     * Setter for the mutually inclusive "clientId" and the "clientSecret" fields.
     * @param clientId - the "clientId" value used to form a Basic Authorization header for IAM token requests
     * @param clientSecret - the "clientSecret" value used to form a Basic Authorization header for IAM token requests
     */
    setClientIdAndSecret(clientId: string, clientSecret: string): void;
    /**
     * Setter for the "scope" parameter to use when fetching the bearer token from the IAM token server.
     * @param scope - (optional) a space-separated string that specifies one or more scopes to be
     * associated with IAM token requests
     */
    setScope(scope: string): void;
    /**
     * Set the flag that indicates whether verification of the server's SSL
     * certificate should be disabled or not.
     *
     * @param value - a flag that indicates whether verification of the
     *   token server's SSL certificate should be disabled or not.
     */
    setDisableSslVerification(value: boolean): void;
    /**
     * Set headers.
     *
     * @param headers - a set of HTTP headers to be sent with each outbound token server request.
     * Overwrites previous default headers.
     */
    setHeaders(headers: OutgoingHttpHeaders): void;
}

/**
 * The IamRequestBasedAuthenticatorImmutable provides shared configuration and functionality
 * for authenticators that interact with the IAM token service. This authenticator
 * is not meant for use on its own.
 */
declare class IamRequestBasedAuthenticatorImmutable extends TokenRequestBasedAuthenticatorImmutable {
    protected tokenManager: IamRequestBasedTokenManager;
    protected clientId: string;
    protected clientSecret: string;
    protected scope: string;
    /**
     *
     * Create a new IamRequestBasedAuthenticatorImmutable instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options: IamRequestOptions_2);
}

/**
 * The IamRequestBasedTokenManager class contains code relevant to any token manager that
 * interacts with the IAM service to manage a token. It stores information relevant to all
 * IAM requests, such as the client ID and secret, and performs the token request with a set
 * of request options common to any IAM token management scheme. It is intended that this
 * class be extended with specific implementations.
 */
export declare class IamRequestBasedTokenManager extends JwtTokenManager {
    protected clientId: string;
    protected clientSecret: string;
    protected scope: string;
    protected refreshToken: string;
    protected formData: any;
    /**
     *
     * Create a new IamRequestBasedTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service (default value: "https://iam.cloud.ibm.com")
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options: IamRequestOptions);
    /**
     * Sets the IAM "scope" value.
     * This value is sent as the "scope" form parameter within the request sent to the IAM token service.
     *
     * @param scope - a space-separated string that contains one or more scope names
     */
    setScope(scope: string): void;
    /**
     * Sets the IAM "clientId" and "clientSecret" values.
     * These values are used to compute the Authorization header used
     * when retrieving the IAM access token.
     * If these values are not set, no Authorization header will be
     * set on the request (it is not required).
     *
     * @param clientId - the client id.
     * @param clientSecret - the client secret.
     */
    setClientIdAndSecret(clientId: string, clientSecret: string): void;
    /**
     * Extend this method from the parent class to extract the refresh token from
     * the request and save it.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    protected saveTokenInfo(tokenResponse: any): void;
    /**
     * Request an IAM access token using an API key.
     *
     * @returns Promise
     */
    protected requestToken(): Promise<any>;
    /**
     * Returns true iff the currently-cached IAM access token is expired.
     * We'll consider an access token as expired when we reach its IAM server-reported
     * expiration time minus our expiration window (10 secs).
     * We do this to avoid using an access token that might expire in the middle of a long-running
     * transaction within an IBM Cloud service.
     *
     * @returns true if the token has expired, false otherwise
     */
    protected isTokenExpired(): boolean;
}

/** Configuration options for IAM token retrieval. */
export declare interface IamRequestOptions extends JwtTokenManagerOptions {
    clientId?: string;
    clientSecret?: string;
    scope?: string;
}

/** Configuration options for IAM Request based authentication. */
declare interface IamRequestOptions_2 extends BaseOptions {
    /**
     * The `clientId` and `clientSecret` fields are used to form a "basic"
     * authorization header for IAM token requests.
     */
    clientId?: string;
    /**
     * The `clientId` and `clientSecret` fields are used to form a "basic"
     * authorization header for IAM token requests.
     */
    clientSecret?: string;
    /**
     * The "scope" parameter to use when fetching the bearer token from the IAM token server.
     */
    scope?: string;
}

/**
 * The IamTokenManager takes an api key and performs the necessary interactions with
 * the IAM token service to obtain and store a suitable bearer token. Additionally, the IamTokenManager
 * will retrieve bearer tokens via basic auth using a supplied "clientId" and "clientSecret" pair.
 */
export declare class IamTokenManager extends IamRequestBasedTokenManager {
    protected requiredOptions: string[];
    private apikey;
    /**
     *
     * Create a new IamTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the IAM token service (default value: "https://iam.cloud.ibm.com")
     * - apikey: (required) the IAM api key
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options: Options_5);
    /**
     * Returns the most recently stored refresh token.
     *
     * @returns the refresh token
     */
    getRefreshToken(): string;
}

export declare function isEmptyObject(obj: any): boolean;

export declare function isFileData(obj: any): obj is NodeJS.ReadableStream | Buffer;

export declare function isFileWithMetadata(obj: any): obj is FileWithMetadata;

/**
 * Return true if 'text' is html
 * @param  text - The 'text' to analyze
 * @returns true if 'text' has html tags
 */
export declare function isHTML(text: string): boolean;

/**
 * Returns true if and only if "mimeType" is a "JSON-like" mime type
 * (e.g. "application/json; charset=utf-8").
 * @param mimeType - the mimeType string
 * @returns true if "mimeType" represents a JSON media type and false otherwise
 */
export declare function isJsonMimeType(mimeType: string): boolean;

/**
 * A class for shared functionality for parsing, storing, and requesting
 * JWT tokens. Intended to be used as a parent to be extended for token
 * request management. Child classes should implement `requestToken()`
 * to retrieve the bearer token from intended sources.
 */
export declare class JwtTokenManager extends TokenManager {
    protected tokenName: string;
    protected tokenInfo: any;
    /**
     * Create a new JwtTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     */
    constructor(options: JwtTokenManagerOptions);
    /**
     * Request a JWT using an API key.
     *
     * @returns Promise
     */
    protected requestToken(): Promise<any>;
    /**
     * Save the JWT service response and the calculated expiration time to the object's state.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    protected saveTokenInfo(tokenResponse: any): void;
}

/** Configuration options for JWT token retrieval. */
export declare type JwtTokenManagerOptions = TokenManagerOptions;

/**
 * The McspAuthenticator uses an apikey to obtain an access token from the MCSP token server.
 * When the access token expires, a new access token is obtained from the token server.
 * The access token will be added to outbound requests via the Authorization header
 * of the form:    "Authorization: Bearer <access-token>"
 */
export declare class McspAuthenticator extends TokenRequestBasedAuthenticator {
    protected requiredOptions: string[];
    protected tokenManager: McspTokenManager;
    private apikey;
    /**
     * Create a new McspAuthenticator instance.
     *
     * @param options - Configuration options for CloudPakForData authentication.
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified)
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the username, password, and/or url are not valid, or unspecified, for Cloud Pak For Data token requests.
     */
    constructor(options: Options_12);
    /**
     * Returns the authenticator's type ('mcsp').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

/**
 * Token Manager for Multi-Cloud Saas Platform (MCSP) authenticator.
 *
 * The Token Manager will invoke the MCSP token service's 'POST /siusermgr/api/1.0/apikeys/token'
 * operation to obtain an MCSP access token for a user-supplied apikey.
 */
export declare class McspTokenManager extends JwtTokenManager {
    protected requiredOptions: string[];
    private apikey;
    /**
     * Create a new McspTokenManager instance.
     *
     * @param options - Configuration options
     * This should be an object containing these fields:
     * - url: (required) the base endpoint URL for the MCSP token service
     * - apikey: (required) the API key used to obtain the MCSP access token.
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the configuration options were invalid.
     */
    constructor(options: Options_11);
    protected requestToken(): Promise<any>;
}

/**
 * The McspV2Authenticator invokes the MCSP v2 token-exchange operation (POST /api/2.0/\{scopeCollectionType\}/\{scopeId\}/apikeys/token)
 * to obtain an access token for an apikey, and adds the access token to requests via an Authorization header
 * of the form:  "Authorization: Bearer <access-token>"
 */
export declare class McspV2Authenticator extends TokenRequestBasedAuthenticator {
    protected tokenManager: McspV2TokenManager;
    /**
     * Create a new McspV2Authenticator instance.
     *
     * @param options - Configuration options for MCSP v2 authentication.
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service.
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified).
     * - scopeCollectionType: (required) The scope collection type of item(s). Valid values are: "accounts", "subscriptions", "services".
     * - scopeId: (required) the scope identifier of item(s).
     * - includeBuiltinActions: (optional) a flag to include builtin actions in the "actions" claim in the MCSP access token (default: false).
     * - includeCustomActions: (optional) a flag to include custom actions in the "actions" claim in the MCSP access token (default: false).
     * - includeRoles: (optional) a flag to include the "roles" claim in the MCSP access token (default: true).
     * - prefixRoles: (optional) a flag to add a prefix with the scope level where the role is defined in the "roles" claim (default: false).
     * - callerExtClaim: (optional) a map (object) containing keys and values to be injected into the access token as the "callerExt" claim.
     *     The keys used in this map must be enabled in the apikey by setting the "callerExtClaimNames" property when the apikey is created.
     *     This property is typically only used in scenarios involving an apikey with identityType `SERVICEID`.
     * - disableSslVerification: (optional) a flag to disable verification of the token server's SSL certificate; defaults to false.
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service.
     *
     * @throws Error: the input configuration failed validation
     */
    constructor(options: Options_14);
    /**
     * Returns the authenticator's type ('mcspv2').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

/**
 * Token Manager for Multi-Cloud Saas Platform (MCSP) V2 authentication.
 *
 * The McspV2TokenManager will invoke the MCSP token service's 'POST /api/2.0/\{scopeCollectionType\}/\{scopeId\}/apikeys/token'
 * operation to obtain an MCSP access token for an apikey.
 */
export declare class McspV2TokenManager extends JwtTokenManager {
    protected requiredOptions: string[];
    private apikey;
    private scopeCollectionType;
    private scopeId;
    private includeBuiltinActions;
    private includeCustomActions;
    private includeRoles;
    private prefixRoles;
    private callerExtClaim;
    /**
     * Create a new McspV2TokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service.
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified).
     * - scopeCollectionType: (required) The scope collection type of item(s). Valid values are: "accounts", "subscriptions", "services".
     * - scopeId: (required) the scope identifier of item(s).
     * - includeBuiltinActions: (optional) a flag to include builtin actions in the "actions" claim in the MCSP access token (default: false).
     * - includeCustomActions: (optional) a flag to include custom actions in the "actions" claim in the MCSP access token (default: false).
     * - includeRoles: (optional) a flag to include the "roles" claim in the MCSP access token (default: true).
     * - prefixRoles: (optional) a flag to add a prefix with the scope level where the role is defined in the "roles" claim (default: false).
     * - callerExtClaim: (optional) a map (object) containing keys and values to be injected into the access token as the "callerExt" claim.
     *     The keys used in this map must be enabled in the apikey by setting the "callerExtClaimNames" property when the apikey is created.
     *     This property is typically only used in scenarios involving an apikey with identityType `SERVICEID`.
     * - disableSslVerification: (optional) a flag to disable verification of the token server's SSL certificate; defaults to false.
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service.
     *
     * @throws Error: the input configuration failed validation
     */
    constructor(options: Options_13);
    private PATH_TEMPLATE;
    protected requestToken(): Promise<any>;
    /**
     * Parses the Options configuration property named by 'fieldName' as a boolean value.
     * The value in the Options object could be either boolean or string and this function
     * will do its best to parse it correctly.
     * @param options - the Options object containing the configuration
     * @param fieldName - the name of the field to parse as a boolean
     * @param defaultValue - the default value to use in case the specified field is not present in Options
     * @returns boolean the boolean value to be used for the configuration property
     */
    private static parseBoolean;
}

/**
 * NoAuthAuthenticator is a placeholder authenticator implementation which
 * performs no authentication of outgoing REST API requests. It might be
 * useful during development and testing.
 */
export declare class NoAuthAuthenticator extends Authenticator {
    authenticate(requestOptions: AuthenticateOptions): Promise<void>;
    /**
     * Returns the authenticator's type ('noauth').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

/**
 * Checks that exactly one of the arguments provided is defined.
 * Returns true if one argument is defined. Returns false if no
 * argument are defined or if 2 or more are defined.
 *
 * @param args - The spread of arguments to check
 * @returns true if and only if exactly one argument is defined
 */
export declare function onlyOne(...args: any): boolean;

/** Configuration options for basic authentication. */
declare type Options = {
    /** The username to be used in basic authorization. */
    username: string;
    /** The password to be used in basic authorization. */
    password: string;
};

/** Configuration options for VpcInstance authentication. */
declare interface Options_10 extends BaseOptions {
    /** The CRN of the linked trusted IAM profile to be used as the identity of the compute resource */
    iamProfileCrn?: string;
    /** The ID of the linked trusted IAM profile to be used when obtaining the IAM access token */
    iamProfileId?: string;
}

/**
 * Configuration options for MCSP token retrieval.
 */
declare interface Options_11 extends JwtTokenManagerOptions {
    /** The API key used to obtain an access token. */
    apikey: string;
    /** The base endpoint URL for MCSP token requests. */
    url: string;
}

/** Configuration options for Multi-Cloud Saas Platform (MCSP) authentication. */
declare interface Options_12 extends BaseOptions {
    /** The API key used to obtain an MCSP access token. */
    apikey: string;
    /** The URL representing the MCSP token service endpoint. */
    url: string;
}

/**
 * Configuration options for MCSP v2 token retrieval.
 */
declare interface Options_13 extends JwtTokenManagerOptions {
    /**
     * (required) The API key used to obtain an MCSP access token.
     */
    apikey: string;
    /**
     * (required) The URL representing the MCSP token service endpoint.
     */
    url: string;
    /**
     * (required) The scope collection type of item(s).
     * Valid values are: "accounts", "subscriptions", "services".
     */
    scopeCollectionType: string;
    /**
     * (required) The scope identifier of item(s).
     */
    scopeId: string;
    /**
     * (optional) A flag to include builtin actions in the "actions" claim in the MCSP access token (default: false).
     */
    includeBuiltinActions?: boolean;
    /**
     * (optional) A flag to include custom actions in the "actions" claim in the MCSP access token (default: false).
     */
    includeCustomActions?: boolean;
    /**
     * (optional) A flag to include the "roles" claim in the MCSP access token (default: true).
     */
    includeRoles?: boolean;
    /**
     * (optional) A flag to add a prefix with the scope level where the role is defined in the "roles" claim (default: false).
     */
    prefixRoles?: boolean;
    /**
     * (optional) A map (object) containing keys and values to be injected into the access token as the "callerExt" claim.
     * The keys used in this map must be enabled in the apikey by setting the "callerExtClaimNames" property when the apikey is created.
     * This property is typically only used in scenarios involving an apikey with identityType `SERVICEID`.
     */
    callerExtClaim?: object;
}

/** Configuration options for Multi-Cloud Saas Platform (MCSP) v2 authentication. */
declare interface Options_14 extends BaseOptions {
    /**
     * (required) The API key used to obtain an MCSP access token.
     */
    apikey: string;
    /**
     * (required) The URL representing the MCSP token service endpoint.
     */
    url: string;
    /**
     * (required) The scope collection type of item(s).
     * Valid values are: "accounts", "subscriptions", "services".
     */
    scopeCollectionType: string;
    /**
     * (required) The scope identifier of item(s).
     */
    scopeId: string;
    /**
     * (optional) A flag to include builtin actions in the "actions" claim in the MCSP access token (default: false).
     */
    includeBuiltinActions?: boolean;
    /**
     * (optional) A flag to include custom actions in the "actions" claim in the MCSP access token (default: false).
     */
    includeCustomActions?: boolean;
    /**
     * (optional) A flag to include the "roles" claim in the MCSP access token (default: true).
     */
    includeRoles?: boolean;
    /**
     * (optional) A flag to add a prefix with the scope level where the role is defined in the "roles" claim (default: false).
     */
    prefixRoles?: boolean;
    /**
     * (optional) A map (object) containing keys and values to be injected into the access token as the "callerExt" claim.
     * The keys used in this map must be enabled in the apikey by setting the "callerExtClaimNames" property when the apikey is created.
     * This property is typically only used in scenarios involving an apikey with identityType `SERVICEID`.
     */
    callerExtClaim?: object;
}

/** Configuration options for IAM Assume token retrieval. */
declare interface Options_15 extends IamRequestOptions {
    apikey: string;
    iamProfileId?: string;
    iamProfileCrn?: string;
    iamProfileName?: string;
    iamAccountId?: string;
}

/** Configuration options for IAM Assume authentication. */
declare interface Options_16 extends IamRequestOptions_2 {
    /** The IAM api key */
    apikey: string;
    /**
     * Specify exactly one of [iamProfileId, iamProfileCrn, or iamProfileName] to
     * identify the trusted profile whose identity should be used. If iamProfileId
     * or iamProfileCrn is used, the trusted profile must exist in the same account.
     * If and only if iamProfileName is used, then iamAccountId must also be
     * specified to indicate the account that contains the trusted profile.
     */
    iamProfileId?: string;
    iamProfileCrn?: string;
    iamProfileName?: string;
    /**
     * If and only if iamProfileName is used to specify the trusted profile, then
     * iamAccountId must also be specified to indicate the account that contains
     * the trusted profile.
     */
    iamAccountId?: string;
}

/** Configuration options for bearer authentication. */
declare type Options_2 = {
    /** The bearer token to be added to requests. */
    bearerToken: string;
};

/** Configuration options for CP4D token retrieval. */
declare interface Options_3 extends JwtTokenManagerOptions {
    /** The endpoint for CP4D token requests. */
    url: string;
    /** The username used to obtain a bearer token. */
    username: string;
    /** The password used to obtain a bearer token [required if apikey not specified]. */
    password?: string;
    /** The API key used to obtain a bearer token [required if password not specified]. */
    apikey?: string;
}

/** Configuration options for CloudPakForData authentication. */
declare interface Options_4 extends BaseOptions {
    /** The username used to obtain a bearer token. */
    username: string;
    /** The password used to obtain a bearer token [required if apikey not specified]. */
    password?: string;
    /** The API key used to obtain a bearer token [required if password not specified]. */
    apikey?: string;
    /** The URL representing the Cloud Pak for Data token service endpoint. */
    url: string;
}

/** Configuration options for IAM token retrieval. */
declare interface Options_5 extends IamRequestOptions {
    apikey: string;
}

/** Configuration options for IAM authentication. */
declare interface Options_6 extends IamRequestOptions_2 {
    /** The IAM api key */
    apikey: string;
}

/** Configuration options for IAM token retrieval. */
declare interface Options_7 extends IamRequestOptions {
    crTokenFilename?: string;
    iamProfileName?: string;
    iamProfileId?: string;
}

/** Configuration options for IAM authentication. */
declare interface Options_8 extends IamRequestOptions_2 {
    /** The file containing the compute resource token. */
    crTokenFilename?: string;
    /** The IAM profile name associated with the compute resource token. */
    iamProfileName?: string;
    /** The IAM profile ID associated with the compute resource token. */
    iamProfileId?: string;
}

/** Configuration options for VPC token retrieval. */
declare interface Options_9 extends JwtTokenManagerOptions {
    /** The CRN of the linked trusted IAM profile to be used as the identity of the compute resource */
    iamProfileCrn?: string;
    /** The ID of the linked trusted IAM profile to be used when obtaining the IAM access token */
    iamProfileId?: string;
}

/**
 * (C) Copyright IBM Corp. 2019, 2022.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export declare const qs: {
    stringify: (queryParams: Object) => string;
};

/**
 * Copyright 2021, 2024 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Return a config object based on a credentials file. Credentials files can
 * be specified filepath via the environment variable: `IBM_CREDENTIALS_FILE`.
 */
export declare function readCredentialsFile(): any;

export declare function readCrTokenFile(filepath: string): string;

/**
 * Read properties stored in external sources like Environment Variables,
 * the credentials file, VCAP services, etc. and return them as an
 * object. The keys of this object will have the service name prefix removed
 * and will be converted to lower camel case.
 *
 * Only one source will be used at a time.
 *
 * @param serviceName - the service name prefix
 */
export declare function readExternalSources(serviceName: string): any;

/**
 * Removes a given suffix if it exists.
 *
 * @param str - the base string to operate on
 * @param suffix - the suffix to remove, if present
 *
 * @returns the substring of "str" that remains after the suffix is removed
 */
export declare function removeSuffix(str: string, suffix: string): string;

declare class RequestWrapper {
    private axiosInstance;
    private compressRequestData;
    private retryInterceptorId;
    private raxConfig;
    constructor(axiosOptions?: any);
    /**
     * Formats the specified Axios request for debug logging.
     * @param request - the request to be logged
     * @returns the string representation of the request
     */
    private formatAxiosRequest;
    /**
     * Formats the specified Axios response for debug logging.
     * @param response - the response to be logged
     * @returns the string representation of the response
     */
    private formatAxiosResponse;
    /**
     * Formats the specified Axios error for debug logging.
     * @param error - the error to be logged
     * @returns the string representation of the error
     */
    private formatAxiosError;
    /**
     * Formats 'headers' to be included in the debug output
     * like this:
     *    Accept: application/json
     *    Content-Type: application/json
     *    My-Header: my-value
     *    ...
     * @param headers - the headers associated with an Axios request or response
     * @returns the formatted output to be included in the HTTP message traces
     */
    private formatAxiosHeaders;
    /**
     * Formats 'body' (either a string or object/array) to be included in the debug output
     *
     * @param body - a string, object or array that contains the request or response body
     * @returns the formatted output to be included in the HTTP message traces
     */
    private formatAxiosBody;
    setCompressRequestData(setting: boolean): void;
    /**
     * Creates the request.
     * 1. Merge default options with user provided options
     * 2. Checks for missing parameters
     * 3. Encode path and query parameters
     * 4. Call the api
     * @returns ReadableStream|undefined
     * @throws Error
     */
    sendRequest(parameters: any): Promise<any>;
    /**
     * Format error returned by axios
     * @param axiosError - the object returned by axios via rejection
     * @returns the Error object
     */
    formatError(axiosError: any): Error;
    getHttpClient(): AxiosInstance;
    private static getRaxConfig;
    enableRetries(retryOptions?: RetryOptions): void;
    disableRetries(): void;
    /**
     * Returns true iff the previously-failed request contained in "error" should be retried.
     * @param error - an AxiosError instance that contains a previously-failed request
     * @returns true iff the request should be retried
     */
    private static retryPolicy;
    private gzipRequestBody;
}

/**
 * Retry configuration options.
 */
declare interface RetryOptions {
    /**
     * Maximum retries to attempt.
     */
    maxRetries?: number;
    /**
     * Ceiling for the retry delay (in seconds) - delay will not exceed this value.
     */
    maxRetryInterval?: number;
}

export declare interface SDKLogger {
    error: Debugger;
    warn: Debugger;
    info: Debugger;
    verbose: Debugger;
    debug: Debugger;
}

/**
 * Helper method that can be bound to a stream - it captures all of the results, and returns a promise that resolves to the final buffer
 * or array of text chunks
 * Essentially a smaller version of concat-stream wrapped in a promise
 *
 * @param stream - optional stream param for when not bound to an existing stream instance.
 * @returns Promise
 */
export declare function streamToPromise(stream: Stream): Promise<any>;

/**
 * Strips trailing slashes from "url", if present.
 * @param  url - the url string
 * @returns the url with any trailing slashes removed
 */
export declare function stripTrailingSlash(url: string): string;

/**
 * A class for shared functionality for storing, and requesting tokens.
 * Intended to be used as a parent to be extended for token request management.
 * Child classes should implement "requestToken()" to retrieve the token
 * from intended sources and "saveTokenInfo(tokenResponse)" to parse and save
 * token information from the response.
 */
export declare class TokenManager {
    protected url: string;
    protected userAgent: string;
    protected disableSslVerification: boolean;
    protected headers: OutgoingHttpHeaders;
    protected requestWrapperInstance: RequestWrapper;
    protected accessToken: string;
    protected expireTime: number;
    protected refreshTime: number;
    private requestTime;
    private pendingRequests;
    /**
     * Create a new TokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     */
    constructor(options: TokenManagerOptions);
    /**
     * Retrieves a new token using "requestToken()" if there is not a
     * currently stored token from a previous call, or the previous token
     * has expired.
     */
    getToken(): Promise<any>;
    /**
     * Sets the "disableSslVerification" property.
     *
     * @param value - the new value for the disableSslVerification property
     */
    setDisableSslVerification(value: boolean): void;
    /**
     * Sets the headers to be included with each outbound request to the token server.
     *
     * @param headers - the set of headers to send with each request to the token server
     */
    setHeaders(headers: OutgoingHttpHeaders): void;
    /**
     * Paces requests to requestToken().
     *
     * This method pseudo-serializes requests for an access_token
     * when the current token is undefined or expired.
     * The first caller to this method records its `requestTime` and
     * then issues the token request. Subsequent callers will check the
     * `requestTime` to see if a request is active (has been issued within
     * the past 60 seconds), and if so will queue their promise for the
     * active requestor to resolve when that request completes.
     */
    protected pacedRequestToken(): Promise<any>;
    /**
     * Request a token using an API endpoint.
     *
     * @returns Promise
     */
    protected requestToken(): Promise<any>;
    /**
     * Parse and save token information from the response.
     * Save the requested token into field `accessToken`.
     * Calculate expiration and refresh time from the received info
     * and store them in fields `expireTime` and `refreshTime`.
     *
     * @param tokenResponse - the response object from a token service request
     */
    protected saveTokenInfo(tokenResponse: any): void;
    /**
     * Checks if currently-stored token is expired
     */
    protected isTokenExpired(): boolean;
    /**
     * Checks if currently-stored token should be refreshed
     * i.e. past the window to request a new token
     */
    private tokenNeedsRefresh;
}

/** Configuration options for token retrieval. */
export declare type TokenManagerOptions = {
    /** The endpoint for token requests. */
    url?: string;
    /** Headers to be sent with every service token request. */
    headers?: OutgoingHttpHeaders;
    /**
     * A flag that indicates whether verification of
     *   the server's SSL certificate should be disabled or not.
     */
    disableSslVerification?: boolean;
    /** Allow additional request config parameters */
    [propName: string]: any;
};

/**
 * Class for common functionality shared by token-request authenticators.
 * TokenRequestBasedAuthenticators use token managers to retrieve, store,
 * and refresh tokens. Not intended to be used as stand-alone authenticator,
 * but as base class to authenticators that have their own token manager
 * implementations.
 *
 * The token will be added as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export declare class TokenRequestBasedAuthenticator extends TokenRequestBasedAuthenticatorImmutable {
    /**
     * Set the flag that indicates whether verification of the server's SSL
     * certificate should be disabled or not.
     *
     * @param value - a flag that indicates whether verification of the
     *   token server's SSL certificate should be disabled or not.
     */
    setDisableSslVerification(value: boolean): void;
    /**
     * Set headers.
     *
     * @param headers - a set of HTTP headers to be sent with each outbound token server request.
     * Overwrites previous default headers.
     */
    setHeaders(headers: OutgoingHttpHeaders): void;
}

/**
 * Class for common functionality shared by token-request authenticators.
 * Token-request authenticators use token managers to retrieve, store,
 * and refresh tokens. Not intended to be used as stand-alone authenticator,
 * but as base class to authenticators that have their own token manager
 * implementations.
 *
 * The token will be added as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
declare class TokenRequestBasedAuthenticatorImmutable extends Authenticator {
    protected tokenManager: JwtTokenManager;
    protected url: string;
    protected headers: OutgoingHttpHeaders;
    protected disableSslVerification: boolean;
    /**
     * Create a new TokenRequestBasedAuthenticatorImmutable instance with an internal JwtTokenManager.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     */
    constructor(options: BaseOptions);
    /**
     * Adds bearer token information to "requestOptions". The bearer token information
     * will be set in the Authorization property of "requestOptions.headers" in the form:
     *
     *     Authorization: Bearer \<bearer-token\>
     *
     * @param requestOptions - The request to augment with authentication information.
     */
    authenticate(requestOptions: AuthenticateOptions): Promise<void>;
}

/**
 * This function converts an object's keys to lower case.
 * note: does not convert nested keys
 * @param obj - The object to convert the keys of.
 * @returns the object with keys folded to lowercase
 */
export declare function toLowerKeys(obj: Object): Object;

/**
 * Configuration values for a service.
 */
export declare interface UserOptions {
    /** The Authenticator object used to authenticate requests to the service */
    authenticator?: AuthenticatorInterface;
    /** The base url to use when contacting the service. The base url may differ between IBM Cloud regions. */
    serviceUrl?: string;
    /** Default headers that shall be included with every request to the service. */
    headers?: OutgoingHttpHeaders;
    /** The API version date to use with the service, in "YYYY-MM-DD" format. */
    version?: string;
    /** Set to `true` to allow unauthorized requests - not recommended for production use. */
    disableSslVerification?: boolean;
    /** Set your own cookie jar object */
    jar?: CookieJar | boolean;
    /** Deprecated. Use `serviceUrl` instead. */
    url?: string;
    /** Allow additional request config parameters */
    [propName: string]: any;
}

/**
 * Validates "options".
 * @param options - a configuration options object
 * @param requiredOptions - the list of properties that must be present in "options"
 *
 * @throws Error: "options" failed validation
 */
export declare function validateInput(options: any, requiredOptions: string[]): void;

/**
 * Validates that "params" contains a value for each key listed in "requiredParams",
 * and that each key contained in "params" is a valid key listed in "allParams".
 * In essence, we want params to contain only valid keys and we want params
 * to contain at least the required keys.
 *
 * @param params - the "params" object passed into an operation containing method parameters.
 * @param requiredParams - the names of required parameters.
 * If null, then the "required params" check is bypassed.
 * @param allParams - the names of all valid parameters.
 * If null, then the "valid params" check is bypassed.
 * @returns null if no errors found, otherwise an Error instance
 */
export declare function validateParams(params: {
    [key: string]: any;
}, requiredParams: string[], allParams: string[]): null | Error;

/**
 * The VpcInstanceAuthenticator implements an authentication scheme in which it retrieves an "instance identity token"
 * and exchanges that for an IAM access token using the VPC Instance Metadata Service API which is available on the local
 * compute resource (VM). The instance identity token is similar to an IAM apikey, except that it is managed automatically
 * by the compute resource provider (VPC).
 *
 * The resulting IAM access token is then added to outbound requests in an Authorization header
 *
 *      Authorization: Bearer \<access-token\>
 */
export declare class VpcInstanceAuthenticator extends TokenRequestBasedAuthenticator {
    protected tokenManager: VpcInstanceTokenManager;
    private iamProfileCrn;
    private iamProfileId;
    /**
     * Create a new VpcInstanceAuthenticator instance.
     *
     * @param options - Configuration options for VpcInstance authentication.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the VPC Instance Metadata Service (default value: "http://169.254.169.254")
     * - iamProfileCrn: (optional) the CRN of the linked IAM trusted profile to be used to obtain the IAM access token
     * - iamProfileId: (optional) the ID of the linked IAM trusted profile to be used to obtain the IAM access token
     *
     * @remarks
     * At most one of "iamProfileCrn" or "iamProfileId" may be specified. If neither one is specified,
     * then the default IAM profile defined for the compute resource will be used.
     */
    constructor(options: Options_10);
    /**
     * Sets the "iamProfileCrn" value to be used when obtaining an IAM access token
     * @param iamProfileCrn - the CRN of the linked IAM trusted profile to use when obtaining an IAM access token
     */
    setIamProfileCrn(iamProfileCrn: string): void;
    /**
     * Sets the "iamProfileId" value to be used when obtaining an IAM access token
     * @param iamProfileId - the ID of the linked IAM trusted profile to use when obtaining an IAM access token
     */
    setIamProfileId(iamProfileId: string): void;
    /**
     * Returns the authenticator's type ('vpc').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

/**
 * Token Manager for VPC Instance Authentication.
 */
export declare class VpcInstanceTokenManager extends JwtTokenManager {
    private iamProfileCrn;
    private iamProfileId;
    /**
     * Create a new VpcInstanceTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the VPC Instance Metadata Service (default value: "http://169.254.169.254")
     * - iamProfileCrn: (optional) the CRN of the linked IAM trusted profile to be used to obtain the IAM access token
     * - iamProfileId: (optional) the ID of the linked IAM trusted profile to be used to obtain the IAM access token
     *
     * @remarks
     * At most one of "iamProfileCrn" or "iamProfileId" may be specified. If neither one is specified,
     * then the default IAM profile defined for the compute resource will be used.
     */
    constructor(options: Options_9);
    /**
     * Sets the CRN of the IAM trusted profile to use when fetching the access token from the IAM token server.
     * @param iamProfileCrn - the CRN of the IAM trusted profile
     */
    setIamProfileCrn(iamProfileCrn: string): void;
    /**
     * Sets the Id of the IAM trusted profile to use when fetching the access token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    setIamProfileId(iamProfileId: string): void;
    protected requestToken(): Promise<any>;
    private getInstanceIdentityToken;
    /**
     * Returns true iff the currently-cached IAM access token is expired.
     * We'll consider an access token as expired when we reach its IAM server-reported
     * expiration time minus our expiration window (10 secs).
     * We do this to avoid using an access token that might expire in the middle of a long-running
     * transaction within an IBM Cloud service.
     *
     * @returns true if the token has expired, false otherwise
     */
    protected isTokenExpired(): boolean;
}

export { }
