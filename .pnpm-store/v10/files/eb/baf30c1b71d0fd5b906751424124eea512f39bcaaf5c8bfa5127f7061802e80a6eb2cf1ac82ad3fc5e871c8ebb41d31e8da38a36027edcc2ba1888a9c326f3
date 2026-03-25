/// <reference types="node" />
import type * as gax from 'google-gax';
import type { Callback, CallOptions, Descriptors, ClientOptions, PaginationCallback } from 'google-gax';
import { Transform } from 'stream';
import * as protos from '../../protos/protos';
/**
 *  Allows users to manage their organization resources.
 * @class
 * @memberof v3
 */
export declare class OrganizationsClient {
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
    organizationsStub?: Promise<{
        [name: string]: Function;
    }>;
    /**
     * Construct an instance of OrganizationsClient.
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
     *     const client = new OrganizationsClient({fallback: true}, gax);
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
     * Fetches an organization resource identified by the specified resource name.
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {string} request.name
     *   Required. The resource name of the Organization to fetch. This is the
     *   organization's relative path in the API, formatted as
     *   "organizations/[organizationId]". For example, "organizations/1234".
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is an object representing {@link protos.google.cloud.resourcemanager.v3.Organization|Organization}.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#regular-methods | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/organizations.get_organization.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Organizations_GetOrganization_async
     */
    getOrganization(request?: protos.google.cloud.resourcemanager.v3.IGetOrganizationRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.IOrganization,
        (protos.google.cloud.resourcemanager.v3.IGetOrganizationRequest | undefined),
        {} | undefined
    ]>;
    getOrganization(request: protos.google.cloud.resourcemanager.v3.IGetOrganizationRequest, options: CallOptions, callback: Callback<protos.google.cloud.resourcemanager.v3.IOrganization, protos.google.cloud.resourcemanager.v3.IGetOrganizationRequest | null | undefined, {} | null | undefined>): void;
    getOrganization(request: protos.google.cloud.resourcemanager.v3.IGetOrganizationRequest, callback: Callback<protos.google.cloud.resourcemanager.v3.IOrganization, protos.google.cloud.resourcemanager.v3.IGetOrganizationRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Gets the access control policy for an organization resource. The policy may
     * be empty if no such policy or resource exists. The `resource` field should
     * be the organization's resource name, for example: "organizations/123".
     *
     * Authorization requires the IAM permission
     * `resourcemanager.organizations.getIamPolicy` on the specified organization.
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
     * @example <caption>include:samples/generated/v3/organizations.get_iam_policy.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Organizations_GetIamPolicy_async
     */
    getIamPolicy(request?: protos.google.iam.v1.IGetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.IGetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    getIamPolicy(request: protos.google.iam.v1.IGetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Sets the access control policy on an organization resource. Replaces any
     * existing policy. The `resource` field should be the organization's resource
     * name, for example: "organizations/123".
     *
     * Authorization requires the IAM permission
     * `resourcemanager.organizations.setIamPolicy` on the specified organization.
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
     * @example <caption>include:samples/generated/v3/organizations.set_iam_policy.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Organizations_SetIamPolicy_async
     */
    setIamPolicy(request?: protos.google.iam.v1.ISetIamPolicyRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.IPolicy,
        protos.google.iam.v1.ISetIamPolicyRequest | undefined,
        {} | undefined
    ]>;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest, callback: Callback<protos.google.iam.v1.IPolicy, protos.google.iam.v1.ISetIamPolicyRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Returns the permissions that a caller has on the specified organization.
     * The `resource` field should be the organization's resource name,
     * for example: "organizations/123".
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
     * @example <caption>include:samples/generated/v3/organizations.test_iam_permissions.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Organizations_TestIamPermissions_async
     */
    testIamPermissions(request?: protos.google.iam.v1.ITestIamPermissionsRequest, options?: CallOptions): Promise<[
        protos.google.iam.v1.ITestIamPermissionsResponse,
        protos.google.iam.v1.ITestIamPermissionsRequest | undefined,
        {} | undefined
    ]>;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, options: CallOptions, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    testIamPermissions(request: protos.google.iam.v1.ITestIamPermissionsRequest, callback: Callback<protos.google.iam.v1.ITestIamPermissionsResponse, protos.google.iam.v1.ITestIamPermissionsRequest | null | undefined, {} | null | undefined>): void;
    /**
     * Searches organization resources that are visible to the user and satisfy
     * the specified filter. This method returns organizations in an unspecified
     * order. New organizations do not necessarily appear at the end of the
     * results, and may take a small amount of time to appear.
     *
     * Search will only return organizations on which the user has the permission
     * `resourcemanager.organizations.get`
     *
     * @param {Object} request
     *   The request object that will be sent.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of organizations to return in the response.
     *   The server can return fewer organizations than requested. If unspecified,
     *   server picks an appropriate default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   `SearchOrganizations` that indicates from where listing should continue.
     * @param {string} [request.query]
     *   Optional. An optional query string used to filter the Organizations to
     *   return in the response. Query rules are case-insensitive.
     *
     *
     *   ```
     *   | Field            | Description                                |
     *   |------------------|--------------------------------------------|
     *   | directoryCustomerId, owner.directoryCustomerId | Filters by directory
     *   customer id. |
     *   | domain           | Filters by domain.                         |
     *   ```
     *
     *   Organizations may be queried by `directoryCustomerId` or by
     *   `domain`, where the domain is a G Suite domain, for example:
     *
     *   * Query `directorycustomerid:123456789` returns Organization
     *   resources with `owner.directory_customer_id` equal to `123456789`.
     *   * Query `domain:google.com` returns Organization resources corresponding
     *   to the domain `google.com`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Promise} - The promise which resolves to an array.
     *   The first element of the array is Array of {@link protos.google.cloud.resourcemanager.v3.Organization|Organization}.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed and will merge results from all the pages into this array.
     *   Note that it can affect your quota.
     *   We recommend using `searchOrganizationsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    searchOrganizations(request?: protos.google.cloud.resourcemanager.v3.ISearchOrganizationsRequest, options?: CallOptions): Promise<[
        protos.google.cloud.resourcemanager.v3.IOrganization[],
        protos.google.cloud.resourcemanager.v3.ISearchOrganizationsRequest | null,
        protos.google.cloud.resourcemanager.v3.ISearchOrganizationsResponse
    ]>;
    searchOrganizations(request: protos.google.cloud.resourcemanager.v3.ISearchOrganizationsRequest, options: CallOptions, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.ISearchOrganizationsRequest, protos.google.cloud.resourcemanager.v3.ISearchOrganizationsResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IOrganization>): void;
    searchOrganizations(request: protos.google.cloud.resourcemanager.v3.ISearchOrganizationsRequest, callback: PaginationCallback<protos.google.cloud.resourcemanager.v3.ISearchOrganizationsRequest, protos.google.cloud.resourcemanager.v3.ISearchOrganizationsResponse | null | undefined, protos.google.cloud.resourcemanager.v3.IOrganization>): void;
    /**
     * Equivalent to `method.name.toCamelCase()`, but returns a NodeJS Stream object.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of organizations to return in the response.
     *   The server can return fewer organizations than requested. If unspecified,
     *   server picks an appropriate default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   `SearchOrganizations` that indicates from where listing should continue.
     * @param {string} [request.query]
     *   Optional. An optional query string used to filter the Organizations to
     *   return in the response. Query rules are case-insensitive.
     *
     *
     *   ```
     *   | Field            | Description                                |
     *   |------------------|--------------------------------------------|
     *   | directoryCustomerId, owner.directoryCustomerId | Filters by directory
     *   customer id. |
     *   | domain           | Filters by domain.                         |
     *   ```
     *
     *   Organizations may be queried by `directoryCustomerId` or by
     *   `domain`, where the domain is a G Suite domain, for example:
     *
     *   * Query `directorycustomerid:123456789` returns Organization
     *   resources with `owner.directory_customer_id` equal to `123456789`.
     *   * Query `domain:google.com` returns Organization resources corresponding
     *   to the domain `google.com`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Stream}
     *   An object stream which emits an object representing {@link protos.google.cloud.resourcemanager.v3.Organization|Organization} on 'data' event.
     *   The client library will perform auto-pagination by default: it will call the API as many
     *   times as needed. Note that it can affect your quota.
     *   We recommend using `searchOrganizationsAsync()`
     *   method described below for async iteration which you can stop as needed.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     */
    searchOrganizationsStream(request?: protos.google.cloud.resourcemanager.v3.ISearchOrganizationsRequest, options?: CallOptions): Transform;
    /**
     * Equivalent to `searchOrganizations`, but returns an iterable object.
     *
     * `for`-`await`-`of` syntax is used with the iterable to get response elements on-demand.
     * @param {Object} request
     *   The request object that will be sent.
     * @param {number} [request.pageSize]
     *   Optional. The maximum number of organizations to return in the response.
     *   The server can return fewer organizations than requested. If unspecified,
     *   server picks an appropriate default.
     * @param {string} [request.pageToken]
     *   Optional. A pagination token returned from a previous call to
     *   `SearchOrganizations` that indicates from where listing should continue.
     * @param {string} [request.query]
     *   Optional. An optional query string used to filter the Organizations to
     *   return in the response. Query rules are case-insensitive.
     *
     *
     *   ```
     *   | Field            | Description                                |
     *   |------------------|--------------------------------------------|
     *   | directoryCustomerId, owner.directoryCustomerId | Filters by directory
     *   customer id. |
     *   | domain           | Filters by domain.                         |
     *   ```
     *
     *   Organizations may be queried by `directoryCustomerId` or by
     *   `domain`, where the domain is a G Suite domain, for example:
     *
     *   * Query `directorycustomerid:123456789` returns Organization
     *   resources with `owner.directory_customer_id` equal to `123456789`.
     *   * Query `domain:google.com` returns Organization resources corresponding
     *   to the domain `google.com`.
     * @param {object} [options]
     *   Call options. See {@link https://googleapis.dev/nodejs/google-gax/latest/interfaces/CallOptions.html|CallOptions} for more details.
     * @returns {Object}
     *   An iterable Object that allows {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols | async iteration }.
     *   When you iterate the returned iterable, each element will be an object representing
     *   {@link protos.google.cloud.resourcemanager.v3.Organization|Organization}. The API will be called under the hood as needed, once per the page,
     *   so you can stop the iteration when you don't need more results.
     *   Please see the {@link https://github.com/googleapis/gax-nodejs/blob/master/client-libraries.md#auto-pagination | documentation }
     *   for more details and examples.
     * @example <caption>include:samples/generated/v3/organizations.search_organizations.js</caption>
     * region_tag:cloudresourcemanager_v3_generated_Organizations_SearchOrganizations_async
     */
    searchOrganizationsAsync(request?: protos.google.cloud.resourcemanager.v3.ISearchOrganizationsRequest, options?: CallOptions): AsyncIterable<protos.google.cloud.resourcemanager.v3.IOrganization>;
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
