import type { Scope } from '@n8n/permissions';

export type GlobalRole = 'global:owner' | 'global:admin' | 'global:member';
export type ProjectRole =
	| 'project:personalOwner'
	| 'project:admin'
	| 'project:editor'
	| 'project:viewer';
export type CredentialSharingRole = 'credential:owner' | 'credential:user';
export type WorkflowSharingRole = 'workflow:owner' | 'workflow:editor';

export type RoleObject<
	T extends GlobalRole | ProjectRole | CredentialSharingRole | WorkflowSharingRole,
> = {
	role: T;
	name: string;
	scopes: Scope[];
	licensed: boolean;
};
export type RoleMap = {
	global: Array<RoleObject<GlobalRole>>;
	project: Array<RoleObject<ProjectRole>>;
	credential: Array<RoleObject<CredentialSharingRole>>;
	workflow: Array<RoleObject<WorkflowSharingRole>>;
};
