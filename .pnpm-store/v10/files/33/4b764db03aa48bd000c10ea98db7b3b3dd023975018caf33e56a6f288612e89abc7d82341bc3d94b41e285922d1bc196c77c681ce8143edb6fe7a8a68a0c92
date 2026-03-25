import { WeaviateUserTypeDB as UserTypeDB, WeaviateUserTypeInternal } from '../openapi/types.js';
import { Role } from '../roles/types.js';
export type User = {
    id: string;
    roles?: Role[];
};
export type UserDB = {
    userType: UserTypeDB;
    id: string;
    roleNames: string[];
    active: boolean;
    createdAt?: Date;
    lastUsedAt?: Date;
    apiKeyFirstLetters?: string;
};
/** Optional arguments to /user/{type}/{username} enpoint. */
export type GetAssignedRolesOptions = {
    includePermissions?: boolean;
};
/** Optional arguments to /assign and /revoke endpoints. */
export type AssignRevokeOptions = {
    userType?: WeaviateUserTypeInternal;
};
/** Optional arguments to /deactivate endpoint. */
export type DeactivateOptions = {
    revokeKey?: boolean;
};
/** Optional arguments to /users and /users/<id> endpoints. */
export type GetUserOptions = {
    includeLastUsedTime?: boolean;
};
