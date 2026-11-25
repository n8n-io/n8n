import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { Gi as getInstanceAiCredits, bC as useRootStore } from "./app-D5flEmb-.js";
//#region src/features/ai/instanceAi/assistantCredits.store.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The Assistant credits of the instance. Both Assistant runtimes use this store,
* so it holds no thread state. Each runtime keeps the credit total of its own
* threads. `fetchCredits` loads the balance, and the `updateInstanceAiCredits`
* push keeps it current. Login and logout reload the page, so it needs no reset.
*/
var useAssistantCreditsStore = defineStore("assistantCredits", () => {
	const rootStore = useRootStore();
	const creditsQuota = ref(void 0);
	const creditsClaimed = ref(void 0);
	const creditsRemaining = computed(() => {
		if (creditsQuota.value === void 0 || creditsClaimed.value === void 0 || creditsQuota.value === -1) return;
		return Math.max(0, creditsQuota.value - creditsClaimed.value);
	});
	const creditsPercentageRemaining = computed(() => {
		if (creditsQuota.value === void 0 || creditsQuota.value === -1 || creditsRemaining.value === void 0) return;
		if (creditsQuota.value === 0) return 0;
		return creditsRemaining.value / creditsQuota.value * 100;
	});
	const isLowCredits = computed(() => creditsPercentageRemaining.value !== void 0 && creditsPercentageRemaining.value <= 10);
	/** Send is blocked. A positive low balance stays a dismissible warning. */
	const isOutOfCredits = computed(() => creditsRemaining.value === 0);
	function setCredits(credits) {
		creditsQuota.value = credits.creditsQuota;
		creditsClaimed.value = credits.creditsClaimed;
	}
	async function fetchCredits() {
		try {
			setCredits(await getInstanceAiCredits(rootStore.restApiContext));
		} catch {}
	}
	return {
		creditsQuota,
		creditsClaimed,
		creditsRemaining,
		isLowCredits,
		isOutOfCredits,
		setCredits,
		fetchCredits
	};
});
//#endregion
export { useAssistantCreditsStore as t };
