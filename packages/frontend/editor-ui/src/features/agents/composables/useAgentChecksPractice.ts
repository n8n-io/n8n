import { ref } from 'vue';

const STORAGE_KEY = 'N8N_AGENT_CHECKS_PRACTICE_SEEN';

const read = () => {
	try {
		return window.localStorage.getItem(STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
};

// Shared across every practice surface on the page, so dismissing one folds them all.
const seen = ref(read());

/**
 * Whether this person has dismissed the practice-run explanation. The first
 * practice surface explains itself in a footer; after "Got it", every surface
 * shows only the folded corner.
 */
export function useAgentChecksPractice() {
	const dismiss = () => {
		seen.value = true;
		try {
			window.localStorage.setItem(STORAGE_KEY, 'true');
		} catch {
			// Without storage the footer comes back on the next visit; nothing breaks.
		}
	};
	return { seen, dismiss };
}
