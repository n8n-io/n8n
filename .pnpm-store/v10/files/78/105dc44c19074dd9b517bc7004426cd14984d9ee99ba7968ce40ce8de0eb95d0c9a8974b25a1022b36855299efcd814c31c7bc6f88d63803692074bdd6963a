import * as gax from './gax';
import type { GrpcClient } from './grpc';
import type { GrpcClient as FallbackGrpcClient } from './fallback';
import type { GoogleAuth } from 'google-auth-library';
import * as protos from '../protos/locations';
import type { Descriptors, ClientOptions, Callback, PaginationCallback } from './clientInterface';
/**
 *  Google Cloud Locations Client.
 *  This is manually written for providing methods [listLocations, getLocations] to the generated client.
 */
export declare class LocationsClient {
    private _terminated;
    private _opts;
    private _providedCustomServicePath;
    private _protos;
    private _defaults;
    auth: GoogleAuth;
    descriptors: Descriptors;
    warn: (code: string, message: string, warnType?: string) => void;
    innerApiCalls: {
        [name: string]: Function;
    };
    locationsStub?: Promise<{
        [name: string]: Function;
    }>;
    gaxGrpc: GrpcClient | FallbackGrpcClient;
    PageDescriptor: any;
    /**
     * Construct an instance of LocationsClient.
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
     * @param {boolean} [options.fallback] - Use HTTP fallback mode.
     *     In fallback mode, a special browser-compatible transport implementation is used
     *     instead of gRPC transport. In browser context (if the `window` object is defined)
     *     the fallback mode is enabled automatically; set `options.fallback` to `false`
     *     if you need to override this behavior.
     */
    constructor(gaxGrpc: GrpcClient | FallbackGrpcClient, opts: ClientOptions);
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
    /**
     * Return the project ID used by this class.
     * @returns {Promise} A promise that resolves to string containing the project ID.
     */
    getProjectId(): Promise<string>;
    getProjectId(callback: Callback<string, undefined, undefined>): void;
    getLocation(request?: protos.google.cloud.location.IGetLocationRequest, options?: gax.CallOptions): Promise<protos.google.cloud.location.ILocation>;
    getLocation(request: protos.google.cloud.location.IGetLocationRequest, options: gax.CallOptions, callback: Callback<protos.google.cloud.location.ILocation, protos.google.cloud.location.IGetLocationRequest | null | undefined, {} | null | undefined>): void;
    getLocation(request: protos.google.cloud.location.IGetLocationRequest, callback: Callback<protos.google.cloud.location.ILocation, protos.google.cloud.location.IGetLocationRequest | null | undefined, {} | null | undefined>): void;
    listLocations(request?: protos.google.cloud.location.IListLocationsRequest, options?: gax.CallOptions): Promise<[
        protos.google.cloud.location.ILocation[],
        protos.google.cloud.location.IListLocationsRequest | null,
        protos.google.cloud.location.IListLocationsResponse
    ]>;
    listLocations(request: protos.google.cloud.location.IListLocationsRequest, options: gax.CallOptions, callback: PaginationCallback<protos.google.cloud.location.IListLocationsRequest, protos.google.cloud.location.IListLocationsResponse | null | undefined, protos.google.cloud.location.ILocation>): void;
    listLocations(request: protos.google.cloud.location.IListLocationsRequest, callback: PaginationCallback<protos.google.cloud.location.IListLocationsRequest, protos.google.cloud.location.IListLocationsResponse | null | undefined, protos.google.cloud.location.ILocation>): void;
    /**
     * Terminate the gRPC channel and close the client.
     *
     * The client will no longer be usable and all future behavior is undefined.
     * @returns {Promise} A promise that resolves when the client is closed.
     */
    close(): Promise<void>;
}
export interface LocationsClient {
    getLocation(request: protos.google.cloud.location.IGetLocationRequest): void;
    getLocation(request: protos.google.cloud.location.IGetLocationRequest, options?: gax.CallOptions | Callback<protos.google.cloud.location.ILocation, protos.google.cloud.location.IGetLocationRequest | null | undefined, {} | null | undefined>, callback?: Callback<protos.google.cloud.location.ILocation, protos.google.cloud.location.IGetLocationRequest | null | undefined, {} | null | undefined>): Promise<protos.google.cloud.location.ILocation>;
    listLocationsAsync(request: protos.google.cloud.location.IListLocationsRequest, options?: gax.CallOptions): AsyncIterable<protos.google.cloud.location.ILocation>;
}
