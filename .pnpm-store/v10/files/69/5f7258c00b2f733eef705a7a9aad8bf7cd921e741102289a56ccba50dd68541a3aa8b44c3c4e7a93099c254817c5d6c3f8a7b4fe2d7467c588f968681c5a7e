/// <reference types="node" />
import type * as gax from 'google-gax';
import type { Callback, CallOptions, Descriptors, ClientOptions, LROperation, PaginationCallback } from 'google-gax';
import { Transform } from 'stream';
import * as protos from '../../protos/protos';
/**
 *  Allow users to create and manage tag keys.
 * @class
 * @memberof v3
 */
export declare class TagKeysClient {
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
    tagKeysStub?: Promise<{
        [name: string]: Function;
    }>;
    /**
     * Construct an instance of TagKeysClient.
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
     *     const client = new TagKeysClient({fallback: true}, gax);
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
     * Retrieves a TagKey. This method will return `PERMISSION_DENIED` if the
     * key does not exist or the user does not have permission to view it.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. A resource name in the format `tagKeys/{id}`, such as
     *   `tagKeys/123`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.resourcemanager.v3.TagKey|TagKey}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/tag_keys.get_tag_key.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_GetTagKey_async
     */
    getTagKey(request?: protos.google.cloud.resourcemanager.v3.IGetTagKeyRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.ITagKey,
        protos.google.cloud.resourcemanager.v3.IGetTagKeyRequest | undefined,
        {} | undefined
    ]>;
    getTagKey(request: protos.google.cloud.resourcemanager.v3.IGetTagKeyRequest, options: CallOptions, callback: Callback<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IGetTagKeyRequest | null | undefined, {} | null | undefined>): void;
    getTagKey(request: protos.google.cloud.resourcemanager.v3.IGetTagKeyRequest, callback: Callback<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IGetTagKeyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Retrieves a TagKey by its namespaced name.
     * This method will return `PERMISSION_DENIED` if the key does not exist
     * or the user does not have permission to view it.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. A namespaced tag key name in the format
     *   `{parentId}/{tagKeyShort}`, such as `42/foo` for a key with short name
     *   "foo" under the organization with ID 42 or `r2-d2/bar` for a key with short
     *   name "bar" under the project `r2-d2`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.resourcemanager.v3.TagKey|TagKey}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/tag_keys.get_namespaced_tag_key.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_GetNamespacedTagKey_async
     */
    getNamespacedTagKey(request?: protos.google.cloud.resourcemanager.v3.IGetNamespacedTagKeyRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.ITagKey,
        (protos.google.cloud.resourcemanager.v3.IGetNamespacedTagKeyRequest | undefined),
        {} | undefined
    ]>;
    getNamespacedTagKey(request: protos.google.cloud.resourcemanager.v3.IGetNamespacedTagKeyRequest, options: CallOptions, callback: Callback<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IGetNamespacedTagKeyRequest | null | undefined, {} | null | undefined>): void;
    getNamespacedTagKey(request: protos.google.cloud.resourcemanager.v3.IGetNamespacedTagKeyRequest, callback: Callback<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IGetNamespacedTagKeyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Gets the access control policy for a TagKey. The returned policy may be
     * empty if no such policy or resource exists. The `resource` field should
     * be the TagKey's resource name. For example, "tagKeys/1234".
     * The caller must have
     * `cloudresourcemanager.googleapis.com/tagKeys.getIamPolicy` permission on
     * the specified TagKey.
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
     * @example <caption>include:samples/generated/v3/tag_keys.get_iam_policy.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_GetIamPolicy_async
     */
    getIamPolicy(request?: protos.google.iam.v1.IGetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.IGetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Sets the access control policy on a TagKey, replacing any existing
     * policy. The `resource` field should be the TagKey's resource name.
     * For example, "tagKeys/1234".
     * The caller must have `resourcemanager.tagKeys.setIamPolicy` permission
     * on the identified tagValue.
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
     * @example <caption>include:samples/generated/v3/tag_keys.set_iam_policy.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_SetIamPolicy_async
     */
    setIamPolicy(request?: protos.google.iam.v1.ISetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.ISetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Returns permissions that a caller has on the specified TagKey.
     * The `resource` field should be the TagKey's resource name.
     * For example, "tagKeys/1234".
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
     * @example <caption>include:samples/generated/v3/tag_keys.test_iam_permissions.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_TestIamPermissions_async
     */
    testIamPermissions(request?: protos.google.iam.v1.ITestIamPermissionsRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.ITestIamPermissionsResponse,
        protos.google.iam.v1.ITestIamPermissionsRequest | undefined,
        {} | undefined
    ]>;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Creates a new TagKey. If another request with the same parameters is
     * sent while the original request is in process, the second request
     * will receive an error. A maximum of 1000 TagKeys can exist under a parent
     * at any given time.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {google.cloud.resourcemanager.v3.TagKey} request.tagKey
     *   Required. The TagKey to be created. Only fields `short_name`,
     *   `description`, and `parent` are considered during the creation request.
     * @param {boolean} [request.validateOnly]
     *   Optional. Set to true to perform validations necessary for creating the
     *   resource, but not actually perform the action.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/tag_keys.create_tag_key.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_CreateTagKey_async
     */
    createTagKey(request?: protos.google.cloud.resourcemanager.v3.ICreateTagKeyRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.ICreateTagKeyMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    createTagKey(request: protos.google.cloud.resourcemanager.v3.ICreateTagKeyRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.ICreateTagKeyMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    createTagKey(request: protos.google.cloud.resourcemanager.v3.ICreateTagKeyRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.ICreateTagKeyMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `createTagKey()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/tag_keys.create_tag_key.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_CreateTagKey_async
     */
    checkCreateTagKeyProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.TagKey, protos.google.cloud.resourcemanager.v3.CreateTagKeyMetadata>>;
    /**
     * Updates the attributes of the TagKey resource.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {google.cloud.resourcemanager.v3.TagKey} request.tagKey
     *   Required. The new definition of the TagKey. Only the `description` and
     *   `etag` fields can be updated by this request. If the `etag` field is not
     *   empty, it must match the `etag` field of the existing tag key. Otherwise,
     *   `ABORTED` will be returned.
     * @param {google.protobuf.FieldMask} request.updateMask
     *   Fields to be updated. The mask may only contain `description` or
     *   `etag`. If omitted entirely, both `description` and `etag` are assumed to
     *   be significant.
     * @param {boolean} request.validateOnly
     *   Set as true to perform validations necessary for updating the resource, but
     *   not actually perform the action.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/tag_keys.update_tag_key.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_UpdateTagKey_async
     */
    updateTagKey(request?: protos.google.cloud.resourcemanager.v3.IUpdateTagKeyRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IUpdateTagKeyMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    updateTagKey(request: protos.google.cloud.resourcemanager.v3.IUpdateTagKeyRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IUpdateTagKeyMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    updateTagKey(request: protos.google.cloud.resourcemanager.v3.IUpdateTagKeyRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IUpdateTagKeyMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `updateTagKey()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/tag_keys.update_tag_key.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_UpdateTagKey_async
     */
    checkUpdateTagKeyProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.TagKey, protos.google.cloud.resourcemanager.v3.UpdateTagKeyMetadata>>;
    /**
     * Deletes a TagKey. The TagKey cannot be deleted if it has any child
     * TagValues.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of a TagKey to be deleted in the format
     *   `tagKeys/123`. The TagKey cannot be a parent of any existing TagValues or
     *   it will not be deleted successfully.
     * @param {boolean} [request.validateOnly]
     *   Optional. Set as true to perform validations necessary for deletion, but
     *   not actually perform the action.
     * @param {string} [request.etag]
     *   Optional. The etag known to the client for the expected state of the
     *   TagKey. This is to be used for optimistic concurrency.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/tag_keys.delete_tag_key.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_DeleteTagKey_async
     */
    deleteTagKey(request?: protos.google.cloud.resourcemanager.v3.IDeleteTagKeyRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IDeleteTagKeyMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    deleteTagKey(request: protos.google.cloud.resourcemanager.v3.IDeleteTagKeyRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IDeleteTagKeyMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    deleteTagKey(request: protos.google.cloud.resourcemanager.v3.IDeleteTagKeyRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.ITagKey, protos.google.cloud.resourcemanager.v3.IDeleteTagKeyMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `deleteTagKey()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/tag_keys.delete_tag_key.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_DeleteTagKey_async
     */
    checkDeleteTagKeyProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.TagKey, protos.google.cloud.resourcemanager.v3.DeleteTagKeyMetadata>>;
    /**
     * Lists all TagKeys for a parent resource.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the TagKey's parent.
     *   Must be of the form `organizations/{org_id}` or `projects/{project_id}` or
     *   `projects/{project_number}`
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of TagKeys to return in the response. The
     *   server allows a maximum of 300 TagKeys to return. If unspecified, the
     *   server will use 100 as the default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to `ListTagKey`
     *   that indicates where this listing should continue from.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is Array of {@link protos.google.cloud.resourcemanager.v3.TagKey|TagKey}.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed and will merge results from all the pages into this array.
     *   Note that it can affect your quota.
     *   We recommend using `listTagKeysAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listTagKeys(request?: protos.google.cloud.resourcemanager.v3.IListTagKeysRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.ITagKey[],
        protos.google.cloud.resourcemanager.v3.IListTagKeysRequest | null,
        protos.google.cloud.resourcemanager.v3.IListTagKeysResponse
    ]>;
    listTagKeys(request: protos.google.cloud.resourcemanager.v3.IListTagKeysRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.IListTagKeysRequest, protos.google.cloud.resourcemanager.v3.IListTagKeysResponse | null | undefined, protos.google.cloud.resourcemanager.v3.ITagKey>): void;
    listTagKeys(request: protos.google.cloud.resourcemanager.v3.IListTagKeysRequest, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.IListTagKeysRequest, protos.google.cloud.resourcemanager.v3.IListTagKeysResponse | null | undefined, protos.google.cloud.resourcemanager.v3.ITagKey>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the TagKey's parent.
     *   Must be of the form `organizations/{org_id}` or `projects/{project_id}` or
     *   `projects/{project_number}`
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of TagKeys to return in the response. The
     *   server allows a maximum of 300 TagKeys to return. If unspecified, the
     *   server will use 100 as the default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to `ListTagKey`
     *   that indicates where this listing should continue from.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing {@link protos.google.cloud.resourcemanager.v3.TagKey|TagKey} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `listTagKeysAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listTagKeysStream(request?: protos.google.cloud.resourcemanager.v3.IListTagKeysRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `listTagKeys`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The resource name of the TagKey's parent.
     *   Must be of the form `organizations/{org_id}` or `projects/{project_id}` or
     *   `projects/{project_number}`
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of TagKeys to return in the response. The
     *   server allows a maximum of 300 TagKeys to return. If unspecified, the
     *   server will use 100 as the default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to `ListTagKey`
     *   that indicates where this listing should continue from.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | async iteration }.
     *   When you iterate the returned iterable, each element will be an object representing
     *   {@link protos.google.cloud.resourcemanager.v3.TagKey|TagKey}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/tag_keys.list_tag_keys.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_TagKeys_ListTagKeys_async
     */
    listTagKeysAsync(request?: protos.google.cloud.resourcemanager.v3.IListTagKeysRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.resourcemanager.v3.ITagKey>;
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
