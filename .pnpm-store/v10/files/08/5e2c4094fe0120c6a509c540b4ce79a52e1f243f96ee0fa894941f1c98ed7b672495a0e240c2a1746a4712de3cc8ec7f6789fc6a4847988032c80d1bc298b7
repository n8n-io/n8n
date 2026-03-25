/// <reference types="node" />
import type * as gax from 'google-gax';
import type { Callback, CallOptions, Descriptors, ClientOptions, PaginationCallback, LocationsClient, LocationProtos } from 'google-gax';
import { Transform } from 'stream';
import * as protos from '../../protos/protos';
/**
 *  Secret Manager Service
 *
 *  Manages secrets and operations using those secrets. Implements a REST
 *  model with the following objects:
 *
 *  * {@link protos.google.cloud.secretmanager.v1.Secret|Secret}
 *  * {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}
 * @class
 * @memberof v1
 */
export declare class SecretManagerServiceClient {
    private _terminated;
    private _opts;
    private _providedCustomServicePath;
    private _gaxModule;
    private _gaxGrpc;
    private _protos;
    private _defaults;
    private _universeDomain;
    private _servicePath;
    auth: gax.GoogleAuth;
    descriptors: Descriptors;
    warn: (code: string, message: string, warnType?: string) => void;
    innerApiCalls: {
        [name: string]: Function;
    };
    locationsClient: LocationsClient;
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
     * in [this document](https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#creating-the-client-instance).
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
     * @param {boolean} [options.fallback] - Use HTTP/1.1 REST mode.
     *     For more information, please check the
     *     {@link https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#http11-rest-api-mode documentation}.
     * @param {gax} [gaxInstance]: loaded instance of `google-gax`. Useful if you
     *     need to avoid loading the default gRPC version and want to use the fallback
     *     HTTP implementation. Load only fallback version and pass it to the constructor:
     *     ```
     *     const gax = require('google-gax/build/src/fallback'); // avoids loading google-gax with gRPC
     *     const client = new SecretManagerServiceClient({fallback: true}, gax);
     *     ```
     */
    constructor(opts?: ClientOptions, gaxInstance?: typeof gax | typeof gax.fallback);
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
     * @deprecated Use the apiEndpoint method of the client instance.
     * @returns {string} The DNS address for this service.
     */
    static get servicePath(): string;
    /**
     * The DNS address for this API service - same as servicePath.
     * @deprecated Use the apiEndpoint method of the client instance.
     * @returns {string} The DNS address for this service.
     */
    static get apiEndpoint(): string;
    /**
     * The DNS address for this API service.
     * @returns {string} The DNS address for this service.
     */
    get apiEndpoint(): string;
    get universeDomain(): string;
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
    /**
     * Creates a new {@link protos.google.cloud.secretmanager.v1.Secret|Secret} containing no
     * {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersions}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the project to associate with the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secret}, in the format `projects/*`
     *   or `projects/* /locations/*`.
     * @param {string} request.secretId
     *   Required. This must be unique within the project.
     *
     *   A secret ID is a string with a maximum length of 255 characters and can
     *   contain uppercase and lowercase letters, numerals, and the hyphen (`-`) and
     *   underscore (`_`) characters.
     * @param {google.cloud.secretmanager.v1.Secret} request.secret
     *   Required. A {@link protos.google.cloud.secretmanager.v1.Secret|Secret} with initial
     *   field values.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.secretmanager.v1.Secret|Secret}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.create_secret.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_CreateSecret_async
     */
    createSecret(request?: protos.google.cloud.secretmanager.v1.ICreateSecretRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecret,
        protos.google.cloud.secretmanager.v1.ICreateSecretRequest | undefined,
        {} | undefined
    ]>;
    createSecret(request: protos.google.cloud.secretmanager.v1.ICreateSecretRequest, options: CallOptions, callback: Callback<protos.google.cloud.secretmanager.v1.ISecret, protos.google.cloud.secretmanager.v1.ICreateSecretRequest | null | undefined, {} | null | undefined>): void;
    createSecret(request: protos.google.cloud.secretmanager.v1.ICreateSecretRequest, callback: Callback<protos.google.cloud.secretmanager.v1.ISecret, protos.google.cloud.secretmanager.v1.ICreateSecretRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Creates a new {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}
     * containing secret data and attaches it to an existing
     * {@link protos.google.cloud.secretmanager.v1.Secret|Secret}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secret} to associate with the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} in the format
     *   `projects/* /secrets/*` or `projects/* /locations/* /secrets/*`.
     * @param {google.cloud.secretmanager.v1.SecretPayload} request.payload
     *   Required. The secret payload of the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.add_secret_version.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_AddSecretVersion_async
     */
    addSecretVersion(request?: protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecretVersion,
        protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest | undefined,
        {} | undefined
    ]>;
    addSecretVersion(request: protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    addSecretVersion(request: protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Gets metadata for a given {@link protos.google.cloud.secretmanager.v1.Secret|Secret}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secret}, in the format
     *   `projects/* /secrets/*` or `projects/* /locations/* /secrets/*`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.secretmanager.v1.Secret|Secret}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.get_secret.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_GetSecret_async
     */
    getSecret(request?: protos.google.cloud.secretmanager.v1.IGetSecretRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecret,
        protos.google.cloud.secretmanager.v1.IGetSecretRequest | undefined,
        {} | undefined
    ]>;
    getSecret(request: protos.google.cloud.secretmanager.v1.IGetSecretRequest, options: CallOptions, callback: Callback<protos.google.cloud.secretmanager.v1.ISecret, protos.google.cloud.secretmanager.v1.IGetSecretRequest | null | undefined, {} | null | undefined>): void;
    getSecret(request: protos.google.cloud.secretmanager.v1.IGetSecretRequest, callback: Callback<protos.google.cloud.secretmanager.v1.ISecret, protos.google.cloud.secretmanager.v1.IGetSecretRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Updates metadata of an existing
     * {@link protos.google.cloud.secretmanager.v1.Secret|Secret}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {google.cloud.secretmanager.v1.Secret} request.secret
     *   Required. {@link protos.google.cloud.secretmanager.v1.Secret|Secret} with updated field
     *   values.
     * @param {google.protobuf.FieldMask} request.updateMask
     *   Required. Specifies the fields to be updated.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.secretmanager.v1.Secret|Secret}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.update_secret.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_UpdateSecret_async
     */
    updateSecret(request?: protos.google.cloud.secretmanager.v1.IUpdateSecretRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecret,
        protos.google.cloud.secretmanager.v1.IUpdateSecretRequest | undefined,
        {} | undefined
    ]>;
    updateSecret(request: protos.google.cloud.secretmanager.v1.IUpdateSecretRequest, options: CallOptions, callback: Callback<protos.google.cloud.secretmanager.v1.ISecret, protos.google.cloud.secretmanager.v1.IUpdateSecretRequest | null | undefined, {} | null | undefined>): void;
    updateSecret(request: protos.google.cloud.secretmanager.v1.IUpdateSecretRequest, callback: Callback<protos.google.cloud.secretmanager.v1.ISecret, protos.google.cloud.secretmanager.v1.IUpdateSecretRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Deletes a {@link protos.google.cloud.secretmanager.v1.Secret|Secret}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secret} to delete in the format
     *   `projects/* /secrets/*`.
     * @param {string} [request.etag]
     *   Optional. Etag of the {@link protos.google.cloud.secretmanager.v1.Secret|Secret}. The
     *   request succeeds if it matches the etag of the currently stored secret
     *   object. If the etag is omitted, the request succeeds.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.protobuf.Empty|Empty}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.delete_secret.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_DeleteSecret_async
     */
    deleteSecret(request?: protos.google.cloud.secretmanager.v1.IDeleteSecretRequest, options?: CallOptions): Promise<[
        protos.google.protobuf.IEmpty,
        protos.google.cloud.secretmanager.v1.IDeleteSecretRequest | undefined,
        {} | undefined
    ]>;
    deleteSecret(request: protos.google.cloud.secretmanager.v1.IDeleteSecretRequest, options: CallOptions, callback: Callback<protos.google.protobuf.IEmpty, protos.google.cloud.secretmanager.v1.IDeleteSecretRequest | null | undefined, {} | null | undefined>): void;
    deleteSecret(request: protos.google.cloud.secretmanager.v1.IDeleteSecretRequest, callback: Callback<protos.google.protobuf.IEmpty, protos.google.cloud.secretmanager.v1.IDeleteSecretRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Gets metadata for a
     * {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *
     * `projects/* /secrets/* /versions/latest` is an alias to the most recently
     * created {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} in the format
     *   `projects/* /secrets/* /versions/*` or
     *   `projects/* /locations/* /secrets/* /versions/*`.
     *
     *   `projects/* /secrets/* /versions/latest` or
     *   `projects/* /locations/* /secrets/* /versions/latest` is an alias to the most
     *   recently created
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.get_secret_version.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_GetSecretVersion_async
     */
    getSecretVersion(request?: protos.google.cloud.secretmanager.v1.IGetSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecretVersion,
        protos.google.cloud.secretmanager.v1.IGetSecretVersionRequest | undefined,
        {} | undefined
    ]>;
    getSecretVersion(request: protos.google.cloud.secretmanager.v1.IGetSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IGetSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    getSecretVersion(request: protos.google.cloud.secretmanager.v1.IGetSecretVersionRequest, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IGetSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Accesses a {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     * This call returns the secret data.
     *
     * `projects/* /secrets/* /versions/latest` is an alias to the most recently
     * created {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} in the format
     *   `projects/* /secrets/* /versions/*` or
     *   `projects/* /locations/* /secrets/* /versions/*`.
     *
     *   `projects/* /secrets/* /versions/latest` or
     *   `projects/* /locations/* /secrets/* /versions/latest` is an alias to the most
     *   recently created
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.secretmanager.v1.AccessSecretVersionResponse|AccessSecretVersionResponse}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.access_secret_version.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_AccessSecretVersion_async
     */
    accessSecretVersion(request?: protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.IAccessSecretVersionResponse,
        (protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest | undefined),
        {} | undefined
    ]>;
    accessSecretVersion(request: protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secretmanager.v1.IAccessSecretVersionResponse, protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    accessSecretVersion(request: protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest, callback: Callback<protos.google.cloud.secretmanager.v1.IAccessSecretVersionResponse, protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Disables a {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *
     * Sets the {@link protos.google.cloud.secretmanager.v1.SecretVersion.state|state} of the
     * {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} to
     * {@link protos.google.cloud.secretmanager.v1.SecretVersion.State.DISABLED|DISABLED}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} to disable in
     *   the format `projects/* /secrets/* /versions/*` or
     *   `projects/* /locations/* /secrets/* /versions/*`.
     * @param {string} [request.etag]
     *   Optional. Etag of the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}. The request
     *   succeeds if it matches the etag of the currently stored secret version
     *   object. If the etag is omitted, the request succeeds.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.disable_secret_version.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_DisableSecretVersion_async
     */
    disableSecretVersion(request?: protos.google.cloud.secretmanager.v1.IDisableSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecretVersion,
        (protos.google.cloud.secretmanager.v1.IDisableSecretVersionRequest | undefined),
        {} | undefined
    ]>;
    disableSecretVersion(request: protos.google.cloud.secretmanager.v1.IDisableSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IDisableSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    disableSecretVersion(request: protos.google.cloud.secretmanager.v1.IDisableSecretVersionRequest, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IDisableSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Enables a {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *
     * Sets the {@link protos.google.cloud.secretmanager.v1.SecretVersion.state|state} of the
     * {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} to
     * {@link protos.google.cloud.secretmanager.v1.SecretVersion.State.ENABLED|ENABLED}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} to enable in
     *   the format `projects/* /secrets/* /versions/*` or
     *   `projects/* /locations/* /secrets/* /versions/*`.
     * @param {string} [request.etag]
     *   Optional. Etag of the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}. The request
     *   succeeds if it matches the etag of the currently stored secret version
     *   object. If the etag is omitted, the request succeeds.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.enable_secret_version.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_EnableSecretVersion_async
     */
    enableSecretVersion(request?: protos.google.cloud.secretmanager.v1.IEnableSecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecretVersion,
        (protos.google.cloud.secretmanager.v1.IEnableSecretVersionRequest | undefined),
        {} | undefined
    ]>;
    enableSecretVersion(request: protos.google.cloud.secretmanager.v1.IEnableSecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IEnableSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    enableSecretVersion(request: protos.google.cloud.secretmanager.v1.IEnableSecretVersionRequest, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IEnableSecretVersionRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Destroys a {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *
     * Sets the {@link protos.google.cloud.secretmanager.v1.SecretVersion.state|state} of the
     * {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} to
     * {@link protos.google.cloud.secretmanager.v1.SecretVersion.State.DESTROYED|DESTROYED}
     * and irrevocably destroys the secret data.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} to destroy in
     *   the format `projects/* /secrets/* /versions/*` or
     *   `projects/* /locations/* /secrets/* /versions/*`.
     * @param {string} [request.etag]
     *   Optional. Etag of the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}. The request
     *   succeeds if it matches the etag of the currently stored secret version
     *   object. If the etag is omitted, the request succeeds.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.destroy_secret_version.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_DestroySecretVersion_async
     */
    destroySecretVersion(request?: protos.google.cloud.secretmanager.v1.IDestroySecretVersionRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecretVersion,
        (protos.google.cloud.secretmanager.v1.IDestroySecretVersionRequest | undefined),
        {} | undefined
    ]>;
    destroySecretVersion(request: protos.google.cloud.secretmanager.v1.IDestroySecretVersionRequest, options: CallOptions, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IDestroySecretVersionRequest | null | undefined, {} | null | undefined>): void;
    destroySecretVersion(request: protos.google.cloud.secretmanager.v1.IDestroySecretVersionRequest, callback: Callback<protos.google.cloud.secretmanager.v1.ISecretVersion, protos.google.cloud.secretmanager.v1.IDestroySecretVersionRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Sets the access control policy on the specified secret. Replaces any
     * existing policy.
     *
     * Permissions on
     * {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersions} are enforced
     * according to the policy set on the associated
     * {@link protos.google.cloud.secretmanager.v1.Secret|Secret}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.resource
     *   REQUIRED: The resource for which the policy is being specified.
     *   See the operation documentation for the appropriate value for this field.
     * @param {google.iam.v1.Policy} request.policy
     *   REQUIRED: The complete policy to be applied to the `resource`. The size of
     *   the policy is limited to a few 10s of KB. An empty policy is a
     *   valid policy but certain Cloud Platform services (such as Projects)
     *   might reject them.
     * @param {google.protobuf.FieldMask} request.updateMask
     *   OPTIONAL: A FieldMask specifying which fields of the policy to modify. Only
     *   the fields in the mask will be modified. If no mask is provided, the
     *   following default mask is used:
     *
     *   `paths: "bindings, etag"`
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.iam.v1.Policy|Policy}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.set_iam_policy.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_SetIamPolicy_async
     */
    setIamPolicy(request?: protos.google.iam.v1.ISetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.ISetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Gets the access control policy for a secret.
     * Returns empty policy if the secret exists and does not have a policy set.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.resource
     *   REQUIRED: The resource for which the policy is being requested.
     *   See the operation documentation for the appropriate value for this field.
     * @param {google.iam.v1.GetPolicyOptions} request.options
     *   OPTIONAL: A `GetPolicyOptions` object for specifying options to
     *   `GetIamPolicy`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.iam.v1.Policy|Policy}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.get_iam_policy.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_GetIamPolicy_async
     */
    getIamPolicy(request?: protos.google.iam.v1.IGetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.IGetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Returns permissions that a caller has for the specified secret.
     * If the secret does not exist, this call returns an empty set of
     * permissions, not a NOT_FOUND error.
     *
     * Note: This operation is designed to be used for building permission-aware
     * UIs and command-line tools, not for authorization checking. This operation
     * may "fail open" without warning.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.resource
     *   REQUIRED: The resource for which the policy detail is being requested.
     *   See the operation documentation for the appropriate value for this field.
     * @param {string[]} request.permissions
     *   The set of permissions to check for the `resource`. Permissions with
     *   wildcards (such as '*' or 'storage.*') are not allowed. For more
     *   information see
     *   [IAM Overview](https://cloud.google.com/iam/docs/overview#permissions).
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.iam.v1.TestIamPermissionsResponse|TestIamPermissionsResponse}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.test_iam_permissions.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_TestIamPermissions_async
     */
    testIamPermissions(request?: protos.google.iam.v1.ITestIamPermissionsRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.ITestIamPermissionsResponse,
        protos.google.iam.v1.ITestIamPermissionsRequest | undefined,
        {} | undefined
    ]>;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Lists {@link protos.google.cloud.secretmanager.v1.Secret|Secrets}.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the project associated with the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secrets}, in the format `projects/*`
     *   or `projects/* /locations/*`
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   {@link protos.google.cloud.secretmanager.v1.ListSecretsResponse.next_page_token|ListSecretsResponse.next_page_token}.
     * @param {string} [request.filter]
     *   Optional. Filter string, adhering to the rules in
     *   [List-operation
     *   filtering](https://cloud.google.com/secret-manager/docs/filtering). List
     *   only secrets matching the filter. If filter is empty, all secrets are
     *   listed.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is Array of {@link protos.google.cloud.secretmanager.v1.Secret|Secret}.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed and will merge results from all the pages into this array.
     *   Note that it can affect your quota.
     *   We recommend using `listSecretsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listSecrets(request?: protos.google.cloud.secretmanager.v1.IListSecretsRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecret[],
        protos.google.cloud.secretmanager.v1.IListSecretsRequest | null,
        protos.google.cloud.secretmanager.v1.IListSecretsResponse
    ]>;
    listSecrets(request: protos.google.cloud.secretmanager.v1.IListSecretsRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.secretmanager.v1.IListSecretsRequest, protos.google.cloud.secretmanager.v1.IListSecretsResponse | null | undefined, protos.google.cloud.secretmanager.v1.ISecret>): void;
    listSecrets(request: protos.google.cloud.secretmanager.v1.IListSecretsRequest, callback: PaginationCallback<protos.google.cloud.secretmanager.v1.IListSecretsRequest, protos.google.cloud.secretmanager.v1.IListSecretsResponse | null | undefined, protos.google.cloud.secretmanager.v1.ISecret>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the project associated with the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secrets}, in the format `projects/*`
     *   or `projects/* /locations/*`
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   {@link protos.google.cloud.secretmanager.v1.ListSecretsResponse.next_page_token|ListSecretsResponse.next_page_token}.
     * @param {string} [request.filter]
     *   Optional. Filter string, adhering to the rules in
     *   [List-operation
     *   filtering](https://cloud.google.com/secret-manager/docs/filtering). List
     *   only secrets matching the filter. If filter is empty, all secrets are
     *   listed.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing {@link protos.google.cloud.secretmanager.v1.Secret|Secret} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `listSecretsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listSecretsStream(request?: protos.google.cloud.secretmanager.v1.IListSecretsRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `listSecrets`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the project associated with the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secrets}, in the format `projects/*`
     *   or `projects/* /locations/*`
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   {@link protos.google.cloud.secretmanager.v1.ListSecretsResponse.next_page_token|ListSecretsResponse.next_page_token}.
     * @param {string} [request.filter]
     *   Optional. Filter string, adhering to the rules in
     *   [List-operation
     *   filtering](https://cloud.google.com/secret-manager/docs/filtering). List
     *   only secrets matching the filter. If filter is empty, all secrets are
     *   listed.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | async iteration }.
     *   When you iterate the returned iterable, each element will be an object representing
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secret}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.list_secrets.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_ListSecrets_async
     */
    listSecretsAsync(request?: protos.google.cloud.secretmanager.v1.IListSecretsRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.secretmanager.v1.ISecret>;
    /**
     * Lists {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersions}. This
     * call does not return secret data.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secret} associated with the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersions} to list, in
     *   the format `projects/* /secrets/*` or `projects/* /locations/* /secrets/*`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   ListSecretVersionsResponse.next_page_token][].
     * @param {string} [request.filter]
     *   Optional. Filter string, adhering to the rules in
     *   [List-operation
     *   filtering](https://cloud.google.com/secret-manager/docs/filtering). List
     *   only secret versions matching the filter. If filter is empty, all secret
     *   versions are listed.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is Array of {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed and will merge results from all the pages into this array.
     *   Note that it can affect your quota.
     *   We recommend using `listSecretVersionsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listSecretVersions(request?: protos.google.cloud.secretmanager.v1.IListSecretVersionsRequest, options?: CallOptions): Promise<[
        protos.google.cloud.secretmanager.v1.ISecretVersion[],
        protos.google.cloud.secretmanager.v1.IListSecretVersionsRequest | null,
        protos.google.cloud.secretmanager.v1.IListSecretVersionsResponse
    ]>;
    listSecretVersions(request: protos.google.cloud.secretmanager.v1.IListSecretVersionsRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.secretmanager.v1.IListSecretVersionsRequest, protos.google.cloud.secretmanager.v1.IListSecretVersionsResponse | null | undefined, protos.google.cloud.secretmanager.v1.ISecretVersion>): void;
    listSecretVersions(request: protos.google.cloud.secretmanager.v1.IListSecretVersionsRequest, callback: PaginationCallback<protos.google.cloud.secretmanager.v1.IListSecretVersionsRequest, protos.google.cloud.secretmanager.v1.IListSecretVersionsResponse | null | undefined, protos.google.cloud.secretmanager.v1.ISecretVersion>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secret} associated with the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersions} to list, in
     *   the format `projects/* /secrets/*` or `projects/* /locations/* /secrets/*`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   ListSecretVersionsResponse.next_page_token][].
     * @param {string} [request.filter]
     *   Optional. Filter string, adhering to the rules in
     *   [List-operation
     *   filtering](https://cloud.google.com/secret-manager/docs/filtering). List
     *   only secret versions matching the filter. If filter is empty, all secret
     *   versions are listed.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `listSecretVersionsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listSecretVersionsStream(request?: protos.google.cloud.secretmanager.v1.IListSecretVersionsRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `listSecretVersions`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the
     *   {@link protos.google.cloud.secretmanager.v1.Secret|Secret} associated with the
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersions} to list, in
     *   the format `projects/* /secrets/*` or `projects/* /locations/* /secrets/*`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of results to be returned in a single page. If
     *   set to 0, the server decides the number of results to return. If the
     *   number is greater than 25000, it is capped at 25000.
     * @param {string} [request.pageToken]
     *   Optional. Pagination token, returned earlier via
     *   ListSecretVersionsResponse.next_page_token][].
     * @param {string} [request.filter]
     *   Optional. Filter string, adhering to the rules in
     *   [List-operation
     *   filtering](https://cloud.google.com/secret-manager/docs/filtering). List
     *   only secret versions matching the filter. If filter is empty, all secret
     *   versions are listed.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | async iteration }.
     *   When you iterate the returned iterable, each element will be an object representing
     *   {@link protos.google.cloud.secretmanager.v1.SecretVersion|SecretVersion}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v1/secret_manager_service.list_secret_versions.js</caption>
     * region_tag:secretmanager_v1_generated_SecretManagerService_ListSecretVersions_async
     */
    listSecretVersionsAsync(request?: protos.google.cloud.secretmanager.v1.IListSecretVersionsRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.secretmanager.v1.ISecretVersion>;
    /**
     * Gets information about a location.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Resource name for the location.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html | CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link google.cloud.location.Location | Location}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example
     * ```
     * const [response] = await client.getLocation(request);
     * ```
     */
    getLocation(request: LocationProtos.google.cloud.location.IGetLocationRequest, options?: gax.CallOptions | Callback<LocationProtos.google.cloud.location.ILocation, LocationProtos.google.cloud.location.IGetLocationRequest | null | undefined, {} | null | undefined>, callback?: Callback<LocationProtos.google.cloud.location.ILocation, LocationProtos.google.cloud.location.IGetLocationRequest | null | undefined, {} | null | undefined>): Promise<LocationProtos.google.cloud.location.ILocation>;
    /**
     * Lists information about the supported locations for this service. Returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   The resource that owns the locations collection, if applicable.
     * @param {string} request.filter
     *   The standard list filter.
     * @param {number} request.pageSize
     *   The standard list page size.
     * @param {string} request.pageToken
     *   The standard list page token.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | async iteration }.
     *   When you iterate the returned iterable, each element will be an object representing
     *   {@link google.cloud.location.Location | Location}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     * @example
     * ```
     * const iterable = client.listLocationsAsync(request);
     * for await (const response of iterable) {
     *   // process response
     * }
     * ```
     */
    listLocationsAsync(request: LocationProtos.google.cloud.location.IListLocationsRequest, options?: CallOptions): AsyncIterable<LocationProtos.google.cloud.location.ILocation>;
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
     * Return a fully-qualified projectLocationSecret resource name string.
     *
     * @param {string} project
     * @param {string} location
     * @param {string} secret
     * @returns {string} Resource name string.
     */
    projectLocationSecretPath(project: string, location: string, secret: string): string;
    /**
     * Parse the project from ProjectLocationSecret resource.
     *
     * @param {string} projectLocationSecretName
     *   A fully-qualified path representing project_location_secret resource.
     * @returns {string} A string representing the project.
     */
    matchProjectFromProjectLocationSecretName(projectLocationSecretName: string): string | number;
    /**
     * Parse the location from ProjectLocationSecret resource.
     *
     * @param {string} projectLocationSecretName
     *   A fully-qualified path representing project_location_secret resource.
     * @returns {string} A string representing the location.
     */
    matchLocationFromProjectLocationSecretName(projectLocationSecretName: string): string | number;
    /**
     * Parse the secret from ProjectLocationSecret resource.
     *
     * @param {string} projectLocationSecretName
     *   A fully-qualified path representing project_location_secret resource.
     * @returns {string} A string representing the secret.
     */
    matchSecretFromProjectLocationSecretName(projectLocationSecretName: string): string | number;
    /**
     * Return a fully-qualified projectLocationSecretSecretVersion resource name string.
     *
     * @param {string} project
     * @param {string} location
     * @param {string} secret
     * @param {string} secret_version
     * @returns {string} Resource name string.
     */
    projectLocationSecretSecretVersionPath(project: string, location: string, secret: string, secretVersion: string): string;
    /**
     * Parse the project from ProjectLocationSecretSecretVersion resource.
     *
     * @param {string} projectLocationSecretSecretVersionName
     *   A fully-qualified path representing project_location_secret_secret_version resource.
     * @returns {string} A string representing the project.
     */
    matchProjectFromProjectLocationSecretSecretVersionName(projectLocationSecretSecretVersionName: string): string | number;
    /**
     * Parse the location from ProjectLocationSecretSecretVersion resource.
     *
     * @param {string} projectLocationSecretSecretVersionName
     *   A fully-qualified path representing project_location_secret_secret_version resource.
     * @returns {string} A string representing the location.
     */
    matchLocationFromProjectLocationSecretSecretVersionName(projectLocationSecretSecretVersionName: string): string | number;
    /**
     * Parse the secret from ProjectLocationSecretSecretVersion resource.
     *
     * @param {string} projectLocationSecretSecretVersionName
     *   A fully-qualified path representing project_location_secret_secret_version resource.
     * @returns {string} A string representing the secret.
     */
    matchSecretFromProjectLocationSecretSecretVersionName(projectLocationSecretSecretVersionName: string): string | number;
    /**
     * Parse the secret_version from ProjectLocationSecretSecretVersion resource.
     *
     * @param {string} projectLocationSecretSecretVersionName
     *   A fully-qualified path representing project_location_secret_secret_version resource.
     * @returns {string} A string representing the secret_version.
     */
    matchSecretVersionFromProjectLocationSecretSecretVersionName(projectLocationSecretSecretVersionName: string): string | number;
    /**
     * Return a fully-qualified projectSecret resource name string.
     *
     * @param {string} project
     * @param {string} secret
     * @returns {string} Resource name string.
     */
    projectSecretPath(project: string, secret: string): string;
    /**
     * Parse the project from ProjectSecret resource.
     *
     * @param {string} projectSecretName
     *   A fully-qualified path representing project_secret resource.
     * @returns {string} A string representing the project.
     */
    matchProjectFromProjectSecretName(projectSecretName: string): string | number;
    /**
     * Parse the secret from ProjectSecret resource.
     *
     * @param {string} projectSecretName
     *   A fully-qualified path representing project_secret resource.
     * @returns {string} A string representing the secret.
     */
    matchSecretFromProjectSecretName(projectSecretName: string): string | number;
    /**
     * Return a fully-qualified projectSecretSecretVersion resource name string.
     *
     * @param {string} project
     * @param {string} secret
     * @param {string} secret_version
     * @returns {string} Resource name string.
     */
    projectSecretSecretVersionPath(project: string, secret: string, secretVersion: string): string;
    /**
     * Parse the project from ProjectSecretSecretVersion resource.
     *
     * @param {string} projectSecretSecretVersionName
     *   A fully-qualified path representing project_secret_secret_version resource.
     * @returns {string} A string representing the project.
     */
    matchProjectFromProjectSecretSecretVersionName(projectSecretSecretVersionName: string): string | number;
    /**
     * Parse the secret from ProjectSecretSecretVersion resource.
     *
     * @param {string} projectSecretSecretVersionName
     *   A fully-qualified path representing project_secret_secret_version resource.
     * @returns {string} A string representing the secret.
     */
    matchSecretFromProjectSecretSecretVersionName(projectSecretSecretVersionName: string): string | number;
    /**
     * Parse the secret_version from ProjectSecretSecretVersion resource.
     *
     * @param {string} projectSecretSecretVersionName
     *   A fully-qualified path representing project_secret_secret_version resource.
     * @returns {string} A string representing the secret_version.
     */
    matchSecretVersionFromProjectSecretSecretVersionName(projectSecretSecretVersionName: string): string | number;
    /**
     * Return a fully-qualified topic resource name string.
     *
     * @param {string} project
     * @param {string} topic
     * @returns {string} Resource name string.
     */
    topicPath(project: string, topic: string): string;
    /**
     * Parse the project from Topic resource.
     *
     * @param {string} topicName
     *   A fully-qualified path representing Topic resource.
     * @returns {string} A string representing the project.
     */
    matchProjectFromTopicName(topicName: string): string | number;
    /**
     * Parse the topic from Topic resource.
     *
     * @param {string} topicName
     *   A fully-qualified path representing Topic resource.
     * @returns {string} A string representing the topic.
     */
    matchTopicFromTopicName(topicName: string): string | number;
    /**
     * Terminate the gRPC channel and close the client.
     *
     * The client will no longer be usable and all future behavior is undefined.
     * @returns {Promise} A promise that resolves when the client is closed.
     */
    close(): Promise<void>;
    /**
     * Return a fully-qualified project resource name string.
     *
     * @param {string} project
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
}
