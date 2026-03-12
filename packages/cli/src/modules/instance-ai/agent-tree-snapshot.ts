import type { Memory } from '@mastra/memory';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { z } from 'zod';

const SNAPSHOTS_KEY = 'instanceAiRunSnapshots';

/** Snapshot value stored in thread metadata — includes the native runId for SSE correlation. */
export interface AgentTreeSnapshot {
	tree: InstanceAiAgentNode;
	/** The n8n runId (e.g. run_xxx) — used so historical messages carry the same runId as live SSE events. */
	runId: string;
}

/**
 * Lightweight Zod schema for validating snapshots read from thread metadata.
 * Only validates the structural envelope — deep InstanceAiAgentNode validation
 * is unnecessary since we wrote the data ourselves.
 */
const agentTreeSnapshotSchema = z.object({
	tree: z.record(z.unknown()),
	runId: z.string(),
});

const snapshotsArraySchema = z.array(agentTreeSnapshotSchema);

/**
 * Parse snapshots from thread metadata with Zod runtime validation.
 * The schema validates the envelope shape; the narrowing to AgentTreeSnapshot[]
 * is safe because we wrote the tree data ourselves (same pattern as task-storage.ts).
 */
function parseSnapshots(raw: unknown): AgentTreeSnapshot[] {
	const result = snapshotsArraySchema.safeParse(raw);
	if (!result.success) return [];
	// Safe narrowing: Zod validated { tree: Record, runId: string }[] — the tree
	// content is trusted because AgentTreeSnapshotStorage is the only writer.
	return result.data as unknown as AgentTreeSnapshot[];
}

/**
 * Persists agent tree snapshots in Mastra thread metadata.
 * Snapshots are stored as an ordered array (appended chronologically)
 * and matched to assistant messages by position during session restore.
 *
 * Same storage pattern as MastraTaskStorage (task-storage.ts).
 */
export class AgentTreeSnapshotStorage {
	constructor(private readonly memory: Memory) {}

	async save(threadId: string, agentTree: InstanceAiAgentNode, runId: string): Promise<void> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread) return;

		const existing = parseSnapshots(thread.metadata?.[SNAPSHOTS_KEY]);
		const snapshot: AgentTreeSnapshot = { tree: agentTree, runId };
		await this.memory.updateThread({
			id: threadId,
			title: thread.title ?? threadId,
			metadata: {
				...thread.metadata,
				[SNAPSHOTS_KEY]: [...existing, snapshot],
			},
		});
	}

	/**
	 * Update the last snapshot in place (used when background tasks complete
	 * after the initial snapshot was saved).
	 */
	async updateLast(threadId: string, agentTree: InstanceAiAgentNode, runId: string): Promise<void> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread) return;

		const existing = parseSnapshots(thread.metadata?.[SNAPSHOTS_KEY]);
		// Find the snapshot with the matching runId and update it
		const idx = existing.findIndex((s) => s.runId === runId);
		if (idx >= 0) {
			existing[idx] = { tree: agentTree, runId };
		} else {
			// Fallback: append if not found (shouldn't happen normally)
			existing.push({ tree: agentTree, runId });
		}
		await this.memory.updateThread({
			id: threadId,
			title: thread.title ?? threadId,
			metadata: {
				...thread.metadata,
				[SNAPSHOTS_KEY]: existing,
			},
		});
	}

	async getAll(threadId: string): Promise<AgentTreeSnapshot[]> {
		const thread = await this.memory.getThreadById({ threadId });
		return parseSnapshots(thread?.metadata?.[SNAPSHOTS_KEY]);
	}
}
