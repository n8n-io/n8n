import { z } from 'zod';

import { iterationEntrySchema } from './iteration-log';
import type { IterationEntry, IterationLog } from './iteration-log';
import { getThread, patchThread, type PatchableThreadMemory } from './thread-patch';

const METADATA_KEY = 'instanceAiIterationLog';

const logRecordSchema = z.record(z.string(), z.array(iterationEntrySchema));

export class ThreadIterationLogStorage implements IterationLog {
	constructor(private readonly memory: PatchableThreadMemory) {}

	async append(threadId: string, taskKey: string, entry: IterationEntry): Promise<void> {
		const updated = await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const existing = this.parseLog(metadata[METADATA_KEY]);
				const entries = [...(existing[taskKey] ?? []), entry];
				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: {
							...existing,
							[taskKey]: entries,
						},
					},
				};
			},
		});
		if (!updated) throw new Error(`Thread ${threadId} not found`);
	}

	async getForTask(threadId: string, taskKey: string): Promise<IterationEntry[]> {
		const thread = await getThread(this.memory, threadId);
		if (!thread?.metadata?.[METADATA_KEY]) return [];

		const existing = this.parseLog(thread.metadata[METADATA_KEY]);
		return existing[taskKey] ?? [];
	}

	async clear(threadId: string): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const nextMetadata = { ...metadata };
				delete nextMetadata[METADATA_KEY];
				return { metadata: nextMetadata };
			},
		});
	}

	private parseLog(raw: unknown): Record<string, IterationEntry[]> {
		const result = logRecordSchema.safeParse(raw);
		return result.success ? result.data : {};
	}
}
