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
	onSaved?: (snapshot: TSnapshot) => void;
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
	let pendingSnapshotRevision = 0;
	let latestSnapshotRevision = 0;
	let lastSaveError: Error | null = null;

	function toError(error: unknown): Error {
		return error instanceof Error ? error : new Error(String(error));
	}

	async function runSave(snapshot: TSnapshot, rethrow: boolean): Promise<void> {
		saveStatus.value = 'saving';
		lastSaveError = null;
		// A `saved → idle` reset timer from the previous save would otherwise
		// fire mid-way through this one and flip the indicator back to idle
		// while the request is still in flight.
		if (saveStatusResetTimer !== null) {
			clearTimeout(saveStatusResetTimer);
			saveStatusResetTimer = null;
		}
		try {
			await params.save(snapshot);
			params.onSaved?.(snapshot);
			saveStatus.value = 'saved';
			saveStatusResetTimer = setTimeout(() => {
				saveStatus.value = 'idle';
				saveStatusResetTimer = null;
			}, savedHoldMs);
		} catch (error) {
			lastSaveError = toError(error);
			params.onError?.(error);
			saveStatus.value = 'idle';
			if (rethrow) throw lastSaveError;
		}
	}

	async function chainSave(snapshot: TSnapshot, rethrow: boolean): Promise<void> {
		// Chain onto any in-flight save so two scheduled saves can't run
		// concurrently — overlapping POSTs would otherwise race the version-id
		// update and the second `autosaveInFlight` write would hide the first
		// one from `settleAutosave`.
		const previous = autosaveInFlight ?? Promise.resolve();
		const slot = previous.then(async () => await runSave(snapshot, rethrow));
		const trackedSlot = slot.catch(() => undefined);
		autosaveInFlight = trackedSlot;
		void trackedSlot.finally(() => {
			// Only release the slot if no later save chained behind us; otherwise
			// leave the newer promise in place so `settleAutosave` awaits the
			// full tail of pending work.
			if (autosaveInFlight === trackedSlot) autosaveInFlight = null;
		});
		await slot;
	}

	function scheduleAutosave(snapshot: TSnapshot) {
		pendingSnapshot = snapshot;
		pendingSnapshotRevision = ++latestSnapshotRevision;
		if (autosaveTimer !== null) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(() => {
			autosaveTimer = null;
			const target = pendingSnapshot as TSnapshot;
			pendingSnapshot = null;
			pendingSnapshotRevision = 0;
			void chainSave(target, false);
		}, getDebounceTime(debounceMs));
	}

	async function settleAutosave() {
		if (autosaveTimer !== null) {
			clearTimeout(autosaveTimer);
			autosaveTimer = null;
		}
		if (autosaveInFlight) await autosaveInFlight;
	}

	async function flushAutosave() {
		if (autosaveTimer !== null) {
			clearTimeout(autosaveTimer);
			autosaveTimer = null;
		}

		const target = pendingSnapshot;
		const targetRevision = pendingSnapshotRevision;
		pendingSnapshot = null;
		pendingSnapshotRevision = 0;

		if (target !== null) {
			try {
				await chainSave(target, true);
			} catch (error) {
				if (latestSnapshotRevision === targetRevision && pendingSnapshot === null) {
					pendingSnapshot = target;
					pendingSnapshotRevision = targetRevision;
				}
				throw error;
			}
			return;
		}

		if (autosaveInFlight) await autosaveInFlight;
		if (lastSaveError) throw lastSaveError;
	}

	return { saveStatus, scheduleAutosave, settleAutosave, flushAutosave };
}
