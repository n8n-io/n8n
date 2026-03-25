import { ConnectionREST } from '../index.js';
import { AliasPermission, BackupsPermission, ClusterPermission, CollectionsPermission, DataPermission, GroupAssignment, GroupsPermission, NodesPermission, Permission, PermissionsInput, ReplicatePermission, Role, RolesPermission, TenantsPermission, UserAssignment, UsersPermission } from './types.js';
export interface Roles {
    /**
     * Retrieve all the roles in the system.
     *
     * @returns {Promise<Record<string, Role>>} A map of role names to their respective roles.
     */
    listAll: () => Promise<Record<string, Role>>;
    /**
     * Retrieve a role by its name.
     *
     * @param {string} roleName The name of the role to retrieve.
     * @returns {Promise<Role | null>} The role if it exists, or null if it does not.
     */
    byName: (roleName: string) => Promise<Role | null>;
    /**
     * Retrieve the user IDs assigned to a role.
     *
     * @param {string} roleName The name of the role to retrieve the assigned user IDs for.
     * @returns {Promise<string[]>} The user IDs assigned to the role.
     *
     * @deprecated: Use `userAssignments` instead.
     */
    assignedUserIds: (roleName: string) => Promise<string[]>;
    /**
     * Retrieve the user IDs assigned to a role. Each user has a qualifying user type,
     * e.g. `'db_user' | 'db_env_user' | 'oidc'`.
     *
     * Note, unlike `assignedUserIds`, this method may return multiple entries for the same username,
     * if OIDC authentication is enabled: once with 'db_*' and once with 'oidc' user type.
     *
     * @param {string} roleName The name of the role to retrieve the assigned user IDs for.
     * @returns {Promise<UserAssignment[]>} User IDs and user types assigned to the role.
     */
    userAssignments: (roleName: string) => Promise<UserAssignment[]>;
    /**
     * Delete a role by its name.
     *
     * @param {string} roleName The name of the role to delete.
     * @returns {Promise<void>} A promise that resolves when the role is deleted.
     */
    delete: (roleName: string) => Promise<void>;
    /**
     * Create a new role.
     *
     * @param {string} roleName The name of the new role.
     * @param {PermissionsInput} [permissions] The permissions to assign to the new role.
     * @returns {Promise<Role>} The newly created role.
     */
    create: (roleName: string, permissions?: PermissionsInput) => Promise<Role>;
    /**
     * Check if a role exists.
     *
     * @param {string} roleName The name of the role to check for.
     * @returns {Promise<boolean>} A promise that resolves to true if the role exists, or false if it does not.
     */
    exists: (roleName: string) => Promise<boolean>;
    /**
     * Add permissions to a role.
     *
     * @param {string} roleName The name of the role to add permissions to.
     * @param {PermissionsInput} permissions The permissions to add.
     * @returns {Promise<void>} A promise that resolves when the permissions are added.
     */
    addPermissions: (roleName: string, permissions: PermissionsInput) => Promise<void>;
    /**
     * Remove permissions from a role.
     *
     * @param {string} roleName The name of the role to remove permissions from.
     * @param {PermissionsInput} permissions The permissions to remove.
     * @returns {Promise<void>} A promise that resolves when the permissions are removed.
     */
    removePermissions: (roleName: string, permissions: PermissionsInput) => Promise<void>;
    /**
     * Check if a role has the specified permissions.
     *
     * @param {string} roleName The name of the role to check.
     * @param {Permission | Permission[]} permission The permission or permissions to check for.
     * @returns {Promise<boolean>} A promise that resolves to true if the role has the permissions, or false if it does not.
     */
    hasPermissions: (roleName: string, permission: Permission | Permission[]) => Promise<boolean>;
    /**
     * Get the IDs and group type of groups that assigned this role.
     *
     * @param {string} roleName The name of the role to check.
     * @returns {Promise<GroupAssignment[]>} A promise that resolves to an array of group names assigned to this role.
     */
    getGroupAssignments: (roleName: string) => Promise<GroupAssignment[]>;
}
declare const roles: (connection: ConnectionREST) => Roles;
export declare const permissions: {
    /**
     * Create a set of permissions specific to Weaviate's collection aliasing functionality.
     *
     * @param {string | string[]} [args.alias] Aliases that will be associated with these permissions.
     * @returns {AliasPermission[]} The permissions for the specified aliases.
     */
    aliases: (args: {
        alias: string | string[];
        collection: string | string[];
        create?: boolean;
        read?: boolean;
        update?: boolean;
        delete?: boolean;
    }) => AliasPermission[];
    /**
     * Create a set of permissions specific to Weaviate's backup functionality.
     *
     * For all collections, provide the `collection` argument as `'*'`.
     *
     * @param {string | string[]} args.collection The collection or collections to create permissions for.
     * @param {boolean} [args.manage] Whether to allow managing backups. Defaults to `false`.
     * @returns {BackupsPermission[]} The permissions for the specified collections.
     */
    backup: (args: {
        collection: string | string[];
        manage?: boolean;
    }) => BackupsPermission[];
    /**
     * Create a set of permissions specific to Weaviate's cluster endpoints.
     *
     * @param {boolean} [args.read] Whether to allow reading cluster information. Defaults to `false`.
     */
    cluster: (args: {
        read?: boolean;
    }) => ClusterPermission[];
    /**
     * Create a set of permissions specific to any operations involving collections.
     *
     * For all collections, provide the `collection` argument as `'*'`.
     *
     * @param {string | string[]} args.collection The collection or collections to create permissions for.
     * @param {boolean} [args.create_collection] Whether to allow creating collections. Defaults to `false`.
     * @param {boolean} [args.read_config] Whether to allow reading collection configurations. Defaults to `false`.
     * @param {boolean} [args.update_config] Whether to allow updating collection configurations. Defaults to `false`.
     * @param {boolean} [args.delete_collection] Whether to allow deleting collections. Defaults to `false`.
     */
    collections: (args: {
        collection: string | string[];
        create_collection?: boolean;
        read_config?: boolean;
        update_config?: boolean;
        delete_collection?: boolean;
    }) => CollectionsPermission[];
    /**
     * Create a set of permissions specific to any operations involving objects within collections and tenants.
     *
     * For all collections, provide the `collection` argument as `'*'`.
     * For all tenants, provide the `tenant` argument as `'*'`.
     *
     * Providing arrays of collections and tenants will create permissions for each combination of collection and tenant.
     * E.g., `data({ collection: ['A', 'B'], tenant: ['X', 'Y'] })` will create permissions for tenants `X` and `Y` in both collections `A` and `B`.
     *
     * @param {string | string[]} args.collection The collection or collections to create permissions for.
     * @param {string | string[]} [args.tenant] The tenant or tenants to create permissions for. Defaults to `'*'`.
     * @param {boolean} [args.create] Whether to allow creating objects. Defaults to `false`.
     * @param {boolean} [args.read] Whether to allow reading objects. Defaults to `false`.
     * @param {boolean} [args.update] Whether to allow updating objects. Defaults to `false`.
     * @param {boolean} [args.delete] Whether to allow deleting objects. Defaults to `false`.
     */
    data: (args: {
        collection: string | string[];
        tenant?: string | string[];
        create?: boolean;
        read?: boolean;
        update?: boolean;
        delete?: boolean;
    }) => DataPermission[];
    /**
     * This namespace contains methods to create permissions specific to RBAC groups.
     */
    groups: {
        /**
         * Create a set of permissions for 'oidc' groups.
         *
         * @param {string | string[]} args.groupID IDs of the groups with permissions.
         * @param {boolean} [args.read] Whether to allow reading groups. Defaults to `false`.
         * @param {boolean} [args.assignAndRevoke] Whether to allow changing group assignements. Defaults to `false`.
         * @returns {GroupsPermission[]} The permissions for managing groups.
         */
        oidc: (args: {
            groupID: string | string[];
            read?: boolean;
            assignAndRevoke?: boolean;
        }) => GroupsPermission[];
    };
    /**
     * This namespace contains methods to create permissions specific to nodes.
     */
    nodes: {
        /**
         * Create a set of permissions specific to reading nodes with verbosity set to `minimal`.
         *
         * @param {boolean} [args.read] Whether to allow reading nodes. Defaults to `false`.
         * @returns {NodesPermission[]} The permissions for reading nodes.
         */
        minimal: (args: {
            read?: boolean;
        }) => NodesPermission[];
        /**
         * Create a set of permissions specific to reading nodes with verbosity set to `verbose`.
         *
         * @param {string | string[]} args.collection The collection or collections to create permissions for.
         * @param {boolean} [args.read] Whether to allow reading nodes. Defaults to `false`.
         * @returns {NodesPermission[]} The permissions for reading nodes.
         */
        verbose: (args: {
            collection: string | string[];
            read?: boolean;
        }) => NodesPermission[];
    };
    /**
     * Create a set of permissions specific to shard replica movement operations.
     *
     * For all collections, provide the `collection` argument as `'*'`.
     * For all shards, provide the `shard` argument as `'*'`.
     *
     * Providing arrays of collections and shards will create permissions for each combination of collection and shard.
     * E.g., `replicate({ collection: ['A', 'B'], shard: ['X', 'Y'] })` will create permissions for shards `X` and `Y` in both collections `A` and `B`.
     *
     * @param {string | string[]} args.collection The collection or collections to create permissions for.
     * @param {string | string[]} args.shard The shard or shards to create permissions for.
     * @param {boolean} [args.create] Whether to allow creating replicas. Defaults to `false`.
     * @param {boolean} [args.read] Whether to allow reading replicas. Defaults to `false`.
     * @param {boolean} [args.update] Whether to allow updating replicas. Defaults to `false`.
     * @param {boolean} [args.delete] Whether to allow deleting replicas. Defaults to `false`.
     * @returns {ReplicatePermission[]} The permissions for the specified collections and shards.
     */
    replicate: (args: {
        collection: string | string[];
        shard: string | string[];
        create?: boolean;
        read?: boolean;
        update?: boolean;
        delete?: boolean;
    }) => ReplicatePermission[];
    /**
     * Create a set of permissions specific to any operations involving roles.
     *
     * @param {string | string[]} args.role The role or roles to create permissions for.
     * @param {boolean} [args.create] Whether to allow creating roles. Defaults to `false`.
     * @param {boolean} [args.read] Whether to allow reading roles. Defaults to `false`.
     * @param {boolean} [args.update] Whether to allow updating roles. Defaults to `false`.
     * @param {boolean} [args.delete] Whether to allow deleting roles. Defaults to `false`.
     * @returns {RolesPermission[]} The permissions for the specified roles.
     */
    roles: (args: {
        role: string | string[];
        create?: boolean;
        read?: boolean;
        update?: boolean;
        delete?: boolean;
    }) => RolesPermission[];
    /**
     * Create a set of permissions specific to any operations involving tenants.
     *
     * For all collections, provide the `collection` argument as `'*'`.
     * For all tenants, provide the `tenant` argument as `'*'`.
     *
     * Providing arrays of collections and tenants will create permissions for each combination of collection and tenant.
     * E.g., `tenants({ collection: ['A', 'B'], tenant: ['X', 'Y'] })` will create permissions for tenants `X` and `Y` in both collections `A` and `B`.
     *
     * @param {string | string[] | Record<string, string | string[]>} args.collection The collection or collections to create permissions for.
     * @param {string | string[]} [args.tenant] The tenant or tenants to create permissions for. Defaults to `'*'`.
     * @param {boolean} [args.create] Whether to allow creating tenants. Defaults to `false`.
     * @param {boolean} [args.read] Whether to allow reading tenants. Defaults to `false`.
     * @param {boolean} [args.update] Whether to allow updating tenants. Defaults to `false`.
     * @param {boolean} [args.delete] Whether to allow deleting tenants. Defaults to `false`.
     * @returns {TenantsPermission[]} The permissions for the specified tenants.
     */
    tenants: (args: {
        collection: string | string[];
        tenant?: string | string[];
        create?: boolean;
        read?: boolean;
        update?: boolean;
        delete?: boolean;
    }) => TenantsPermission[];
    /**
     * Create a set of permissions specific to any operations involving users.
     *
     * @param {string | string[]} args.user The user or users to create permissions for.
     * @param {boolean} [args.assignAndRevoke] Whether to allow assigning and revoking users. Defaults to `false`.
     * @param {boolean} [args.read] Whether to allow reading users. Defaults to `false`.
     * @returns {UsersPermission[]} The permissions for the specified users.
     */
    users: (args: {
        user: string | string[];
        assignAndRevoke?: boolean;
        read?: boolean;
    }) => UsersPermission[];
};
export default roles;
