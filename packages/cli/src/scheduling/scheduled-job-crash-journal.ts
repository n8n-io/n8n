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

/** One run of a scheduled job. */
export interface JobAttempt {
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
	inFlight: Record<string, WorkflowNodeTaskPayload>;
}

const jobKey = ({ workflowId, nodeId }: WorkflowNodeTaskPayload) => `${workflowId}:${nodeId}`;
const attemptKey = ({ id, leaseEpoch }: JobAttempt) => `${id}:${leaseEpoch}`;

/**
 * Counts, in a file next to the crash journal, crashes in a row with a scheduled job in flight.
 * The file lists the jobs in flight, because the scheduler rows do not show a poll that
 * timed out but still runs.
 */
@Service()
export class ScheduledJobCrashJournal {
	private readonly file = `${journalFile}.scheduled-jobs`;

	private streaks: Map<string, CrashStreak>;

	private inFlight: Map<string, WorkflowNodeTaskPayload>;

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('scheduler');
		const state = this.read() ?? { streaks: {}, inFlight: {} };
		this.streaks = new Map(Object.entries(state.streaks));
		this.inFlight = new Map(Object.entries(state.inFlight));
	}

	/**
	 * Call once at startup, before any job runs. After a crash, a job that was in flight
	 * extends its streak and a job that was not loses it. Either way the previous
	 * session's jobs stop being in flight.
	 */
	startSession(crashed: boolean): CrashStreak[] {
		if (crashed) {
			const streaks = new Map<string, CrashStreak>();
			for (const job of this.inFlight.values()) {
				const key = jobKey(job);
				if (streaks.has(key)) continue;
				streaks.set(key, { ...job, crashes: (this.streaks.get(key)?.crashes ?? 0) + 1 });
			}
			this.streaks = streaks;
		}
		this.inFlight.clear();
		this.write();
		return crashed ? [...this.streaks.values()] : [];
	}

	/** Returns the callback that marks the attempt as no longer in flight. */
	recordStart(attempt: JobAttempt): () => void {
		const { payload } = attempt;
		if (!isWorkflowNodeTaskPayload(payload)) return () => {};
		const key = attemptKey(attempt);
		this.inFlight.set(key, { workflowId: payload.workflowId, nodeId: payload.nodeId });
		this.write();
		return () => {
			if (this.inFlight.delete(key)) this.write();
		};
	}

	recordCompletion(payload: Record<string, unknown>) {
		if (!isWorkflowNodeTaskPayload(payload)) return;
		if (!this.streaks.delete(jobKey(payload))) return;
		this.write();
	}

	/** Ends the streaks of every job of the workflow, so a reactivation starts from zero. */
	clearWorkflow(workflowId: string) {
		let cleared = false;
		for (const [key, streak] of this.streaks) {
			if (streak.workflowId !== workflowId) continue;
			this.streaks.delete(key);
			cleared = true;
		}
		if (cleared) this.write();
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
			inFlight: Object.fromEntries(this.inFlight),
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

function isJob(value: unknown): value is WorkflowNodeTaskPayload {
	return isRecord(value) && isWorkflowNodeTaskPayload(value);
}

function isCrashStreak(value: unknown): value is CrashStreak {
	return isRecord(value) && typeof value.crashes === 'number' && isJob(value);
}

function isJournalState(value: unknown): value is JournalState {
	return (
		isRecord(value) &&
		isRecord(value.streaks) &&
		Object.values(value.streaks).every(isCrashStreak) &&
		isRecord(value.inFlight) &&
		Object.values(value.inFlight).every(isJob)
	);
}
