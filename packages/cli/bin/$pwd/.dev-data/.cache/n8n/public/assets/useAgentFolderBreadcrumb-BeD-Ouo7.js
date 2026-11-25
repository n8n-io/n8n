import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Tf as watch, Vf as ref, Xo as useRouter } from "./vendor-Hx42-oQF.js";
import { Ph as PROJECT_AGENTS, bC as useRootStore, uc as getFolderPath, yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/features/agents/composables/useAgentFolderBreadcrumb.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
function useAgentFolderBreadcrumb(projectId, parentFolderId) {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const router = useRouter();
	const items = ref([]);
	watch([projectId, parentFolderId], async ([project, folderId], _, onCleanup) => {
		let current = true;
		onCleanup(() => {
			current = false;
		});
		items.value = [];
		if (!project || !folderId || !settingsStore.isFoldersFeatureEnabled) return;
		try {
			const tree = await getFolderPath(rootStore.restApiContext, project, folderId);
			const path = [];
			let node = tree[0];
			while (node) {
				path.push({
					id: node.id,
					label: node.name,
					href: router.resolve({
						name: PROJECT_AGENTS,
						params: { projectId: project },
						query: { folderId: node.id }
					}).href
				});
				node = node.children[0];
			}
			if (current) items.value = path;
		} catch {}
	}, { immediate: true });
	return items;
}
//#endregion
export { useAgentFolderBreadcrumb as t };
