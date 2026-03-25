/// <reference types="node" />
import * as gax from 'google-gax';
import { Callback, CallOptions, Descriptors, ClientOptions, PaginationCallback } from 'google-gax';
import { Transform } from 'stream';
import * as protos from '../../protos/protos';
/**
 *  Secret Manager Service
 *
 *  Manages secrets and operations using those secrets. Implements a REST
 *  model with the following objects:
 *
 *  * {@link google.cloud.secrets.v1beta1.Secret|Secret}
 *  * {@link google.cloud.secrets.v1beta1.SecretVersion|SecretVersion}
 * @class
 * @memberof v1beta1
 */
export declare class SecretManagerServiceClient {
    private _terminated;
    private _opts;
    private _gaxModule;
    private _gaxGrpc;
    private _protos;
    private _defaults;
    auth: gax.GoogleAuth;
    descriptors: Descriptors;
    innerApiCalls: {
        [name: string]: Function;
    };
    pathTemplates: {
        [name: string]: gax.PathTemplate;
    };
    secretManagerServiceStub?: Promise<{
        [name: string]: Function;
    }>;
    /**
     * Construct an instance of SecretManagerServiceClient.
     *
     * @param {object} [options] - The configuration object.
     * The options accepted by the constructor are described in detail
     * in [this document](https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#creating-the-client-instance).
     * The common options are:
     * @param {object} [options.credentials] - Credentials object.
     * @param {string} [options.credentials.client_email]
     * @param {string} [options.credentials.private_key]
     * @param {string} [options.email] - Account email address. Required when
     *     using a .pem or .p12 keyFilename.
     * @param {string} [options.keyFilename] - Full path to the a .json, .pem, or
     *     .p12 key downloaded from the Google Developers Console. If you provide
     *     a path to a JSON file, the projectId option below is not necessary.
     *     NOTE: .pem and .p12 require you to specify options.email as well.
     * @param {number} [options.port] - The port on which to connect to
     *     the remote host.
     * @param {string} [options.projectId] - The project ID from the Google
     *     Developer's Console, e.g. 'grape-spaceship-123'. We will also check
     *     the environment variable GCLOUD_PROJECT for your project ID. If your
     *     app is running in an environment which supports
     *     {@link https://developers.google.com/identity/protocols/application-default-credentials Application Default Credentials},
     *     your project ID will be detected automatically.
     * @param {string} [options.apiEndpoint] - The domain name of the
     *     API remote host.
     * @param {gax.ClientConfig} [options.clientConfig] - Client configuration override.
     *     Follows the structure of {@link gapicConfig}.
     * @param {boolean} [options.fallback] - Use HTTP fallback mode.
     *     In fallback mode, a special browser-compatible transport implementation is used
     *     instead of gRPC transport. In browser context (if the `window` object is defined)
     *     the fallback mode is enabled automatically; set `options.fallback` to `false`
     *     if you need to override this behavior.
     */
    constructor(opts?: ClientOptions);
    /**
     * Initialize the client.
     * Performs asynchronous operations (such as authentication) and prepares the client.
     * This function will be called automatically when any class method is called for the
     * first time, but if you need to initialize it before calling an actual method,
     * feel free to call initialize() directly.
     *
     * You can await on this method if you want to make sure the client is initialized.
     *
     * @returns {Promise} A promise that resolves to an authenticated service stub.
     */
    initialize(): Promise<{
        [name: string]: Function;
    }>;
    /**
     * The DNS address for this API service.
     * @returns {string} The DNS address for this service.
     */
    static get servicePath(): string;
    /**
     * The DNS address for this API service - same as servicePath(),
     * exists for compatibility reasons.
     * @returns {string} The DNS address for this service.
     */
    static get apiEndpoint(): string;
    /**
     * The port for this API service.
     * @returns {number} The default port for this service.
     */
    static get port(): number;
    /**
     * The scopes needed to make gRPC calls for every method defined
     * in this service.
     * @returns {string[]} List of default scopes.
     */
    static get scopes(): string[];
    getProjectId(): Promise<string>;
    getProjectId(callback: Callback<string, undefined, undefined>): void;
    createSecret(request: protos.google.cloud.secrets.v1beta1.ICreateSecretRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecret,
        protos.google.cloud.secrets.v1beta1.ICreateSecretRequest | undefined,
        {} | undefined
    ]>;
    createSecret(request: protos.google.cloud.secrets.v1beta1.ICreateSecretRequest, options: CallOptions, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecret, protos.google.cloud.secrets.v1beta1.ICreateSecretRequest | null | undefined, {} | null | undefined>): void;
    createSecret(request: protos.google.cloud.secrets.v1beta1.ICreateSecretRequest, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecret, protos.google.cloud.secrets.v1beta1.ICreateSecretRequest | null | undefined, {} | null | undefined>): void;
    addSecretVersion(request: protos.google.cloud.secrets.v1beta1.IAddSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecretVersion,
        protos.google.cloud.secrets.v1beta1.IAddSecretVersionRequest | undefined,
        {} | undefined
    ]>;
    addSecretVersion(request: protos.google.cloud.secrets.v1beta1.IAddSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IAddSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    addSecretVersion(request: protos.google.cloud.secrets.v1beta1.IAddSecretVersionRequest, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IAddSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    getSecret(request: protos.google.cloud.secrets.v1beta1.IGetSecretRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecret,
        protos.google.cloud.secrets.v1beta1.IGetSecretRequest | undefined,
        {} | undefined
    ]>;
    getSecret(request: protos.google.cloud.secrets.v1beta1.IGetSecretRequest, options: CallOptions, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecret, protos.google.cloud.secrets.v1beta1.IGetSecretRequest | null | undefined, {} | null | undefined>): void;
    getSecret(request: protos.google.cloud.secrets.v1beta1.IGetSecretRequest, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecret, protos.google.cloud.secrets.v1beta1.IGetSecretRequest | null | undefined, {} | null | undefined>): void;
    updateSecret(request: protos.google.cloud.secrets.v1beta1.IUpdateSecretRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecret,
        protos.google.cloud.secrets.v1beta1.IUpdateSecretRequest | undefined,
        {} | undefined
    ]>;
    updateSecret(request: protos.google.cloud.secrets.v1beta1.IUpdateSecretRequest, options: CallOptions, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecret, protos.google.cloud.secrets.v1beta1.IUpdateSecretRequest | null | undefined, {} | null | undefined>): void;
    updateSecret(request: protos.google.cloud.secrets.v1beta1.IUpdateSecretRequest, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecret, protos.google.cloud.secrets.v1beta1.IUpdateSecretRequest | null | undefined, {} | null | undefined>): void;
    deleteSecret(request: protos.google.cloud.secrets.v1beta1.IDeleteSecretRequest, options?: CallOptions): Promise<[
        protos.google.protobuf.IEmpty,
        protos.google.cloud.secrets.v1beta1.IDeleteSecretRequest | undefined,
        {} | undefined
    ]>;
    deleteSecret(request: protos.google.cloud.secrets.v1beta1.IDeleteSecretRequest, options: CallOptions, callback: Callback<protos.google.protobuf.IEmpty, protos.google.cloud.secrets.v1beta1.IDeleteSecretRequest | null | undefined, {} | null | undefined>): void;
    deleteSecret(request: protos.google.cloud.secrets.v1beta1.IDeleteSecretRequest, callback: Callback<protos.google.protobuf.IEmpty, protos.google.cloud.secrets.v1beta1.IDeleteSecretRequest | null | undefined, {} | null | undefined>): void;
    getSecretVersion(request: protos.google.cloud.secrets.v1beta1.IGetSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecretVersion,
        protos.google.cloud.secrets.v1beta1.IGetSecretVersionRequest | undefined,
        {} | undefined
    ]>;
    getSecretVersion(request: protos.google.cloud.secrets.v1beta1.IGetSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IGetSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    getSecretVersion(request: protos.google.cloud.secrets.v1beta1.IGetSecretVersionRequest, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IGetSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    accessSecretVersion(request: protos.google.cloud.secrets.v1beta1.IAccessSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.IAccessSecretVersionResponse,
        (protos.google.cloud.secrets.v1beta1.IAccessSecretVersionRequest | undefined),
        {} | undefined
    ]>;
    accessSecretVersion(request: protos.google.cloud.secrets.v1beta1.IAccessSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secrets.v1beta1.IAccessSecretVersionResponse, protos.google.cloud.secrets.v1beta1.IAccessSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    accessSecretVersion(request: protos.google.cloud.secrets.v1beta1.IAccessSecretVersionRequest, callback: Callback<protos.google.cloud.secrets.v1beta1.IAccessSecretVersionResponse, protos.google.cloud.secrets.v1beta1.IAccessSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    disableSecretVersion(request: protos.google.cloud.secrets.v1beta1.IDisableSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecretVersion,
        (protos.google.cloud.secrets.v1beta1.IDisableSecretVersionRequest | undefined),
        {} | undefined
    ]>;
    disableSecretVersion(request: protos.google.cloud.secrets.v1beta1.IDisableSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IDisableSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    disableSecretVersion(request: protos.google.cloud.secrets.v1beta1.IDisableSecretVersionRequest, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IDisableSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    enableSecretVersion(request: protos.google.cloud.secrets.v1beta1.IEnableSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecretVersion,
        (protos.google.cloud.secrets.v1beta1.IEnableSecretVersionRequest | undefined),
        {} | undefined
    ]>;
    enableSecretVersion(request: protos.google.cloud.secrets.v1beta1.IEnableSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IEnableSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    enableSecretVersion(request: protos.google.cloud.secrets.v1beta1.IEnableSecretVersionRequest, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IEnableSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    destroySecretVersion(request: protos.google.cloud.secrets.v1beta1.IDestroySecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecretVersion,
        (protos.google.cloud.secrets.v1beta1.IDestroySecretVersionRequest | undefined),
        {} | undefined
    ]>;
    destroySecretVersion(request: protos.google.cloud.secrets.v1beta1.IDestroySecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IDestroySecretVersionRequest | null | undefined, {} | null | undefined>): void;
    destroySecretVersion(request: protos.google.cloud.secrets.v1beta1.IDestroySecretVersionRequest, callback: Callback<protos.google.cloud.secrets.v1beta1.ISecretVersion, protos.google.cloud.secrets.v1beta1.IDestroySecretVersionRequest | null | undefined, {} | null | undefined>): void;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.ISetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.IGetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.ITestIamPermissionsResponse,
        protos.google.iam.v1.ITestIamPermissionsRequest | undefined,
        {} | undefined
    ]>;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    listSecrets(request: protos.google.cloud.secrets.v1beta1.IListSecretsRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecret[],
        protos.google.cloud.secrets.v1beta1.IListSecretsRequest | null,
        protos.google.cloud.secrets.v1beta1.IListSecretsResponse
    ]>;
    listSecrets(request: protos.google.cloud.secrets.v1beta1.IListSecretsRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.secrets.v1beta1.IListSecretsRequest, protos.google.cloud.secrets.v1beta1.IListSecretsResponse | null | undefined, protos.google.cloud.secrets.v1beta1.ISecret>): void;
    listSecrets(request: protos.google.cloud.secrets.v1beta1.IListSecretsRequest, callback: PaginationCallback<protos.google.cloud.secrets.v1beta1.IListSecretsRequest, protos.google.cloud.secrets.v1beta1.IListSecretsResponse | null | undefined, protos.google.cloud.secrets.v1beta1.ISecret>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the project associated with the
     *   {@link google.cloud.secrets.v1beta1.Secret|Secrets}, in the format `projects/*`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   {@link google.cloud.secrets.v1beta1.ListSecretsResponse.next_page_token|ListSecretsResponse.next_page_token}.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing [Secret]{@link google.cloud.secrets.v1beta1.Secret} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `listSecretsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the
     *   [documentation](https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination)
     *   for more details and examples.
     */
    listSecretsStream(request?: protos.google.cloud.secrets.v1beta1.IListSecretsRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `listSecrets`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the project associated with the
     *   {@link google.cloud.secrets.v1beta1.Secret|Secrets}, in the format `projects/*`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   {@link google.cloud.secrets.v1beta1.ListSecretsResponse.next_page_token|ListSecretsResponse.next_page_token}.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows [async iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols).
     *   When you iterate the returned iterable, each element will be an object representing
     *   [Secret]{@link google.cloud.secrets.v1beta1.Secret}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the
     *   [documentation](https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination)
     *   for more details and examples.
     * @example
     * const iterable = client.listSecretsAsync(request);
     * for await (const response of iterable) {
     *   // process response
     * }
     */
    listSecretsAsync(request?: protos.google.cloud.secrets.v1beta1.IListSecretsRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.secrets.v1beta1.ISecret>;
    listSecretVersions(request: protos.google.cloud.secrets.v1beta1.IListSecretVersionsRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secrets.v1beta1.ISecretVersion[],
        protos.google.cloud.secrets.v1beta1.IListSecretVersionsRequest | null,
        protos.google.cloud.secrets.v1beta1.IListSecretVersionsResponse
    ]>;
    listSecretVersions(request: protos.google.cloud.secrets.v1beta1.IListSecretVersionsRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.secrets.v1beta1.IListSecretVersionsRequest, protos.google.cloud.secrets.v1beta1.IListSecretVersionsResponse | null | undefined, protos.google.cloud.secrets.v1beta1.ISecretVersion>): void;
    listSecretVersions(request: protos.google.cloud.secrets.v1beta1.IListSecretVersionsRequest, callback: PaginationCallback<protos.google.cloud.secrets.v1beta1.IListSecretVersionsRequest, protos.google.cloud.secrets.v1beta1.IListSecretVersionsResponse | null | undefined, protos.google.cloud.secrets.v1beta1.ISecretVersion>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the {@link google.cloud.secrets.v1beta1.Secret|Secret} associated with the
     *   {@link google.cloud.secrets.v1beta1.SecretVersion|SecretVersions} to list, in the format
     *   `projects/* /secrets/*`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   ListSecretVersionsResponse.next_page_token][].
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing [SecretVersion]{@link google.cloud.secrets.v1beta1.SecretVersion} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `listSecretVersionsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the
     *   [documentation](https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination)
     *   for more details and examples.
     */
    listSecretVersionsStream(request?: protos.google.cloud.secrets.v1beta1.IListSecretVersionsRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `listSecretVersions`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the {@link google.cloud.secrets.v1beta1.Secret|Secret} associated with the
     *   {@link google.cloud.secrets.v1beta1.SecretVersion|SecretVersions} to list, in the format
     *   `projects/* /secrets/*`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   ListSecretVersionsResponse.next_page_token][].
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows [async iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols).
     *   When you iterate the returned iterable, each element will be an object representing
     *   [SecretVersion]{@link google.cloud.secrets.v1beta1.SecretVersion}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the
     *   [documentation](https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination)
     *   for more details and examples.
     * @example
     * const iterable = client.listSecretVersionsAsync(request);
     * for await (const response of iterable) {
     *   // process response
     * }
     */
    listSecretVersionsAsync(request?: protos.google.cloud.secrets.v1beta1.IListSecretVersionsRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.secrets.v1beta1.ISecretVersion>;
    /**
     * Return a fully-qualified project resource name string.
     *
     * @param {string} project
     * @returns {string} Resource name string.
     */
    projectPath(project: string): string;
    /**
     * Parse the project from Project resource.
     *
     * @param {string} projectName
     *   A fully-qualified path representing Project resource.
     * @returns {string} A string representing the project.
     */
    matchProjectFromProjectName(projectName: string): string | number;
    /**
     * Return a fully-qualified secret resource name string.
     *
     * @param {string} project
     * @param {string} secret
     * @returns {string} Resource name string.
     */
    secretPath(project: string, secret: string): string;
    /**
     * Parse the project from Secret resource.
     *
     * @param {string} secretName
     *   A fully-qualified path representing Secret resource.
     * @returns {string} A string representing the project.
     */
    matchProjectFromSecretName(secretName: string): string | number;
    /**
     * Parse the secret from Secret resource.
     *
     * @param {string} secretName
     *   A fully-qualified path representing Secret resource.
     * @returns {string} A string representing the secret.
     */
    matchSecretFromSecretName(secretName: string): string | number;
    /**
     * Return a fully-qualified secretVersion resource name string.
     *
     * @param {string} project
     * @param {string} secret
     * @param {string} secret_version
     * @returns {string} Resource name string.
     */
    secretVersionPath(project: string, secret: string, secretVersion: string): string;
    /**
     * Parse the project from SecretVersion resource.
     *
     * @param {string} secretVersionName
     *   A fully-qualified path representing SecretVersion resource.
     * @returns {string} A string representing the project.
     */
    matchProjectFromSecretVersionName(secretVersionName: string): string | number;
    /**
     * Parse the secret from SecretVersion resource.
     *
     * @param {string} secretVersionName
     *   A fully-qualified path representing SecretVersion resource.
     * @returns {string} A string representing the secret.
     */
    matchSecretFromSecretVersionName(secretVersionName: string): string | number;
    /**
     * Parse the secret_version from SecretVersion resource.
     *
     * @param {string} secretVersionName
     *   A fully-qualified path representing SecretVersion resource.
     * @returns {string} A string representing the secret_version.
     */
    matchSecretVersionFromSecretVersionName(secretVersionName: string): string | number;
    /**
     * Terminate the gRPC channel and close the client.
     *
     * The client will no longer be usable and all future behavior is undefined.
     * @returns {Promise} A promise that resolves when the client is closed.
     */
    close(): Promise<void>;
}
