export type * from './types.ee';
export * from './constants.ee';

export * from './roles/scopes/global-scopes.ee';
export * from './scope-information';
export * from './roles/role-maps.ee';
export * from './roles/all-roles';

export { projectRoleSchema } from './schemas.ee';

export { hasScope } from './utilities/has-scope.ee';
export { hasGlobalScope } from './utilities/has-global-scope.ee';
export { combineScopes } from './utilities/combine-scopes.ee';
export { rolesWithScope } from './utilities/roles-with-scope.ee';
export { getGlobalScopes } from './utilities/get-global-scopes.ee';
export { getRoleScopes } from './utilities/get-role-scopes.ee';
export { getResourcePermissions } from './utilities/get-resource-permissions.ee';
export type { PermissionsRecord } from './utilities/get-resource-permissions.ee';
export * from './public-api-permissions.ee';
