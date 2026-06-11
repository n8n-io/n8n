/*
 * Empty-state task recommendations.
 *
 * Watches the shared selected context (see use-assistant-context) and asks the
 * backend for a few one-shot task suggestions. Regeneration on context change is
 * debounced so rapidly switching windows doesn't fan out a request per change,
 * and results are cached per context key so re-selecting a seen context is
 * instant. The first open fetches immediately.
 */
import { ref, watch } from 'vue';

import { useAssistantContext } from './use-assistant-context';
import type { DesktopAssistantRecommendation, DetectedContext } from '../../shared/types';

/** Debounce window for context-change-driven regeneration. */
export const RECOMMENDATIONS_DEBOUNCE_MS = 500;

/** Project the locally-detected context onto the backend request shape. */
function toRequestContext(detected: DetectedContext) {
	return {
		kind: detected.kind,
		fileType: detected.fileType,
		app: detected.app,
		windowTitle: detected.windowTitle,
		url: detected.url,
		path: detected.path,
	};
}

export function useRecommendations() {
	const { contextKey, detected, ensureDetection } = useAssistantContext();

	const recommendations = ref<DesktopAssistantRecommendation[]>([]);
	const loading = ref(false);
	const error = ref(false);

	// Per-context-key cache: a seen key resolves with no network round-trip.
	const cache = new Map<string, DesktopAssistantRecommendation[]>();

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	// The key whose result we currently want; guards against a slow in-flight
	// request for a superseded context overwriting fresher state.
	let activeKey: string | undefined;
	let stopWatch: (() => void) | undefined;

	async function fetchFor(key: string): Promise<void> {
		activeKey = key;

		const cached = cache.get(key);
		if (cached) {
			recommendations.value = cached;
			loading.value = false;
			error.value = false;
			return;
		}

		loading.value = true;
		error.value = false;
		try {
			const response = await window.electronAPI.getRecommendations({
				context: toRequestContext(detected.value),
			});
			if (activeKey !== key) return;
			cache.set(key, response.recommendations);
			recommendations.value = response.recommendations;
		} catch (e) {
			if (activeKey !== key) return;
			// The empty state falls back to its "No tasks yet" text on error.
			console.error('Failed to load task recommendations', e);
			error.value = true;
			recommendations.value = [];
		} finally {
			if (activeKey === key) loading.value = false;
		}
	}

	function schedule(key: string, immediate: boolean): void {
		if (debounceTimer) clearTimeout(debounceTimer);

		// Cached keys (and the first open) resolve right away; only live
		// regeneration for an unseen context waits out the debounce.
		if (immediate || cache.has(key)) {
			void fetchFor(key);
			return;
		}

		// Show the skeleton during the debounce wait, not just the request.
		loading.value = true;
		error.value = false;
		debounceTimer = setTimeout(() => {
			void fetchFor(key);
		}, RECOMMENDATIONS_DEBOUNCE_MS);
	}

	/** Begin detection + fetch for the current context, then track changes. */
	async function start(): Promise<void> {
		// Show the skeleton straight away, before detection/fetch resolves, so the
		// empty state never flashes its "No tasks yet" fallback first.
		loading.value = true;
		await ensureDetection();
		schedule(contextKey.value, true);
		// Sync flush so a context change schedules deterministically.
		stopWatch = watch(contextKey, (key) => schedule(key, false), { flush: 'sync' });
	}

	function stop(): void {
		stopWatch?.();
		stopWatch = undefined;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = undefined;
	}

	return { recommendations, loading, error, start, stop };
}
