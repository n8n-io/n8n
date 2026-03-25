import { Map } from './util.js';
const roles = (connection) => {
    return {
        listAll: () => connection.get('/authz/roles').then(Map.roles),
        byName: (roleName) => connection.get(`/authz/roles/${roleName}`).then(Map.roleFromWeaviate),
        assignedUserIds: (roleName) => connection.get(`/authz/roles/${roleName}/users`),
        userAssignments: (roleName) => connection
            .get(`/authz/roles/${roleName}/user-assignments`, true)
            .then(Map.assignedUsers),
        create: (roleName, permissions) => {
            const perms = permissions
                ? Map.flattenPermissions(permissions).flatMap(Map.permissionToWeaviate)
                : undefined;
            return connection
                .postEmpty('/authz/roles', {
                name: roleName,
                permissions: perms,
            })
                .then(() => Map.roleFromWeaviate({ name: roleName, permissions: perms || [] }));
        },
        delete: (roleName) => connection.delete(`/authz/roles/${roleName}`, null),
        exists: (roleName) => connection
            .get(`/authz/roles/${roleName}`)
            .then(() => true)
            .catch(() => false),
        addPermissions: (roleName, permissions) => connection.postEmpty(`/authz/roles/${roleName}/add-permissions`, {
            permissions: Map.flattenPermissions(permissions).flatMap(Map.permissionToWeaviate),
        }),
        removePermissions: (roleName, permissions) => connection.postEmpty(`/authz/roles/${roleName}/remove-permissions`, {
            permissions: Map.flattenPermissions(permissions).flatMap(Map.permissionToWeaviate),
        }),
        hasPermissions: (roleName, permission) => Promise.all((Array.isArray(permission) ? permission : [permission])
            .flatMap((p) => Map.permissionToWeaviate(p))
            .map((p) => connection.postReturn(`/authz/roles/${roleName}/has-permission`, p))).then((r) => r.every((b) => b)),
        getGroupAssignments: (roleName) => connection
            .get(`/authz/roles/${roleName}/group-assignments`)
            .then(Map.groupsAssignments),
    };
};
export const permissions = {
    /**
     * Create a set of permissions specific to Weaviate's collection aliasing functionality.
     *
     * @param {string | string[]} [args.alias] Aliases that will be associated with these permissions.
     * @returns {AliasPermission[]} The permissions for the specified aliases.
     */
    aliases: (args) => {
        const aliases = Array.isArray(args.alias) ? args.alias : [args.alias];
        const collections = Array.isArray(args.collection) ? args.collection : [args.collection];
        const combinations = aliases.flatMap((alias) => collections.map((collection) => ({ alias, collection })));
        return combinations.map(({ collection, alias }) => {
            const out = { alias, collection, actions: [] };
            if (args.create)
                out.actions.push('create_aliases');
            if (args.read)
                out.actions.push('read_aliases');
            if (args.update)
                out.actions.push('update_aliases');
            if (args.delete)
                out.actions.push('delete_aliases');
            return out;
        });
    },
    /**
     * Create a set of permissions specific to Weaviate's backup functionality.
     *
     * For all collections, provide the `collection` argument as `'*'`.
     *
     * @param {string | string[]} args.collection The collection or collections to create permissions for.
     * @param {boolean} [args.manage] Whether to allow managing backups. Defaults to `false`.
     * @returns {BackupsPermission[]} The permissions for the specified collections.
     */
    backup: (args) => {
        const collections = Array.isArray(args.collection) ? args.collection : [args.collection];
        return collections.flatMap((collection) => {
            const out = { collection, actions: [] };
            if (args.manage)
                out.actions.push('manage_backups');
            return out;
        });
    },
    /**
     * Create a set of permissions specific to Weaviate's cluster endpoints.
     *
     * @param {boolean} [args.read] Whether to allow reading cluster information. Defaults to `false`.
     */
    cluster: (args) => {
        const out = { actions: [] };
        if (args.read)
            out.actions.push('read_cluster');
        return [out];
    },
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
    collections: (args) => {
        const collections = Array.isArray(args.collection) ? args.collection : [args.collection];
        return collections.flatMap((collection) => {
            const out = { collection, actions: [] };
            if (args.create_collection)
                out.actions.push('create_collections');
            if (args.read_config)
                out.actions.push('read_collections');
            if (args.update_config)
                out.actions.push('update_collections');
            if (args.delete_collection)
                out.actions.push('delete_collections');
            return out;
        });
    },
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
    data: (args) => {
        var _a;
        const collections = Array.isArray(args.collection) ? args.collection : [args.collection];
        const tenants = Array.isArray(args.tenant) ? args.tenant : [(_a = args.tenant) !== null && _a !== void 0 ? _a : '*'];
        const combinations = collections.flatMap((collection) => tenants.map((tenant) => ({ collection, tenant })));
        return combinations.flatMap(({ collection, tenant }) => {
            const out = { collection, tenant, actions: [] };
            if (args.create)
                out.actions.push('create_data');
            if (args.read)
                out.actions.push('read_data');
            if (args.update)
                out.actions.push('update_data');
            if (args.delete)
                out.actions.push('delete_data');
            return out;
        });
    },
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
        oidc: (args) => {
            const groups = Array.isArray(args.groupID) ? args.groupID : [args.groupID];
            const actions = [];
            if (args.read)
                actions.push('read_groups');
            if (args.assignAndRevoke)
                actions.push('assign_and_revoke_groups');
            return groups.map((gid) => ({ groupID: gid, groupType: 'oidc', actions }));
        },
        /**
         * Create a set of permissions for 'db' groups.
         *
         * @param {string | string[]} args.groupID IDs of the groups with permissions.
         * @param {boolean} [args.read] Whether to allow reading groups. Defaults to `false`.
         * @param {boolean} [args.assignAndRevoke] Whether to allow changing group assignements. Defaults to `false`.
         * @returns {GroupsPermission[]} The permissions for managing groups.
         */
        // db: (args: {
        //   groupID: string | string[];
        //   read?: boolean;
        //   assignAndRevoke?: boolean;
        // }): GroupsPermission[] => {
        //   const groups = Array.isArray(args.groupID) ? args.groupID : [args.groupID];
        //   const actions: GroupsAction[] = [];
        //   if (args.read) actions.push('read_groups');
        //   if (args.assignAndRevoke) actions.push('assign_and_revoke_groups');
        //   return groups.map((gid) => ({ groupID: gid, groupType: 'db', actions }));
        // },
    },
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
        minimal: (args) => {
            const out = {
                collection: '*',
                actions: [],
                verbosity: 'minimal',
            };
            if (args.read)
                out.actions.push('read_nodes');
            return [out];
        },
        /**
         * Create a set of permissions specific to reading nodes with verbosity set to `verbose`.
         *
         * @param {string | string[]} args.collection The collection or collections to create permissions for.
         * @param {boolean} [args.read] Whether to allow reading nodes. Defaults to `false`.
         * @returns {NodesPermission[]} The permissions for reading nodes.
         */
        verbose: (args) => {
            const collections = Array.isArray(args.collection) ? args.collection : [args.collection];
            return collections.flatMap((collection) => {
                const out = {
                    collection,
                    actions: [],
                    verbosity: 'verbose',
                };
                if (args.read)
                    out.actions.push('read_nodes');
                return out;
            });
        },
    },
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
    replicate: (args) => {
        const collections = Array.isArray(args.collection) ? args.collection : [args.collection];
        const shards = Array.isArray(args.shard) ? args.shard : [args.shard];
        const combinations = collections.flatMap((collection) => shards.map((shard) => ({ collection, shard })));
        return combinations.map(({ collection, shard }) => {
            const out = { collection, shard, actions: [] };
            if (args.create)
                out.actions.push('create_replicate');
            if (args.read)
                out.actions.push('read_replicate');
            if (args.update)
                out.actions.push('update_replicate');
            if (args.delete)
                out.actions.push('delete_replicate');
            return out;
        });
    },
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
    roles: (args) => {
        const roles = Array.isArray(args.role) ? args.role : [args.role];
        return roles.flatMap((role) => {
            const out = { role, actions: [] };
            if (args.create)
                out.actions.push('create_roles');
            if (args.read)
                out.actions.push('read_roles');
            if (args.update)
                out.actions.push('update_roles');
            if (args.delete)
                out.actions.push('delete_roles');
            return out;
        });
    },
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
    tenants: (args) => {
        var _a;
        const collections = Array.isArray(args.collection) ? args.collection : [args.collection];
        const tenants = Array.isArray(args.tenant) ? args.tenant : [(_a = args.tenant) !== null && _a !== void 0 ? _a : '*'];
        const combinations = collections.flatMap((collection) => tenants.map((tenant) => ({ collection, tenant })));
        return combinations.flatMap(({ collection, tenant }) => {
            const out = { collection, tenant, actions: [] };
            if (args.create)
                out.actions.push('create_tenants');
            if (args.read)
                out.actions.push('read_tenants');
            if (args.update)
                out.actions.push('update_tenants');
            if (args.delete)
                out.actions.push('delete_tenants');
            return out;
        });
    },
    /**
     * Create a set of permissions specific to any operations involving users.
     *
     * @param {string | string[]} args.user The user or users to create permissions for.
     * @param {boolean} [args.assignAndRevoke] Whether to allow assigning and revoking users. Defaults to `false`.
     * @param {boolean} [args.read] Whether to allow reading users. Defaults to `false`.
     * @returns {UsersPermission[]} The permissions for the specified users.
     */
    users: (args) => {
        const users = Array.isArray(args.user) ? args.user : [args.user];
        return users.flatMap((user) => {
            const out = { users: user, actions: [] };
            if (args.assignAndRevoke)
                out.actions.push('assign_and_revoke_users');
            if (args.read)
                out.actions.push('read_users');
            return out;
        });
    },
};
export default roles;
