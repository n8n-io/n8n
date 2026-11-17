import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

import { journalFile } from '@/crash-journal';
import { isWorkflowNodeTaskPayload } from '@/scheduling/workflow-node-task-payload';

/** One run of a scheduled job. */
export interface JobAttempt {
	id: string;
	leaseEpoch: number;
	payload: Record<string, unknown>;
}

/** Crashes within the window with the workflow in flight. */
export interface WorkflowCrashes {
	workflowId: string;
	crashes: number;
}

interface JournalState {
	/** Per workflow, when n8n crashed with it in flight. */
	crashes: Record<string, number[]>;
	/** Per attempt, the workflow of the scheduled job in flight. */
	inFlight: Record<string, string>;
}

/** Crashes older than this no longer count. */
export const CRASH_WINDOW_MS = 6 * 60 * 60 * 1000;

const attemptKey = ({ id, leaseEpoch }: JobAttempt) => `${id}:${leaseEpoch}`;

/**
 * Counts, in a file next to the crash journal, the crashes of n8n per workflow that was in
 * flight at the time: an execution that was running, or a scheduled job that had started.
 * The file lists the jobs in flight, because the scheduler rows do not show a poll that
 * timed out but still runs. The executions come from the event log at the next startup.
 */
@Service()
export class WorkflowCrashJournal {
	private readonly file = `${journalFile}.workflows`;

	private crashes: Map<string, number[]>;

	private inFlight: Map<string, string>;

	/** Workflows of the executions that did not finish, until the session starts. */
	private readonly unfinishedWorkflowIds = new Set<string>();

	constructor(private readonly logger: Logger) {
		const state = this.read() ?? { crashes: {}, inFlight: {} };
		this.crashes = new Map(Object.entries(state.crashes));
		this.inFlight = new Map(Object.entries(state.inFlight));
	}

	/** Call before `startSession()` with the workflows of the executions that did not finish. */
	noteUnfinishedExecutions(workflowIds: Iterable<string>) {
		for (const workflowId of workflowIds) this.unfinishedWorkflowIds.add(workflowId);
	}

	/**
	 * Call once at startup, before any job runs. After a crash, each workflow that was in
	 * flight gets one more crash, and crashes older than the window are dropped. Either way
	 * the previous session's jobs stop being in flight.
	 */
	startSession(crashed: boolean, now = Date.now()): WorkflowCrashes[] {
		const workflowIds = new Set([...this.unfinishedWorkflowIds, ...this.inFlight.values()]);
		this.unfinishedWorkflowIds.clear();
		this.inFlight.clear();

		if (crashed) {
			for (const workflowId of workflowIds) {
				this.crashes.set(workflowId, [...(this.crashes.get(workflowId) ?? []), now]);
			}
		}
		this.dropCrashesBefore(now - CRASH_WINDOW_MS);
		this.write();

		if (!crashed) return [];
		return [...workflowIds].map((workflowId) => ({
			workflowId,
			crashes: this.crashes.get(workflowId)?.length ?? 0,
		}));
	}

	/** Returns the callback that marks the attempt as no longer in flight. */
	recordStart(attempt: JobAttempt): () => void {
		const { payload } = attempt;
		if (!isWorkflowNodeTaskPayload(payload)) return () => {};
		const key = attemptKey(attempt);
		this.inFlight.set(key, payload.workflowId);
		this.write();
		return () => {
			if (this.inFlight.delete(key)) this.write();
		};
	}

	/** Forgets the crashes of the workflow, so a reactivation starts from zero. */
	clearWorkflow(workflowId: string) {
		if (this.crashes.delete(workflowId)) this.write();
	}

	private dropCrashesBefore(cutoff: number) {
		for (const [workflowId, times] of this.crashes) {
			const recent = times.filter((time) => time > cutoff);
			if (recent.length === 0) this.crashes.delete(workflowId);
			else this.crashes.set(workflowId, recent);
		}
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
			crashes: Object.fromEntries(this.crashes),
			inFlight: Object.fromEntries(this.inFlight),
		};
		try {
			writeFileSync(`${this.file}.tmp`, JSON.stringify(state));
			renameSync(`${this.file}.tmp`, this.file);
		} catch (error) {
			this.logger.debug('Failed to write the workflow crash journal', {
				error: ensureError(error),
			});
		}
	}
}

const isTimes = (value: unknown): value is number[] =>
	Array.isArray(value) && value.every((time) => typeof time === 'number');

function isJournalState(value: unknown): value is JournalState {
	return (
		isRecord(value) &&
		isRecord(value.crashes) &&
		Object.values(value.crashes).every(isTimes) &&
		isRecord(value.inFlight) &&
		Object.values(value.inFlight).every((workflowId) => typeof workflowId === 'string')
	);
}
