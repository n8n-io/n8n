import { Service } from '@n8n/di';
import { combineScopes, getRoleScopes } from '@n8n/permissions';
import type { Scope } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import type { ProjectRelation } from '@/databases/entities/project-relation';
import type { SharedCredentials } from '@/databases/entities/shared-credentials';
import type { SharedWorkflow } from '@/databases/entities/shared-workflow';
import type { User } from '@/databases/entities/user';
import type { ListQueryDb, ScopesField } from '@/types-db';

@Service()
export class RoleService {
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
}
