import type { Project, User } from '@n8n/db';
import { PROJECT_OWNER_ROLE_SLUG, hasGlobalScope } from '@n8n/permissions';

import type { RemoteResourceOwner } from './resource-owner';

export class SourceControlContext {
	private readonly _hasAccessToAllProjects: boolean;

	private readonly authorizedProjectIds: Set<string>;

	private readonly authorizedProjectsByTeamId = new Map<string, Project>();

	private readonly authorizedProjectsByOwnerEmail = new Map<string, Project>();

	constructor(
		readonly user: User,
		readonly authorizedProjects: Project[],
		readonly accessibleWorkflowIds: string[],
	) {
		this._hasAccessToAllProjects = hasGlobalScope(this.user, 'project:update');
		this.authorizedProjectIds = new Set(this.authorizedProjects.map((project) => project.id));
		for (const project of this.authorizedProjects) {
			if (project.type === 'team') {
				this.authorizedProjectsByTeamId.set(project.id, project);
			}
			if (project.type === 'personal') {
				const ownerEmail = project.projectRelations?.find(
					(relation) => relation.role.slug === PROJECT_OWNER_ROLE_SLUG,
				)?.user?.email;
				if (ownerEmail) {
					this.authorizedProjectsByOwnerEmail.set(ownerEmail, project);
				}
			}
		}
	}

	hasAccessToAllProjects() {
		return this._hasAccessToAllProjects;
	}

	canAccessProject(projectId: string) {
		return this._hasAccessToAllProjects || this.authorizedProjectIds.has(projectId);
	}

	findAuthorizedProjectByOwner(owner: RemoteResourceOwner) {
		if (typeof owner === 'string') {
			return this.authorizedProjectsByOwnerEmail.get(owner);
		}
		if (owner.type === 'personal') {
			return this.authorizedProjectsByOwnerEmail.get(owner.personalEmail);
		}
		return this.authorizedProjectsByTeamId.get(owner.teamId);
	}
}
