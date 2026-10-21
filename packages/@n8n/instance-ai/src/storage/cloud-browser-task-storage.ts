import { z } from 'zod';

import { getThread, patchThread, type PatchableThreadMemory } from './thread-patch';

const METADATA_KEY = 'instanceAiCloudBrowserTasks';

const cloudBrowserTaskRecordSchema = z.object({
	taskId: z.string(),
	agentId: z.string(),
	/** The orchestrator run that started the task. */
	runId: z.string(),
	/** The turn that started the task. */
	messageGroupId: z.string().optional(),
	title: z.string(),
	status: z.enum(['running', 'finished']),
	startedAt: z.string(),
	/** How the task ended, in the agent's own words, for example "succeeded" or "blocked". */
	outcome: z.string().optional(),
	summary: z.string().optional(),
	finishedAt: z.string().optional(),
	/** Set when a follow-up run carried the result to the orchestrator. */
	deliveredAt: z.string().optional(),
});

export type CloudBrowserTaskRecord = z.infer<typeof cloudBrowserTaskRecordSchema>;

/**
 * The cloud browser tasks of a thread, in the thread's metadata, one record per task from start
 * to delivery. The store is in the database, so a restart keeps the records and any main can
 * deliver a finished task's result.
 */
export class CloudBrowserTaskStorage {
	constructor(private readonly memory: PatchableThreadMemory) {}

	async add(threadId: string, record: CloudBrowserTaskRecord): Promise<void> {
		await this.patch(threadId, (records) => ({ ...records, [record.taskId]: record }));
	}

	async remove(threadId: string, taskId: string): Promise<void> {
		await this.patch(threadId, ({ [taskId]: _removed, ...rest }) => rest);
	}

	async markFinished(
		threadId: string,
		taskId: string,
		end: { outcome: string; summary: string },
	): Promise<void> {
		await this.patch(threadId, (records) => {
			const record = records[taskId];
			if (!record) return null;
			return {
				...records,
				[taskId]: { ...record, ...end, status: 'finished', finishedAt: new Date().toISOString() },
			};
		});
	}

	/**
	 * Claims every finished task whose result has not reached the orchestrator, in one patch, so
	 * two deliveries can never share one. Returns the claimed records, oldest first.
	 */
	async claimUndelivered(threadId: string): Promise<CloudBrowserTaskRecord[]> {
		const deliveredAt = new Date().toISOString();
		let claimed: CloudBrowserTaskRecord[] = [];
		await this.patch(threadId, (records) => {
			claimed = Object.values(records)
				.filter(isUndelivered)
				.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
			if (claimed.length === 0) return null;
			const next = { ...records };
			for (const record of claimed) next[record.taskId] = { ...record, deliveredAt };
			return next;
		});
		return claimed;
	}

	/** Releases a claim after a delivery that did not happen, so the next delivery takes it. */
	async releaseClaim(threadId: string, taskIds: string[]): Promise<void> {
		if (taskIds.length === 0) return;
		await this.patch(threadId, (records) => {
			const next = { ...records };
			for (const taskId of taskIds) {
				const record = next[taskId];
				if (record) next[taskId] = { ...record, deliveredAt: undefined };
			}
			return next;
		});
	}

	async list(threadId: string): Promise<CloudBrowserTaskRecord[]> {
		const thread = await getThread(this.memory, threadId);
		return Object.values(parseRecords(thread?.metadata?.[METADATA_KEY]));
	}

	/** Read-modify-write of the records inside one locked thread patch. `null` leaves the row as is. */
	private async patch(
		threadId: string,
		update: (
			records: Record<string, CloudBrowserTaskRecord>,
		) => Record<string, CloudBrowserTaskRecord> | null,
	): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const next = update(parseRecords(metadata[METADATA_KEY]));
				if (!next) return null;
				return { metadata: { ...metadata, [METADATA_KEY]: next } };
			},
		});
	}
}

function isUndelivered(record: CloudBrowserTaskRecord): boolean {
	return record.status === 'finished' && !record.deliveredAt;
}

function parseRecords(raw: unknown): Record<string, CloudBrowserTaskRecord> {
	if (!raw || typeof raw !== 'object') return {};
	const records: Record<string, CloudBrowserTaskRecord> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		const parsed = cloudBrowserTaskRecordSchema.safeParse(value);
		if (parsed.success) records[key] = parsed.data;
	}
	return records;
}
