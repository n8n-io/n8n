import type { Project, User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';

export class SourceControlContext {
	private authorizedProjectsPromise: Promise<Project[]> | undefined;
	private accessibleWorkflowIdsPromise: Promise<string[]> | undefined;

	constructor(private readonly userInternal: User) {}

	get user() {
		return this.userInternal;
	}

	hasAccessToAllProjects() {
		return hasGlobalScope(this.userInternal, 'project:update');
	}

	/**
	 * Returns a cached promise for authorized projects, or creates one using the factory.
	 * The promise itself is cached, so concurrent callers share the same in-flight query.
	 */
	getOrFetchAuthorizedProjects(factory: () => Promise<Project[]>): Promise<Project[]> {
		if (!this.authorizedProjectsPromise) {
			this.authorizedProjectsPromise = factory();
		}
		return this.authorizedProjectsPromise;
	}

	/**
	 * Returns a cached promise for accessible workflow IDs, or creates one using the factory.
	 */
	getOrFetchAccessibleWorkflowIds(factory: () => Promise<string[]>): Promise<string[]> {
		if (!this.accessibleWorkflowIdsPromise) {
			this.accessibleWorkflowIdsPromise = factory();
		}
		return this.accessibleWorkflowIdsPromise;
	}
}
