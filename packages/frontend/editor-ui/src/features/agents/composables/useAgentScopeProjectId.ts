import { computed } from 'vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

/**
 * Project scope for reading/writing the agent referenced from a workflow.
 *
 * Every surface that touches the referenced agent (the picker, the canvas
 * agent card, the NDV orchestrator) MUST resolve the same project so they all
 * read/write the same agent record. Falls back to the workflow's home project
 * (shared personal workflows have no `currentProject`) and finally the
 * personal project, mirroring how execution resolves the agent's owning
 * project.
 */
export function useAgentScopeProjectId() {
	const projectsStore = useProjectsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	return computed(
		() =>
			projectsStore.currentProjectId ??
			workflowDocumentStore.value?.homeProject?.id ??
			projectsStore.personalProject?.id ??
			'',
	);
}
