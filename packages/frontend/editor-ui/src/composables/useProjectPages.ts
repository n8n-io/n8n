import { computed, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
/**
 * This composable holds reusable logic that detects the current page type
 */
export const useProjectPages = () => {
	const route = useRoute();

	// Project pages have a projectId in the route params
	const isProjectsSubPage = computed(() => route.params?.projectId !== undefined);

	// Overview pages don't
	const isOverviewSubPage = computed(() => route.params?.projectId === undefined);

	// Shared pages are identified by specific route names
	const isSharedSubPage = computed(
		() =>
			route.name === VIEWS.SHARED_WITH_ME ||
			route.name === VIEWS.SHARED_WORKFLOWS ||
			route.name === VIEWS.SHARED_CREDENTIALS,
	);

	return reactive({
		isOverviewSubPage,
		isSharedSubPage,
		isProjectsSubPage,
	});
};
