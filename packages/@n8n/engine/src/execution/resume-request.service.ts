import { setTimeout as sleep } from 'node:timers/promises';

import { verifyResumeToken } from '../auth/resume-token';
import type { StepMessage, WorkQueue } from '../queue';
import { ExecutionNotFoundError, type ExecutionStore } from './execution-store';
import { isLiveExecutionStatus, type ExecutionStatus, type StepSlots } from './execution.types';
import { StepNotFoundError, type StepRecord, type StepStore } from './step-store';

export type ResumeRejection = 'invalid_token' | 'not_found' | 'not_waiting' | 'ambiguous';

export class ResumeRejectedError extends Error {
	constructor(readonly code: ResumeRejection) {
		super(`Resume request rejected: ${code}`);
		this.name = 'ResumeRejectedError';
	}
}

/** The waiting step that a resume request addresses. */
export interface ResumeTarget {
	stepId: string;
	nodeId: string;
}

/**
 * How long `locate` holds a request for an execution that still runs but has
 * no step that accepts a request yet. The default covers the write of the
 * `waiting` row, not upstream work.
 */
export interface ResumeHold {
	attempts: number;
	delayMs: number;
}

const DEFAULT_RESUME_HOLD: ResumeHold = { attempts: 10, delayMs: 100 };

/**
 * An execution that can still reach a wait. `queued` counts too: its trigger
 * may not have been planned yet.
 */
const isLive = (status: ExecutionStatus) => status === 'queued' || isLiveExecutionStatus(status);

/** A waiting step that an execution-bound token can resume, the only kind this service verifies. */
const acceptsRequest = ({ status, waitDeclaration }: StepRecord) =>
	status === 'waiting' && waitDeclaration?.resumeBinding === 'execution';

/**
 * Accepts resume requests (ADR-20260902-steps-declare-waits, decision 5).
 *
 * Two calls, because the control plane runs the node's resume method: it must
 * know which node waits before that code runs, and the request must be
 * authorized before any node code runs.
 *
 * 1. `locate` verifies the token and names the waiting step.
 * 2. `resolve` verifies the token against that step and ends its wait with the
 *    outputs that the resume method produced.
 */
export class ResumeRequestService {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
		private readonly secret: string,
		private readonly hold: ResumeHold = DEFAULT_RESUME_HOLD,
	) {}

	/**
	 * Verifies the token and returns the execution's execution-bound wait, or
	 * `null` if it has none. The caller reads the execution's status to learn why.
	 *
	 * A request can arrive before the step writes its wait. While the execution
	 * is live, this retries for a short time.
	 *
	 * @throws {ResumeRejectedError} `invalid_token`, `not_found`, or `ambiguous`
	 * when a live execution has two execution-bound waits.
	 */
	async locate(executionId: string, token: string): Promise<ResumeTarget | null> {
		if (!verifyResumeToken(this.secret, token, executionId)) {
			throw new ResumeRejectedError('invalid_token');
		}

		for (let attempt = 0; attempt < this.hold.attempts; attempt++) {
			if (attempt > 0) await sleep(this.hold.delayMs);
			const [status, waits] = await Promise.all([
				this.loadStatus(executionId),
				this.loadExecutionBoundWaits(executionId),
			]);
			// An execution ends before its waits are cancelled, so its status decides first.
			if (!isLive(status)) return null;
			if (waits.length > 1) throw new ResumeRejectedError('ambiguous');
			if (waits[0]) return { stepId: waits[0].id, nodeId: waits[0].nodeId };
		}
		// TODO(CET-522): when the only wait is step bound, say to use the step's own resume URL.
		return null;
	}

	/**
	 * Ends the wait of `stepId` with `outputs`, and announces the step. The
	 * worker that claims it emits the outputs. A second wait does not refuse
	 * the request: `locate` chose the step while it was the only one.
	 *
	 * @throws {ResumeRejectedError} `invalid_token`, or `not_waiting` when the
	 * step does not wait for a request (any more) or its execution ended.
	 */
	async resolve(stepId: string, token: string, outputs: StepSlots): Promise<StepRecord> {
		const step = await this.loadStep(stepId);
		if (!verifyResumeToken(this.secret, token, step.executionId)) {
			throw new ResumeRejectedError('invalid_token');
		}
		if (!acceptsRequest(step)) throw new ResumeRejectedError('not_waiting');
		if (!isLive(await this.loadStatus(step.executionId))) {
			throw new ResumeRejectedError('not_waiting');
		}

		const resumed = await this.stepStore.resumeStep(step.id, { kind: 'request', outputs });
		if (!resumed) throw new ResumeRejectedError('not_waiting');

		// Resume first and announce second, as the sweep does. The reverse order
		// announces a step that the claim still refuses.
		// TODO(CAT-2938): a crash here leaves the step `queued` with nothing to announce it.
		await this.stepQueue.publish({
			type: 'step:ready',
			executionId: step.executionId,
			stepId: step.id,
		});
		return step;
	}

	private async loadExecutionBoundWaits(executionId: string): Promise<StepRecord[]> {
		return (await this.stepStore.loadWaitingSteps(executionId)).filter(acceptsRequest);
	}

	private async loadStatus(executionId: string): Promise<ExecutionStatus> {
		try {
			// TODO(CET-488): load only the status.
			return (await this.executionStore.loadExecution(executionId)).status;
		} catch (error) {
			if (error instanceof ExecutionNotFoundError) throw new ResumeRejectedError('not_found');
			throw error;
		}
	}

	private async loadStep(stepId: string): Promise<StepRecord> {
		try {
			return await this.stepStore.loadStep(stepId);
		} catch (error) {
			// As a bad token, so a caller cannot learn whether a step id exists.
			if (error instanceof StepNotFoundError) throw new ResumeRejectedError('invalid_token');
			throw error;
		}
	}
}
