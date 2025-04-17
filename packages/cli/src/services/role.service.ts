import type { ProjectRole } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { combineScopes } from '@n8n/permissions';
import type { GlobalRole, Resource, Scope } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import type { ProjectRelation } from '@/databases/entities/project-relation';
import type {
	CredentialSharingRole,
	SharedCredentials,
} from '@/databases/entities/shared-credentials';
import type { SharedWorkflow, WorkflowSharingRole } from '@/databases/entities/shared-workflow';
import type { User } from '@/databases/entities/user';
import { License } from '@/license';
import {
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	GLOBAL_OWNER_SCOPES,
} from '@/permissions.ee/global-roles';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/permissions.ee/project-roles';
import {
	CREDENTIALS_SHARING_OWNER_SCOPES,
	CREDENTIALS_SHARING_USER_SCOPES,
	WORKFLOW_SHARING_EDITOR_SCOPES,
	WORKFLOW_SHARING_OWNER_SCOPES,
} from '@/permissions.ee/resource-roles';
import type { ListQuery } from '@/requests';

export type RoleNamespace = 'global' | 'project' | 'credential' | 'workflow';

const GLOBAL_SCOPE_MAP: Record<GlobalRole, Scope[]> = {
	'global:owner': GLOBAL_OWNER_SCOPES,
	'global:admin': GLOBAL_ADMIN_SCOPES,
	'global:member': GLOBAL_MEMBER_SCOPES,
};

const PROJECT_SCOPE_MAP: Record<ProjectRole, Scope[]> = {
	'project:admin': REGULAR_PROJECT_ADMIN_SCOPES,
	'project:personalOwner': PERSONAL_PROJECT_OWNER_SCOPES,
	'project:editor': PROJECT_EDITOR_SCOPES,
	'project:viewer': PROJECT_VIEWER_SCOPES,
};

const CREDENTIALS_SHARING_SCOPE_MAP: Record<CredentialSharingRole, Scope[]> = {
	'credential:owner': CREDENTIALS_SHARING_OWNER_SCOPES,
	'credential:user': CREDENTIALS_SHARING_USER_SCOPES,
};

const WORKFLOW_SHARING_SCOPE_MAP: Record<WorkflowSharingRole, Scope[]> = {
	'workflow:owner': WORKFLOW_SHARING_OWNER_SCOPES,
	'workflow:editor': WORKFLOW_SHARING_EDITOR_SCOPES,
};

interface AllMaps {
	global: Record<GlobalRole, Scope[]>;
	project: Record<ProjectRole, Scope[]>;
	credential: Record<CredentialSharingRole, Scope[]>;
	workflow: Record<WorkflowSharingRole, Scope[]>;
}

const ALL_MAPS: AllMaps = {
	global: GLOBAL_SCOPE_MAP,
	project: PROJECT_SCOPE_MAP,
	credential: CREDENTIALS_SHARING_SCOPE_MAP,
	workflow: WORKFLOW_SHARING_SCOPE_MAP,
} as const;

const COMBINED_MAP = Object.fromEntries(
	Object.values(ALL_MAPS).flatMap((o: Record<string, Scope[]>) => Object.entries(o)),
) as Record<GlobalRole | ProjectRole | CredentialSharingRole | WorkflowSharingRole, Scope[]>;

export interface RoleMap {
	global: GlobalRole[];
	project: ProjectRole[];
	credential: CredentialSharingRole[];
	workflow: WorkflowSharingRole[];
}
export type AllRoleTypes = GlobalRole | ProjectRole | WorkflowSharingRole | CredentialSharingRole;

const ROLE_NAMES: Record<
	GlobalRole | ProjectRole | WorkflowSharingRole | CredentialSharingRole,
	string
> = {
	'global:owner': 'Owner',
	'global:admin': 'Admin',
	'global:member': 'Member',
	'project:personalOwner': 'Project Owner',
	'project:admin': 'Project Admin',
	'project:editor': 'Project Editor',
	'project:viewer': 'Project Viewer',
	'credential:user': 'Credential User',
	'credential:owner': 'Credential Owner',
	'workflow:owner': 'Workflow Owner',
	'workflow:editor': 'Workflow Editor',
};

export type ScopesField = { scopes: Scope[] };

@Service()
export class RoleService {
	constructor(private readonly license: License) {}

	rolesWithScope(namespace: 'global', scopes: Scope | Scope[]): GlobalRole[];
	rolesWithScope(namespace: 'project', scopes: Scope | Scope[]): ProjectRole[];
	rolesWithScope(namespace: 'credential', scopes: Scope | Scope[]): CredentialSharingRole[];
	rolesWithScope(namespace: 'workflow', scopes: Scope | Scope[]): WorkflowSharingRole[];
	rolesWithScope(namespace: RoleNamespace, scopes: Scope | Scope[]) {
		if (!Array.isArray(scopes)) {
			scopes = [scopes];
		}

		return Object.keys(ALL_MAPS[namespace]).filter((k) => {
			return scopes.every((s) =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
				((ALL_MAPS[namespace] as any)[k] as Scope[]).includes(s),
			);
		});
	}

	getRoles(): RoleMap {
		return Object.fromEntries(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			Object.entries(ALL_MAPS).map((e) => [e[0], Object.keys(e[1])]),
		) as unknown as RoleMap;
	}

	getRoleName(role: AllRoleTypes): string {
		return ROLE_NAMES[role];
	}

	getRoleScopes(
		role: GlobalRole | ProjectRole | WorkflowSharingRole | CredentialSharingRole,
		filters?: Resource[],
	): Scope[] {
		let scopes = COMBINED_MAP[role];
		if (filters) {
			scopes = scopes.filter((s) => filters.includes(s.split(':')[0] as Resource));
		}
		return scopes;
	}

	/**
	 * Find all distinct scopes in a set of project roles.
	 */
	getScopesBy(projectRoles: Set<ProjectRole>) {
		return [...projectRoles].reduce<Set<Scope>>((acc, projectRole) => {
			for (const scope of PROJECT_SCOPE_MAP[projectRole] ?? []) {
				acc.add(scope);
			}

			return acc;
		}, new Set());
	}

	addScopes(
		rawWorkflow: ListQuery.Workflow.WithSharing | ListQuery.Workflow.WithOwnedByAndSharedWith,
		user: User,
		userProjectRelations: ProjectRelation[],
	): ListQuery.Workflow.WithScopes;
	addScopes(
		rawCredential: CredentialsEntity,
		user: User,
		userProjectRelations: ProjectRelation[],
	): CredentialsEntity & ScopesField;
	addScopes(
		rawCredential:
			| ListQuery.Credentials.WithSharing
			| ListQuery.Credentials.WithOwnedByAndSharedWith,
		user: User,
		userProjectRelations: ProjectRelation[],
	): ListQuery.Credentials.WithScopes;
	addScopes(
		rawEntity:
			| CredentialsEntity
			| ListQuery.Workflow.WithSharing
			| ListQuery.Credentials.WithOwnedByAndSharedWith
			| ListQuery.Credentials.WithSharing
			| ListQuery.Workflow.WithOwnedByAndSharedWith,
		user: User,
		userProjectRelations: ProjectRelation[],
	):
		| (CredentialsEntity & ScopesField)
		| ListQuery.Workflow.WithScopes
		| ListQuery.Credentials.WithScopes {
		const shared = rawEntity.shared;
		const entity = rawEntity as ListQuery.Workflow.WithScopes | ListQuery.Credentials.WithScopes;

		Object.assign(entity, {
			scopes: [],
		});

		if (shared === undefined) {
			return entity;
		}

		if (!('active' in entity) && !('type' in entity)) {
			throw new UnexpectedError('Cannot detect if entity is a workflow or credential.');
		}

		entity.scopes = this.combineResourceScopes(
			'active' in entity ? 'workflow' : 'credential',
			user,
			shared,
			userProjectRelations,
		);

		return entity;
	}

	combineResourceScopes(
		type: 'workflow' | 'credential',
		user: User,
		shared: SharedCredentials[] | SharedWorkflow[],
		userProjectRelations: ProjectRelation[],
	): Scope[] {
		const globalScopes = this.getRoleScopes(user.role, [type]);
		const scopesSet: Set<Scope> = new Set(globalScopes);
		for (const sharedEntity of shared) {
			const pr = userProjectRelations.find(
				(p) => p.projectId === (sharedEntity.projectId ?? sharedEntity.project.id),
			);
			let projectScopes: Scope[] = [];
			if (pr) {
				projectScopes = this.getRoleScopes(pr.role);
			}
			const resourceMask = this.getRoleScopes(sharedEntity.role);
			const mergedScopes = combineScopes(
				{
					global: globalScopes,
					project: projectScopes,
				},
				{ sharing: resourceMask },
			);
			mergedScopes.forEach((s) => scopesSet.add(s));
		}
		return [...scopesSet].sort();
	}

	isRoleLicensed(role: AllRoleTypes) {
		switch (role) {
			case 'project:admin':
				return this.license.isProjectRoleAdminLicensed();
			case 'project:editor':
				return this.license.isProjectRoleEditorLicensed();
			case 'project:viewer':
				return this.license.isProjectRoleViewerLicensed();
			case 'global:admin':
				return this.license.isAdvancedPermissionsLicensed();
			default:
				return true;
		}
	}
}
