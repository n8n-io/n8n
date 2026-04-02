import type { Project, User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';

export class SourceControlContext {
	private readonly _hasAccessToAllProjects: boolean;

	constructor(
		readonly user: User,
		readonly authorizedProjects: Project[],
		readonly accessibleWorkflowIds: string[],
	) {
		this._hasAccessToAllProjects = hasGlobalScope(this.user, 'project:update');
	}

	hasAccessToAllProjects() {
		return this._hasAccessToAllProjects;
	}
}
