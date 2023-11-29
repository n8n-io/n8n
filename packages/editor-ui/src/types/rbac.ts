import type { EnterpriseEditionFeature } from '@/constants';
import type { Resource, ScopeOptions, Scope } from '@n8n/permissions';
import type { IRole } from '@/Interface';

export type AuthenticatedPermissionOptions = {};
export type CustomPermissionOptions<C = {}> = RBACPermissionCheck<C>;
export type DefaultUserMiddlewareOptions = {};
export type EnterprisePermissionOptions = {
	feature?: EnterpriseEditionFeature | EnterpriseEditionFeature[];
	mode?: 'oneOf' | 'allOf';
};
export type GuestPermissionOptions = {};
export type RBACPermissionOptions = {
	scope?: Scope | Scope[];
	projectId?: string;
	resourceType?: Resource;
	resourceId?: string;
	options?: ScopeOptions;
};
export type RolePermissionOptions = IRole[];

export type PermissionType =
	| 'authenticated'
	| 'custom'
	| 'defaultUser'
	| 'enterprise'
	| 'guest'
	| 'rbac'
	| 'role';
export type PermissionTypeOptions = {
	authenticated: AuthenticatedPermissionOptions;
	custom: CustomPermissionOptions;
	defaultUser: DefaultUserMiddlewareOptions;
	enterprise: EnterprisePermissionOptions;
	guest: GuestPermissionOptions;
	rbac: RBACPermissionOptions;
	role: RolePermissionOptions;
};

export interface RBACPermissionCheck<Options> {
	(options?: Options): boolean;
}
