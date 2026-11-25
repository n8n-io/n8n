import { $d as init_runtime_core_esm_bundler, Rd as computed, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { AN as i18n, EA as STORES, GS as EnterpriseEditionFeature, Tm as setWorkflowSharedWith, Wp as useWorkflowsListStore, bC as useRootStore, hm as splitName, yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/app/stores/workflows.ee.store.ts
init_runtime_core_esm_bundler();
var useWorkflowsEEStore = defineStore(STORES.WORKFLOWS_EE, () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const workflowsListStore = useWorkflowsListStore();
	const getWorkflowOwnerName = computed(() => {
		return (workflowId, fallback = i18n.baseText("workflows.shareModal.info.sharee.fallback")) => {
			const workflow = workflowsListStore.getWorkflowById(workflowId);
			const { name, email } = splitName(workflow?.homeProject?.name ?? "");
			const trimmedName = name?.replace(/\s+/g, " ")?.trim();
			return trimmedName ? email ? `${trimmedName} (${email})` : trimmedName : email ?? fallback;
		};
	});
	const setWorkflowSharedWith$1 = (payload) => {
		workflowsListStore.updateWorkflowInCache(payload.workflowId, { sharedWithProjects: payload.sharedWithProjects });
	};
	const saveWorkflowSharedWith = async (payload) => {
		if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]) {
			await setWorkflowSharedWith(rootStore.restApiContext, payload.workflowId, { shareWithIds: payload.sharedWithProjects.map((p) => p.id) });
			setWorkflowSharedWith$1(payload);
		}
	};
	return {
		getWorkflowOwnerName,
		setWorkflowSharedWith: setWorkflowSharedWith$1,
		saveWorkflowSharedWith
	};
});
//#endregion
export { useWorkflowsEEStore as t };
