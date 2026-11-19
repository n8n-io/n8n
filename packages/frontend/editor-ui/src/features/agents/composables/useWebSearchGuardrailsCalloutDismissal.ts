import { computed, ref } from 'vue';

/**
 * The native-web-search notice in the web search section explains that tool
 * guardrails do not cover it. A builder who has read it once does not need it
 * on every visit. `sessionStorage`-backed so it survives a reload but clears
 * when the tab closes.
 */
const STORAGE_KEY = 'N8N_AGENT_WEB_SEARCH_GUARDRAILS_CALLOUT_DISMISSED';

const version = ref(0);

export function useWebSearchGuardrailsCalloutDismissal() {
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
