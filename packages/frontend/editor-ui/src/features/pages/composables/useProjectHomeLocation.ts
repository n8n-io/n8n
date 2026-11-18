import type { RouteLocationRaw } from 'vue-router';

import { VIEWS } from '@/app/constants';

import { useIsPageModuleActive } from './useIsPageModuleActive';
import { DOCUMENTATION_OVERVIEW_MODE, OVERVIEW_MODE_QUERY_PARAMETER } from './useOverviewMode';

/**
 * Gives the function that builds the address of the first view of a project.
 * The first view is the documentation board when the instance has pages. It is the list of workflows in each other case.
 */
export function useProjectHomeLocation() {
	const isPageModuleActive = useIsPageModuleActive();

	return (projectId: string | undefined): RouteLocationRaw => ({
		name: VIEWS.PROJECTS_WORKFLOWS,
		params: { projectId },
		...(isPageModuleActive.value
			? { query: { [OVERVIEW_MODE_QUERY_PARAMETER]: DOCUMENTATION_OVERVIEW_MODE } }
			: {}),
	});
}
