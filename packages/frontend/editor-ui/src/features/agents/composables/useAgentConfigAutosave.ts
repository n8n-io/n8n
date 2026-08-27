import { ref } from 'vue';

import { getDebounceTime } from '@n8n/composables/useDebounce';

export type SaveStatus = 'idle' | 'saving' | 'saved';

export interface UseAgentConfigAutosaveParams<TSnapshot> {
	/**
	 * Persist the snapshot captured at schedule-time. The caller is responsible
	 * for snapshotting any per-agent context (projectId/agentId/config) so that
	 * a save scheduled for agent A doesn't accidentally fire against agent B
	 * after a switch.
	 *
	 * Return `'skipped'` when the save was intentionally declined (e.g. a
	 * write-lock is active) rather than performed — this suppresses `onSaved`
	 * and keeps `saveStatus` at `'idle'` instead of flashing `'saved'` for an
	 * edit that was never persisted.
	 */
	save: (snapshot: TSnapshot) => Promise<'skipped' | undefined>;
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
	/**
	 * Bumped by `reset()`. A save captures the generation at the start of `runSave`
	 * and re-checks it after each `await` before touching `saveStatus`, so a save
	 * that was in-flight for agent A when the builder switched to B can still
	 * finish persisting A's snapshot but cannot flip B's save indicator.
	 */
	let generation = 0;

	function toError(error: unknown): Error {
		return error instanceof Error ? error : new Error(String(error));
	}

	async function runSave(snapshot: TSnapshot, rethrow: boolean): Promise<void> {
		const gen = generation;
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
			const result = await params.save(snapshot);
			// A `reset()` between schedule and resolution (e.g. an A→B target
			// switch) detaches this save from `saveStatus`: the snapshot still
			// persists for A and its `onSaved`/`onError` side-effects still fire
			// for A, but it must not flip B's indicator, queue a `saved → idle`
			// timer against B, or seed B's `lastSaveError`.
			const detached = gen !== generation;
			if (result === 'skipped') {
				if (!detached) saveStatus.value = 'idle';
				return;
			}
			params.onSaved?.(snapshot);
			if (detached) return;
			saveStatus.value = 'saved';
			saveStatusResetTimer = setTimeout(() => {
				if (gen !== generation) {
					saveStatusResetTimer = null;
					return;
				}
				saveStatus.value = 'idle';
				saveStatusResetTimer = null;
			}, savedHoldMs);
		} catch (error) {
			const detached = gen !== generation;
			params.onError?.(error);
			if (!detached) {
				lastSaveError = toError(error);
				saveStatus.value = 'idle';
			}
			if (rethrow) throw toError(error);
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
		const gen = generation;
		pendingSnapshot = null;
		pendingSnapshotRevision = 0;

		if (target !== null) {
			try {
				await chainSave(target, true);
			} catch (error) {
				// Restore the failed snapshot for a retry — unless a `reset()`
				// happened while the save was in flight: the loop now serves a
				// new target and re-queueing the old target's snapshot would
				// replay it on the new target's next flush.
				if (
					gen === generation &&
					latestSnapshotRevision === targetRevision &&
					pendingSnapshot === null
				) {
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

	function cancelPendingAutosave() {
		if (autosaveTimer !== null) {
			clearTimeout(autosaveTimer);
			autosaveTimer = null;
		}
		pendingSnapshot = null;
		pendingSnapshotRevision = 0;
	}

	/**
	 * Detach this loop from `saveStatus`/`lastSaveError` for a new target.
	 * Drops pending snapshots, clears the `saved` hold timer, and bumps
	 * `generation` so an in-flight save for A can still persist A's snapshot
	 * but cannot mutate B's indicator. Call on every genuine A→B switch,
	 * including drain failure; stale overlapping inits must not reset.
	 */
	function reset() {
		cancelPendingAutosave();
		if (saveStatusResetTimer !== null) {
			clearTimeout(saveStatusResetTimer);
			saveStatusResetTimer = null;
		}
		lastSaveError = null;
		generation += 1;
		saveStatus.value = 'idle';
	}

	return {
		saveStatus,
		scheduleAutosave,
		settleAutosave,
		flushAutosave,
		cancelPendingAutosave,
		reset,
	};
}
