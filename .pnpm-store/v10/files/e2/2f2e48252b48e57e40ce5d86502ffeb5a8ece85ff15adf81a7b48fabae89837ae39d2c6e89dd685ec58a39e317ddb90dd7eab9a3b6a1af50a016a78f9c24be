"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groups = void 0;
const util_js_1 = require("../roles/util.js");
const groups = (connection) => ({
    oidc: {
        getAssignedRoles: (groupID, includePermissions) => connection
            .get(`/authz/groups/${encodeURIComponent(groupID)}/roles/oidc${includePermissions ? '?includeFullRoles=true' : ''}`)
            .then(util_js_1.Map.roles),
        assignRoles: (groupID, roles) => connection.postEmpty(`/authz/groups/${encodeURIComponent(groupID)}/assign`, {
            roles: Array.isArray(roles) ? roles : [roles],
            groupType: 'oidc',
        }),
        revokeRoles: (groupID, roles) => connection.postEmpty(`/authz/groups/${encodeURIComponent(groupID)}/revoke`, {
            roles: Array.isArray(roles) ? roles : [roles],
            groupType: 'oidc',
        }),
        getKnownGroupNames: () => connection.get(`/authz/groups/oidc`),
    },
});
exports.groups = groups;
exports.default = exports.groups;
