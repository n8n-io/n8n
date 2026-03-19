import type { Memory } from '@mastra/memory';
import { z } from 'zod';
import { instanceAiTaskRunSchema } from '@n8n/api-types';
import type { InstanceAiTaskRun } from '@n8n/api-types';
import type { TaskRunStorage } from '@n8n/instance-ai';

const TASK_RUNS_METADATA_KEY = 'instanceAiTaskRuns';
const taskRunsSchema = z.array(instanceAiTaskRunSchema);

export class MastraTaskRunStorage implements TaskRunStorage {
	constructor(private readonly memory: Memory) {}

	async get(threadId: string): Promise<InstanceAiTaskRun[]> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread?.metadata?.[TASK_RUNS_METADATA_KEY]) {
			return [];
		}

		const result = taskRunsSchema.safeParse(thread.metadata[TASK_RUNS_METADATA_KEY]);
		return result.success ? result.data : [];
	}

	async save(threadId: string, taskRuns: InstanceAiTaskRun[]): Promise<void> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread) {
			throw new Error(`Thread ${threadId} not found`);
		}

		await this.memory.updateThread({
			id: threadId,
			title: thread.title ?? threadId,
			metadata: {
				...thread.metadata,
				[TASK_RUNS_METADATA_KEY]: taskRuns,
			},
		});
	}
}
