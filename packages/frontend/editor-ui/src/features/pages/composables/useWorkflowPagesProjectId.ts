import { computed, type ComputedRef } from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

/**
 * Reads the project that holds the pages of the open workflow.
 * This is the home project of the workflow. A workflow that has none yet uses
 * the current project, then the personal project.
 */
export function useWorkflowPagesProjectId(): ComputedRef<string | undefined> {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const projectsStore = useProjectsStore();

	return computed(
		() =>
			workflowDocumentStore.value.homeProject?.id ??
			projectsStore.currentProjectId ??
			projectsStore.personalProject?.id,
	);
}
