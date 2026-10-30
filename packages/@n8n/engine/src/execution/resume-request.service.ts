import { setTimeout as sleep } from 'node:timers/promises';

import { verifyResumeToken, type ResumeTokenClaims } from '../auth/resume-token';
import type { StepMessage, WorkQueue } from '../queue';
import { ExecutionNotFoundError, type ExecutionStore } from './execution-store';
import {
	isLiveExecutionStatus,
	isSettledStatus,
	type ExecutionStatus,
	type ResumeBinding,
	type StepSlots,
} from './execution.types';
import { StepNotFoundError, type StepRecord, type StepStore } from './step-store';

export type ResumeRejection =
	| 'invalid_token'
	| 'not_found'
	| 'not_waiting'
	| 'ambiguous'
	| 'step_bound_only';

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

/** What `locateByToken` found: the execution of the id, and its waiting step if any. */
export interface ResumeLocation {
	executionId: string;
	target: ResumeTarget | null;
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

/** A step that waits for a request bound to `binding`. */
const waitsFor =
	(binding: ResumeBinding) =>
	({ status, waitDeclaration }: StepRecord) =>
		status === 'waiting' && waitDeclaration?.resumeBinding === binding;

/** The waits that each kind of token can end (token record, decision 4). */
const BINDING_OF_KIND: Record<ResumeTokenClaims['kind'], ResumeBinding> = {
	'execution-bound': 'execution',
	'step-bound': 'step',
	'approval-callback': 'step',
};

/** The id a token names: an execution for an execution-bound token, else a step. */
const idOf = (claims: ResumeTokenClaims) =>
	claims.kind === 'execution-bound' ? claims.executionId : claims.stepId;

const namesStep = (claims: ResumeTokenClaims, step: StepRecord) =>
	claims.kind === 'execution-bound'
		? claims.executionId === step.executionId
		: claims.stepId === step.id;

/**
 * Accepts resume requests (ADR-20260902-steps-declare-waits, decision 5).
 *
 * Two calls, because the control plane runs the node's resume method: it must
 * know which node waits before that code runs, and the request must be
 * authorized before any node code runs.
 *
 * 1. `locate` or `locateByToken` verifies the token and names the waiting step.
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
	 * @throws {ResumeRejectedError} `invalid_token`, `not_found`, `ambiguous`
	 * when a live execution has two execution-bound waits, or `step_bound_only`
	 * when the hold runs out and the execution has only step-bound waits.
	 */
	async locate(executionId: string, token: string): Promise<ResumeTarget | null> {
		const claims = verifyResumeToken(this.secret, token);
		if (claims?.kind !== 'execution-bound' || claims.executionId !== executionId) {
			throw new ResumeRejectedError('invalid_token');
		}
		return await this.locateExecutionBoundWait(executionId);
	}

	/**
	 * Verifies the token and returns the wait it can end, for every kind of
	 * token. The control plane cannot tell an execution id from a step id, and
	 * it does not read the token, so the kind of the token decides what `id`
	 * names. An execution-bound token gets the answer of `locate`.
	 *
	 * @throws {ResumeRejectedError} `invalid_token` when the token does not
	 * name `id`, or a step-bound token binds another path and query; else as
	 * `locate`, and `not_found` for a step that does not exist.
	 */
	async locateByToken(id: string, token: string, pathAndQuery?: string): Promise<ResumeLocation> {
		const claims = verifyResumeToken(this.secret, token);
		if (!claims || idOf(claims) !== id) throw new ResumeRejectedError('invalid_token');
		// One literal string, never rebuilt from parsed values: two different
		// queries can parse to the same values.
		if (claims.kind === 'step-bound' && pathAndQuery !== claims.binding) {
			throw new ResumeRejectedError('invalid_token');
		}

		if (claims.kind === 'execution-bound') {
			return { executionId: id, target: await this.locateExecutionBoundWait(id) };
		}
		return await this.locateStepBoundWait(id);
	}

	private async locateExecutionBoundWait(executionId: string): Promise<ResumeTarget | null> {
		let stepBoundOnly = false;
		for (let attempt = 0; attempt < this.hold.attempts; attempt++) {
			if (attempt > 0) await sleep(this.hold.delayMs);
			const [status, waits] = await Promise.all([
				this.loadStatus(executionId),
				this.stepStore.loadWaitingSteps(executionId),
			]);
			// An execution ends before its waits are cancelled, so its status decides first.
			if (!isLive(status)) return null;
			const executionBound = waits.filter(waitsFor('execution'));
			if (executionBound.length > 1) throw new ResumeRejectedError('ambiguous');
			if (executionBound[0]) {
				return { stepId: executionBound[0].id, nodeId: executionBound[0].nodeId };
			}
			stepBoundOnly = waits.some(waitsFor('step'));
		}
		// Holds first, because another branch can still reach an execution-bound
		// wait. The token is valid for this execution, so the caller may learn why.
		if (stepBoundOnly) throw new ResumeRejectedError('step_bound_only');
		return null;
	}

	/**
	 * The step row exists before its node runs, so a request can arrive while
	 * the step still runs: hold as `locate` does. A settled step never waits
	 * again, because a loop runs its next iteration as a new step.
	 */
	private async locateStepBoundWait(stepId: string): Promise<ResumeLocation> {
		for (let attempt = 1; ; attempt++) {
			const step = await this.loadStep(stepId, 'not_found');
			const live = isLive(await this.loadStatus(step.executionId));
			if (live && waitsFor('step')(step)) {
				return { executionId: step.executionId, target: { stepId: step.id, nodeId: step.nodeId } };
			}
			if (!live || isSettledStatus(step.status) || attempt >= this.hold.attempts) {
				return { executionId: step.executionId, target: null };
			}
			await sleep(this.hold.delayMs);
		}
	}

	/**
	 * Ends the wait of `stepId` with `outputs`, and announces the step. The
	 * worker that claims it emits the outputs. A second wait does not refuse
	 * the request: `locate` chose the step while it was the only one. The
	 * binding of a step-bound token is not compared here: `locateByToken`
	 * compared it with the request.
	 *
	 * @throws {ResumeRejectedError} `invalid_token` when the token names
	 * neither the step nor its execution, or `not_waiting` when the step does
	 * not wait (any more) for a request of the token's kind, or its execution
	 * ended.
	 */
	async resolve(stepId: string, token: string, outputs: StepSlots): Promise<StepRecord> {
		// As a bad token, so a caller cannot learn whether a step id exists.
		const step = await this.loadStep(stepId, 'invalid_token');
		const claims = verifyResumeToken(this.secret, token);
		if (!claims || !namesStep(claims, step)) throw new ResumeRejectedError('invalid_token');
		if (!waitsFor(BINDING_OF_KIND[claims.kind])(step)) {
			throw new ResumeRejectedError('not_waiting');
		}
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

	private async loadStatus(executionId: string): Promise<ExecutionStatus> {
		try {
			// TODO(CET-488): load only the status.
			return (await this.executionStore.loadExecution(executionId)).status;
		} catch (error) {
			if (error instanceof ExecutionNotFoundError) throw new ResumeRejectedError('not_found');
			throw error;
		}
	}

	private async loadStep(stepId: string, ifMissing: ResumeRejection): Promise<StepRecord> {
		try {
			return await this.stepStore.loadStep(stepId);
		} catch (error) {
			if (error instanceof StepNotFoundError) throw new ResumeRejectedError(ifMissing);
			throw error;
		}
	}
}
