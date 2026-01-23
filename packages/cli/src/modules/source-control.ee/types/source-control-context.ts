import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';

export class SourceControlContext {
	constructor(private readonly userInternal: User) {}

	get user() {
		return this.userInternal;
	}

	hasAccessToAllProjects() {
		return hasGlobalScope(this.userInternal, 'project:update');
	}
}
