import type { CheckpointStore, SerializableAgentState } from '../types';

/**
 * Manages suspended agent run state for tool approval (HITL).
 * Uses an in-flight Map for same-process lookups and optionally
 * delegates to a CheckpointStore for durable persistence.
 *
 * Note: Suspended runs that are never resumed accumulate in inFlight
 * indefinitely. For long-running processes a TTL-based eviction mechanism
 * should be added to prevent unbounded memory growth.
 */
export class RunStateManager {
	private inFlight = new Map<string, SerializableAgentState>();

	private store?: CheckpointStore;

	constructor(storage?: 'memory' | CheckpointStore) {
		if (storage && storage !== 'memory') {
			this.store = storage;
		}
	}

	/** Save a suspended run state. */
	async suspend(runId: string, state: SerializableAgentState): Promise<void> {
		const stored = { ...state, status: 'suspended' as const };
		this.inFlight.set(runId, stored);
		if (this.store) {
			await this.store.save(runId, stored);
		}
	}

	/** Load and remove a suspended run state, returning it for resumption. */
	async resume(runId: string): Promise<SerializableAgentState | undefined> {
		let state = this.inFlight.get(runId);
		if (!state && this.store) {
			state = await this.store.load(runId);
		}
		if (!state) return undefined;

		this.inFlight.delete(runId);
		state = { ...state, status: 'running' as const };

		// Best-effort delete — log on failure but don't block resumption
		if (this.store) {
			this.store.delete(runId).catch((err: unknown) => {
				console.error(`[RunStateManager] Failed to delete checkpoint ${runId}:`, err);
			});
		}

		return state;
	}
}

/** Generate a unique run ID. */
export function generateRunId(): string {
	return `run_${crypto.randomUUID()}`;
}
