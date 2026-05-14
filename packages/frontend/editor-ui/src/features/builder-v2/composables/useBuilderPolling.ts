import { useBuilderV2Store } from '../stores/builder-v2.store';

/**
 * POC: Each user-driven action (start / pick / reject) triggers exactly one
 * state refresh. No background polling. The store actions already call
 * `refreshState()` internally; this composable just exposes a manual hook for
 * components that want to force a refresh (e.g. after canvas integration in M3).
 */
export function useBuilderPolling() {
	const store = useBuilderV2Store();

	async function refreshNow() {
		await store.refreshState();
	}

	return { refreshNow };
}
