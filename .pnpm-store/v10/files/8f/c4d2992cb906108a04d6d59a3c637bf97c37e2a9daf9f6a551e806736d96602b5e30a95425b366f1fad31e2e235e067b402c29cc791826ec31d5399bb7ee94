"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../errors.js");
const util_js_1 = require("../roles/util.js");
const users = (connection) => {
    const base = baseUsers(connection);
    return {
        getMyUser: () => connection.get('/users/own-info').then(util_js_1.Map.user),
        getAssignedRoles: (userId) => connection.get(`/authz/users/${encodeURIComponent(userId)}/roles`).then(util_js_1.Map.roles),
        assignRoles: (roleNames, userId) => base.assignRoles(roleNames, userId),
        revokeRoles: (roleNames, userId) => base.revokeRoles(roleNames, userId),
        db: db(connection),
        oidc: oidc(connection),
    };
};
const db = (connection) => {
    const ns = namespacedUsers(connection);
    /** expectCode returns false if the contained WeaviateUnexpectedStatusCodeError
     * has an known error code and rethrows the error otherwise. */
    const expectCode = (code) => {
        return (error) => {
            if (error instanceof errors_js_1.WeaviateUnexpectedStatusCodeError && error.code === code) {
                return false;
            }
            throw error;
        };
    };
    return {
        getAssignedRoles: (userId, opts) => ns.getAssignedRoles('db', userId, opts),
        assignRoles: (roleNames, userId) => ns.assignRoles(roleNames, userId, { userType: 'db' }),
        revokeRoles: (roleNames, userId) => ns.revokeRoles(roleNames, userId, { userType: 'db' }),
        create: (userId) => connection
            .postReturn(`/users/db/${encodeURIComponent(userId)}`, null)
            .then((resp) => resp.apikey),
        delete: (userId) => connection
            .delete(`/users/db/${encodeURIComponent(userId)}`, null)
            .then(() => true)
            .catch(() => false),
        rotateKey: (userId) => connection
            .postReturn(`/users/db/${encodeURIComponent(userId)}/rotate-key`, null)
            .then((resp) => resp.apikey),
        activate: (userId) => connection
            .postEmpty(`/users/db/${encodeURIComponent(userId)}/activate`, null)
            .then(() => true)
            .catch(expectCode(409)),
        deactivate: (userId, opts) => connection
            .postEmpty(`/users/db/${encodeURIComponent(userId)}/deactivate`, opts || null)
            .then(() => true)
            .catch(expectCode(409)),
        byName: (userId, opts) => connection
            .get(`/users/db/${encodeURIComponent(userId)}?includeLastUsedTime=${(opts === null || opts === void 0 ? void 0 : opts.includeLastUsedTime) || false}`, true)
            .then(util_js_1.Map.dbUser),
        listAll: (opts) => connection
            .get(`/users/db?includeLastUsedTime=${(opts === null || opts === void 0 ? void 0 : opts.includeLastUsedTime) || false}`, true)
            .then(util_js_1.Map.dbUsers),
    };
};
const oidc = (connection) => {
    const ns = namespacedUsers(connection);
    return {
        getAssignedRoles: (userId, opts) => ns.getAssignedRoles('oidc', userId, opts),
        assignRoles: (roleNames, userId) => ns.assignRoles(roleNames, userId, { userType: 'oidc' }),
        revokeRoles: (roleNames, userId) => ns.revokeRoles(roleNames, userId, { userType: 'oidc' }),
    };
};
/** Implementation of the operations common to 'db', 'oidc', and legacy users. */
const baseUsers = (connection) => {
    const ns = namespacedUsers(connection);
    return {
        assignRoles: (roleNames, userId) => ns.assignRoles(roleNames, userId),
        revokeRoles: (roleNames, userId) => ns.revokeRoles(roleNames, userId),
    };
};
/** Implementation of the operations common to 'db' and 'oidc' users. */
const namespacedUsers = (connection) => {
    return {
        getAssignedRoles: (userType, userId, opts) => connection
            .get(`/authz/users/${encodeURIComponent(userId)}/roles/${userType}?includeFullRoles=${(opts === null || opts === void 0 ? void 0 : opts.includePermissions) || false}`)
            .then(util_js_1.Map.roles),
        assignRoles: (roleNames, userId, opts) => connection.postEmpty(`/authz/users/${encodeURIComponent(userId)}/assign`, Object.assign(Object.assign({}, opts), { roles: Array.isArray(roleNames) ? roleNames : [roleNames] })),
        revokeRoles: (roleNames, userId, opts) => connection.postEmpty(`/authz/users/${encodeURIComponent(userId)}/revoke`, Object.assign(Object.assign({}, opts), { roles: Array.isArray(roleNames) ? roleNames : [roleNames] })),
    };
};
exports.default = users;
