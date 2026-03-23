import type { Memory } from '@mastra/memory';
import type { IterationEntry, IterationLog } from '@n8n/instance-ai';
import { iterationEntrySchema } from '@n8n/instance-ai';
import { z } from 'zod';

const METADATA_KEY = 'instanceAiIterationLog';

/**
 * Maximum number of iteration entries kept per task key.
 * Older entries are dropped to prevent thread metadata from growing unboundedly.
 */
const MAX_ENTRIES_PER_TASK = 50;

/** Thread-metadata schema: taskKey → IterationEntry[] */
const logRecordSchema = z.record(z.string(), z.array(iterationEntrySchema));

export class MastraIterationLogStorage implements IterationLog {
	constructor(private readonly memory: Memory) {}

	async append(threadId: string, taskKey: string, entry: IterationEntry): Promise<void> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread) throw new Error(`Thread ${threadId} not found`);

		const existing = this.parseLog(thread.metadata?.[METADATA_KEY]);
		const entries = existing[taskKey] ?? [];
		entries.push(entry);
		// Keep only the most recent entries to prevent metadata inflation
		if (entries.length > MAX_ENTRIES_PER_TASK) {
			entries.splice(0, entries.length - MAX_ENTRIES_PER_TASK);
		}
		existing[taskKey] = entries;

		await this.memory.updateThread({
			id: threadId,
			title: thread.title ?? threadId,
			metadata: {
				...thread.metadata,
				[METADATA_KEY]: existing,
			},
		});
	}

	async getForTask(threadId: string, taskKey: string): Promise<IterationEntry[]> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread?.metadata?.[METADATA_KEY]) return [];

		const existing = this.parseLog(thread.metadata[METADATA_KEY]);
		return existing[taskKey] ?? [];
	}

	async clear(threadId: string): Promise<void> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread) return;

		const metadata = { ...thread.metadata };
		delete metadata[METADATA_KEY];

		await this.memory.updateThread({
			id: threadId,
			title: thread.title ?? threadId,
			metadata,
		});
	}

	private parseLog(raw: unknown): Record<string, IterationEntry[]> {
		const result = logRecordSchema.safeParse(raw);
		return result.success ? result.data : {};
	}
}
