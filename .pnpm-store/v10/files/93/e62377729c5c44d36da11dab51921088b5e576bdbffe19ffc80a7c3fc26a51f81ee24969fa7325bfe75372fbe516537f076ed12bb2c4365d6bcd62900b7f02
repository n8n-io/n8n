/// <reference types="node" />
import type * as gax from 'google-gax';
import type { Callback, CallOptions, Descriptors, ClientOptions, LROperation, PaginationCallback } from 'google-gax';
import { Transform } from 'stream';
import * as protos from '../../protos/protos';
/**
 *  Manages Google Cloud Projects.
 * @class
 * @memberof v3
 */
export declare class ProjectsClient {
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
    projectsStub?: Promise<{
        [name: string]: Function;
    }>;
    /**
     * Construct an instance of ProjectsClient.
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
     *     const client = new ProjectsClient({fallback: true}, gax);
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
     * Retrieves the project identified by the specified `name` (for example,
     * `projects/415104041262`).
     *
     * The caller must have `resourcemanager.projects.get` permission
     * for this project.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The name of the project (for example, `projects/415104041262`).
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.resourcemanager.v3.Project|Project}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.get_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_GetProject_async
     */
    getProject(request?: protos.google.cloud.resourcemanager.v3.IGetProjectRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.IProject,
        protos.google.cloud.resourcemanager.v3.IGetProjectRequest | undefined,
        {} | undefined
    ]>;
    getProject(request: protos.google.cloud.resourcemanager.v3.IGetProjectRequest, options: CallOptions, callback: Callback<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IGetProjectRequest | null | undefined, {} | null | undefined>): void;
    getProject(request: protos.google.cloud.resourcemanager.v3.IGetProjectRequest, callback: Callback<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IGetProjectRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Returns the IAM access control policy for the specified project, in the
     * format `projects/{ProjectIdOrNumber}` e.g. projects/123.
     * Permission is denied if the policy or the resource do not exist.
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
     * @example <caption>include:samples/generated/v3/projects.get_iam_policy.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_GetIamPolicy_async
     */
    getIamPolicy(request?: protos.google.iam.v1.IGetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.IGetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Sets the IAM access control policy for the specified project, in the
     * format `projects/{ProjectIdOrNumber}` e.g. projects/123.
     *
     * CAUTION: This method will replace the existing policy, and cannot be used
     * to append additional IAM settings.
     *
     * Note: Removing service accounts from policies or changing their roles can
     * render services completely inoperable. It is important to understand how
     * the service account is being used before removing or updating its roles.
     *
     * The following constraints apply when using `setIamPolicy()`:
     *
     * + Project does not support `allUsers` and `allAuthenticatedUsers` as
     * `members` in a `Binding` of a `Policy`.
     *
     * + The owner role can be granted to a `user`, `serviceAccount`, or a group
     * that is part of an organization. For example,
     * group@myownpersonaldomain.com could be added as an owner to a project in
     * the myownpersonaldomain.com organization, but not the examplepetstore.com
     * organization.
     *
     * + Service accounts can be made owners of a project directly
     * without any restrictions. However, to be added as an owner, a user must be
     * invited using the Cloud Platform console and must accept the invitation.
     *
     * + A user cannot be granted the owner role using `setIamPolicy()`. The user
     * must be granted the owner role using the Cloud Platform Console and must
     * explicitly accept the invitation.
     *
     * + Invitations to grant the owner role cannot be sent using
     * `setIamPolicy()`;
     * they must be sent only using the Cloud Platform Console.
     *
     * + If the project is not part of an organization, there must be at least
     * one owner who has accepted the Terms of Service (ToS) agreement in the
     * policy. Calling `setIamPolicy()` to remove the last ToS-accepted owner
     * from the policy will fail. This restriction also applies to legacy
     * projects that no longer have owners who have accepted the ToS. Edits to
     * IAM policies will be rejected until the lack of a ToS-accepting owner is
     * rectified. If the project is part of an organization, you can remove all
     * owners, potentially making the organization inaccessible.
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
     * @example <caption>include:samples/generated/v3/projects.set_iam_policy.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_SetIamPolicy_async
     */
    setIamPolicy(request?: protos.google.iam.v1.ISetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.ISetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Returns permissions that a caller has on the specified project, in the
     * format `projects/{ProjectIdOrNumber}` e.g. projects/123..
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
     * @example <caption>include:samples/generated/v3/projects.test_iam_permissions.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_TestIamPermissions_async
     */
    testIamPermissions(request?: protos.google.iam.v1.ITestIamPermissionsRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.ITestIamPermissionsResponse,
        protos.google.iam.v1.ITestIamPermissionsRequest | undefined,
        {} | undefined
    ]>;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Request that a new project be created. The result is an `Operation` which
     * can be used to track the creation process. This process usually takes a few
     * seconds, but can sometimes take much longer. The tracking `Operation` is
     * automatically deleted after a few hours, so there is no need to call
     * `DeleteOperation`.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {google.cloud.resourcemanager.v3.Project} request.project
     *   Required. The Project to create.
     *
     *   Project ID is required. If the requested ID is unavailable, the request
     *   fails.
     *
     *   If the `parent` field is set, the `resourcemanager.projects.create`
     *   permission is checked on the parent resource. If no parent is set and
     *   the authorization credentials belong to an Organization, the parent
     *   will be set to that Organization.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.create_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_CreateProject_async
     */
    createProject(request?: protos.google.cloud.resourcemanager.v3.ICreateProjectRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.ICreateProjectMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    createProject(request: protos.google.cloud.resourcemanager.v3.ICreateProjectRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.ICreateProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    createProject(request: protos.google.cloud.resourcemanager.v3.ICreateProjectRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.ICreateProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `createProject()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.create_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_CreateProject_async
     */
    checkCreateProjectProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Project, protos.google.cloud.resourcemanager.v3.CreateProjectMetadata>>;
    /**
     * Updates the `display_name` and labels of the project identified by the
     * specified `name` (for example, `projects/415104041262`). Deleting all
     * labels requires an update mask for labels field.
     *
     * The caller must have `resourcemanager.projects.update` permission for this
     * project.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {google.cloud.resourcemanager.v3.Project} request.project
     *   Required. The new definition of the project.
     * @param {google.protobuf.FieldMask} [request.updateMask]
     *   Optional. An update mask to selectively update fields.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.update_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_UpdateProject_async
     */
    updateProject(request?: protos.google.cloud.resourcemanager.v3.IUpdateProjectRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IUpdateProjectMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    updateProject(request: protos.google.cloud.resourcemanager.v3.IUpdateProjectRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IUpdateProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    updateProject(request: protos.google.cloud.resourcemanager.v3.IUpdateProjectRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IUpdateProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `updateProject()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.update_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_UpdateProject_async
     */
    checkUpdateProjectProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Project, protos.google.cloud.resourcemanager.v3.UpdateProjectMetadata>>;
    /**
     * Move a project to another place in your resource hierarchy, under a new
     * resource parent.
     *
     * Returns an operation which can be used to track the process of the project
     * move workflow.
     * Upon success, the `Operation.response` field will be populated with the
     * moved project.
     *
     * The caller must have `resourcemanager.projects.move` permission on the
     * project, on the project's current and proposed new parent.
     *
     * If project has no current parent, or it currently does not have an
     * associated organization resource, you will also need the
     * `resourcemanager.projects.setIamPolicy` permission in the project.
     *
     *
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The name of the project to move.
     * @param {string} request.destinationParent
     *   Required. The new parent to move the Project under.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.move_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_MoveProject_async
     */
    moveProject(request?: protos.google.cloud.resourcemanager.v3.IMoveProjectRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IMoveProjectMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    moveProject(request: protos.google.cloud.resourcemanager.v3.IMoveProjectRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IMoveProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    moveProject(request: protos.google.cloud.resourcemanager.v3.IMoveProjectRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IMoveProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `moveProject()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.move_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_MoveProject_async
     */
    checkMoveProjectProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Project, protos.google.cloud.resourcemanager.v3.MoveProjectMetadata>>;
    /**
     * Marks the project identified by the specified
     * `name` (for example, `projects/415104041262`) for deletion.
     *
     * This method will only affect the project if it has a lifecycle state of
     * {@link protos.google.cloud.resourcemanager.v3.Project.State.ACTIVE|ACTIVE}.
     *
     * This method changes the Project's lifecycle state from
     * {@link protos.google.cloud.resourcemanager.v3.Project.State.ACTIVE|ACTIVE}
     * to
     * {@link protos.google.cloud.resourcemanager.v3.Project.State.DELETE_REQUESTED|DELETE_REQUESTED}.
     * The deletion starts at an unspecified time,
     * at which point the Project is no longer accessible.
     *
     * Until the deletion completes, you can check the lifecycle state
     * checked by retrieving the project with [GetProject]
     * [google.cloud.resourcemanager.v3.Projects.GetProject],
     * and the project remains visible to [ListProjects]
     * [google.cloud.resourcemanager.v3.Projects.ListProjects].
     * However, you cannot update the project.
     *
     * After the deletion completes, the project is not retrievable by
     * the  [GetProject]
     * [google.cloud.resourcemanager.v3.Projects.GetProject],
     * [ListProjects]
     * [google.cloud.resourcemanager.v3.Projects.ListProjects], and
     * {@link protos.google.cloud.resourcemanager.v3.Projects.SearchProjects|SearchProjects}
     * methods.
     *
     * This method behaves idempotently, such that deleting a `DELETE_REQUESTED`
     * project will not cause an error, but also won't do anything.
     *
     * The caller must have `resourcemanager.projects.delete` permissions for this
     * project.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The name of the Project (for example, `projects/415104041262`).
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.delete_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_DeleteProject_async
     */
    deleteProject(request?: protos.google.cloud.resourcemanager.v3.IDeleteProjectRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IDeleteProjectMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    deleteProject(request: protos.google.cloud.resourcemanager.v3.IDeleteProjectRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IDeleteProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    deleteProject(request: protos.google.cloud.resourcemanager.v3.IDeleteProjectRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IDeleteProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `deleteProject()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.delete_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_DeleteProject_async
     */
    checkDeleteProjectProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Project, protos.google.cloud.resourcemanager.v3.DeleteProjectMetadata>>;
    /**
     * Restores the project identified by the specified
     * `name` (for example, `projects/415104041262`).
     * You can only use this method for a project that has a lifecycle state of
     * [DELETE_REQUESTED]
     * [Projects.State.DELETE_REQUESTED].
     * After deletion starts, the project cannot be restored.
     *
     * The caller must have `resourcemanager.projects.undelete` permission for
     * this project.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The name of the project (for example, `projects/415104041262`).
     *
     *   Required.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing
     *   a long running operation. Its `promise()` method returns a promise
     *   you can `await` for.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.undelete_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_UndeleteProject_async
     */
    undeleteProject(request?: protos.google.cloud.resourcemanager.v3.IUndeleteProjectRequest, options?: CallOptions): Promise<[
        LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IUndeleteProjectMetadata>,
        protos.google.longrunning.IOperation | undefined,
        {} | undefined
    ]>;
    undeleteProject(request: protos.google.cloud.resourcemanager.v3.IUndeleteProjectRequest, options: CallOptions, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IUndeleteProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    undeleteProject(request: protos.google.cloud.resourcemanager.v3.IUndeleteProjectRequest, callback: Callback<LROperation<protos.google.cloud.resourcemanager.v3.IProject, protos.google.cloud.resourcemanager.v3.IUndeleteProjectMetadata>, protos.google.longrunning.IOperation | null | undefined, {} | null | undefined>): void;
    /**
     * Check the status of the long running operation returned by `undeleteProject()`.
     * @param {String} name
     *   The operation name that will be passed.
     * @returns {Promise} - The promise which resolves to an object.
     *   The decoded operation object has result and metadata field to get information from.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#long-running-operations | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.undelete_project.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_UndeleteProject_async
     */
    checkUndeleteProjectProgress(name: string): Promise<LROperation<protos.google.cloud.resourcemanager.v3.Project, protos.google.cloud.resourcemanager.v3.UndeleteProjectMetadata>>;
    /**
     * Lists projects that are direct children of the specified folder or
     * organization resource. `list()` provides a strongly consistent view of the
     * projects underneath the specified parent resource. `list()` returns
     * projects sorted based upon the (ascending) lexical ordering of their
     * `display_name`. The caller must have `resourcemanager.projects.list`
     * permission on the identified parent.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The name of the parent resource whose projects are being listed.
     *   Only children of this parent resource are listed; descendants are not
     *   listed.
     *
     *   If the parent is a folder, use the value `folders/{folder_id}`. If the
     *   parent is an organization, use the value `organizations/{org_id}`.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   [ListProjects] [google.cloud.resourcemanager.v3.Projects.ListProjects] that
     *   indicates from where listing should continue.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of projects to return in the response.
     *   The server can return fewer projects than requested.
     *   If unspecified, server picks an appropriate default.
     * @param {boolean} [request.showDeleted]
     *   Optional. Indicate that projects in the `DELETE_REQUESTED` state should
     *   also be returned. Normally only `ACTIVE` projects are returned.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is Array of {@link protos.google.cloud.resourcemanager.v3.Project|Project}.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed and will merge results from all the pages into this array.
     *   Note that it can affect your quota.
     *   We recommend using `listProjectsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listProjects(request?: protos.google.cloud.resourcemanager.v3.IListProjectsRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.IProject[],
        protos.google.cloud.resourcemanager.v3.IListProjectsRequest | null,
        protos.google.cloud.resourcemanager.v3.IListProjectsResponse
    ]>;
    listProjects(request: protos.google.cloud.resourcemanager.v3.IListProjectsRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.IListProjectsRequest, protos.google.cloud.resourcemanager.v3.IListProjectsResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IProject>): void;
    listProjects(request: protos.google.cloud.resourcemanager.v3.IListProjectsRequest, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.IListProjectsRequest, protos.google.cloud.resourcemanager.v3.IListProjectsResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IProject>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The name of the parent resource whose projects are being listed.
     *   Only children of this parent resource are listed; descendants are not
     *   listed.
     *
     *   If the parent is a folder, use the value `folders/{folder_id}`. If the
     *   parent is an organization, use the value `organizations/{org_id}`.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   [ListProjects] [google.cloud.resourcemanager.v3.Projects.ListProjects] that
     *   indicates from where listing should continue.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of projects to return in the response.
     *   The server can return fewer projects than requested.
     *   If unspecified, server picks an appropriate default.
     * @param {boolean} [request.showDeleted]
     *   Optional. Indicate that projects in the `DELETE_REQUESTED` state should
     *   also be returned. Normally only `ACTIVE` projects are returned.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing {@link protos.google.cloud.resourcemanager.v3.Project|Project} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `listProjectsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    listProjectsStream(request?: protos.google.cloud.resourcemanager.v3.IListProjectsRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `listProjects`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.parent
     *   Required. The name of the parent resource whose projects are being listed.
     *   Only children of this parent resource are listed; descendants are not
     *   listed.
     *
     *   If the parent is a folder, use the value `folders/{folder_id}`. If the
     *   parent is an organization, use the value `organizations/{org_id}`.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   [ListProjects] [google.cloud.resourcemanager.v3.Projects.ListProjects] that
     *   indicates from where listing should continue.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of projects to return in the response.
     *   The server can return fewer projects than requested.
     *   If unspecified, server picks an appropriate default.
     * @param {boolean} [request.showDeleted]
     *   Optional. Indicate that projects in the `DELETE_REQUESTED` state should
     *   also be returned. Normally only `ACTIVE` projects are returned.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | async iteration }.
     *   When you iterate the returned iterable, each element will be an object representing
     *   {@link protos.google.cloud.resourcemanager.v3.Project|Project}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.list_projects.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_ListProjects_async
     */
    listProjectsAsync(request?: protos.google.cloud.resourcemanager.v3.IListProjectsRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.resourcemanager.v3.IProject>;
    /**
     * Search for projects that the caller has both `resourcemanager.projects.get`
     * permission on, and also satisfy the specified query.
     *
     * This method returns projects in an unspecified order.
     *
     * This method is eventually consistent with project mutations; this means
     * that a newly created project may not appear in the results or recent
     * updates to an existing project may not be reflected in the results. To
     * retrieve the latest state of a project, use the
     * {@link protos.google.cloud.resourcemanager.v3.Projects.GetProject|GetProject} method.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} [request.query]
     *   Optional. A query string for searching for projects that the caller has
     *   `resourcemanager.projects.get` permission to. If multiple fields are
     *   included in the query, then it will return results that match any of the
     *   fields. Some eligible fields are:
     *
     *   - **`displayName`, `name`**: Filters by displayName.
     *   - **`parent`**: Project's parent (for example: `folders/123`,
     *   `organizations/*`). Prefer `parent` field over `parent.type` and
     *   `parent.id`.
     *   - **`parent.type`**: Parent's type: `folder` or `organization`.
     *   - **`parent.id`**: Parent's id number (for example: `123`).
     *   - **`id`, `projectId`**: Filters by projectId.
     *   - **`state`, `lifecycleState`**: Filters by state.
     *   - **`labels`**: Filters by label name or value.
     *   - **`labels.<key>` (where `<key>` is the name of a label)**: Filters by label
     *   name.
     *
     *   Search expressions are case insensitive.
     *
     *   Some examples queries:
     *
     *
     *   - **`name:how*`**: The project's name starts with "how".
     *   - **`name:Howl`**: The project's name is `Howl` or `howl`.
     *   - **`name:HOWL`**: Equivalent to above.
     *   - **`NAME:howl`**: Equivalent to above.
     *   - **`labels.color:*`**: The project has the label `color`.
     *   - **`labels.color:red`**:  The project's label `color` has the value `red`.
     *   - **`labels.color:red labels.size:big`**: The project's label `color` has
     *   the value `red` or its label `size` has the value `big`.
     *
     *   If no query is specified, the call will return projects for which the user
     *   has the `resourcemanager.projects.get` permission.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   [ListProjects] [google.cloud.resourcemanager.v3.Projects.ListProjects] that
     *   indicates from where listing should continue.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of projects to return in the response.
     *   The server can return fewer projects than requested.
     *   If unspecified, server picks an appropriate default.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is Array of {@link protos.google.cloud.resourcemanager.v3.Project|Project}.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed and will merge results from all the pages into this array.
     *   Note that it can affect your quota.
     *   We recommend using `searchProjectsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    searchProjects(request?: protos.google.cloud.resourcemanager.v3.ISearchProjectsRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.IProject[],
        protos.google.cloud.resourcemanager.v3.ISearchProjectsRequest | null,
        protos.google.cloud.resourcemanager.v3.ISearchProjectsResponse
    ]>;
    searchProjects(request: protos.google.cloud.resourcemanager.v3.ISearchProjectsRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.ISearchProjectsRequest, protos.google.cloud.resourcemanager.v3.ISearchProjectsResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IProject>): void;
    searchProjects(request: protos.google.cloud.resourcemanager.v3.ISearchProjectsRequest, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.ISearchProjectsRequest, protos.google.cloud.resourcemanager.v3.ISearchProjectsResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IProject>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} [request.query]
     *   Optional. A query string for searching for projects that the caller has
     *   `resourcemanager.projects.get` permission to. If multiple fields are
     *   included in the query, then it will return results that match any of the
     *   fields. Some eligible fields are:
     *
     *   - **`displayName`, `name`**: Filters by displayName.
     *   - **`parent`**: Project's parent (for example: `folders/123`,
     *   `organizations/*`). Prefer `parent` field over `parent.type` and
     *   `parent.id`.
     *   - **`parent.type`**: Parent's type: `folder` or `organization`.
     *   - **`parent.id`**: Parent's id number (for example: `123`).
     *   - **`id`, `projectId`**: Filters by projectId.
     *   - **`state`, `lifecycleState`**: Filters by state.
     *   - **`labels`**: Filters by label name or value.
     *   - **`labels.<key>` (where `<key>` is the name of a label)**: Filters by label
     *   name.
     *
     *   Search expressions are case insensitive.
     *
     *   Some examples queries:
     *
     *
     *   - **`name:how*`**: The project's name starts with "how".
     *   - **`name:Howl`**: The project's name is `Howl` or `howl`.
     *   - **`name:HOWL`**: Equivalent to above.
     *   - **`NAME:howl`**: Equivalent to above.
     *   - **`labels.color:*`**: The project has the label `color`.
     *   - **`labels.color:red`**:  The project's label `color` has the value `red`.
     *   - **`labels.color:red labels.size:big`**: The project's label `color` has
     *   the value `red` or its label `size` has the value `big`.
     *
     *   If no query is specified, the call will return projects for which the user
     *   has the `resourcemanager.projects.get` permission.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   [ListProjects] [google.cloud.resourcemanager.v3.Projects.ListProjects] that
     *   indicates from where listing should continue.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of projects to return in the response.
     *   The server can return fewer projects than requested.
     *   If unspecified, server picks an appropriate default.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing {@link protos.google.cloud.resourcemanager.v3.Project|Project} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `searchProjectsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    searchProjectsStream(request?: protos.google.cloud.resourcemanager.v3.ISearchProjectsRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `searchProjects`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} [request.query]
     *   Optional. A query string for searching for projects that the caller has
     *   `resourcemanager.projects.get` permission to. If multiple fields are
     *   included in the query, then it will return results that match any of the
     *   fields. Some eligible fields are:
     *
     *   - **`displayName`, `name`**: Filters by displayName.
     *   - **`parent`**: Project's parent (for example: `folders/123`,
     *   `organizations/*`). Prefer `parent` field over `parent.type` and
     *   `parent.id`.
     *   - **`parent.type`**: Parent's type: `folder` or `organization`.
     *   - **`parent.id`**: Parent's id number (for example: `123`).
     *   - **`id`, `projectId`**: Filters by projectId.
     *   - **`state`, `lifecycleState`**: Filters by state.
     *   - **`labels`**: Filters by label name or value.
     *   - **`labels.<key>` (where `<key>` is the name of a label)**: Filters by label
     *   name.
     *
     *   Search expressions are case insensitive.
     *
     *   Some examples queries:
     *
     *
     *   - **`name:how*`**: The project's name starts with "how".
     *   - **`name:Howl`**: The project's name is `Howl` or `howl`.
     *   - **`name:HOWL`**: Equivalent to above.
     *   - **`NAME:howl`**: Equivalent to above.
     *   - **`labels.color:*`**: The project has the label `color`.
     *   - **`labels.color:red`**:  The project's label `color` has the value `red`.
     *   - **`labels.color:red labels.size:big`**: The project's label `color` has
     *   the value `red` or its label `size` has the value `big`.
     *
     *   If no query is specified, the call will return projects for which the user
     *   has the `resourcemanager.projects.get` permission.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   [ListProjects] [google.cloud.resourcemanager.v3.Projects.ListProjects] that
     *   indicates from where listing should continue.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of projects to return in the response.
     *   The server can return fewer projects than requested.
     *   If unspecified, server picks an appropriate default.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | async iteration }.
     *   When you iterate the returned iterable, each element will be an object representing
     *   {@link protos.google.cloud.resourcemanager.v3.Project|Project}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/projects.search_projects.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Projects_SearchProjects_async
     */
    searchProjectsAsync(request?: protos.google.cloud.resourcemanager.v3.ISearchProjectsRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.resourcemanager.v3.IProject>;
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
