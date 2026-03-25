import { Resource } from './Resource';
import { CreateUserReq, DeleteUserReq, ListUsersReq, UpdateUserReq, CreateRoleReq, DropRoleReq, AddUserToRoleReq, RemoveUserFromRoleReq, SelectRoleReq, SelectUserReq, OperateRolePrivilegeReq, SelectGrantReq, ListGrantsReq, HasRoleReq, listRoleReq, CreatePrivilegeGroupReq, DropPrivilegeGroupReq, AddPrivilegesToGroupReq, RemovePrivilegesFromGroupReq, GrantPrivilegeV2Request, RevokePrivilegeV2Request, BackupRBACRequest, RestoreRBACRequest, GrpcTimeOut, ListCredUsersResponse, ResStatus, SelectRoleResponse, SelectUserResponse, SelectGrantResponse, HasRoleResponse, ListPrivilegeGroupsResponse, BackupRBACResponse } from '../';
export declare class User extends Resource {
    /**
     * Creates a new user in Milvus.
     *
     * @param {CreateUserReq} data - The user data.
     * @param {string} data.username - The username of the new user.
     * @param {string} data.password - The password for the new user.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status.
     * @returns {number} ResStatus.error_code - The error code number.
     * @returns {string} ResStatus.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     *  milvusClient.createUser({
     *    username: 'exampleUser',
     *    password: 'examplePassword',
     *  });
     * ```
     */
    createUser(data: CreateUserReq): Promise<ResStatus>;
    /**
     * Update user in Milvus.
     *
     * @param {UpdateUserReq} data - The user data.
     * @param {string} data.username - The username of the user to be updated.
     * @param {string} data.newPassword - The new password for the user.
     * @param {string} data.oldPassword - The old password of the user.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status.
     * @returns {number} ResStatus.error_code - The error code number.
     * @returns {string} ResStatus.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     *  milvusClient.updateUser({
     *    username: 'exampleUser',
     *    newPassword: 'newPassword',
     *    oldPassword: 'oldPassword',
     *  });
     * ```
     */
    updateUser(data: UpdateUserReq): Promise<ResStatus>;
    updatePassword: (data: UpdateUserReq) => Promise<ResStatus>;
    /**
     * Lists all users in Milvus.
     *
     * @param {Object} data - The data object.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<Object>} The response object.
     * @returns {Object} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     * @returns {string[]} response.usernames - An array of usernames.
     *
     * @example
     * ```javascript
     *  milvusClient.listUsers();
     * ```
     */
    deleteUser(data: DeleteUserReq): Promise<ResStatus>;
    dropUser: (data: DeleteUserReq) => Promise<ResStatus>;
    /**
     * Lists all users in Milvus.
     *
     * @param {ListUsersReq} data - The data object.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ListCredUsersResponse>} The response object.
     * @returns {ResStatus} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     * @returns {string[]} response.usernames - An array of usernames.
     *
     * @example
     * ```javascript
     *  milvusClient.listUsers();
     * ```
     */
    listUsers(data?: ListUsersReq): Promise<ListCredUsersResponse>;
    /**
     * Create a new role in Milvus.
     *
     * @param {CreateRoleReq} data - The role data.
     * @param {string} data.roleName - The name of the new role.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status.
     * @returns {number} ResStatus.error_code - The error code number.
     * @returns {string} ResStatus.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     *  milvusClient.createRole({
     *    roleName: 'exampleRole',
     *  });
     * ```
     */
    createRole(data: CreateRoleReq): Promise<ResStatus>;
    /**
     * Drops a user role in Milvus.
     *
     * @param {DropRoleReq} data - The data object.
     * @param {string} data.roleName - The name of the role to be dropped.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status.
     * @returns {number} ResStatus.error_code - The error code number.
     * @returns {string} ResStatus.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     *  milvusClient.dropRole({
     *    roleName: 'exampleRole',
     *  });
     * ```
     */
    dropRole(data: DropRoleReq): Promise<ResStatus>;
    /**
     * Adds a user to a role.
     *
     * @param {AddUserToRoleReq} data - The data object.
     * @param {string} data.username - The username of the user to be added to the role.
     * @param {string} data.roleName - The name of the role to which the user will be added.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status.
     * @returns {number} ResStatus.error_code - The error code number.
     * @returns {string} ResStatus.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     *  milvusClient.addUserToRole({
     *    username: 'my',
     *    roleName: 'myrole'
     *  });
     * ```
     */
    addUserToRole(data: AddUserToRoleReq): Promise<ResStatus>;
    grantRole: (data: AddUserToRoleReq) => Promise<ResStatus>;
    /**
     * Removes a user from a role.
     *
     * @param {RemoveUserFromRoleReq} data - The data object.
     * @param {string} data.username - The username of the user to be removed from the role.
     * @param {string} data.roleName - The name of the role from which the user will be removed.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status.
     * @returns {number} ResStatus.error_code - The error code number.
     * @returns {string} ResStatus.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     *  milvusClient.removeUserFromRole({
     *    username: 'my',
     *    roleName: 'myrole'
     *  });
     * ```
     */
    removeUserFromRole(data: RemoveUserFromRoleReq): Promise<ResStatus>;
    revokeRole: (data: RemoveUserFromRoleReq) => Promise<ResStatus>;
    /**
     * Gets all users that belong to a specified role.
     *
     * @param {Object} data - The data object.
     * @param {string} data.roleName - The name of the role.
     * @param {boolean} [data.includeUserInfo=true] - Determines whether the result should include user info.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<Object>} The response object.
     * @returns {Object} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     * @returns {Object[]} response.results - An array of objects, each containing a list of users and a role.
     * @returns {Object[]} response.results.users - An array of user objects.
     * @returns {string} response.results.users.name - The name of the user.
     * @returns {Object} response.results.role - The role object.
     * @returns {string} response.results.role.name - The name of the role.
     *
     * @example
     * ```javascript
     *  milvusClient.describeRole({roleName: 'myrole'});
     * ```
     */
    describeRole(data: SelectRoleReq): Promise<SelectRoleResponse>;
    selectRole: (data: SelectRoleReq) => Promise<SelectRoleResponse>;
    /**
     * Lists all roles in Milvus.
     *
     * @param {Object} data - The data object.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<Object>} The response object.
     * @returns {Object} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     * @returns {Object[]} response.results - An array of objects, each containing a role.
     * @returns {string} response.results.role.name - The name of the role.
     *
     * @example
     * ```javascript
     *  milvusClient.listRoles();
     * ```
     */
    listRoles(data?: listRoleReq): Promise<SelectRoleResponse>;
    /**
     * Gets all users that belong to a specified role.
     *
     * @param {Object} data - The data object.
     * @param {string} data.userName - The username of the user.
     * @param {boolean} [data.includeUserInfo=true] - Determines whether the result should include user info.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<Object>} The response object.
     * @returns {Object} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     * @returns {Object[]} response.results - An array of objects, each containing a user and a list of roles.
     * @returns {Object} response.results.user - The user object.
     * @returns {string} response.results.user.name - The name of the user.
     * @returns {Object[]} response.results.roles - An array of role objects.
     * @returns {string} response.results.roles.name - The name of the role.
     *
     * @example
     * ```javascript
     *  milvusClient.describeUser({username: 'name'});
     * ```
     */
    describeUser(data: SelectUserReq): Promise<SelectUserResponse>;
    selectUser: (data: SelectUserReq) => Promise<SelectUserResponse>;
    /**
     * Grants privileges to a role.
     *
     * @param {Object} data - The data object.
     * @param {string} data.roleName - The name of the role.
     * @param {string} data.object - The type of the operational object to which the specified privilege belongs, such as Collection, Index, Partition, etc. This parameter is case-sensitive.
     * @param {string} data.objectName - The name of the object to which the role is granted the specified privilege.
     * @param {string} data.privilegeName - The name of the privilege to be granted to the role. This parameter is case-sensitive.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<Object>} The response object.
     * @returns {Object} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     *  milvusClient.grantPrivilege({
     *    roleName: 'roleName',
     *    object: '*',
     *    objectName: 'Collection',
     *    privilegeName: 'CreateIndex'
     *  });
     * ```
     */
    grantPrivilege(data: OperateRolePrivilegeReq): Promise<ResStatus>;
    grantRolePrivilege: (data: OperateRolePrivilegeReq) => Promise<ResStatus>;
    /**
     * Revokes privileges from a role.
     *
     * @param {Object} data - The data object.
     * @param {string} data.roleName - The name of the role.
     * @param {string} data.object - The type of the operational object from which the specified privilege is revoked, such as Collection, Index, Partition, etc. This parameter is case-sensitive.
     * @param {string} data.objectName - The name of the object from which the role's specified privilege is revoked.
     * @param {string} data.privilegeName - The name of the privilege to be revoked from the role. This parameter is case-sensitive.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<Object>} The response object.
     * @returns {Object} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     *  milvusClient.revokePrivilege({
     *    roleName: 'roleName',
     *    object: '*',
     *    objectName: 'Collection',
     *    privilegeName: 'CreateIndex'
     *  });
     * ```
     */
    revokePrivilege(data: OperateRolePrivilegeReq): Promise<ResStatus>;
    revokeRolePrivilege: (data: OperateRolePrivilegeReq) => Promise<ResStatus>;
    /**
     * Revokes all privileges from all roles.
     *
     * @param {Object} data - The data object.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus[]>} - An array of response statuses for each role.
     * @returns {number} ResStatus.error_code - The error code number for each role.
     * @returns {string} ResStatus.reason - The cause of the error, if any, for each role.
     *
     * @example
     * ```javascript
     *  milvusClient.revokeAllRolesPrivileges();
     * ```
     */
    dropAllRoles(data?: GrpcTimeOut): Promise<ResStatus[]>;
    /**
     * Selects a grant for a specific role.
     *
     * @param {Object} data - The data object.
     * @param {string} data.roleName - The name of the role.
     * @param {string} data.object - The type of the operational object to which the specified privilege belongs, such as Collection, Index, Partition, etc. This parameter is case-sensitive.
     * @param {string} data.objectName - The name of the object to which the role is granted the specified privilege.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<Object>} The response object.
     * @returns {Object} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     *  milvusClient.selectGrant({
     *    roleName: 'roleName',
     *    object: '*',
     *    objectName: 'Collection',
     *  });
     * ```
     */
    selectGrant(data: SelectGrantReq): Promise<SelectGrantResponse>;
    listGrant: (data: SelectGrantReq) => Promise<SelectGrantResponse>;
    /**
     * Lists all grants for a specific role.
     *
     * @param {Object} data - The data object.
     * @param {string} data.roleName - The name of the role.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<SelectGrantResponse>} The response object.
     * @returns {Object} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     * @returns {Object[]} response.entities - An array of entities, each containing a role, an object, an object name, and a grantor.
     * @returns {Object} response.entities.role - The role object.
     * @returns {string} response.entities.role.name - The name of the role.
     * @returns {Object} response.entities.object - The object to which the specified privilege belongs.
     * @returns {string} response.entities.object.name - The name of the object.
     * @returns {string} response.entities.object_name - The name of the object to which the role is granted the specified privilege.
     * @returns {Object} response.entities.grantor - The grantor object.
     * @returns {string} response.entities.grantor.privilege.name - The name of the privilege granted to the role.
     *
     * @example
     * ```javascript
     *  milvusClient.listGrants({
     *    roleName: 'roleName',
     *  });
     * ```
     */
    listGrants(data: ListGrantsReq): Promise<SelectGrantResponse>;
    /**
     * Checks if a role exists.
     *
     * @param {HasRoleReq} data - The data object.
     * @param {string} data.roleName - The name of the role.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<HasRoleResponse>} The response object.
     * @returns {ResStatus} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     * @returns {boolean} response.hasRole - A boolean indicating whether the role exists.
     *
     * @example
     * ```javascript
     *  milvusClient.hasRole({
     *    roleName: 'roleName',
     *  });
     * ```
     */
    hasRole(data: HasRoleReq): Promise<HasRoleResponse>;
    /**
     * Create a new privilege group in Milvus.
     * @param {CreatePrivilegeGroupReq} data - The privilege group data.
     * @param {string} data.group_name - The name of the new privilege group.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status.
     *
     * @example
     * ```javascript
     * milvusClient.createPrivilegeGroup({
     *  group_name: 'exampleGroup',
     * });
     * ```
     */
    createPrivilegeGroup(data: CreatePrivilegeGroupReq): Promise<ResStatus>;
    /**
     * Drop a privilege group in Milvus.
     * @param {DropPrivilegeGroupReq} data - The privilege group data.
     * @param {string} data.group_name - The name of the privilege group to be dropped.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status.
     *
     * @example
     * ```javascript
     * await milvusClient.dropPrivilegeGroup({
     *  group_name: 'exampleGroup',
     * });
     * ```
     */
    dropPrivilegeGroup(data: DropPrivilegeGroupReq): Promise<ResStatus>;
    /**
     * List all privilege groups in Milvus.
     * @param {GrpcTimeOut} data - The data object.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ListPrivilegeGroupsResponse>} The response object.
     * @returns {ResStatus} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     * @returns {PrivelegeGroup[]} response.privilege_groups - An array of privilege groups.
     * @returns {string} response.privilege_groups.group_name - The name of the privilege group.
     * @returns {PrivilegeEntity[]} response.privilege_groups.privileges - An array of privileges.
     * @returns {string} response.privilege_groups.privileges.name - The name of the privilege.
     *
     * @example
     * ```javascript
     * await milvusClient.listPrivilegeGroups();
     * ```
     */
    listPrivilegeGroups(data?: GrpcTimeOut): Promise<ListPrivilegeGroupsResponse>;
    /**
     * add privileges to a privilege group in Milvus.
     * @param {AddPrivilegesToGroupReq} data - The privilege group data.
     * @param {string} data.group_name - The name of the privilege group to be operated.
     * @param {string[]} data.privileges - The privileges to be added to the group.
     *
     * @returns {Promise<ResStatus>} The response object.
     * @returns {ResStatus} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     * await milvusClient.addPrivilegesToGroup({
     * group_name: 'exampleGroup',
     * privileges: ['CreateCollection', 'DropCollection'],
     * });
     *
     * ```
     */
    addPrivilegesToGroup(data: AddPrivilegesToGroupReq): Promise<ResStatus>;
    /**
     * remove privileges from a privilege group in Milvus.
     * @param {RemovePrivilegesFromGroupReq} data - The privilege group data.
     * @param {string} data.group_name - The name of the privilege group to be operated.
     * @param {string[]} data.privileges - The privileges to be removed from the group.
     *
     * @returns {Promise<ResStatus>} The response object.
     * @returns {ResStatus} response.status - The response status.
     * @returns {number} response.status.error_code - The error code number.
     * @returns {string} response.status.reason - The cause of the error, if any.
     *
     * @example
     * ```javascript
     * await milvusClient.removePrivilegesFromGroup({
     * group_name: 'exampleGroup',
     * privileges: ['CreateCollection', 'DropCollection'],
     * });
     *
     * ```
     */
    removePrivilegesFromGroup(data: RemovePrivilegesFromGroupReq): Promise<ResStatus>;
    /**
     * Grant a privilege to a role in Milvus.
     * @param {GrantPrivilegeV2Request} data - The privilege data.
     * @param {string} data.role - The name of the role.
     * @param {string} data.privilege - The name of the privilege.
     * @param {string} data.db_name - The name of the database.
     * @param {string} data.collection_name - The name of the collection.
     * @returns {Promise<ResStatus>} The response object.
     *
     * @example
     * ```javascript
     * await milvusClient.grantPrivilegeV2({
     *  role: 'exampleRole',
     *  privilege: 'CreateCollection',
     *  db_name: 'exampleDB',
     *  collection_name: 'exampleCollection',
     * });
     * ```
     */
    grantPrivilegeV2(data: GrantPrivilegeV2Request): Promise<ResStatus>;
    /**
     * Revoke a privilege from a role in Milvus.
     * @param {RevokePrivilegeV2Request} data - The privilege data.
     * @param {string} data.role - The name of the role.
     * @param {string} data.privilege - The name of the privilege.
     * @param {string} data.db_name - The name of the database.
     * @param {string} data.collection_name - The name of the collection.
     * @returns {Promise<ResStatus>} The response object.
     *
     * @example
     * ```javascript
     * await milvusClient.revokePrivilegeV2({
     *  role: 'exampleRole',
     *  privilege: 'CreateCollection',
     *  db_name: 'exampleDB',
     *  collection_name: 'exampleCollection',
     * });
     * ```
     * */
    revokePrivilegeV2(data: RevokePrivilegeV2Request): Promise<ResStatus>;
    /**
     * backup RBAC data in Milvus.
     * @param {BackupRBACRequest} data - The data object.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<BackupRBACResponse>} The response object.
     *
     * @example
     * ```javascript
     * await milvusClient.BackupRBAC();
     * ```
     *
     */
    backupRBAC(data?: BackupRBACRequest): Promise<BackupRBACResponse>;
    /**
     * restore RBAC data in Milvus.
     * @param {RestoreRBACRequest} data - The data object.
     * @param {RBACMeta} data.RBAC_meta - The rbac meta data returned from the backupRBAC API.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response object.
     *
     * @example
     * ```javascript
     * await milvusClient.restoreRBAC({
     *   RBAC_meta: rbacMeta,
     * });
     * ```
     */
    restoreRBAC(data: RestoreRBACRequest): Promise<ResStatus>;
}
