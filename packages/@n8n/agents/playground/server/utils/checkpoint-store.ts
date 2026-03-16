import type { CheckpointStore, SerializableAgentState } from '@n8n/agents';

/**
 * In-memory CheckpointStore for the playground.
 *
 * Demonstrates how the execution engine would implement CheckpointStore
 * backed by its own database. In production this would be TypeORM/PostgreSQL;
 * here we use a simple Map.
 */
class PlaygroundCheckpointStore implements CheckpointStore {
	private snapshots = new Map<string, SerializableAgentState>();

	async save(key: string, snapshot: SerializableAgentState): Promise<void> {
		this.snapshots.set(key, snapshot);
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		return this.snapshots.get(key);
	}

	async delete(key: string): Promise<void> {
		this.snapshots.delete(key);
	}
}

/** Singleton — shared across all agents in the playground process. */
export const playgroundCheckpointStore = new PlaygroundCheckpointStore();
