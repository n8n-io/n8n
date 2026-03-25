import ConnectionREST from '../connection/http.js';
import { Role } from '../roles/types.js';
export interface Groups {
    /** Manage roles of OIDC user groups. */
    oidc: GroupsOIDC;
}
export interface GroupsOIDC {
    /**
     * Get the roles assigned to a group specific to the configured OIDC's dynamic auth functionality.
     *
     * @param {string} groupID The group ID to get the roles for.
     * @param {boolean} [includePermissions] Whether to include all associated permissions in the response.
     * @returns {Promise<Record<string, Role>>} A map of roles assigned to the group.
     */
    getAssignedRoles(groupID: string, includePermissions?: boolean): Promise<Record<string, Role>>;
    /**
     * Assign roles to a group specific to the configured OIDC's dynamic auth functionality.
     *
     * @param {string} groupID The group ID to get the roles for.
     * @param {string | string[]} roles  The names of the roles to assign to the group.
     */
    assignRoles(groupID: string, roles: string | string[]): Promise<void>;
    /**
     * Revoke roles from a group specific to the configured OIDC's dynamic auth functionality.
     *
     * @param {string} groupID The group ID to get the roles for.
     * @param {string | string[]} roles  The names of the roles to revoke from the group.
     */
    revokeRoles(groupID: string, roles: string | string[]): Promise<void>;
    /**
     * Get the known group names specific to the configured OIDC's dynamic auth functionality.
     *
     * @returns {Promise<string[]>} A list of known group names.
     */
    getKnownGroupNames(): Promise<string[]>;
}
export declare const groups: (connection: ConnectionREST) => Groups;
export default groups;
