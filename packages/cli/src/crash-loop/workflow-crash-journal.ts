import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { OperationalError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { constants, ftruncateSync, openSync, readFileSync, rmSync, writeSync } from 'node:fs';
import { crc32 } from 'node:zlib';

import { journalFile } from '@/crash-journal';
import { isWorkflowNodeTaskPayload } from '@/scheduling/workflow-node-task-payload';

/** One run of a scheduled job. */
export interface JobAttempt {
	id: string;
	leaseEpoch: number;
	payload: Record<string, unknown>;
}

/** Crashes in a row, within the window, with only this workflow in flight. */
export interface WorkflowCrashes {
	workflowId: string;
	crashes: number;
}

interface Streak {
	workflowId: string;
	crashedAt: number[];
}

interface JournalState {
	/** The one workflow that was alone in flight at each of the last crashes. */
	streak: Streak | null;
	/** Per attempt, the workflow of the scheduled job in flight. */
	inFlight: Record<string, string>;
}

/** Crashes older than this no longer count. */
export const CRASH_WINDOW_MS = 6 * Time.hours.toMilliseconds;

const attemptKey = ({ id, leaseEpoch }: JobAttempt) => `${id}:${leaseEpoch}`;

/**
 * Counts, in a file next to the crash journal, the crashes of n8n in a row with one workflow
 * alone in flight: an execution that was running, or a scheduled job that had started. A crash
 * with no workflow or several workflows in flight names no suspect and ends the streak. The file
 * lists the jobs in flight, because the scheduler rows do not show a poll that timed out but
 * still runs. The executions come from the event log at the next startup.
 */
@Service()
export class WorkflowCrashJournal {
	private readonly file = `${journalFile}.workflows`;

	/** Opened at the first write, so that only the main that runs the jobs creates the file. */
	private fd: number | undefined;

	private streak: Streak | null;

	/** Scheduled job attempts in flight, attempt key to workflow id. */
	private inFlight: Map<string, string>;

	/** Workflows of the executions that did not finish, until the session starts. */
	private readonly unfinishedWorkflowIds = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
	) {
		const state = this.read() ?? { streak: null, inFlight: {} };
		this.streak = state.streak;
		this.inFlight = new Map(Object.entries(state.inFlight));
	}

	/** Call before `startSession()` with the workflows of the executions that did not finish. */
	noteUnfinishedExecutions(workflowIds: Iterable<string>) {
		for (const workflowId of workflowIds) this.unfinishedWorkflowIds.add(workflowId);
	}

	/**
	 * Call once at startup, before any job runs. After a crash, the one workflow in flight gets
	 * one more crash, and any other streak ends. Crashes older than the window are dropped.
	 * Either way the previous session's jobs stop being in flight.
	 */
	startSession(crashed: boolean, now = Date.now()): WorkflowCrashes | undefined {
		const workflowIds = new Set([...this.unfinishedWorkflowIds, ...this.inFlight.values()]);
		this.unfinishedWorkflowIds.clear();
		this.inFlight.clear();

		if (crashed) {
			const [suspect] = workflowIds.size === 1 ? workflowIds : [];
			if (suspect === undefined) {
				this.streak = null;
			} else {
				const crashedAt = this.streak?.workflowId === suspect ? this.streak.crashedAt : [];
				this.streak = { workflowId: suspect, crashedAt: [...crashedAt, now] };
			}
		}
		this.dropCrashesBefore(now - CRASH_WINDOW_MS);
		this.write();

		if (!crashed || this.streak === null) return undefined;
		return { workflowId: this.streak.workflowId, crashes: this.streak.crashedAt.length };
	}

	/** Returns the callback that marks the attempt as no longer in flight. */
	recordStart(attempt: JobAttempt): () => void {
		const { payload } = attempt;
		if (!this.executionsConfig.recovery.workflowDeactivationEnabled) return () => {};
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
		if (this.streak?.workflowId !== workflowId) return;
		this.streak = null;
		this.write();
	}

	private dropCrashesBefore(cutoff: number) {
		if (this.streak === null) return;
		const crashedAt = this.streak.crashedAt.filter((time) => time > cutoff);
		this.streak = crashedAt.length === 0 ? null : { ...this.streak, crashedAt };
	}

	private read(): JournalState | undefined {
		try {
			const body = decode(readFileSync(this.file));
			if (body === undefined) return undefined;
			const parsed: unknown = JSON.parse(body);
			return isJournalState(parsed) ? parsed : undefined;
		} catch {
			return undefined;
		}
	}

	private write() {
		const content = encode({ streak: this.streak, inFlight: Object.fromEntries(this.inFlight) });
		try {
			// Writes over the start of the open file, because a rename to replace it can block for milliseconds.
			this.fd ??= openSync(this.file, constants.O_RDWR | constants.O_CREAT);
			const written = writeSync(this.fd, content, 0, content.length, 0);
			if (written !== content.length)
				throw new OperationalError(`Wrote ${written} of ${content.length} bytes`);
		} catch (error) {
			// A stale file would blame a workflow for the wrong crash, so the next session starts from nothing.
			let cleared = true;
			try {
				if (this.fd === undefined) rmSync(this.file, { force: true });
				else ftruncateSync(this.fd, 0);
			} catch {
				cleared = false;
			}
			this.logger.warn(
				cleared
					? 'Failed to write the workflow crash journal, cleared it'
					: 'Failed to write and to clear the workflow crash journal',
				{ error: ensureError(error) },
			);
		}
	}
}

/**
 * Each write leaves the bytes of a longer earlier state after its own, and a crash can cut a
 * write short, so a header gives the checksum and the length of the current state.
 */
function encode(state: JournalState): Buffer {
	const body = Buffer.from(JSON.stringify(state));
	return Buffer.concat([Buffer.from(`${crc32(body)} ${body.length}\n`), body]);
}

function decode(content: Buffer): string | undefined {
	const newline = content.indexOf('\n');
	if (newline === -1) return undefined;
	const [checksum, length] = content.subarray(0, newline).toString().split(' ').map(Number);
	const body = content.subarray(newline + 1, newline + 1 + length);
	if (body.length !== length || crc32(body) !== checksum) return undefined;
	return body.toString();
}

const isStreak = (value: unknown): value is Streak =>
	isRecord(value) &&
	typeof value.workflowId === 'string' &&
	Array.isArray(value.crashedAt) &&
	value.crashedAt.every((time) => typeof time === 'number');

function isJournalState(value: unknown): value is JournalState {
	return (
		isRecord(value) &&
		(value.streak === null || isStreak(value.streak)) &&
		isRecord(value.inFlight) &&
		Object.values(value.inFlight).every((workflowId) => typeof workflowId === 'string')
	);
}
