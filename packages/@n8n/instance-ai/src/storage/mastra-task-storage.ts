import type { Memory } from '@mastra/memory';
import { taskListSchema } from '@n8n/api-types';
import type { TaskList } from '@n8n/api-types';

import type { TaskStorage } from '../types';
import { patchThread } from './thread-patch';

const TASKS_METADATA_KEY = 'instanceAiTasks';

export class MastraTaskStorage implements TaskStorage {
	constructor(private readonly memory: Memory) {}

	async get(threadId: string): Promise<TaskList | null> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread?.metadata?.[TASKS_METADATA_KEY]) return null;
		const result = taskListSchema.safeParse(thread.metadata[TASKS_METADATA_KEY]);
		return result.success ? result.data : null;
	}

	async save(threadId: string, tasks: TaskList): Promise<void> {
		const updated = await patchThread(this.memory, {
			threadId,
			update: ({ metadata }) => ({
				metadata: {
					...metadata,
					[TASKS_METADATA_KEY]: tasks,
				},
			}),
		});
		if (!updated) {
			throw new Error(`Thread ${threadId} not found`);
		}
	}
}
