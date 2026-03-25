"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const Resource_1 = require("./Resource");
const __1 = require("../");
class User extends Resource_1.Resource {
    constructor() {
        super(...arguments);
        // alias
        this.updatePassword = this.updateUser;
        this.dropUser = this.deleteUser;
        // alias
        this.grantRole = this.addUserToRole;
        // alias
        this.revokeRole = this.removeUserFromRole;
        // alias
        this.selectRole = this.describeRole;
        // alias
        this.selectUser = this.describeUser;
        // alias
        this.grantRolePrivilege = this.grantPrivilege;
        this.revokeRolePrivilege = this.revokePrivilege;
        // alias
        this.listGrant = this.selectGrant;
    }
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
    createUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data.username === undefined || data.password === undefined) {
                throw new Error(__1.ERROR_REASONS.USERNAME_PWD_ARE_REQUIRED);
            }
            const encryptedPassword = (0, __1.stringToBase64)(data.password);
            const promise = yield (0, __1.promisify)(this.channelPool, 'CreateCredential', {
                username: data.username,
                password: encryptedPassword,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    updateUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data.username === undefined ||
                data.newPassword === undefined ||
                data.oldPassword === undefined) {
                throw new Error(__1.ERROR_REASONS.USERNAME_PWD_ARE_REQUIRED);
            }
            const encryptedOldPwd = (0, __1.stringToBase64)(data.oldPassword);
            const encryptedNewPwd = (0, __1.stringToBase64)(data.newPassword);
            const promise = yield (0, __1.promisify)(this.channelPool, 'UpdateCredential', {
                username: data.username,
                oldPassword: encryptedOldPwd,
                newPassword: encryptedNewPwd,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    deleteUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data.username) {
                throw new Error(__1.ERROR_REASONS.USERNAME_IS_REQUIRED);
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'DeleteCredential', {
                username: data.username,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    listUsers(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'ListCredUsers', {}, (data === null || data === void 0 ? void 0 : data.timeout) || this.timeout);
            return promise;
        });
    }
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
    createRole(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'CreateRole', {
                entity: { name: data.roleName },
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    dropRole(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'DropRole', {
                role_name: data.roleName,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    addUserToRole(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'OperateUserRole', {
                username: data.username,
                role_name: data.roleName,
                type: __1.OperateUserRoleType.AddUserToRole,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    removeUserFromRole(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'OperateUserRole', {
                username: data.username,
                role_name: data.roleName,
                type: __1.OperateUserRoleType.RemoveUserFromRole,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    describeRole(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'SelectRole', {
                role: { name: data.roleName },
                include_user_info: data.includeUserInfo || true,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    listRoles(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'SelectRole', {
                include_user_info: (data === null || data === void 0 ? void 0 : data.includeUserInfo) || true,
            }, (data === null || data === void 0 ? void 0 : data.timeout) || this.timeout);
            return promise;
        });
    }
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
    describeUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'SelectUser', {
                user: { name: data.username },
                include_role_info: data.includeRoleInfo || true,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    grantPrivilege(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'OperatePrivilege', {
                entity: {
                    role: { name: data.roleName },
                    object: { name: data.object },
                    object_name: data.objectName,
                    grantor: {
                        privilege: { name: data.privilegeName },
                    },
                },
                type: __1.OperatePrivilegeType.Grant,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    revokePrivilege(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'OperatePrivilege', {
                entity: {
                    role: { name: data.roleName },
                    object: { name: data.object },
                    object_name: data.objectName,
                    grantor: {
                        privilege: { name: data.privilegeName },
                    },
                },
                type: __1.OperatePrivilegeType.Revoke,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    /* istanbul ignore next */
    dropAllRoles(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // find all roles
            const res = yield this.listRoles({ timeout: data === null || data === void 0 ? void 0 : data.timeout });
            const promises = [];
            // iterate through roles
            for (let i = 0; i < res.results.length; i++) {
                const r = res.results[i];
                // get all grants that specific to the role
                const grants = yield this.listGrants({
                    roleName: r.role.name,
                });
                // iterate throught these grant
                for (let j = 0; j < grants.entities.length; j++) {
                    const entity = grants.entities[j];
                    // revoke grant
                    yield this.revokeRolePrivilege({
                        roleName: entity.role.name,
                        object: entity.object.name,
                        objectName: entity.object_name,
                        privilegeName: entity.grantor.privilege.name,
                        timeout: data === null || data === void 0 ? void 0 : data.timeout,
                    });
                }
                promises.push(
                // drop the role
                yield this.dropRole({
                    roleName: r.role.name,
                    timeout: data === null || data === void 0 ? void 0 : data.timeout,
                }));
            }
            return promises;
        });
    }
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
    selectGrant(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {
                entity: {
                    role: { name: data.roleName },
                    object: { name: data.object },
                    object_name: data.objectName,
                },
            };
            if (data.db_name) {
                params.entity.db_name = data.db_name;
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'SelectGrant', params, data.timeout || this.timeout);
            return promise;
        });
    }
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
    listGrants(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'SelectGrant', {
                entity: {
                    role: { name: data.roleName },
                    db_name: data.db_name || '*',
                },
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    hasRole(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.listRoles();
            return {
                status: result.status,
                hasRole: result.results.map(r => r.role.name).includes(data.roleName),
            };
        });
    }
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
    createPrivilegeGroup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'CreatePrivilegeGroup', data, data.timeout || this.timeout);
            return promise;
        });
    }
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
    dropPrivilegeGroup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'DropPrivilegeGroup', data, data.timeout || this.timeout);
            return promise;
        });
    }
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
    listPrivilegeGroups(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'ListPrivilegeGroups', {}, (data === null || data === void 0 ? void 0 : data.timeout) || this.timeout);
            return promise;
        });
    }
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
    addPrivilegesToGroup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'OperatePrivilegeGroup', {
                group_name: data.group_name,
                privileges: data.privileges.map(p => ({ name: p })),
                type: __1.OperatePrivilegeGroupType.AddPrivilegesToGroup,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    removePrivilegesFromGroup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'OperatePrivilegeGroup', {
                group_name: data.group_name,
                privileges: data.privileges.map(p => ({ name: p })),
                type: __1.OperatePrivilegeGroupType.RemovePrivilegesFromGroup,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    grantPrivilegeV2(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'OperatePrivilegeV2', {
                role: { name: data.role },
                grantor: { privilege: { name: data.privilege } },
                type: __1.OperatePrivilegeType.Grant,
                db_name: data.db_name,
                collection_name: data.collection_name,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    revokePrivilegeV2(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'OperatePrivilegeV2', {
                role: { name: data.role },
                grantor: { privilege: { name: data.privilege } },
                type: __1.OperatePrivilegeType.Revoke,
                db_name: data.db_name,
                collection_name: data.collection_name,
            }, data.timeout || this.timeout);
            return promise;
        });
    }
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
    backupRBAC(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'BackupRBAC', data || {}, (data === null || data === void 0 ? void 0 : data.timeout) || this.timeout);
            return promise;
        });
    }
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
    restoreRBAC(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = yield (0, __1.promisify)(this.channelPool, 'RestoreRBAC', data, data.timeout || this.timeout);
            return promise;
        });
    }
}
exports.User = User;
//# sourceMappingURL=User.js.map