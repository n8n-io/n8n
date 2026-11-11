import { computed, ref } from 'vue';

/**
 * The "Practice run" reassurance banner shows under every expanded case
 * sample. Dismissing it from any one row should hide it everywhere else too
 * — a reviewer who already knows nothing is sent/saved/changed doesn't need
 * to be told again on the next row they expand. `sessionStorage`-backed so it
 * survives a reload but clears when the tab closes, matching "for that
 * session".
 *
 * Storage is the source of truth, not a cached module-level flag: `dismissed`
 * re-reads it on every access, gated by this module-level version counter
 * (bumped on dismiss) so every row's own `computed` — across every mounted
 * `AgentEvalTryRow` instance — invalidates and re-reads together.
 */
const STORAGE_KEY = 'N8N_AGENT_EVAL_PRACTICE_BANNER_DISMISSED';

const version = ref(0);

export function usePracticeRunBannerDismissal() {
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
