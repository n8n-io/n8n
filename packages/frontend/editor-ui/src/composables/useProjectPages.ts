import { computed, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
import { getModuleRoutes } from '@/features/router.utils';

/**
 * This composable holds reusable logic that detects the current page type
 */
export const useProjectPages = () => {
	const route = useRoute();

	// Routes collected from modules:
	// 1. Project-specific routes
	const moduleProjectRouteNames = computed(() => {
		return getModuleRoutes()
			.filter((r) => r.meta?.projectRoute)
			.map((r1) => r1.name);
	});

	// 2. Overview routes (homepage)
	const moduleOverviewRouteNames = computed(() => {
		return getModuleRoutes()
			.filter((r) => !r.meta?.projectRoute)
			.map((r1) => r1.name);
	});

	const isOverviewSubPage = computed(
		() =>
			route.name === VIEWS.WORKFLOWS ||
			route.name === VIEWS.HOMEPAGE ||
			route.name === VIEWS.CREDENTIALS ||
			route.name === VIEWS.EXECUTIONS ||
			route.name === VIEWS.FOLDERS ||
			moduleOverviewRouteNames.value.includes(route.name),
	);

	const isSharedSubPage = computed(
		() =>
			route.name === VIEWS.SHARED_WITH_ME ||
			route.name === VIEWS.SHARED_WORKFLOWS ||
			route.name === VIEWS.SHARED_CREDENTIALS,
	);

	const isProjectsSubPage = computed(
		() =>
			route.name === VIEWS.PROJECTS_WORKFLOWS ||
			route.name === VIEWS.PROJECTS_CREDENTIALS ||
			route.name === VIEWS.PROJECTS_EXECUTIONS ||
			route.name === VIEWS.PROJECT_SETTINGS ||
			route.name === VIEWS.PROJECTS_FOLDERS ||
			moduleProjectRouteNames.value.includes(route.name),
	);

	return reactive({
		isOverviewSubPage,
		isSharedSubPage,
		isProjectsSubPage,
	});
};
