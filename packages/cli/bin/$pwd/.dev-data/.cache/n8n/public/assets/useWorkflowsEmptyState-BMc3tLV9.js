import { $d as init_runtime_core_esm_bundler, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { CS as CREDENTIALS_APP_SELECTION_EXPERIMENT, EA as STORES, Mp as useCredentialsStore, SN as _plugin_vue_export_helper_default, bm as useSourceControlStore, hC as useTelemetry, jN as useI18n, mC as useCloudPlanStore, nD as getResourcePermissions, pC as useStorage, tN as N8nLoading_default, vm as useProjectsStore, vy as usePostHog } from "./app-D5flEmb-.js";
//#region src/app/components/layouts/ResourcesListLoadingState.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ResourcesListLoadingState_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ResourcesListLoadingState",
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createVNode(unref(N8nLoading_default), {
				rows: 3,
				variant: "p"
			})], 2);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_wwumi_1" } }]]);
//#endregion
//#region src/experiments/credentialsAppSelection/stores/credentialsAppSelection.store.ts
init_runtime_core_esm_bundler();
var APP_SELECTION_DISMISSED_KEY = "N8N_APP_SELECTION_DISMISSED";
var useCredentialsAppSelectionStore = defineStore(STORES.EXPERIMENT_CREDENTIALS_APP_SELECTION, () => {
	const posthogStore = usePostHog();
	const credentialsStore = useCredentialsStore();
	const cloudPlanStore = useCloudPlanStore();
	const telemetry = useTelemetry();
	const dismissedStorage = useStorage(APP_SELECTION_DISMISSED_KEY);
	const isDismissed = computed(() => dismissedStorage.value === "true");
	const currentVariant = computed(() => posthogStore.getVariant(CREDENTIALS_APP_SELECTION_EXPERIMENT.name));
	const isVariant = computed(() => currentVariant.value === CREDENTIALS_APP_SELECTION_EXPERIMENT.variant);
	const userIsTrialing = computed(() => cloudPlanStore.userIsTrialing);
	const isFeatureEnabled = computed(() => {
		if (isDismissed.value) return false;
		if (!isVariant.value || !userIsTrialing.value) return false;
		return true;
	});
	const connectedCount = computed(() => credentialsStore.allCredentials.length);
	const canContinue = computed(() => connectedCount.value > 0);
	function trackPageViewed() {
		telemetry.track("App selection page viewed");
	}
	function trackSearchPerformed(searchTerm, resultCount) {
		telemetry.track("App selection search performed", {
			search_term: searchTerm,
			result_count: resultCount
		});
	}
	function dismiss() {
		dismissedStorage.value = "true";
	}
	function trackCompleted(connectedApps) {
		telemetry.track("App selection completed", {
			connected_count: connectedCount.value,
			connected_apps: connectedApps
		});
		dismiss();
	}
	function reset() {
		dismissedStorage.value = null;
	}
	return {
		currentVariant,
		isFeatureEnabled,
		isDismissed,
		connectedCount,
		canContinue,
		trackPageViewed,
		trackSearchPerformed,
		trackCompleted,
		dismiss,
		reset
	};
});
//#endregion
//#region src/features/workflows/composables/useWorkflowsEmptyState.ts
init_runtime_core_esm_bundler();
/**
* Composable for managing workflows empty state display logic.
* Handles heading, description, and permission-based visibility
* for the empty state when no workflows exist.
*/
function useWorkflowsEmptyState() {
	const i18n = useI18n();
	const projectsStore = useProjectsStore();
	const sourceControlStore = useSourceControlStore();
	const credentialsAppSelectionStore = useCredentialsAppSelectionStore();
	const personalProject = computed(() => projectsStore.personalProject);
	const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);
	const projectPermissions = computed(() => {
		return getResourcePermissions(projectsStore.currentProject?.scopes ?? personalProject.value?.scopes);
	});
	const canCreateWorkflow = computed(() => !readOnlyEnv.value && projectPermissions.value.workflow.create);
	return {
		showAppSelection: computed(() => {
			return credentialsAppSelectionStore.isFeatureEnabled && !readOnlyEnv.value && projectPermissions.value.workflow.create;
		}),
		emptyStateHeading: computed(() => i18n.baseText("workflows.empty.onboarding.heading")),
		emptyStateDescription: computed(() => {
			if (readOnlyEnv.value) return i18n.baseText("workflows.empty.description.readOnlyEnv");
			else if (!projectPermissions.value.workflow.create) return i18n.baseText("workflows.empty.description.noPermission");
			return "";
		}),
		canCreateWorkflow,
		readOnlyEnv,
		projectPermissions
	};
}
//#endregion
export { useCredentialsAppSelectionStore as n, ResourcesListLoadingState_default as r, useWorkflowsEmptyState as t };
