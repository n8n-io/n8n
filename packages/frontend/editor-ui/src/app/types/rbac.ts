import type { Resource, ScopeOptions, Scope } from '@n8n/permissions';
import type { EnterpriseEditionFeatureValue } from '@/Interface';
import type { Role } from '@n8n/api-types';

export type AuthenticatedPermissionOptions = {
	bypass?: () => boolean;
};
export type CustomPermissionOptions<C = {}> = RBACPermissionCheck<C>;
export type DefaultUserMiddlewareOptions = {};
export type InstanceOwnerMiddlewareOptions = {};
export type EnterprisePermissionOptions = {
	feature?: EnterpriseEditionFeatureValue | EnterpriseEditionFeatureValue[];
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
export type RolePermissionOptions = Role[];

export type PermissionType =
	| 'authenticated'
	| 'custom'
	| 'defaultUser'
	| 'instanceOwner'
	| 'enterprise'
	| 'guest'
	| 'rbac'
	| 'role';
export type PermissionTypeOptions = {
	authenticated: AuthenticatedPermissionOptions;
	custom: CustomPermissionOptions;
	defaultUser: DefaultUserMiddlewareOptions;
	instanceOwner: InstanceOwnerMiddlewareOptions;
	enterprise: EnterprisePermissionOptions;
	guest: GuestPermissionOptions;
	rbac: RBACPermissionOptions;
	role: RolePermissionOptions;
};

export interface RBACPermissionCheck<Options> {
	(options?: Options): boolean;
}
