import { computed } from 'vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

/**
 * The project of the open workflow. A saved workflow runs against its home project, so that
 * comes first. `currentProjectId` can come from a stale `?projectId=` in the URL.
 */
export function useWorkflowProjectId() {
	const projectsStore = useProjectsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	return computed(
		() =>
			workflowDocumentStore.value.homeProject?.id ??
			projectsStore.currentProjectId ??
			projectsStore.personalProject?.id,
	);
}
