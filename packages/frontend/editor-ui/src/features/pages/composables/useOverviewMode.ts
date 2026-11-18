import { usePageStore } from '@n8n/frontend-module-page';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useIsPageModuleActive } from './useIsPageModuleActive';

export const OVERVIEW_MODES = ['list', 'docs'] as const;
export type OverviewMode = (typeof OVERVIEW_MODES)[number];

/** The query parameter that holds the mode that the user chose. */
export const OVERVIEW_MODE_QUERY_PARAMETER = 'view';

function isOverviewMode(value: unknown): value is OverviewMode {
	return OVERVIEW_MODES.some((mode) => mode === value);
}

/**
 * Gives the mode of the overview of the open project, or of all projects when the route has no project.
 * `mode` is the choice of the user from the address. Without a choice it is `docs` when a workflow has a page, and `list` when none has.
 * It is always `list` when the instance has no pages.
 * `loadDocumentation` reads the documentation overview, which the default needs. A failure keeps the `list` default.
 */
export function useOverviewMode() {
	const route = useRoute();
	const router = useRouter();
	const pageStore = usePageStore();
	const isPageModuleActive = useIsPageModuleActive();

	const projectId = computed(() =>
		typeof route.params.projectId === 'string' ? route.params.projectId : undefined,
	);
	const workflows = computed(() => pageStore.overviewOf(projectId.value)?.workflows ?? []);
	const hasDocumentation = computed(() =>
		workflows.value.some((workflow) => workflow.page !== undefined),
	);
	const undocumentedWorkflows = computed(() =>
		workflows.value
			.filter((workflow) => workflow.page === undefined)
			.map(({ id, name }) => ({ id, name })),
	);

	const defaultMode = computed<OverviewMode>(() => (hasDocumentation.value ? 'docs' : 'list'));
	const chosenMode = computed(() => route.query[OVERVIEW_MODE_QUERY_PARAMETER]);
	const mode = computed<OverviewMode>(() => {
		if (!isPageModuleActive.value) {
			return 'list';
		}
		return isOverviewMode(chosenMode.value) ? chosenMode.value : defaultMode.value;
	});

	async function setMode(newMode: OverviewMode): Promise<void> {
		await router.replace({ query: { ...route.query, [OVERVIEW_MODE_QUERY_PARAMETER]: newMode } });
	}

	async function loadDocumentation(): Promise<void> {
		if (isPageModuleActive.value) {
			await pageStore.fetchOverview(projectId.value).catch(() => undefined);
		}
	}

	return {
		isPageModuleActive,
		projectId,
		mode,
		hasDocumentation,
		undocumentedWorkflows,
		setMode,
		loadDocumentation,
	};
}
