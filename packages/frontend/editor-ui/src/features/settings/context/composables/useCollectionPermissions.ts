import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { useRBACStore } from '@n8n/stores/rbac.store';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

/** The one rule for who can rename, describe or delete a collection. */
export function useCollectionPermissions() {
	const projectsStore = useProjectsStore();
	const rbacStore = useRBACStore();

	// This permission will change once we have specific knowledge permissions
	const updateScope = 'agent:update';

	function projectScopes(projectId: string) {
		const personal = projectsStore.personalProject;
		if (personal?.id === projectId) {
			return personal.scopes;
		}

		return projectsStore.myProjects.find((project) => project.id === projectId)?.scopes;
	}

	// The server checks the update scope in the home project, or the global scope of an instance owner.
	function canChange(collection: KnowledgeCollectionDto): boolean {
		const hasGlobalScope = rbacStore.hasScope(updateScope);
		if (hasGlobalScope) {
			return true;
		}

		const scopes = projectScopes(collection.homeProject.id);
		return scopes?.includes(updateScope) === true;
	}

	return { canChange };
}
