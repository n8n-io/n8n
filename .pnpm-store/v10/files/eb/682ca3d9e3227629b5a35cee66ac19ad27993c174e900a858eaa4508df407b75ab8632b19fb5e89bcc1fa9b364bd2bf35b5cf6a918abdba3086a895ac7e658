import { Bucket } from './bucket.js';
export interface GetPolicyOptions {
    userProject?: string;
    requestedPolicyVersion?: number;
}
export type GetPolicyResponse = [Policy, unknown];
/**
 * @callback GetPolicyCallback
 * @param {?Error} err Request error, if any.
 * @param {object} acl The policy.
 * @param {object} apiResponse The full API response.
 */
export interface GetPolicyCallback {
    (err?: Error | null, acl?: Policy, apiResponse?: unknown): void;
}
/**
 * @typedef {object} SetPolicyOptions
 * @param {string} [userProject] The ID of the project which will be
 *     billed for the request.
 */
export interface SetPolicyOptions {
    userProject?: string;
}
/**
 * @typedef {array} SetPolicyResponse
 * @property {object} 0 The policy.
 * @property {object} 1 The full API response.
 */
export type SetPolicyResponse = [Policy, unknown];
/**
 * @callback SetPolicyCallback
 * @param {?Error} err Request error, if any.
 * @param {object} acl The policy.
 * @param {object} apiResponse The full API response.
 */
export interface SetPolicyCallback {
    (err?: Error | null, acl?: Policy, apiResponse?: object): void;
}
export interface Policy {
    bindings: PolicyBinding[];
    version?: number;
    etag?: string;
}
export interface PolicyBinding {
    role: string;
    members: string[];
    condition?: Expr;
}
export interface Expr {
    title?: string;
    description?: string;
    expression: string;
}
/**
 * @typedef {array} TestIamPermissionsResponse
 * @property {object} 0 A subset of permissions that the caller is allowed.
 * @property {object} 1 The full API response.
 */
export type TestIamPermissionsResponse = [{
    [key: string]: boolean;
}, unknown];
/**
 * @callback TestIamPermissionsCallback
 * @param {?Error} err Request error, if any.
 * @param {object} acl A subset of permissions that the caller is allowed.
 * @param {object} apiResponse The full API response.
 */
export interface TestIamPermissionsCallback {
    (err?: Error | null, acl?: {
        [key: string]: boolean;
    } | null, apiResponse?: unknown): void;
}
/**
 * @typedef {object} TestIamPermissionsOptions Configuration options for Iam#testPermissions().
 * @param {string} [userProject] The ID of the project which will be
 *     billed for the request.
 */
export interface TestIamPermissionsOptions {
    userProject?: string;
}
export declare enum IAMExceptionMessages {
    POLICY_OBJECT_REQUIRED = "A policy object is required.",
    PERMISSIONS_REQUIRED = "Permissions are required."
}
/**
 * Get and set IAM policies for your Cloud Storage bucket.
 *
 * See {@link https://cloud.google.com/storage/docs/access-control/iam#short_title_iam_management| Cloud Storage IAM Management}
 * See {@link https://cloud.google.com/iam/docs/granting-changing-revoking-access| Granting, Changing, and Revoking Access}
 * See {@link https://cloud.google.com/iam/docs/understanding-roles| IAM Roles}
 *
 * @constructor Iam
 *
 * @param {Bucket} bucket The parent instance.
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const bucket = storage.bucket('my-bucket');
 * // bucket.iam
 * ```
 */
declare class Iam {
    private request_;
    private resourceId_;
    constructor(bucket: Bucket);
    getPolicy(options?: GetPolicyOptions): Promise<GetPolicyResponse>;
    getPolicy(options: GetPolicyOptions, callback: GetPolicyCallback): void;
    getPolicy(callback: GetPolicyCallback): void;
    setPolicy(policy: Policy, options?: SetPolicyOptions): Promise<SetPolicyResponse>;
    setPolicy(policy: Policy, callback: SetPolicyCallback): void;
    setPolicy(policy: Policy, options: SetPolicyOptions, callback: SetPolicyCallback): void;
    testPermissions(permissions: string | string[], options?: TestIamPermissionsOptions): Promise<TestIamPermissionsResponse>;
    testPermissions(permissions: string | string[], callback: TestIamPermissionsCallback): void;
    testPermissions(permissions: string | string[], options: TestIamPermissionsOptions, callback: TestIamPermissionsCallback): void;
}
export { Iam };
