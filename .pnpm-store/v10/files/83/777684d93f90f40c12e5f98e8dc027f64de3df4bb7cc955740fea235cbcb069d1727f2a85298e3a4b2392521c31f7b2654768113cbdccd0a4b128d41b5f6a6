/// <reference types="node" />
import type * as gax from 'google-gax';
import type { Callback, CallOptions, Descriptors, ClientOptions, LROperation, PaginationCallback } from 'google-gax';
import { Transform } from 'stream';
import * as protos from '../../protos/protos';
/**
 *  Manages Cloud Platform folder resources.
 *  Folders can be used to organize the resources under an
 *  organization and to control the policies applied to groups of resources.
 * @class
 * @memberof v3
 */
export declare class FoldersClient {
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
    pathTemplates: {
        [name: string]: gax.PathTemplate;
    };
    operationsClient: gax.OperationsClient;
    foldersStub?: Promise<{
        [name: string]: Function;
    }>;
    /**
     * Construct an instance of FoldersClient.
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
     *     const client = new FoldersClient({fallback: true}, gax);
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
     * Retrieves a folder identified by the supplied resource name.
     * Valid folder resource names have the format `folders/{folder_id}`
     * (for example, `folders/1234`).
     * The caller must have `resourcemanager.folders.get` permission on the
     * identified folder.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the folder to retrieve.
     *   Must be of the form `folders/{folder_id}`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.resourcemanager.v3.Folder|Folder}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.get_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_GetFolder_async
     */
    getFolder(request?: protos.google.cloud.resourcemanager.v3.IGetFolderRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.IFolder,
        protos.google.cloud.resourcemanager.v3.IGetFolderRequest | undefined,
        {} | undefined
    ]>;
    getFolder(request: protos.google.cloud.resourcemanager.v3.IGetFolderRequest, options: CallOptions, callback: Callback<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IGetFolderRequest | null | undefined, {} | null | undefined>): void;
    getFolder(request: protos.google.cloud.resourcemanager.v3.IGetFolderRequest, callback: Callback<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IGetFolderRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Gets the access control policy for a folder. The returned policy may be
     * empty if no such policy or resource exists. The `resource` field should
     * be the folder's resource name, for example: "folders/1234".
     * The caller must have `resourcemanager.folders.getIamPolicy` permission
     * on the identified folder.
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
     * @example <caption>include:samples/generated/v3/folders.get_iam_policy.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_GetIamPolicy_async
     */
    getIamPolicy(request?: protos.google.iam.v1.IGetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.IGetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Sets the access control policy on a folder, replacing any existing policy.
     * The `resource` field should be the folder's resource name, for example:
     * "folders/1234".
     * The caller must have `resourcemanager.folders.setIamPolicy` permission
     * on the identified folder.
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
     * @example <caption>include:samples/generated/v3/folders.set_iam_policy.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_SetIamPolicy_async
     */
    setIamPolicy(request?: protos.google.iam.v1.ISetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.ISetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Returns permissions that a caller has on the specified folder.
     * The `resource` field should be the folder's resource name,
     * for example: "folders/1234".
     *
     * There are no permissions required for making this API call.
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
     * @example <caption>include:samples/generated/v3/folders.test_iam_permissions.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_TestIamPermissions_async
     */
    testIamPermissions(request?: protos.google.iam.v1.ITestIamPermissionsRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.ITestIamPermissionsResponse,
        protos.google.iam.v1.ITestIamPermissionsRequest | undefined,
        {} | undefined
    ]>;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Creates a folder in the resource hierarchy.
     * Returns an `Operation` which can be used to track the progress of the
     * folder creation workflow.
     * Upon success, the `Operation.response` field will be populated with the
     * created Folder.
     *
     * In order to succeed, the addition of this new folder must not violate
     * the folder naming, height, or fanout constraints.
     *
     * + The folder's `display_name` must be distinct from all other folders that
     * share its parent.
     * + The addition of the folder must not cause the active folder hierarchy
     * to exceed a height of 10. Note, the full active + deleted folder hierarchy
     * is allowed to reach a height of 20; this provides additional headroom when
     * moving folders that contain deleted folders.
     * + The addition of the folder must not cause the total number of folders
     * under its parent to exceed 300.
     *
     * If the operation fails due to a folder constraint violation, some errors
     * may be returned by the `CreateFolder` request, with status code
     * `FAILED_PRECONDITION` and an error description. Other folder constraint
     * violations will be communicated in the `Operation`, with the specific
     * `PreconditionFailure` returned in the details list in the `Operation.error`
     * field.
     *
     * The caller must have `resourcemanager.folders.create` permission on the
     * identified parent.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {google.cloud.resourcemanager.v3.Folder} request.folder
     *   Required. The folder being created, only the display name and parent will
     *   be consulted. All other fields will be ignored.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.create_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_CreateFolder_async
     */
    createFolder(request?: protos.google.cloud.resourcemanager.v3.ICreateFolderRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.ICreateFolderMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    createFolder(request: protos.google.cloud.resourcemanager.v3.ICreateFolderRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.ICreateFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    createFolder(request: protos.google.cloud.resourcemanager.v3.ICreateFolderRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.ICreateFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `createFolder()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.create_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_CreateFolder_async
     */
    checkCreateFolderProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Folder, protos.google.cloud.resourcemanager.v3.CreateFolderMetadata>>;
    /**
     * Updates a folder, changing its `display_name`.
     * Changes to the folder `display_name` will be rejected if they violate
     * either the `display_name` formatting rules or the naming constraints
     * described in the
     * {@link protos.google.cloud.resourcemanager.v3.Folders.CreateFolder|CreateFolder}
     * documentation.
     *
     * The folder's `display_name` must start and end with a letter or digit,
     * may contain letters, digits, spaces, hyphens and underscores and can be
     * between 3 and 30 characters. This is captured by the regular expression:
     * `{@link protos.\p{L}\p{N}_- |\p{L}\p{N}}{1,28}[\p{L}\p{N}]`.
     * The caller must have `resourcemanager.folders.update` permission on the
     * identified folder.
     *
     * If the update fails due to the unique name constraint then a
     * `PreconditionFailure` explaining this violation will be returned
     * in the Status.details field.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {google.cloud.resourcemanager.v3.Folder} request.folder
     *   Required. The new definition of the Folder. It must include the `name`
     *   field, which cannot be changed.
     * @param {google.protobuf.FieldMask} request.updateMask
     *   Required. Fields to be updated.
     *   Only the `display_name` can be updated.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.update_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_UpdateFolder_async
     */
    updateFolder(request?: protos.google.cloud.resourcemanager.v3.IUpdateFolderRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IUpdateFolderMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    updateFolder(request: protos.google.cloud.resourcemanager.v3.IUpdateFolderRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IUpdateFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    updateFolder(request: protos.google.cloud.resourcemanager.v3.IUpdateFolderRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IUpdateFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `updateFolder()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.update_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_UpdateFolder_async
     */
    checkUpdateFolderProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Folder, protos.google.cloud.resourcemanager.v3.UpdateFolderMetadata>>;
    /**
     * Moves a folder under a new resource parent.
     * Returns an `Operation` which can be used to track the progress of the
     * folder move workflow.
     * Upon success, the `Operation.response` field will be populated with the
     * moved folder.
     * Upon failure, a `FolderOperationError` categorizing the failure cause will
     * be returned - if the failure occurs synchronously then the
     * `FolderOperationError` will be returned in the `Status.details` field.
     * If it occurs asynchronously, then the FolderOperation will be returned
     * in the `Operation.error` field.
     * In addition, the `Operation.metadata` field will be populated with a
     * `FolderOperation` message as an aid to stateless clients.
     * Folder moves will be rejected if they violate either the naming, height,
     * or fanout constraints described in the
     * {@link protos.google.cloud.resourcemanager.v3.Folders.CreateFolder|CreateFolder}
     * documentation. The caller must have `resourcemanager.folders.move`
     * permission on the folder's current and proposed new parent.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the Folder to move.
     *   Must be of the form folders/{folder_id}
     * @param {string} request.destinationParent
     *   Required. The resource name of the folder or organization which should be
     *   the folder's new parent. Must be of the form `folders/{folder_id}` or
     *   `organizations/{org_id}`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.move_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_MoveFolder_async
     */
    moveFolder(request?: protos.google.cloud.resourcemanager.v3.IMoveFolderRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IMoveFolderMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    moveFolder(request: protos.google.cloud.resourcemanager.v3.IMoveFolderRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IMoveFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    moveFolder(request: protos.google.cloud.resourcemanager.v3.IMoveFolderRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IMoveFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `moveFolder()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.move_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_MoveFolder_async
     */
    checkMoveFolderProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Folder, protos.google.cloud.resourcemanager.v3.MoveFolderMetadata>>;
    /**
     * Requests deletion of a folder. The folder is moved into the
     * {@link protos.google.cloud.resourcemanager.v3.Folder.State.DELETE_REQUESTED|DELETE_REQUESTED}
     * state immediately, and is deleted approximately 30 days later. This method
     * may only be called on an empty folder, where a folder is empty if it
     * doesn't contain any folders or projects in the
     * {@link protos.google.cloud.resourcemanager.v3.Folder.State.ACTIVE|ACTIVE} state. If
     * called on a folder in
     * {@link protos.google.cloud.resourcemanager.v3.Folder.State.DELETE_REQUESTED|DELETE_REQUESTED}
     * state the operation will result in a no-op success.
     * The caller must have `resourcemanager.folders.delete` permission on the
     * identified folder.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the folder to be deleted.
     *   Must be of the form `folders/{folder_id}`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.delete_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_DeleteFolder_async
     */
    deleteFolder(request?: protos.google.cloud.resourcemanager.v3.IDeleteFolderRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IDeleteFolderMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    deleteFolder(request: protos.google.cloud.resourcemanager.v3.IDeleteFolderRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IDeleteFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    deleteFolder(request: protos.google.cloud.resourcemanager.v3.IDeleteFolderRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IDeleteFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `deleteFolder()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.delete_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_DeleteFolder_async
     */
    checkDeleteFolderProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Folder, protos.google.cloud.resourcemanager.v3.DeleteFolderMetadata>>;
    /**
     * Cancels the deletion request for a folder. This method may be called on a
     * folder in any state. If the folder is in the
     * {@link protos.google.cloud.resourcemanager.v3.Folder.State.ACTIVE|ACTIVE} state the
     * result will be a no-op success. In order to succeed, the folder's parent
     * must be in the
     * {@link protos.google.cloud.resourcemanager.v3.Folder.State.ACTIVE|ACTIVE} state. In
     * addition, reintroducing the folder into the tree must not violate folder
     * naming, height, and fanout constraints described in the
     * {@link protos.google.cloud.resourcemanager.v3.Folders.CreateFolder|CreateFolder}
     * documentation. The caller must have `resourcemanager.folders.undelete`
     * permission on the identified folder.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the folder to undelete.
     *   Must be of the form `folders/{folder_id}`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.undelete_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_UndeleteFolder_async
     */
    undeleteFolder(request?: protos.google.cloud.resourcemanager.v3.IUndeleteFolderRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IUndeleteFolderMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    undeleteFolder(request: protos.google.cloud.resourcemanager.v3.IUndeleteFolderRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IUndeleteFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    undeleteFolder(request: protos.google.cloud.resourcemanager.v3.IUndeleteFolderRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IFolder, protos.google.cloud.resourcemanager.v3.IUndeleteFolderMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `undeleteFolder()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.undelete_folder.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_UndeleteFolder_async
     */
    checkUndeleteFolderProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Folder, protos.google.cloud.resourcemanager.v3.UndeleteFolderMetadata>>;
    /**
     * Lists the folders that are direct descendants of supplied parent resource.
     * `list()` provides a strongly consistent view of the folders underneath
     * the specified parent resource.
     * `list()` returns folders sorted based upon the (ascending) lexical ordering
     * of their display_name.
     * The caller must have `resourcemanager.folders.list` permission on the
     * identified parent.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The name of the parent resource whose folders are being listed.
     *   Only children of this parent resource are listed; descendants are not
     *   listed.
     *
     *   If the parent is a folder, use the value `folders/{folder_id}`. If the
     *   parent is an organization, use the value `organizations/{org_id}`.
     *
     *   Access to this method is controlled by checking the
     *   `resourcemanager.folders.list` permission on the `parent`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of folders to return in the response. The
     *   server can return fewer folders than requested. If unspecified, server
     *   picks an appropriate default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to `ListFolders`
     *   that indicates where this listing should continue from.
     * @param {boolean} [request.showDeleted]
     *   Optional. Controls whether folders in the
     *   {@link protos.google.cloud.resourcemanager.v3.Folder.State.DELETE_REQUESTED|DELETE_REQUESTED}
     *   state should be returned. Defaults to false.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is Array of {@link protos.google.cloud.resourcemanager.v3.Folder|Folder}.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed and will merge results from all the pages into this array.
     *   Note that it can affect your quota.
     *   We recommend using `listFoldersAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listFolders(request?: protos.google.cloud.resourcemanager.v3.IListFoldersRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.IFolder[],
        protos.google.cloud.resourcemanager.v3.IListFoldersRequest | null,
        protos.google.cloud.resourcemanager.v3.IListFoldersResponse
    ]>;
    listFolders(request: protos.google.cloud.resourcemanager.v3.IListFoldersRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.IListFoldersRequest, protos.google.cloud.resourcemanager.v3.IListFoldersResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IFolder>): void;
    listFolders(request: protos.google.cloud.resourcemanager.v3.IListFoldersRequest, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.IListFoldersRequest, protos.google.cloud.resourcemanager.v3.IListFoldersResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IFolder>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The name of the parent resource whose folders are being listed.
     *   Only children of this parent resource are listed; descendants are not
     *   listed.
     *
     *   If the parent is a folder, use the value `folders/{folder_id}`. If the
     *   parent is an organization, use the value `organizations/{org_id}`.
     *
     *   Access to this method is controlled by checking the
     *   `resourcemanager.folders.list` permission on the `parent`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of folders to return in the response. The
     *   server can return fewer folders than requested. If unspecified, server
     *   picks an appropriate default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to `ListFolders`
     *   that indicates where this listing should continue from.
     * @param {boolean} [request.showDeleted]
     *   Optional. Controls whether folders in the
     *   {@link protos.google.cloud.resourcemanager.v3.Folder.State.DELETE_REQUESTED|DELETE_REQUESTED}
     *   state should be returned. Defaults to false.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing {@link protos.google.cloud.resourcemanager.v3.Folder|Folder} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `listFoldersAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listFoldersStream(request?: protos.google.cloud.resourcemanager.v3.IListFoldersRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `listFolders`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The name of the parent resource whose folders are being listed.
     *   Only children of this parent resource are listed; descendants are not
     *   listed.
     *
     *   If the parent is a folder, use the value `folders/{folder_id}`. If the
     *   parent is an organization, use the value `organizations/{org_id}`.
     *
     *   Access to this method is controlled by checking the
     *   `resourcemanager.folders.list` permission on the `parent`.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of folders to return in the response. The
     *   server can return fewer folders than requested. If unspecified, server
     *   picks an appropriate default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to `ListFolders`
     *   that indicates where this listing should continue from.
     * @param {boolean} [request.showDeleted]
     *   Optional. Controls whether folders in the
     *   {@link protos.google.cloud.resourcemanager.v3.Folder.State.DELETE_REQUESTED|DELETE_REQUESTED}
     *   state should be returned. Defaults to false.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | async iteration }.
     *   When you iterate the returned iterable, each element will be an object representing
     *   {@link protos.google.cloud.resourcemanager.v3.Folder|Folder}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.list_folders.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_ListFolders_async
     */
    listFoldersAsync(request?: protos.google.cloud.resourcemanager.v3.IListFoldersRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.resourcemanager.v3.IFolder>;
    /**
     * Search for folders that match specific filter criteria.
     * `search()` provides an eventually consistent view of the folders a user has
     * access to which meet the specified filter criteria.
     *
     * This will only return folders on which the caller has the
     * permission `resourcemanager.folders.get`.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of folders to return in the response. The
     *   server can return fewer folders than requested. If unspecified, server
     *   picks an appropriate default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   `SearchFolders` that indicates from where search should continue.
     * @param {string} [request.query]
     *   Optional. Search criteria used to select the folders to return.
     *   If no search criteria is specified then all accessible folders will be
     *   returned.
     *
     *   Query expressions can be used to restrict results based upon displayName,
     *   state and parent, where the operators `=` (`:`) `NOT`, `AND` and `OR`
     *   can be used along with the suffix wildcard symbol `*`.
     *
     *   The `displayName` field in a query expression should use escaped quotes
     *   for values that include whitespace to prevent unexpected behavior.
     *
     *   ```
     *   | Field                   | Description                            |
     *   |-------------------------|----------------------------------------|
     *   | displayName             | Filters by displayName.                |
     *   | parent                  | Filters by parent (for example: folders/123). |
     *   | state, lifecycleState   | Filters by state.                      |
     *   ```
     *
     *   Some example queries are:
     *
     *   * Query `displayName=Test*` returns Folder resources whose display name
     *   starts with "Test".
     *   * Query `state=ACTIVE` returns Folder resources with
     *   `state` set to `ACTIVE`.
     *   * Query `parent=folders/123` returns Folder resources that have
     *   `folders/123` as a parent resource.
     *   * Query `parent=folders/123 AND state=ACTIVE` returns active
     *   Folder resources that have `folders/123` as a parent resource.
     *   * Query `displayName=\\"Test String\\"` returns Folder resources with
     *   display names that include both "Test" and "String".
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is Array of {@link protos.google.cloud.resourcemanager.v3.Folder|Folder}.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed and will merge results from all the pages into this array.
     *   Note that it can affect your quota.
     *   We recommend using `searchFoldersAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    searchFolders(request?: protos.google.cloud.resourcemanager.v3.ISearchFoldersRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.IFolder[],
        protos.google.cloud.resourcemanager.v3.ISearchFoldersRequest | null,
        protos.google.cloud.resourcemanager.v3.ISearchFoldersResponse
    ]>;
    searchFolders(request: protos.google.cloud.resourcemanager.v3.ISearchFoldersRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.ISearchFoldersRequest, protos.google.cloud.resourcemanager.v3.ISearchFoldersResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IFolder>): void;
    searchFolders(request: protos.google.cloud.resourcemanager.v3.ISearchFoldersRequest, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.ISearchFoldersRequest, protos.google.cloud.resourcemanager.v3.ISearchFoldersResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IFolder>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of folders to return in the response. The
     *   server can return fewer folders than requested. If unspecified, server
     *   picks an appropriate default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   `SearchFolders` that indicates from where search should continue.
     * @param {string} [request.query]
     *   Optional. Search criteria used to select the folders to return.
     *   If no search criteria is specified then all accessible folders will be
     *   returned.
     *
     *   Query expressions can be used to restrict results based upon displayName,
     *   state and parent, where the operators `=` (`:`) `NOT`, `AND` and `OR`
     *   can be used along with the suffix wildcard symbol `*`.
     *
     *   The `displayName` field in a query expression should use escaped quotes
     *   for values that include whitespace to prevent unexpected behavior.
     *
     *   ```
     *   | Field                   | Description                            |
     *   |-------------------------|----------------------------------------|
     *   | displayName             | Filters by displayName.                |
     *   | parent                  | Filters by parent (for example: folders/123). |
     *   | state, lifecycleState   | Filters by state.                      |
     *   ```
     *
     *   Some example queries are:
     *
     *   * Query `displayName=Test*` returns Folder resources whose display name
     *   starts with "Test".
     *   * Query `state=ACTIVE` returns Folder resources with
     *   `state` set to `ACTIVE`.
     *   * Query `parent=folders/123` returns Folder resources that have
     *   `folders/123` as a parent resource.
     *   * Query `parent=folders/123 AND state=ACTIVE` returns active
     *   Folder resources that have `folders/123` as a parent resource.
     *   * Query `displayName=\\"Test String\\"` returns Folder resources with
     *   display names that include both "Test" and "String".
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing {@link protos.google.cloud.resourcemanager.v3.Folder|Folder} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `searchFoldersAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    searchFoldersStream(request?: protos.google.cloud.resourcemanager.v3.ISearchFoldersRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `searchFolders`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of folders to return in the response. The
     *   server can return fewer folders than requested. If unspecified, server
     *   picks an appropriate default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   `SearchFolders` that indicates from where search should continue.
     * @param {string} [request.query]
     *   Optional. Search criteria used to select the folders to return.
     *   If no search criteria is specified then all accessible folders will be
     *   returned.
     *
     *   Query expressions can be used to restrict results based upon displayName,
     *   state and parent, where the operators `=` (`:`) `NOT`, `AND` and `OR`
     *   can be used along with the suffix wildcard symbol `*`.
     *
     *   The `displayName` field in a query expression should use escaped quotes
     *   for values that include whitespace to prevent unexpected behavior.
     *
     *   ```
     *   | Field                   | Description                            |
     *   |-------------------------|----------------------------------------|
     *   | displayName             | Filters by displayName.                |
     *   | parent                  | Filters by parent (for example: folders/123). |
     *   | state, lifecycleState   | Filters by state.                      |
     *   ```
     *
     *   Some example queries are:
     *
     *   * Query `displayName=Test*` returns Folder resources whose display name
     *   starts with "Test".
     *   * Query `state=ACTIVE` returns Folder resources with
     *   `state` set to `ACTIVE`.
     *   * Query `parent=folders/123` returns Folder resources that have
     *   `folders/123` as a parent resource.
     *   * Query `parent=folders/123 AND state=ACTIVE` returns active
     *   Folder resources that have `folders/123` as a parent resource.
     *   * Query `displayName=\\"Test String\\"` returns Folder resources with
     *   display names that include both "Test" and "String".
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | async iteration }.
     *   When you iterate the returned iterable, each element will be an object representing
     *   {@link protos.google.cloud.resourcemanager.v3.Folder|Folder}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/folders.search_folders.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Folders_SearchFolders_async
     */
    searchFoldersAsync(request?: protos.google.cloud.resourcemanager.v3.ISearchFoldersRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.resourcemanager.v3.IFolder>;
    /**
     * Gets the latest state of a long-running operation.  Clients can use this
     * method to poll the operation result at intervals as recommended by the API
     * service.
     *
     * @param {Object} request - The request object that will be sent.
     * @param {string} request.name - The name of the operation resource.
     * @param {Object=} options
     *   Optional parameters. You can override the default settings for this call,
     *   e.g, timeout, retries, paginations, etc. See {@link
     *   https://googleapis.github.io/gax-nodejs/global.html#CallOptions | gax.CallOptions}
     *   for the details.
     * @param {function(?Error, ?Object)=} callback
     *   The function which will be called with the result of the API call.
     *
     *   The second parameter to the callback is an object representing
     *   {@link google.longrunning.Operation | google.longrunning.Operation}.
     * @return {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     * {@link google.longrunning.Operation | google.longrunning.Operation}.
     * The promise has a method named "cancel" which cancels the ongoing API call.
     *
     * @example
     * ```
     * const client = longrunning.operationsClient();
     * const name = '';
     * const [response] = await client.getOperation({name});
     * // doThingsWith(response)
     * ```
     */
    getOperation(request: protos.google.longrunning.GetOperationRequest, options?: gax.CallOptions | Callback<protos.google.longrunning.Operation, protos.google.longrunning.GetOperationRequest, {} | null | undefined>, callback?: Callback<protos.google.longrunning.Operation, protos.google.longrunning.GetOperationRequest, {} | null | undefined>): Promise<[protos.google.longrunning.Operation]>;
    /**
     * Lists operations that match the specified filter in the request. If the
     * server doesn't support this method, it returns `UNIMPLEMENTED`. Returns an iterable object.
     *
     * For-await-of syntax is used with the iterable to recursively get response element on-demand.
     *
     * @param {Object} request - The request object that will be sent.
     * @param {string} request.name - The name of the operation collection.
     * @param {string} request.filter - The standard list filter.
     * @param {number=} request.pageSize -
     *   The maximum number of resources contained in the underlying API
     *   response. If page streaming is performed per-resource, this
     *   parameter does not affect the return value. If page streaming is
     *   performed per-page, this determines the maximum number of
     *   resources in a page.
     * @param {Object=} options
     *   Optional parameters. You can override the default settings for this call,
     *   e.g, timeout, retries, paginations, etc. See {@link
     *   https://googleapis.github.io/gax-nodejs/global.html#CallOptions | gax.CallOptions} for the
     *   details.
     * @returns {Object}
     *   An iterable Object that conforms to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | iteration protocols}.
     *
     * @example
     * ```
     * const client = longrunning.operationsClient();
     * for await (const response of client.listOperationsAsync(request));
     * // doThingsWith(response)
     * ```
     */
    listOperationsAsync(request: protos.google.longrunning.ListOperationsRequest, options?: gax.CallOptions): AsyncIterable<protos.google.longrunning.ListOperationsResponse>;
    /**
     * Starts asynchronous cancellation on a long-running operation.  The server
     * makes a best effort to cancel the operation, but success is not
     * guaranteed.  If the server doesn't support this method, it returns
     * `google.rpc.Code.UNIMPLEMENTED`.  Clients can use
     * {@link Operations.GetOperation} or
     * other methods to check whether the cancellation succeeded or whether the
     * operation completed despite cancellation. On successful cancellation,
     * the operation is not deleted; instead, it becomes an operation with
     * an {@link Operation.error} value with a {@link google.rpc.Status.code} of
     * 1, corresponding to `Code.CANCELLED`.
     *
     * @param {Object} request - The request object that will be sent.
     * @param {string} request.name - The name of the operation resource to be cancelled.
     * @param {Object=} options
     *   Optional parameters. You can override the default settings for this call,
     * e.g, timeout, retries, paginations, etc. See {@link
     * https://googleapis.github.io/gax-nodejs/global.html#CallOptions | gax.CallOptions} for the
     * details.
     * @param {function(?Error)=} callback
     *   The function which will be called with the result of the API call.
     * @return {Promise} - The promise which resolves when API call finishes.
     *   The promise has a method named "cancel" which cancels the ongoing API
     * call.
     *
     * @example
     * ```
     * const client = longrunning.operationsClient();
     * await client.cancelOperation({name: ''});
     * ```
     */
    cancelOperation(request: protos.google.longrunning.CancelOperationRequest, options?: gax.CallOptions | Callback<protos.google.protobuf.Empty, protos.google.longrunning.CancelOperationRequest, {} | undefined | null>, callback?: Callback<protos.google.longrunning.CancelOperationRequest, protos.google.protobuf.Empty, {} | undefined | null>): Promise<protos.google.protobuf.Empty>;
    /**
     * Deletes a long-running operation. This method indicates that the client is
     * no longer interested in the operation result. It does not cancel the
     * operation. If the server doesn't support this method, it returns
     * `google.rpc.Code.UNIMPLEMENTED`.
     *
     * @param {Object} request - The request object that will be sent.
     * @param {string} request.name - The name of the operation resource to be deleted.
     * @param {Object=} options
     *   Optional parameters. You can override the default settings for this call,
     * e.g, timeout, retries, paginations, etc. See {@link
     * https://googleapis.github.io/gax-nodejs/global.html#CallOptions | gax.CallOptions}
     * for the details.
     * @param {function(?Error)=} callback
     *   The function which will be called with the result of the API call.
     * @return {Promise} - The promise which resolves when API call finishes.
     *   The promise has a method named "cancel" which cancels the ongoing API
     * call.
     *
     * @example
     * ```
     * const client = longrunning.operationsClient();
     * await client.deleteOperation({name: ''});
     * ```
     */
    deleteOperation(request: protos.google.longrunning.DeleteOperationRequest, options?: gax.CallOptions | Callback<protos.google.protobuf.Empty, protos.google.longrunning.DeleteOperationRequest, {} | null | undefined>, callback?: Callback<protos.google.protobuf.Empty, protos.google.longrunning.DeleteOperationRequest, {} | null | undefined>): Promise<protos.google.protobuf.Empty>;
    /**
     * Return a fully-qualified folder resource name string.
     *
     * @param {string} folder
     * @returns {string} Resource name string.
     */
    folderPath(folder: string): string;
    /**
     * Parse the folder from Folder resource.
     *
     * @param {string} folderName
     *   A fully-qualified path representing Folder resource.
     * @returns {string} A string representing the folder.
     */
    matchFolderFromFolderName(folderName: string): string | number;
    /**
     * Return a fully-qualified organization resource name string.
     *
     * @param {string} organization
     * @returns {string} Resource name string.
     */
    organizationPath(organization: string): string;
    /**
     * Parse the organization from Organization resource.
     *
     * @param {string} organizationName
     *   A fully-qualified path representing Organization resource.
     * @returns {string} A string representing the organization.
     */
    matchOrganizationFromOrganizationName(organizationName: string): string | number;
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
     * Return a fully-qualified tagBinding resource name string.
     *
     * @param {string} tag_binding
     * @returns {string} Resource name string.
     */
    tagBindingPath(tagBinding: string): string;
    /**
     * Parse the tag_binding from TagBinding resource.
     *
     * @param {string} tagBindingName
     *   A fully-qualified path representing TagBinding resource.
     * @returns {string} A string representing the tag_binding.
     */
    matchTagBindingFromTagBindingName(tagBindingName: string): string | number;
    /**
     * Return a fully-qualified tagHold resource name string.
     *
     * @param {string} tag_value
     * @param {string} tag_hold
     * @returns {string} Resource name string.
     */
    tagHoldPath(tagValue: string, tagHold: string): string;
    /**
     * Parse the tag_value from TagHold resource.
     *
     * @param {string} tagHoldName
     *   A fully-qualified path representing TagHold resource.
     * @returns {string} A string representing the tag_value.
     */
    matchTagValueFromTagHoldName(tagHoldName: string): string | number;
    /**
     * Parse the tag_hold from TagHold resource.
     *
     * @param {string} tagHoldName
     *   A fully-qualified path representing TagHold resource.
     * @returns {string} A string representing the tag_hold.
     */
    matchTagHoldFromTagHoldName(tagHoldName: string): string | number;
    /**
     * Return a fully-qualified tagKey resource name string.
     *
     * @param {string} tag_key
     * @returns {string} Resource name string.
     */
    tagKeyPath(tagKey: string): string;
    /**
     * Parse the tag_key from TagKey resource.
     *
     * @param {string} tagKeyName
     *   A fully-qualified path representing TagKey resource.
     * @returns {string} A string representing the tag_key.
     */
    matchTagKeyFromTagKeyName(tagKeyName: string): string | number;
    /**
     * Return a fully-qualified tagValue resource name string.
     *
     * @param {string} tag_value
     * @returns {string} Resource name string.
     */
    tagValuePath(tagValue: string): string;
    /**
     * Parse the tag_value from TagValue resource.
     *
     * @param {string} tagValueName
     *   A fully-qualified path representing TagValue resource.
     * @returns {string} A string representing the tag_value.
     */
    matchTagValueFromTagValueName(tagValueName: string): string | number;
    /**
     * Terminate the gRPC channel and close the client.
     *
     * The client will no longer be usable and all future behavior is undefined.
     * @returns {Promise} A promise that resolves when the client is closed.
     */
    close(): Promise<void>;
}
