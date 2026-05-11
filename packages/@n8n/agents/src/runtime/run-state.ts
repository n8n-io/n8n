import type { CheckpointStore, SerializableAgentState } from '../types';

/**
 * Default in-memory CheckpointStore implementation.
 * Used when no external store is configured (storage: 'memory' or omitted).
 *
 * Note: Suspended runs that are never resumed accumulate indefinitely.
 * For long-running processes a TTL-based eviction mechanism should be added
 * to prevent unbounded memory growth.
 */
class MemoryCheckpointStore implements CheckpointStore {
	private store = new Map<string, SerializableAgentState>();

	async save(key: string, state: SerializableAgentState): Promise<void> {
		await Promise.resolve(this.store.set(key, state));
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		return await Promise.resolve(this.store.get(key));
	}

	async delete(key: string): Promise<void> {
		await Promise.resolve(this.store.delete(key));
	}
}

/**
 * Manages suspended agent run state for tool approval (HITL).
 * Delegates all persistence to a CheckpointStore — either the provided
 * external store or the default MemoryCheckpointStore.
 */
export class RunStateManager {
	private store: CheckpointStore;

	constructor(storage?: 'memory' | CheckpointStore) {
		this.store = storage && storage !== 'memory' ? storage : new MemoryCheckpointStore();
	}

	/** Save a suspended run state. */
	async suspend(runId: string, state: SerializableAgentState): Promise<void> {
		await this.store.save(runId, { ...state, status: 'suspended' });
	}

	/** Load a suspended run state for resumption and mark it running. Status is not updated in the store. */
	async resume(runId: string): Promise<SerializableAgentState | undefined> {
		const state = await this.store.load(runId);
		if (!state) return undefined;
		if (state.status !== 'suspended') {
			throw new Error(`Run ${runId} is not suspended. Cannot resume.`);
		}
		const newState: SerializableAgentState = { ...state, status: 'running' };
		return newState;
	}

	/** Delete a finished run from storage. Called when a resumed run completes without re-suspending. */
	async complete(runId: string): Promise<void> {
		try {
			await this.store.delete(runId);
		} catch (deleteError: unknown) {
			console.error(`[RunStateManager] Failed to delete checkpoint ${runId}:`, deleteError);
		}
	}
}

/** Generate a unique run ID. */
export function generateRunId(): string {
	return `run_${crypto.randomUUID()}`;
}
