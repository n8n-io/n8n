import { z } from 'zod';

import { getThread, patchThread, type PatchableThreadMemory } from './thread-patch';

const METADATA_KEY = 'instanceAiCloudBrowserTasks';

/**
 * How long a delivery holds the finished tasks it claimed. After that, the next delivery can take
 * them again, so a main that stopped between the claim and the delivery does not lose them.
 */
export const CLAIM_LEASE_MS = 5 * 60 * 1000;

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
	/**
	 * When the main that runs the task last said it is alive. A running task whose main stopped,
	 * for example on a restart, stops updating it.
	 */
	aliveAt: z.string().optional(),
	/**
	 * The approval card the task waits on, or `null` once it closed. Another main closes it when the
	 * task stops being marked alive, because the task's own main cannot.
	 */
	pendingConfirmationRequestId: z.string().nullish(),
	/** How the task ended, in the agent's own words, for example "succeeded" or "blocked". */
	outcome: z.string().optional(),
	summary: z.string().optional(),
	finishedAt: z.string().optional(),
	/** Set while a delivery holds the finished task. See `CLAIM_LEASE_MS`. */
	claimedAt: z.string().optional(),
});

export type CloudBrowserTaskRecord = z.infer<typeof cloudBrowserTaskRecordSchema>;

/**
 * The cloud browser tasks of a thread, in the thread's metadata, one record per task from start
 * until its result is delivered. The store is in the database, so a restart keeps the records and
 * any main can deliver a finished task's result.
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

	/** Records that the task's main is still running it. */
	async markAlive(threadId: string, taskId: string): Promise<void> {
		await this.patch(threadId, (records) => {
			const record = records[taskId];
			if (record?.status !== 'running') return null;
			return { ...records, [taskId]: { ...record, aliveAt: new Date().toISOString() } };
		});
	}

	/**
	 * Saves the approval card the running task waits on, or `null` when it waits on none. Returns
	 * false when the task is no longer running.
	 */
	async setPendingConfirmation(
		threadId: string,
		taskId: string,
		requestId: string | null,
	): Promise<boolean> {
		let updated = false;
		await this.patch(threadId, (records) => {
			const record = records[taskId];
			if (record?.status !== 'running') return null;
			updated = true;
			return { ...records, [taskId]: { ...record, pendingConfirmationRequestId: requestId } };
		});
		return updated;
	}

	/**
	 * Marks a running task failed when its main has not said it is alive since `aliveBefore`, so
	 * its result can be delivered. Returns the tasks it failed.
	 */
	async failStale(
		threadId: string,
		aliveBefore: Date,
		end: { outcome: string; summary: string },
	): Promise<CloudBrowserTaskRecord[]> {
		let failed: CloudBrowserTaskRecord[] = [];
		await this.patch(threadId, (records) => {
			failed = Object.values(records).filter(
				(record) =>
					record.status === 'running' && new Date(record.aliveAt ?? record.startedAt) < aliveBefore,
			);
			if (failed.length === 0) return null;
			const finishedAt = new Date().toISOString();
			const next = { ...records };
			for (const record of failed) {
				next[record.taskId] = { ...record, ...end, status: 'finished', finishedAt };
			}
			return next;
		});
		return failed;
	}

	/**
	 * Claims every finished task that no delivery holds, in one patch, so two deliveries can never
	 * share one. A claim older than `CLAIM_LEASE_MS` no longer holds its tasks. Returns the claimed
	 * records, oldest first. The caller then calls `removeDelivered` or `releaseClaim`.
	 */
	async claimUndelivered(threadId: string): Promise<CloudBrowserTaskRecord[]> {
		const now = new Date();
		const leaseStart = now.getTime() - CLAIM_LEASE_MS;
		let claimed: CloudBrowserTaskRecord[] = [];
		await this.patch(threadId, (records) => {
			claimed = Object.values(records)
				.filter(
					(record) =>
						record.status === 'finished' &&
						(!record.claimedAt || new Date(record.claimedAt).getTime() < leaseStart),
				)
				.sort((a, b) => a.startedAt.localeCompare(b.startedAt))
				.map((record) => ({ ...record, claimedAt: now.toISOString() }));
			if (claimed.length === 0) return null;
			const next = { ...records };
			for (const record of claimed) next[record.taskId] = record;
			return next;
		});
		return claimed;
	}

	/** Removes claimed tasks once their delivery started. */
	async removeDelivered(threadId: string, claimed: CloudBrowserTaskRecord[]): Promise<void> {
		await this.patchClaimed(threadId, claimed, () => undefined);
	}

	/** Gives claimed tasks back when no delivery started, so the next delivery takes them. */
	async releaseClaim(threadId: string, claimed: CloudBrowserTaskRecord[]): Promise<void> {
		await this.patchClaimed(threadId, claimed, ({ claimedAt: _released, ...record }) => record);
	}

	async list(threadId: string): Promise<CloudBrowserTaskRecord[]> {
		const thread = await getThread(this.memory, threadId);
		return Object.values(parseRecords(thread?.metadata?.[METADATA_KEY]));
	}

	/**
	 * Changes the claimed tasks that this claim still holds. A task that a later delivery took over,
	 * after this claim's lease ended, belongs to that delivery and is left as is.
	 */
	private async patchClaimed(
		threadId: string,
		claimed: CloudBrowserTaskRecord[],
		change: (record: CloudBrowserTaskRecord) => CloudBrowserTaskRecord | undefined,
	): Promise<void> {
		if (claimed.length === 0) return;
		await this.patch(threadId, (records) => {
			const next = { ...records };
			for (const { taskId, claimedAt } of claimed) {
				const record = next[taskId];
				if (!record || record.claimedAt !== claimedAt) continue;
				const changed = change(record);
				if (changed) next[taskId] = changed;
				else delete next[taskId];
			}
			return next;
		});
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

function parseRecords(raw: unknown): Record<string, CloudBrowserTaskRecord> {
	if (!raw || typeof raw !== 'object') return {};
	const records: Record<string, CloudBrowserTaskRecord> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		const parsed = cloudBrowserTaskRecordSchema.safeParse(value);
		if (parsed.success) records[key] = parsed.data;
	}
	return records;
}
