import { Nf as init_reactivity_esm_bundler, Vf as ref, lo as defineStore } from "./vendor-Hx42-oQF.js";
//#region src/features/agents/agentReturnContext.store.ts
init_reactivity_esm_bundler();
var useAgentReturnContextStore = defineStore("agentReturnContext", () => {
	const context = ref(null);
	const pendingArtifactReturn = ref(null);
	function set(ctx) {
		context.value = ctx;
	}
	function clear() {
		context.value = null;
	}
	function setPendingArtifactReturn(pending) {
		pendingArtifactReturn.value = pending;
	}
	function consumePendingArtifactReturn() {
		const pending = pendingArtifactReturn.value;
		pendingArtifactReturn.value = null;
		return pending;
	}
	return {
		context,
		pendingArtifactReturn,
		set,
		clear,
		setPendingArtifactReturn,
		consumePendingArtifactReturn
	};
});
//#endregion
export { useAgentReturnContextStore as t };
