import { $d as init_runtime_core_esm_bundler, Jf as toValue, Nf as init_reactivity_esm_bundler, Rd as computed } from "./vendor-Hx42-oQF.js";
import { pp as useNodeTypeRestriction, tp as useTypeAvailability, uf as useNodeTypesStore, vm as useProjectsStore } from "./app-D5flEmb-.js";
//#region src/features/ai/chatHub/composables/useChatToolRestriction.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/** Loads the policy that applies to chat tools. */
function useChatToolPolicy() {
	const projectsStore = useProjectsStore();
	return useTypeAvailability(() => projectsStore.personalProject?.id);
}
/** Loads the policy that applies to chat tools and reports whether `nodeType` is restricted. */
function useChatToolRestriction(nodeType) {
	const nodeTypesStore = useNodeTypesStore();
	useChatToolPolicy();
	const { isRestricted, restriction } = useNodeTypeRestriction(nodeType);
	return {
		isRestricted,
		restriction,
		typeName: computed(() => {
			const name = toValue(nodeType);
			if (!name) return "";
			return nodeTypesStore.getNodeType(name)?.displayName ?? name;
		})
	};
}
//#endregion
export { useChatToolRestriction as n, useChatToolPolicy as t };
