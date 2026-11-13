import { computed, ref } from 'vue';

/**
 * The budget coverage caption in the usage-and-limits panel explains which
 * costs the limits cover. A builder who has read it once does not need it on
 * every visit. `sessionStorage`-backed so it survives a reload but clears
 * when the tab closes.
 */
const STORAGE_KEY = 'N8N_AGENT_BUDGET_COVERAGE_CALLOUT_DISMISSED';

const version = ref(0);

export function useBudgetCoverageCalloutDismissal() {
	const dismissed = computed(() => {
		void version.value;
		return sessionStorage.getItem(STORAGE_KEY) === 'true';
	});

	function dismiss() {
		sessionStorage.setItem(STORAGE_KEY, 'true');
		version.value++;
	}

	return { dismissed, dismiss };
}
