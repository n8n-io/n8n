import type {
	CredentialsEntity,
	SharedCredentials,
	SharedWorkflow,
	User,
	ListQueryDb,
	ScopesField,
	ProjectRelation,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { AllRoleTypes, Scope } from '@n8n/permissions';
import { ALL_ROLES, combineScopes, getRoleScopes } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import { License } from '@/license';

@Service()
export class RoleService {
	constructor(private readonly license: License) {}

	getAllRoles() {
		Object.values(ALL_ROLES).forEach((entries) => {
			entries.forEach((entry) => {
				entry.licensed = this.isRoleLicensed(entry.role);
			});
		});
		return ALL_ROLES;
	}

	addScopes(
		rawWorkflow: ListQueryDb.Workflow.WithSharing | ListQueryDb.Workflow.WithOwnedByAndSharedWith,
		user: User,
		userProjectRelations: ProjectRelation[],
	): ListQueryDb.Workflow.WithScopes;
	addScopes(
		rawCredential: CredentialsEntity,
		user: User,
		userProjectRelations: ProjectRelation[],
	): CredentialsEntity & ScopesField;
	addScopes(
		rawCredential:
			| ListQueryDb.Credentials.WithSharing
			| ListQueryDb.Credentials.WithOwnedByAndSharedWith,
		user: User,
		userProjectRelations: ProjectRelation[],
	): ListQueryDb.Credentials.WithScopes;
	addScopes(
		rawEntity:
			| CredentialsEntity
			| ListQueryDb.Workflow.WithSharing
			| ListQueryDb.Credentials.WithOwnedByAndSharedWith
			| ListQueryDb.Credentials.WithSharing
			| ListQueryDb.Workflow.WithOwnedByAndSharedWith,
		user: User,
		userProjectRelations: ProjectRelation[],
	):
		| (CredentialsEntity & ScopesField)
		| ListQueryDb.Workflow.WithScopes
		| ListQueryDb.Credentials.WithScopes {
		const shared = rawEntity.shared;
		const entity = rawEntity as
			| (CredentialsEntity & ScopesField)
			| ListQueryDb.Workflow.WithScopes
			| ListQueryDb.Credentials.WithScopes;

		entity.scopes = [];

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
		const globalScopes = getRoleScopes(user.role, [type]);
		const scopesSet: Set<Scope> = new Set(globalScopes);
		for (const sharedEntity of shared) {
			const pr = userProjectRelations.find(
				(p) => p.projectId === (sharedEntity.projectId ?? sharedEntity.project.id),
			);
			let projectScopes: Scope[] = [];
			if (pr) {
				projectScopes = getRoleScopes(pr.role);
			}
			const resourceMask = getRoleScopes(sharedEntity.role);
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
		// TODO: move this info into FrontendSettings
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
