import { setTimeout as sleep } from 'node:timers/promises';

import { verifyResumeToken } from '../auth/resume-token';
import type { EngineLogger } from '../logging';
import { createConsoleLogger } from '../logging';
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
		private readonly logger: EngineLogger = createConsoleLogger(),
		private readonly hold: ResumeHold = DEFAULT_RESUME_HOLD,
	) {}

	/**
	 * The one step of the execution that accepts a request, or `null` when none
	 * does. `null` is an answer, not a refusal: the execution's status says why.
	 *
	 * A request can arrive before the step records its wait. While the
	 * execution is live, this holds the request for a short time.
	 *
	 * @throws {ResumeRejectedError} `invalid_token`, `not_found`, or `ambiguous`
	 * when two steps accept a request at once.
	 */
	async locate(executionId: string, token: string): Promise<ResumeTarget | null> {
		if (!verifyResumeToken(this.secret, token, executionId)) {
			throw new ResumeRejectedError('invalid_token');
		}

		for (let attempt = 0; ; attempt++) {
			// Liveness comes from the execution and not from the step rows. An execution
			// that ended can still hold a waiting row, so the row alone does not make a
			// target.
			const status = await this.loadStatus(executionId);
			const [step] = await this.loadOnlyWait(executionId);
			if (step && isLive(status)) {
				this.logHold(executionId, attempt, step.id);
				return { stepId: step.id, nodeId: step.nodeId };
			}

			if (!isLive(status) || attempt + 1 >= this.hold.attempts) {
				this.logHold(executionId, attempt, null, status);
				return null;
			}
			await sleep(this.hold.delayMs);
		}
	}

	/**
	 * Ends the wait of `stepId` with `outputs`, and announces the step. The
	 * worker that claims it emits the outputs.
	 *
	 * @throws {ResumeRejectedError} `invalid_token`, `not_waiting` when the step
	 * does not wait for a request (any more) or its execution ended, or
	 * `ambiguous` when the execution holds two such waits.
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
		// The same rule as `locate`: an execution-bound token cannot pick one of two waits.
		await this.loadOnlyWait(step.executionId);

		const resumed = await this.stepStore.resumeStep(step.id, { kind: 'request', outputs });
		if (!resumed) throw new ResumeRejectedError('not_waiting');

		// Resume first and announce second, as the sweep does. The reverse order
		// announces a step that the claim still refuses.
		await this.stepQueue.publish({
			type: 'step:ready',
			executionId: step.executionId,
			stepId: step.id,
		});
		return step;
	}

	/**
	 * The execution's wait that an execution-bound token can resume, as a list of
	 * at most one.
	 *
	 * @throws {ResumeRejectedError} `ambiguous` when there are two.
	 */
	private async loadOnlyWait(executionId: string): Promise<StepRecord[]> {
		const waits = (await this.stepStore.loadWaitingSteps(executionId)).filter(acceptsRequest);
		if (waits.length > 1) throw new ResumeRejectedError('ambiguous');
		return waits;
	}

	/** Logs a held request on either exit, so a `null` after a hold is traceable. */
	private logHold(
		executionId: string,
		attempt: number,
		stepId: string | null,
		status?: ExecutionStatus,
	): void {
		if (attempt === 0) return;
		this.logger.debug('engine: held a resume request', {
			executionId,
			heldMs: attempt * this.hold.delayMs,
			...(stepId === null ? { outcome: 'no_target', status } : { outcome: 'target', stepId }),
		});
	}

	private async loadStatus(executionId: string): Promise<ExecutionStatus> {
		try {
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
