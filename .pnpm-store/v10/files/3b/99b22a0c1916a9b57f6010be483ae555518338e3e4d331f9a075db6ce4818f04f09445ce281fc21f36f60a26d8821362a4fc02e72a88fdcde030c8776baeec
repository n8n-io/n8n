"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Map = exports.PermissionGuards = void 0;
/** ZERO_TIME is the timestamp Weaviate server sends in abscence of a value (null value). */
const ZERO_TIME = '0001-01-01T00:00:00.000Z';
class PermissionGuards {
}
exports.PermissionGuards = PermissionGuards;
PermissionGuards.includes = (permission, ...actions) => actions.filter((a) => Array.from(permission.actions).includes(a)).length > 0;
PermissionGuards.isAlias = (permission) => PermissionGuards.includes(permission, 'create_aliases', 'read_aliases', 'update_aliases', 'delete_aliases');
PermissionGuards.isBackups = (permission) => PermissionGuards.includes(permission, 'manage_backups');
PermissionGuards.isCluster = (permission) => PermissionGuards.includes(permission, 'read_cluster');
PermissionGuards.isCollections = (permission) => PermissionGuards.includes(permission, 'create_collections', 'delete_collections', 'read_collections', 'update_collections');
PermissionGuards.isData = (permission) => PermissionGuards.includes(permission, 'create_data', 'delete_data', 'read_data', 'update_data');
PermissionGuards.isGroups = (permission) => PermissionGuards.includes(permission, 'read_groups', 'assign_and_revoke_groups');
PermissionGuards.isNodes = (permission) => PermissionGuards.includes(permission, 'read_nodes');
PermissionGuards.isReplicate = (permission) => PermissionGuards.includes(permission, 'create_replicate', 'read_replicate', 'update_replicate', 'delete_replicate');
PermissionGuards.isRoles = (permission) => PermissionGuards.includes(permission, 'create_roles', 'read_roles', 'update_roles', 'delete_roles');
PermissionGuards.isTenants = (permission) => PermissionGuards.includes(permission, 'create_tenants', 'delete_tenants', 'read_tenants', 'update_tenants');
PermissionGuards.isUsers = (permission) => PermissionGuards.includes(permission, 'read_users', 'assign_and_revoke_users');
PermissionGuards.isPermission = (permissions) => !Array.isArray(permissions);
PermissionGuards.isPermissionArray = (permissions) => Array.isArray(permissions) && permissions.every(PermissionGuards.isPermission);
PermissionGuards.isPermissionMatrix = (permissions) => Array.isArray(permissions) && permissions.every(PermissionGuards.isPermissionArray);
PermissionGuards.isPermissionTuple = (permissions) => Array.isArray(permissions) &&
    permissions.every((permission) => PermissionGuards.isPermission(permission) || PermissionGuards.isPermissionArray(permission));
class Map {
}
exports.Map = Map;
Map.flattenPermissions = (permissions) => !Array.isArray(permissions) ? [permissions] : permissions.flat(2);
Map.permissionToWeaviate = (permission) => {
    if (PermissionGuards.isAlias(permission)) {
        return Array.from(permission.actions).map((action) => ({
            aliases: permission,
            action,
        }));
    }
    if (PermissionGuards.isBackups(permission)) {
        return Array.from(permission.actions).map((action) => ({
            backups: permission,
            action,
        }));
    }
    else if (PermissionGuards.isCluster(permission)) {
        return Array.from(permission.actions).map((action) => ({ action }));
    }
    else if (PermissionGuards.isCollections(permission)) {
        return Array.from(permission.actions).map((action) => ({
            collections: permission,
            action,
        }));
    }
    else if (PermissionGuards.isData(permission)) {
        return Array.from(permission.actions).map((action) => ({
            data: permission,
            action,
        }));
    }
    else if (PermissionGuards.isGroups(permission)) {
        return Array.from(permission.actions).map((action) => ({
            groups: { group: permission.groupID, groupType: permission.groupType },
            action,
        }));
    }
    else if (PermissionGuards.isNodes(permission)) {
        return Array.from(permission.actions).map((action) => ({
            nodes: permission,
            action,
        }));
    }
    else if (PermissionGuards.isReplicate(permission)) {
        return Array.from(permission.actions).map((action) => ({
            replicate: permission,
            action,
        }));
    }
    else if (PermissionGuards.isRoles(permission)) {
        return Array.from(permission.actions).map((action) => ({ roles: permission, action }));
    }
    else if (PermissionGuards.isTenants(permission)) {
        return Array.from(permission.actions).map((action) => ({
            tenants: permission,
            action,
        }));
    }
    else if (PermissionGuards.isUsers(permission)) {
        return Array.from(permission.actions).map((action) => ({ users: permission, action }));
    }
    else {
        throw new Error(`Unknown permission type: ${JSON.stringify(permission, null, 2)}`);
    }
};
Map.roleFromWeaviate = (role) => PermissionsMapping.use(role).map();
Map.roles = (roles) => roles.reduce((acc, role) => (Object.assign(Object.assign({}, acc), { [role.name]: Map.roleFromWeaviate(role) })), {});
Map.groupsAssignments = (groups) => groups.map((g) => ({
    groupID: g.groupId || '',
    groupType: g.groupType,
}));
Map.users = (users) => users.reduce((acc, user) => (Object.assign(Object.assign({}, acc), { [user]: { id: user } })), {});
Map.user = (user) => {
    var _a;
    return ({
        id: user.username,
        roles: (_a = user.roles) === null || _a === void 0 ? void 0 : _a.map(Map.roleFromWeaviate),
    });
};
Map.dbUser = (user) => ({
    userType: user.dbUserType,
    id: user.userId,
    roleNames: user.roles,
    active: user.active,
    createdAt: Map.unknownDate(user.createdAt),
    lastUsedAt: Map.unknownDate(user.lastUsedAt),
    apiKeyFirstLetters: user.apiKeyFirstLetters,
});
Map.dbUsers = (users) => users.map(Map.dbUser);
Map.assignedUsers = (users) => users.map((user) => ({
    id: user.userId || '',
    userType: user.userType,
}));
Map.unknownDate = (date) => date !== undefined && typeof date === 'string' && date !== ZERO_TIME ? new Date(date) : undefined;
class PermissionsMapping {
    constructor(role) {
        this.map = () => {
            // If truncated roles are requested (?includeFullRoles=false),
            // role.permissions are not present.
            if (this.role.permissions !== null) {
                this.role.permissions.forEach(this.permissionFromWeaviate);
            }
            return {
                name: this.role.name,
                aliasPermissions: Object.values(this.mappings.aliases),
                backupsPermissions: Object.values(this.mappings.backups),
                clusterPermissions: Object.values(this.mappings.cluster),
                collectionsPermissions: Object.values(this.mappings.collections),
                dataPermissions: Object.values(this.mappings.data),
                groupsPermissions: Object.values(this.mappings.groups),
                nodesPermissions: Object.values(this.mappings.nodes),
                replicatePermissions: Object.values(this.mappings.replicate),
                rolesPermissions: Object.values(this.mappings.roles),
                tenantsPermissions: Object.values(this.mappings.tenants),
                usersPermissions: Object.values(this.mappings.users),
            };
        };
        this.aliases = (permission) => {
            if (permission.aliases !== undefined) {
                const { alias, collection } = permission.aliases;
                if (alias === undefined)
                    throw new Error('Alias permission missing an alias');
                if (this.mappings.aliases[alias] === undefined) {
                    this.mappings.aliases[alias] = { alias, collection: collection || '*', actions: [] };
                }
                this.mappings.aliases[alias].actions.push(permission.action);
            }
        };
        this.backups = (permission) => {
            if (permission.backups !== undefined) {
                const key = permission.backups.collection;
                if (key === undefined)
                    throw new Error('Backups permission missing collection');
                if (this.mappings.backups[key] === undefined)
                    this.mappings.backups[key] = { collection: key, actions: [] };
                this.mappings.backups[key].actions.push(permission.action);
            }
        };
        this.cluster = (permission) => {
            if (permission.action === 'read_cluster') {
                if (this.mappings.cluster[''] === undefined)
                    this.mappings.cluster[''] = { actions: [] };
                this.mappings.cluster[''].actions.push('read_cluster');
            }
        };
        this.collections = (permission) => {
            if (permission.collections !== undefined) {
                const key = permission.collections.collection;
                if (key === undefined)
                    throw new Error('Collections permission missing collection');
                if (this.mappings.collections[key] === undefined)
                    this.mappings.collections[key] = { collection: key, actions: [] };
                this.mappings.collections[key].actions.push(permission.action);
            }
        };
        this.data = (permission) => {
            if (permission.data !== undefined) {
                const { collection, tenant } = permission.data;
                if (collection === undefined)
                    throw new Error('Data permission missing collection');
                const key = tenant === undefined ? collection : `${collection}#${tenant}`;
                if (this.mappings.data[key] === undefined)
                    this.mappings.data[key] = { collection, tenant: tenant || '*', actions: [] };
                this.mappings.data[key].actions.push(permission.action);
            }
        };
        this.groups = (permission) => {
            if (permission.groups !== undefined) {
                const { group, groupType } = permission.groups;
                if (group === undefined)
                    throw new Error('Group permission missing groupID');
                if (groupType === undefined)
                    throw new Error('Group permission missing groupType');
                const key = `${groupType}#${group}`;
                if (this.mappings.groups[key] === undefined)
                    this.mappings.groups[key] = { groupType, groupID: group, actions: [] };
                this.mappings.groups[key].actions.push(permission.action);
            }
        };
        this.nodes = (permission) => {
            if (permission.nodes !== undefined) {
                let { collection } = permission.nodes;
                const { verbosity } = permission.nodes;
                if (verbosity === undefined)
                    throw new Error('Nodes permission missing verbosity');
                if (verbosity === 'verbose') {
                    if (collection === undefined)
                        throw new Error('Nodes permission missing collection');
                }
                else if (verbosity === 'minimal')
                    collection = '*';
                else
                    throw new Error('Nodes permission missing verbosity');
                const key = `${collection}#${verbosity}`;
                if (this.mappings.nodes[key] === undefined)
                    this.mappings.nodes[key] = { collection, verbosity, actions: [] };
                this.mappings.nodes[key].actions.push(permission.action);
            }
        };
        this.replicate = (permission) => {
            if (permission.replicate !== undefined) {
                const { collection, shard } = permission.replicate;
                if (collection === undefined)
                    throw new Error('Replicate permission missing collection');
                if (shard === undefined)
                    throw new Error('Replicate permission missing shard');
                const key = `${collection}#${shard}`;
                if (this.mappings.replicate[key] === undefined)
                    this.mappings.replicate[key] = { collection, shard, actions: [] };
                this.mappings.replicate[key].actions.push(permission.action);
            }
        };
        this.roles = (permission) => {
            if (permission.roles !== undefined) {
                const key = permission.roles.role;
                if (key === undefined)
                    throw new Error('Roles permission missing role');
                if (this.mappings.roles[key] === undefined)
                    this.mappings.roles[key] = { role: key, actions: [] };
                this.mappings.roles[key].actions.push(permission.action);
            }
        };
        this.tenants = (permission) => {
            if (permission.tenants !== undefined) {
                const { collection, tenant } = permission.tenants;
                if (collection === undefined)
                    throw new Error('Tenants permission missing collection');
                const key = tenant === undefined ? collection : `${collection}#${tenant}`;
                if (this.mappings.tenants[key] === undefined)
                    this.mappings.tenants[key] = { collection, tenant: tenant || '*', actions: [] };
                this.mappings.tenants[key].actions.push(permission.action);
            }
        };
        this.users = (permission) => {
            if (permission.users !== undefined) {
                const key = permission.users.users;
                if (key === undefined)
                    throw new Error('Users permission missing user');
                if (this.mappings.users[key] === undefined)
                    this.mappings.users[key] = { users: key, actions: [] };
                this.mappings.users[key].actions.push(permission.action);
            }
        };
        this.permissionFromWeaviate = (permission) => {
            this.aliases(permission);
            this.backups(permission);
            this.cluster(permission);
            this.collections(permission);
            this.data(permission);
            this.groups(permission);
            this.nodes(permission);
            this.replicate(permission);
            this.roles(permission);
            this.tenants(permission);
            this.users(permission);
        };
        this.mappings = {
            aliases: {},
            backups: {},
            cluster: {},
            collections: {},
            data: {},
            groups: {},
            nodes: {},
            replicate: {},
            roles: {},
            tenants: {},
            users: {},
        };
        this.role = role;
    }
}
PermissionsMapping.use = (role) => new PermissionsMapping(role);
