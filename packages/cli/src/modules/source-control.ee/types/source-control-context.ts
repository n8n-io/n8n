import type { Project, User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';

export class SourceControlContext {
	constructor(
		readonly user: User,
		readonly authorizedProjects: Project[],
		readonly accessibleWorkflowIds: string[],
	) {}

	hasAccessToAllProjects() {
		return hasGlobalScope(this.user, 'project:update');
	}
}
