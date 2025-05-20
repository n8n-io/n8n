import type {
	CredentialsEntity,
	Folder,
	Project,
	User,
	WorkflowEntity,
	WorkflowTagMapping,
} from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import type { FindOptionsWhere } from '@n8n/typeorm';

export class SourceControlContext {
	constructor(private readonly userInternal: User) {}

	get user() {
		return this.userInternal;
	}

	accessToAllProjects() {
		return hasGlobalScope(this.userInternal, 'project:read');
	}
}
