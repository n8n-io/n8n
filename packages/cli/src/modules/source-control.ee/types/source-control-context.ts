import type { Project, User } from '@n8n/db';

export class SourceControlContext {
	readonly isAdmin: boolean;

	constructor(
		readonly user: User,
		readonly authorizedProjects: Project[],
		readonly accessibleWorkflowIds: string[],
		isAdmin: boolean,
	) {
		this.isAdmin = isAdmin;
	}
}
