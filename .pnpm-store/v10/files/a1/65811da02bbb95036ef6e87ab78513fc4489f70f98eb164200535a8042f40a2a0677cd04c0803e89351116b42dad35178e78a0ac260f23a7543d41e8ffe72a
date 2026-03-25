import { Map } from '../roles/util.js';
export const groups = (connection) => ({
    oidc: {
        getAssignedRoles: (groupID, includePermissions) => connection
            .get(`/authz/groups/${encodeURIComponent(groupID)}/roles/oidc${includePermissions ? '?includeFullRoles=true' : ''}`)
            .then(Map.roles),
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
export default groups;
