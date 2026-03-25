import { GrpcTimeOut, PrivilegesTypes, resStatusResponse } from './Common';
import { RbacObjects, OperatePrivilegeGroupType, OperatePrivilegeType } from '../';
export interface usernameReq extends GrpcTimeOut {
    username: string;
}
export interface roleNameReq extends GrpcTimeOut {
    roleName: string;
}
export interface CreateUserReq extends usernameReq {
    password: string;
}
export interface DeleteUserReq extends usernameReq {
}
export interface UpdateUserReq extends usernameReq {
    oldPassword: string;
    newPassword: string;
}
export interface ListUsersReq extends GrpcTimeOut {
}
export interface CreateRoleReq extends roleNameReq {
}
export interface DropRoleReq extends roleNameReq {
}
export interface HasRoleReq extends roleNameReq {
}
export interface AddUserToRoleReq extends roleNameReq {
    username: string;
}
export interface RemoveUserFromRoleReq extends AddUserToRoleReq {
    roleName: string;
}
export interface SelectRoleReq extends roleNameReq {
    includeUserInfo?: boolean;
}
export interface listRoleReq extends GrpcTimeOut {
    includeUserInfo?: boolean;
}
export interface SelectUserReq extends usernameReq {
    includeRoleInfo?: boolean;
}
export interface BaseGrantReq extends roleNameReq {
    object: RbacObjects;
    objectName: string;
    db_name?: string;
}
export interface OperateRolePrivilegeReq extends BaseGrantReq {
    privilegeName: PrivilegesTypes;
}
export interface SelectGrantReq extends BaseGrantReq {
}
export interface ListGrantsReq extends roleNameReq {
    db_name?: string;
}
export interface ListCredUsersResponse extends resStatusResponse {
    usernames: string[];
}
export type RoleEntity = {
    name: string;
};
export type User = {
    name: string;
};
export type RoleResult = {
    users: User[];
    role: RoleEntity;
    entities: GrantEntity[];
};
export type PrivelegeGroup = {
    group_name: string;
    privileges: PrivilegeEntity[];
};
export type RBACMeta = {
    users: User[];
    roles: RoleEntity[];
    grants: GrantEntity[];
    privilege_groups: PrivelegeGroup[];
};
export interface SelectRoleResponse extends resStatusResponse {
    results: RoleResult[];
}
export type UserResult = {
    user: User;
    roles: RoleEntity[];
};
export interface SelectUserResponse extends resStatusResponse {
    results: UserResult[];
}
export type ObjectEntity = {
    name: RbacObjects;
};
export type PrivilegeEntity = {
    name: PrivilegesTypes;
};
export type Grantor = {
    user: User;
    privilege: PrivilegeEntity;
};
export type GrantEntity = {
    role: RoleEntity;
    object: ObjectEntity;
    object_name: string;
    grantor: Grantor;
    db_name: string;
};
export interface SelectGrantResponse extends resStatusResponse {
    entities: GrantEntity[];
}
export interface HasRoleResponse extends resStatusResponse {
    hasRole: boolean;
}
export interface OperatePrivilegeV2Request extends GrpcTimeOut {
    role: RoleEntity;
    grantor: Grantor;
    type: OperatePrivilegeType;
    db_name: string;
    collection_name: string;
}
export interface GrantPrivilegeV2Request extends GrpcTimeOut {
    role: string;
    privilege: PrivilegesTypes;
    db_name: string;
    collection_name: string;
}
export interface RevokePrivilegeV2Request extends GrantPrivilegeV2Request {
}
export interface CreatePrivilegeGroupReq extends GrpcTimeOut {
    group_name: string;
}
export interface DropPrivilegeGroupReq extends GrpcTimeOut {
    group_name: string;
}
export interface ListPrivilegeGroupsResponse extends resStatusResponse {
    privilege_groups: PrivelegeGroup[];
}
export interface OperatePrivilegeGroupReq extends GrpcTimeOut {
    group_name: string;
    privileges: PrivilegeEntity[];
    type: OperatePrivilegeGroupType;
}
export interface AddPrivilegesToGroupReq extends GrpcTimeOut {
    group_name: string;
    privileges: PrivilegesTypes[];
}
export interface RemovePrivilegesFromGroupReq extends GrpcTimeOut {
    group_name: string;
    privileges: PrivilegesTypes[];
}
export interface BackupRBACRequest extends GrpcTimeOut {
}
export interface RestoreRBACRequest extends GrpcTimeOut {
    RBAC_meta: RBACMeta;
}
export interface BackupRBACResponse extends resStatusResponse {
    RBAC_meta: RBACMeta;
}
