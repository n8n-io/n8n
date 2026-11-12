import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

import { journalFile } from '@/crash-journal';

import {
	isWorkflowNodeTaskPayload,
	type WorkflowNodeTaskPayload,
} from './workflow-node-task-payload';

export interface RunningAttempt {
	id: string;
	leaseEpoch: number;
	payload: Record<string, unknown>;
}

/** Crashes in a row with the job in flight, since the job last completed. */
export interface CrashStreak extends WorkflowNodeTaskPayload {
	crashes: number;
}

interface JournalState {
	streaks: Record<string, CrashStreak>;
	counted: string[];
}

const jobKey = ({ workflowId, nodeId }: WorkflowNodeTaskPayload) => `${workflowId}:${nodeId}`;
const attemptKey = ({ id, leaseEpoch }: RunningAttempt) => `${id}:${leaseEpoch}`;

/** Counts, in a file next to the crash journal, crashes in a row with a scheduled job in flight. */
@Service()
export class ScheduledJobCrashJournal {
	private readonly file = `${journalFile}.scheduled-jobs`;

	private streaks: Map<string, CrashStreak>;

	private counted: Set<string>;

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('scheduler');
		const state = this.read() ?? { streaks: {}, counted: [] };
		this.streaks = new Map(Object.entries(state.streaks));
		this.counted = new Set(state.counted);
	}

	/** A job in flight extends its streak, a job not in flight loses it. An attempt counted before does not count again. */
	recordCrash(running: RunningAttempt[]): CrashStreak[] {
		const streaks = new Map<string, CrashStreak>();
		for (const attempt of running) {
			if (this.counted.has(attemptKey(attempt))) continue;
			if (!isWorkflowNodeTaskPayload(attempt.payload)) continue;
			const { workflowId, nodeId } = attempt.payload;
			const key = jobKey(attempt.payload);
			if (streaks.has(key)) continue;
			const crashes = (this.streaks.get(key)?.crashes ?? 0) + 1;
			streaks.set(key, { workflowId, nodeId, crashes });
		}
		this.streaks = streaks;
		this.counted = new Set(running.map(attemptKey));
		this.write();
		return [...streaks.values()];
	}

	recordCompletion(payload: Record<string, unknown>) {
		if (!isWorkflowNodeTaskPayload(payload)) return;
		if (!this.streaks.delete(jobKey(payload))) return;
		this.write();
	}

	private read(): JournalState | undefined {
		try {
			const parsed: unknown = JSON.parse(readFileSync(this.file, 'utf8'));
			return isJournalState(parsed) ? parsed : undefined;
		} catch {
			return undefined;
		}
	}

	private write() {
		const state: JournalState = {
			streaks: Object.fromEntries(this.streaks),
			counted: [...this.counted],
		};
		try {
			writeFileSync(`${this.file}.tmp`, JSON.stringify(state));
			renameSync(`${this.file}.tmp`, this.file);
		} catch (error) {
			this.logger.debug('Failed to write the scheduled job crash journal', {
				error: ensureError(error),
			});
		}
	}
}

function isCrashStreak(value: unknown): value is CrashStreak {
	return (
		isRecord(value) &&
		typeof value.workflowId === 'string' &&
		typeof value.nodeId === 'string' &&
		typeof value.crashes === 'number'
	);
}

function isJournalState(value: unknown): value is JournalState {
	return (
		isRecord(value) &&
		isRecord(value.streaks) &&
		Object.values(value.streaks).every(isCrashStreak) &&
		Array.isArray(value.counted) &&
		value.counted.every((attempt) => typeof attempt === 'string')
	);
}
