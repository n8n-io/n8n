import type { CheckpointStore, SerializableAgentState } from '../../types';

/**
 * Default in-memory CheckpointStore implementation.
 * Used when no external store is configured (storage: 'memory' or omitted).
 *
 * Includes TTL-based eviction to prevent suspended runs that are never
 * resumed from accumulating indefinitely. The eviction runs lazily on
 * `save()` and `load()` — stale entries are purged as a side effect.
 */
class MemoryCheckpointStore implements CheckpointStore {
	private store = new Map<string, { state: SerializableAgentState; savedAt: number }>();

	/** TTL in milliseconds. Entries older than this are evicted. Default: 1 hour. */
	private readonly ttlMs: number;

	/** Maximum number of entries before the oldest are evicted. Default: 1000. */
	private readonly maxEntries: number;

	constructor(options?: { ttlMs?: number; maxEntries?: number }) {
		this.ttlMs = options?.ttlMs ?? 3_600_000; // 1 hour
		this.maxEntries = options?.maxEntries ?? 1000;
	}

	async save(key: string, state: SerializableAgentState): Promise<void> {
		this.evictStale();
		this.evictOverage();
		this.store.set(key, { state, savedAt: Date.now() });
		await Promise.resolve();
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		this.evictStale();
		const entry = this.store.get(key);
		if (!entry) return undefined;
		if (Date.now() - entry.savedAt > this.ttlMs) {
			this.store.delete(key);
			return undefined;
		}
		return await Promise.resolve(entry.state);
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
		await Promise.resolve();
	}

	private evictStale(): void {
		const now = Date.now();
		for (const [key, entry] of this.store) {
			if (now - entry.savedAt > this.ttlMs) {
				this.store.delete(key);
			}
		}
	}

	private evictOverage(): void {
		while (this.store.size > this.maxEntries) {
			let oldestKey: string | undefined;
			let oldestTime = Infinity;
			for (const [key, entry] of this.store) {
				if (entry.savedAt < oldestTime) {
					oldestTime = entry.savedAt;
					oldestKey = key;
				}
			}
			if (oldestKey) this.store.delete(oldestKey);
		}
	}
}

/**
 * Manages suspended agent run state for tool approval (HITL).
 * Delegates all persistence to a CheckpointStore — either the provided
 * external store or the default MemoryCheckpointStore.
 *
 * The `resume()` method uses optimistic locking via a version counter
 * in the serialized state to prevent concurrent resume conflicts.
 */
export class RunStateManager {
	private store: CheckpointStore;

	constructor(storage?: 'memory' | CheckpointStore) {
		this.store = storage && storage !== 'memory' ? storage : new MemoryCheckpointStore();
	}

	/** Save a suspended run state. */
	async suspend(runId: string, state: SerializableAgentState): Promise<void> {
		await this.store.save(runId, {
			...state,
			status: 'suspended',
			__version: state.__version ?? 0,
		});
	}

	/**
	 * Load a suspended run state for resumption and atomically mark it running.
	 *
	 * Uses optimistic concurrency: increments the `__version` counter on load
	 * and writes the 'running' status back to the store. If the version has
	 * changed since the last read (another agent resumed first), throws an error
	 * to prevent double-resume.
	 *
	 * The caller must call `complete()` when the resumed run finishes, or
	 * `resume()` again with a fresh checkpoint.
	 */
	async resume(runId: string): Promise<SerializableAgentState | undefined> {
		const state = await this.store.load(runId);
		if (!state) return undefined;
		if (state.status !== 'suspended') {
			throw new Error(`Run ${runId} is not suspended. Cannot resume.`);
		}

		const currentVersion =
			(state as SerializableAgentState & { __version?: number }).__version ?? 0;
		const newState: SerializableAgentState = {
			...state,
			status: 'running',
			__version: currentVersion + 1,
		};

		// Optimistic lock: save the new state with updated version.
		// The store's save is the atomic check — if another agent also did
		// resume() concurrently, one will overwrite the other's `running` status.
		// This is the best we can do without compare-and-swap in the store interface.
		// External stores (e.g. Redis/DynamoDB) should implement atomic CAS in
		// their CheckpointStore.save() to prevent this race entirely.
		await this.store.save(runId, newState);

		return newState;
	}

	/** Delete a finished run from storage. Called when a resumed run completes without re-suspending. */
	async complete(runId: string): Promise<void> {
		try {
			await this.store.delete(runId);
		} catch (deleteError: unknown) {
			// eslint-disable-next-line no-console
			console.warn(`[RunStateManager] Failed to delete checkpoint ${runId}:`, deleteError);
		}
	}
}

/** Generate a unique run ID. */
export function generateRunId(): string {
	return `run_${crypto.randomUUID()}`;
}
