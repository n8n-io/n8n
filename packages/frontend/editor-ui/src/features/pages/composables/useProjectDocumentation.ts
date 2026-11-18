import { usePageStore } from '@n8n/frontend-module-page';
import { computed } from 'vue';

import { useOverviewMode } from './useOverviewMode';

/**
 * Tells how far the documentation of the open project is, or of all projects when the route has no project.
 * `hasDocumentation` is true when at least one workflow has a page. It is false until `loadDocumentation` resolved.
 * `undocumentedWorkflows` lists the workflows without a page.
 * `loadDocumentation` reads the documentation overview. It does nothing when the instance has no pages, and a failure keeps the last state.
 */
export function useProjectDocumentation() {
	const pageStore = usePageStore();
	const { isPageModuleActive, projectId } = useOverviewMode();

	const workflows = computed(() => pageStore.overviewOf(projectId.value)?.workflows ?? []);
	const hasDocumentation = computed(() =>
		workflows.value.some((workflow) => workflow.page !== undefined),
	);
	const undocumentedWorkflows = computed(() =>
		workflows.value
			.filter((workflow) => workflow.page === undefined)
			.map(({ id, name }) => ({ id, name })),
	);

	async function loadDocumentation(): Promise<void> {
		if (isPageModuleActive.value) {
			await pageStore.fetchOverview(projectId.value).catch(() => undefined);
		}
	}

	return { projectId, hasDocumentation, undocumentedWorkflows, loadDocumentation };
}
