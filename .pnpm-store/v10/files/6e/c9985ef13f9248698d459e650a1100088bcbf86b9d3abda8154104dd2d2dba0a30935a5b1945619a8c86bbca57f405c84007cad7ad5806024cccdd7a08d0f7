import { BodyResponseCallback, DecorateRequestOptions, BaseMetadata } from './nodejs-common/index.js';
export interface AclOptions {
    pathPrefix: string;
    request: (reqOpts: DecorateRequestOptions, callback: BodyResponseCallback) => void;
}
export type GetAclResponse = [
    AccessControlObject | AccessControlObject[],
    AclMetadata
];
export interface GetAclCallback {
    (err: Error | null, acl?: AccessControlObject | AccessControlObject[] | null, apiResponse?: AclMetadata): void;
}
export interface GetAclOptions {
    entity: string;
    generation?: number;
    userProject?: string;
}
export interface UpdateAclOptions {
    entity: string;
    role: string;
    generation?: number;
    userProject?: string;
}
export type UpdateAclResponse = [AccessControlObject, AclMetadata];
export interface UpdateAclCallback {
    (err: Error | null, acl?: AccessControlObject | null, apiResponse?: AclMetadata): void;
}
export interface AddAclOptions {
    entity: string;
    role: string;
    generation?: number;
    userProject?: string;
}
export type AddAclResponse = [AccessControlObject, AclMetadata];
export interface AddAclCallback {
    (err: Error | null, acl?: AccessControlObject | null, apiResponse?: AclMetadata): void;
}
export type RemoveAclResponse = [AclMetadata];
export interface RemoveAclCallback {
    (err: Error | null, apiResponse?: AclMetadata): void;
}
export interface RemoveAclOptions {
    entity: string;
    generation?: number;
    userProject?: string;
}
export interface AccessControlObject {
    entity: string;
    role: string;
    projectTeam: string;
}
export interface AclMetadata extends BaseMetadata {
    bucket?: string;
    domain?: string;
    entity?: string;
    entityId?: string;
    generation?: string;
    object?: string;
    projectTeam?: {
        projectNumber?: string;
        team?: 'editors' | 'owners' | 'viewers';
    };
    role?: 'OWNER' | 'READER' | 'WRITER' | 'FULL_CONTROL';
    [key: string]: unknown;
}
/**
 * Attach functionality to a {@link Storage.acl} instance. This will add an
 * object for each role group (owners, readers, and writers), with each object
 * containing methods to add or delete a type of entity.
 *
 * As an example, here are a few methods that are created.
 *
 *   myBucket.acl.readers.deleteGroup('groupId', function(err) {});
 *
 *   myBucket.acl.owners.addUser('email@example.com', function(err, acl) {});
 *
 *   myBucket.acl.writers.addDomain('example.com', function(err, acl) {});
 *
 * @private
 */
declare class AclRoleAccessorMethods {
    private static accessMethods;
    private static entities;
    private static roles;
    owners: {};
    readers: {};
    writers: {};
    constructor();
    _assignAccessMethods(role: string): void;
}
/**
 * Cloud Storage uses access control lists (ACLs) to manage object and
 * bucket access. ACLs are the mechanism you use to share objects with other
 * users and allow other users to access your buckets and objects.
 *
 * An ACL consists of one or more entries, where each entry grants permissions
 * to an entity. Permissions define the actions that can be performed against an
 * object or bucket (for example, `READ` or `WRITE`); the entity defines who the
 * permission applies to (for example, a specific user or group of users).
 *
 * Where an `entity` value is accepted, we follow the format the Cloud Storage
 * API expects.
 *
 * Refer to
 * https://cloud.google.com/storage/docs/json_api/v1/defaultObjectAccessControls
 * for the most up-to-date values.
 *
 *   - `user-userId`
 *   - `user-email`
 *   - `group-groupId`
 *   - `group-email`
 *   - `domain-domain`
 *   - `project-team-projectId`
 *   - `allUsers`
 *   - `allAuthenticatedUsers`
 *
 * Examples:
 *
 *   - The user "liz@example.com" would be `user-liz@example.com`.
 *   - The group "example@googlegroups.com" would be
 *     `group-example@googlegroups.com`.
 *   - To refer to all members of the Google Apps for Business domain
 *     "example.com", the entity would be `domain-example.com`.
 *
 * For more detailed information, see
 * {@link http://goo.gl/6qBBPO| About Access Control Lists}.
 *
 * @constructor Acl
 * @mixin
 * @param {object} options Configuration options.
 */
declare class Acl extends AclRoleAccessorMethods {
    default: Acl;
    pathPrefix: string;
    request_: (reqOpts: DecorateRequestOptions, callback: BodyResponseCallback) => void;
    constructor(options: AclOptions);
    add(options: AddAclOptions): Promise<AddAclResponse>;
    add(options: AddAclOptions, callback: AddAclCallback): void;
    delete(options: RemoveAclOptions): Promise<RemoveAclResponse>;
    delete(options: RemoveAclOptions, callback: RemoveAclCallback): void;
    get(options?: GetAclOptions): Promise<GetAclResponse>;
    get(options: GetAclOptions, callback: GetAclCallback): void;
    get(callback: GetAclCallback): void;
    update(options: UpdateAclOptions): Promise<UpdateAclResponse>;
    update(options: UpdateAclOptions, callback: UpdateAclCallback): void;
    /**
     * Transform API responses to a consistent object format.
     *
     * @private
     */
    makeAclObject_(accessControlObject: AccessControlObject): AccessControlObject;
    /**
     * Patch requests up to the bucket's request object.
     *
     * @private
     *
     * @param {string} method Action.
     * @param {string} path Request path.
     * @param {*} query Request query object.
     * @param {*} body Request body contents.
     * @param {function} callback Callback function.
     */
    request(reqOpts: DecorateRequestOptions, callback: BodyResponseCallback): void;
}
export { Acl, AclRoleAccessorMethods };
