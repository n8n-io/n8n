import { Action, WeaviateGroupType, WeaviateUserType } from '../openapi/types.js';
export type AliasAction = Extract<Action, 'create_aliases' | 'read_aliases' | 'update_aliases' | 'delete_aliases'>;
export type BackupsAction = Extract<Action, 'manage_backups'>;
export type ClusterAction = Extract<Action, 'read_cluster'>;
export type CollectionsAction = Extract<Action, 'create_collections' | 'delete_collections' | 'read_collections' | 'update_collections' | 'manage_collections'>;
export type DataAction = Extract<Action, 'create_data' | 'delete_data' | 'read_data' | 'update_data' | 'manage_data'>;
export type GroupsAction = Extract<Action, 'read_groups' | 'assign_and_revoke_groups'>;
export type NodesAction = Extract<Action, 'read_nodes'>;
export type ReplicateAction = Extract<Action, 'create_replicate' | 'read_replicate' | 'update_replicate' | 'delete_replicate'>;
export type RolesAction = Extract<Action, 'create_roles' | 'read_roles' | 'update_roles' | 'delete_roles'>;
export type TenantsAction = Extract<Action, 'create_tenants' | 'delete_tenants' | 'read_tenants' | 'update_tenants'>;
export type UsersAction = Extract<Action, 'read_users' | 'assign_and_revoke_users'>;
export type UserAssignment = {
    id: string;
    userType: WeaviateUserType;
};
export type GroupAssignment = {
    groupID: string;
    groupType: WeaviateGroupType;
};
export type AliasPermission = {
    alias: string;
    collection: string;
    actions: AliasAction[];
};
export type BackupsPermission = {
    collection: string;
    actions: BackupsAction[];
};
export type ClusterPermission = {
    actions: ClusterAction[];
};
export type CollectionsPermission = {
    collection: string;
    actions: CollectionsAction[];
};
export type DataPermission = {
    collection: string;
    tenant: string;
    actions: DataAction[];
};
export type GroupsPermission = {
    groupID: string;
    groupType: WeaviateGroupType;
    actions: GroupsAction[];
};
export type NodesPermission = {
    collection: string;
    verbosity: 'verbose' | 'minimal';
    actions: NodesAction[];
};
export type ReplicatePermission = {
    collection: string;
    shard: string;
    actions: ReplicateAction[];
};
export type RolesPermission = {
    role: string;
    actions: RolesAction[];
};
export type TenantsPermission = {
    collection: string;
    tenant: string;
    actions: TenantsAction[];
};
export type UsersPermission = {
    users: string;
    actions: UsersAction[];
};
export type Role = {
    name: string;
    aliasPermissions: AliasPermission[];
    backupsPermissions: BackupsPermission[];
    clusterPermissions: ClusterPermission[];
    collectionsPermissions: CollectionsPermission[];
    dataPermissions: DataPermission[];
    groupsPermissions: GroupsPermission[];
    nodesPermissions: NodesPermission[];
    replicatePermissions: ReplicatePermission[];
    rolesPermissions: RolesPermission[];
    tenantsPermissions: TenantsPermission[];
    usersPermissions: UsersPermission[];
};
export type Permission = AliasPermission | BackupsPermission | ClusterPermission | CollectionsPermission | DataPermission | GroupsPermission | NodesPermission | ReplicatePermission | RolesPermission | TenantsPermission | UsersPermission;
export type PermissionsInput = Permission | Permission[] | Permission[][] | (Permission | Permission[])[];
