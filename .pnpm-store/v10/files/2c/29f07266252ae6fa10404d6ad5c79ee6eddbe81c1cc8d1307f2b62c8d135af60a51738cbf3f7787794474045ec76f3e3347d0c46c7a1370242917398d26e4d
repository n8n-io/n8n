import { ConnectionREST } from '../index.js';
import { Role } from '../roles/types.js';
import { DeactivateOptions, GetAssignedRolesOptions, GetUserOptions, User, UserDB } from './types.js';
/**
 * Operations supported for 'db', 'oidc', and legacy (non-namespaced) users.
 * Use respective implementations in `users.db` and `users.oidc`, and `users`.
 */
interface UsersBase {
    /**
     * Assign roles to a user.
     *
     * @param {string | string[]} roleNames The name or names of the roles to assign.
     * @param {string} userId The ID of the user to assign the roles to.
     * @returns {Promise<void>} A promise that resolves when the roles are assigned.
     */
    assignRoles: (roleNames: string | string[], userId: string) => Promise<void>;
    /**
     * Revoke roles from a user.
     *
     * @param {string | string[]} roleNames The name or names of the roles to revoke.
     * @param {string} userId The ID of the user to revoke the roles from.
     * @returns {Promise<void>} A promise that resolves when the roles are revoked.
     */
    revokeRoles: (roleNames: string | string[], userId: string) => Promise<void>;
}
export interface Users extends UsersBase {
    /** @deprecated: Use `users.db.assignRoles` or `users.oidc.assignRoles` instead. */
    assignRoles: (roleNames: string | string[], userId: string) => Promise<void>;
    /** @deprecated: Use `users.db.revokeRoles` or `users.oidc.revokeRoles` instead. */
    revokeRoles: (roleNames: string | string[], userId: string) => Promise<void>;
    /**
     * Retrieve the information relevant to the currently authenticated user.
     *
     * @returns {Promise<User>} The user information.
     */
    getMyUser: () => Promise<User>;
    /**
     * Retrieve the roles assigned to a user.
     *
     * @param {string} userId The ID of the user to retrieve the assigned roles for.
     * @returns {Promise<Record<string, Role>>} A map of role names to their respective roles.
     *
     * @deprecated: Use `users.db.getAssignedRoles` or `users.oidc.getAssignedRoles` instead.
     */
    getAssignedRoles: (userId: string) => Promise<Record<string, Role>>;
    db: DBUsers;
    oidc: OIDCUsers;
}
/** Operations supported for namespaced 'db' users.*/
export interface DBUsers extends UsersBase {
    /**
     * Retrieve the roles assigned to a 'db_user' user.
     *
     * @param {string} userId The ID of the user to retrieve the assigned roles for.
     * @returns {Promise<Record<string, Role>>} A map of role names to their respective roles.
     */
    getAssignedRoles: (userId: string, opts?: GetAssignedRolesOptions) => Promise<Record<string, Role>>;
    /** Create a new 'db_user' user.
     *
     * @param {string} userId The ID of the user to create. Must consist of valid URL characters only.
     * @returns {Promise<string>} API key for the newly created user.
     */
    create: (userId: string) => Promise<string>;
    /**
     * Delete a 'db_user' user. It is not possible to delete 'db_env_user' users programmatically.
     *
     * @param {string} userId The ID of the user to delete.
     * @returns {Promise<boolean>} `true` if the user has been successfully deleted.
     */
    delete: (userId: string) => Promise<boolean>;
    /**
     * Rotate the API key of a 'db_user' user. The old API key becomes invalid.
     * API keys of 'db_env_user' users are defined in the server's environment
     * and cannot be modified programmatically.
     *
     * @param {string} userId The ID of the user to create a new API key for.
     * @returns {Promise<string>} New API key for the user.
     */
    rotateKey: (userId: string) => Promise<string>;
    /**
     * Activate 'db_user' user.
     *
     * @param {string} userId The ID of the user to activate.
     * @returns {Promise<boolean>} `true` if the user has been successfully activated.
     */
    activate: (userId: string) => Promise<boolean>;
    /**
     * Deactivate 'db_user' user.
     *
     * @param {string} userId The ID of the user to deactivate.
     * @returns {Promise<boolean>} `true` if the user has been successfully deactivated.
     */
    deactivate: (userId: string, opts?: DeactivateOptions) => Promise<boolean>;
    /**
     * Retrieve information about the 'db_user' / 'db_env_user' user.
     *
     * @param {string} userId The ID of the user to get.
     * @returns {Promise<UserDB>} ID, status, and assigned roles of a 'db_*' user.
     */
    byName: (userId: string, opts?: GetUserOptions) => Promise<UserDB>;
    /**
     * List all 'db_user' / 'db_env_user' users.
     *
     * @returns {Promise<UserDB[]>} ID, status, and assigned roles for each 'db_*' user.
     */
    listAll: (opts?: GetUserOptions) => Promise<UserDB[]>;
}
/** Operations supported for namespaced 'oidc' users.*/
export interface OIDCUsers extends UsersBase {
    /**
     * Retrieve the roles assigned to an 'oidc' user.
     *
     * @param {string} userId The ID of the user to retrieve the assigned roles for.
     * @returns {Promise<Record<string, Role>>} A map of role names to their respective roles.
     */
    getAssignedRoles: (userId: string, opts?: GetAssignedRolesOptions) => Promise<Record<string, Role>>;
}
declare const users: (connection: ConnectionREST) => Users;
export default users;
