import type { Memory } from '@mastra/memory';
import {
	workflowLoopStateSchema,
	attemptRecordSchema,
	workflowBuildOutcomeSchema,
} from '@n8n/instance-ai';
import type { WorkflowLoopState, AttemptRecord, WorkflowBuildOutcome } from '@n8n/instance-ai';
import { z } from 'zod';

const METADATA_KEY = 'instanceAiWorkflowLoop';

/** Thread-metadata schema: workItemId → { state, attempts } */
const workItemRecordSchema = z.object({
	state: workflowLoopStateSchema,
	attempts: z.array(attemptRecordSchema),
	/** Last build outcome — stored so the service can consume it after (continue) runs. */
	lastBuildOutcome: workflowBuildOutcomeSchema.optional(),
});

const loopStorageSchema = z.record(z.string(), workItemRecordSchema);

type WorkItemRecord = z.infer<typeof workItemRecordSchema>;

/**
 * Persists workflow loop state and attempt records in thread metadata.
 * Same storage pattern as MastraIterationLogStorage and MastraTaskStorage.
 */
export class WorkflowLoopStorage {
	constructor(private readonly memory: Memory) {}

	async getWorkItem(threadId: string, workItemId: string): Promise<WorkItemRecord | null> {
		const all = await this.loadAll(threadId);
		return all[workItemId] ?? null;
	}

	async saveWorkItem(
		threadId: string,
		state: WorkflowLoopState,
		attempts: AttemptRecord[],
		lastBuildOutcome?: WorkflowBuildOutcome,
	): Promise<void> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread) return;

		const all = this.parse(thread.metadata?.[METADATA_KEY]);
		all[state.workItemId] = { state, attempts, lastBuildOutcome };

		await this.memory.updateThread({
			id: threadId,
			title: thread.title ?? threadId,
			metadata: {
				...thread.metadata,
				[METADATA_KEY]: all,
			},
		});
	}

	async getActiveWorkItem(threadId: string): Promise<WorkItemRecord | null> {
		const all = await this.loadAll(threadId);
		// Return the most recent active work item
		for (const record of Object.values(all)) {
			if (record.state.status === 'active') {
				return record;
			}
		}
		return null;
	}

	private async loadAll(threadId: string): Promise<Record<string, WorkItemRecord>> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread?.metadata?.[METADATA_KEY]) return {};
		return this.parse(thread.metadata[METADATA_KEY]);
	}

	private parse(raw: unknown): Record<string, WorkItemRecord> {
		const result = loopStorageSchema.safeParse(raw);
		return result.success ? result.data : {};
	}
}
