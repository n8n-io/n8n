import { ref } from 'vue';

import { getDebounceTime } from '@/app/constants/durations';

export type SaveStatus = 'idle' | 'saving' | 'saved';

export interface UseAgentConfigAutosaveParams<TSnapshot> {
	/**
	 * Persist the snapshot captured at schedule-time. The caller is responsible
	 * for snapshotting any per-agent context (projectId/agentId/config) so that
	 * a save scheduled for agent A doesn't accidentally fire against agent B
	 * after a switch.
	 */
	save: (snapshot: TSnapshot) => Promise<void>;
	/** Called after a successful save so the caller can fire telemetry. */
	onSaved?: () => void;
	/** Called when the save throws — caller decides how to surface the error. */
	onError?: (error: unknown) => void;
	/** Debounce delay in ms (after `getDebounceTime`). */
	debounceMs?: number;
	/** How long to keep the "saved" affordance visible before fading back to idle. */
	savedHoldMs?: number;
}

/**
 * Owns the debounced autosave loop for the agent builder.
 *
 * Hand-rolled timers (instead of `useDebounceFn`) so the route-leave guard can
 * both cancel a pending save AND await one in flight — important to avoid a
 * scheduled save that fires after publish, bumping versionId and immediately
 * re-marking the agent as having unpublished changes.
 *
 * `scheduleAutosave` snapshots its argument at call time; later switches to a
 * different agent therefore can't bleed an in-flight save onto the new agent.
 */
export function useAgentConfigAutosave<TSnapshot>(params: UseAgentConfigAutosaveParams<TSnapshot>) {
	const saveStatus = ref<SaveStatus>('idle');
	const debounceMs = params.debounceMs ?? 500;
	const savedHoldMs = params.savedHoldMs ?? 2000;

	let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
	let autosaveInFlight: Promise<void> | null = null;
	let saveStatusResetTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingSnapshot: TSnapshot | null = null;

	function scheduleAutosave(snapshot: TSnapshot) {
		pendingSnapshot = snapshot;
		if (autosaveTimer !== null) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(() => {
			autosaveTimer = null;
			const target = pendingSnapshot as TSnapshot;
			pendingSnapshot = null;
			saveStatus.value = 'saving';
			autosaveInFlight = (async () => {
				try {
					await params.save(target);
					params.onSaved?.();
					saveStatus.value = 'saved';
					if (saveStatusResetTimer !== null) clearTimeout(saveStatusResetTimer);
					saveStatusResetTimer = setTimeout(() => {
						saveStatus.value = 'idle';
						saveStatusResetTimer = null;
					}, savedHoldMs);
				} catch (error) {
					params.onError?.(error);
					saveStatus.value = 'idle';
				} finally {
					autosaveInFlight = null;
				}
			})();
		}, getDebounceTime(debounceMs));
	}

	async function settleAutosave() {
		if (autosaveTimer !== null) {
			clearTimeout(autosaveTimer);
			autosaveTimer = null;
		}
		if (autosaveInFlight) await autosaveInFlight;
	}

	return { saveStatus, scheduleAutosave, settleAutosave };
}
