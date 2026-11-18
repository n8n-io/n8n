import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useIsPageModuleActive } from './useIsPageModuleActive';

export type OverviewMode = 'list' | 'docs';

/** The query parameter that holds the mode of the overview. */
export const OVERVIEW_MODE_QUERY_PARAMETER = 'view';

/** The value of the query parameter that asks for the documentation board. */
export const DOCUMENTATION_OVERVIEW_MODE = 'docs';

/**
 * Gives the mode of the overview of the open project, or of all projects when the route has no project.
 * `mode` is `docs` when the address asks for the documentation board and the instance has pages. It is `list` in each other case.
 */
export function useOverviewMode() {
	const route = useRoute();
	const isPageModuleActive = useIsPageModuleActive();

	const projectId = computed(() =>
		typeof route.params.projectId === 'string' ? route.params.projectId : undefined,
	);
	const asksForDocumentation = computed(
		() => route.query[OVERVIEW_MODE_QUERY_PARAMETER] === DOCUMENTATION_OVERVIEW_MODE,
	);
	const mode = computed<OverviewMode>(() =>
		isPageModuleActive.value && asksForDocumentation.value ? 'docs' : 'list',
	);

	return { isPageModuleActive, projectId, mode };
}
