import type { RouteLocationNormalized } from 'vue-router';
import { useFoldersStore } from '@/features/folders/folders.store';
import { useProjectPages } from '@/features/projects/composables/useProjectPages';
import { useRoute } from 'vue-router';

/**
 * Determines if the instance is truly empty and should show the simplified layout
 */
export function useEmptyStateDetection() {
	const foldersStore = useFoldersStore();
	const projectPages = useProjectPages();
	const route = useRoute();

	/**
	 * Checks if the current state qualifies as "truly empty"
	 * - No workflows exist in the instance
	 * - User is on the main workflows view (not in a specific folder)
	 * - User is on overview page or personal project workflows
	 * - No search filters are applied
	 * - Not currently refreshing data
	 */
	const isTrulyEmpty = (currentRoute: RouteLocationNormalized = route) => {
		const hasNoWorkflows = foldersStore.totalWorkflowCount === 0;
		const isNotInSpecificFolder = !currentRoute.params?.folderId;
		const isMainWorkflowsPage = projectPages.isOverviewSubPage || !projectPages.isSharedSubPage;

		// Check for any search or filter parameters that would indicate filtering is active
		const hasSearchQuery = !!currentRoute.query?.search;
		const hasFilters = !!(
			currentRoute.query?.status ||
			currentRoute.query?.tags ||
			currentRoute.query?.showArchived ||
			currentRoute.query?.homeProject
		);

		return (
			hasNoWorkflows &&
			isNotInSpecificFolder &&
			isMainWorkflowsPage &&
			!hasSearchQuery &&
			!hasFilters
		);
	};

	/**
	 * Checks if we're in a state where the simplified layout should be shown
	 * This matches the logic from ResourcesListLayout's showEmptyState computed property
	 */
	const shouldShowSimplifiedLayout = (
		currentRoute: RouteLocationNormalized,
		isFeatureEnabled: boolean,
		loading: boolean,
	) => {
		// Don't show simplified layout if loading or feature is disabled
		if (loading || !isFeatureEnabled) {
			return false;
		}

		return isTrulyEmpty(currentRoute);
	};

	return {
		isTrulyEmpty,
		shouldShowSimplifiedLayout,
	};
}
