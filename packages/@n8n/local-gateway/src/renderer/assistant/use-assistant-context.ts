/*
 * Shared, module-scoped state for the locally-detected context the user can act
 * on (the open windows, pushed from the main process). Lifted out of
 * TaskComposer so other surfaces — notably the empty-state recommendations —
 * read the same selection: when the user picks a different window in the
 * composer pill, the recommendations regenerate for it too.
 *
 * Same tiny, no-pinia pattern as `use-assistant-screen.ts`: a module-scope ref
 * holds the state and any component can read or drive it.
 */
import { computed, ref } from 'vue';

import { assistantContextFromDetected, type AssistantContext } from './contexts';
import { getContextOptions, onContextChanged } from './tasks-api';
import type { DetectedContext } from '../../shared/types';

// The open windows the user can pick as context (first = frontmost). `selectedKey`
// is the user's manual pick; `null` means "use the frontmost".
const optionsList = ref<DetectedContext[]>([]);
const selectedKey = ref<string | null>(null);

// Single detection subscription for the app session. Set up lazily on first use
// and intentionally never torn down — the context should stay live across tab
// switches (TaskComposer unmounts when the History tab is shown). `initPromise`
// dedupes concurrent first-callers; `initialized` only latches on success so a
// failed detection can be retried.
let initialized = false;
let initPromise: Promise<void> | undefined;
let dispose: (() => void) | undefined;

const detected = computed<DetectedContext>(() => {
	const list = optionsList.value;
	return list.find((c) => (c.id ?? c.app) === selectedKey.value) ?? list[0] ?? { kind: 'other' };
});

const activeContext = computed(() => assistantContextFromDetected(detected.value));

const contextOptions = computed<AssistantContext[]>(() =>
	optionsList.value.length
		? optionsList.value.map(assistantContextFromDetected)
		: [activeContext.value],
);

/** Stable identity of the current context, used as the recommendations cache key. */
const contextKey = computed(() => detected.value.id ?? detected.value.app ?? detected.value.kind);

export function useAssistantContext() {
	/** Load the initial options and subscribe to pushes. Idempotent across callers;
	 *  a failure is not latched, so a later caller can retry. */
	async function ensureDetection(): Promise<void> {
		if (initialized) return;
		if (initPromise) {
			await initPromise;
			return;
		}
		initPromise = (async () => {
			optionsList.value = await getContextOptions();
			dispose = onContextChanged((contexts) => {
				optionsList.value = contexts;
				// A fresh detection supersedes a stale manual pick.
				selectedKey.value = null;
			});
			initialized = true;
		})();
		try {
			await initPromise;
		} catch (error) {
			// Allow a retry on the next call rather than latching a broken state.
			initPromise = undefined;
			throw error;
		}
	}

	function selectContext(key: string | null): void {
		selectedKey.value = key;
	}

	return {
		optionsList,
		selectedKey,
		detected,
		activeContext,
		contextOptions,
		contextKey,
		ensureDetection,
		selectContext,
	};
}

/** Test-only: reset the module-scoped singleton between specs. */
export function __resetAssistantContextForTests(): void {
	optionsList.value = [];
	selectedKey.value = null;
	dispose?.();
	dispose = undefined;
	initialized = false;
	initPromise = undefined;
}
