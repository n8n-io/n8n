import type { Memory } from '@mastra/memory';
import { z } from 'zod';

import { patchThread } from './thread-patch';
import type {
	AttemptRecord,
	WorkflowBuildOutcome,
	WorkflowLoopState,
} from '../workflow-loop/workflow-loop-state';
import {
	attemptRecordSchema,
	workflowBuildOutcomeSchema,
	workflowLoopStateSchema,
} from '../workflow-loop/workflow-loop-state';

const METADATA_KEY = 'instanceAiWorkflowLoop';

const workItemRecordSchema = z.object({
	state: workflowLoopStateSchema,
	attempts: z.array(attemptRecordSchema),
	lastBuildOutcome: workflowBuildOutcomeSchema.optional(),
});

const loopStorageSchema = z.record(z.string(), workItemRecordSchema);

export type WorkflowLoopWorkItemRecord = z.infer<typeof workItemRecordSchema>;

export class WorkflowLoopStorage {
	constructor(private readonly memory: Memory) {}

	async getWorkItem(
		threadId: string,
		workItemId: string,
	): Promise<WorkflowLoopWorkItemRecord | null> {
		const all = await this.loadAll(threadId);
		return all[workItemId] ?? null;
	}

	async saveWorkItem(
		threadId: string,
		state: WorkflowLoopState,
		attempts: AttemptRecord[],
		lastBuildOutcome?: WorkflowBuildOutcome,
	): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const all = this.parse(metadata[METADATA_KEY]);
				all[state.workItemId] = { state, attempts, lastBuildOutcome };
				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: all,
					},
				};
			},
		});
	}

	async getActiveWorkItem(threadId: string): Promise<WorkflowLoopWorkItemRecord | null> {
		const all = await this.loadAll(threadId);
		for (const record of Object.values(all)) {
			if (record.state.status === 'active') {
				return record;
			}
		}
		return null;
	}

	private async loadAll(threadId: string): Promise<Record<string, WorkflowLoopWorkItemRecord>> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread?.metadata?.[METADATA_KEY]) return {};
		return this.parse(thread.metadata[METADATA_KEY]);
	}

	private parse(raw: unknown): Record<string, WorkflowLoopWorkItemRecord> {
		const result = loopStorageSchema.safeParse(raw);
		return result.success ? result.data : {};
	}
}
