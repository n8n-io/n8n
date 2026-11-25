import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Yo as useRoute, zf as reactive } from "./vendor-Hx42-oQF.js";
import { L as isInboxRoute, fC as VIEWS } from "./app-D5flEmb-.js";
//#region src/features/collaboration/projects/composables/useProjectPages.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* This composable holds reusable logic that detects the current page type
*/
var useProjectPages = () => {
	const route = useRoute();
	const isProjectsSubPage = computed(() => route.params?.projectId !== void 0);
	const isOverviewSubPage = computed(() => route.params?.projectId === void 0);
	const isSharedSubPage = computed(() => route.name === VIEWS.SHARED_WITH_ME || route.name === VIEWS.SHARED_WORKFLOWS || route.name === VIEWS.SHARED_CREDENTIALS);
	const isWorkflowReviewsSubPage = computed(() => isInboxRoute(route));
	return reactive({
		isOverviewSubPage,
		isSharedSubPage,
		isProjectsSubPage,
		isWorkflowReviewsSubPage
	});
};
//#endregion
export { useProjectPages as t };
