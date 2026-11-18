import { setTimeout as sleep } from 'node:timers/promises';

import { verifyResumeToken, type ResumeTokenClaims } from '../auth/resume-token';
import type { StepMessage, WorkQueue } from '../queue';
import { ExecutionNotFoundError, type ExecutionStore } from './execution-store';
import { evaluateBallot } from './ballot';
import {
	isLiveExecutionStatus,
	isSettledStatus,
	type BallotDecision,
	type BallotOutcome,
	type ExecutionStatus,
	type ResumeBinding,
	type StepSlots,
} from './execution.types';
import { StepNotFoundError, type StepRecord, type StepStore } from './step-store';

export type ResumeRejection =
	/**
	 * The token does not verify, names another id, or binds another path and
	 * query. `resolve` also answers it for a step that does not exist.
	 */
	| 'invalid_token'
	/** The execution or the step does not exist. */
	| 'not_found'
	/** The step does not wait (any more) for a request of the token's kind, or its execution ended. */
	| 'not_waiting'
	/** The execution has two execution-bound waits, so an execution-bound token cannot pick one. */
	| 'ambiguous'
	/**
	 * The token is execution bound, and after the hold the execution has a
	 * step-bound wait but no execution-bound wait.
	 */
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

/** The execution of a resume request, and the wait that its token can end, if any. */
export interface ResumeLocation {
	executionId: string;
	target: ResumeTarget | null;
}

/**
 * How long `locateByToken` holds a request for an execution that still runs
 * but has no step that accepts a request yet. The default covers the write of
 * the `waiting` row, not upstream work.
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

/** Whether the step waits for a resume request. Only votes end a ballot wait. */
const waitsFor =
	(binding: ResumeBinding) =>
	({ status, waitDeclaration }: StepRecord) =>
		status === 'waiting' &&
		waitDeclaration?.resumeBinding === binding &&
		waitDeclaration.ballot === undefined;

/** The waits that each kind of token can end (token record, decision 4). */
const BINDING_OF_KIND: Record<ResumeTokenClaims['kind'], ResumeBinding> = {
	'execution-bound': 'execution',
	'step-bound': 'step',
	'approval-callback': 'step',
};

/** What happened to a vote. */
export type BallotVoteResult =
	| {
			/** `duplicate`: the voter already voted, and the first vote stays. */
			result: 'recorded' | 'duplicate';
			/** Set when this vote decided the ballot. */
			outcome?: Exclude<BallotOutcome, 'timedOut'>;
	  }
	| {
			/** The ballot no longer takes votes. `inactive`: it ended without an outcome. */
			result: 'closed';
			outcome: BallotOutcome | 'inactive';
	  };

/** The vote in the query of a ballot link: `voter=<index>&vote=<a|d>`. */
function parseBallotVote(
	pathAndQuery: string,
): { voter: number; decision: BallotDecision } | undefined {
	const queryStart = pathAndQuery.indexOf('?');
	if (queryStart === -1) return undefined;
	const query = new URLSearchParams(pathAndQuery.slice(queryStart + 1));
	const voter = query.get('voter');
	const decision = query.get('vote');
	if (voter === null || !/^\d{1,3}$/.test(voter)) return undefined;
	if (decision !== 'a' && decision !== 'd') return undefined;
	return { voter: Number(voter), decision };
}

/** How a ballot that no longer takes votes ended. */
function closedOutcome(step: StepRecord): BallotOutcome | 'inactive' {
	if (step.resumeCause?.kind === 'ballot') return step.resumeCause.outcome;
	if (step.resumeCause?.kind === 'deadline') return 'timedOut';
	return 'inactive';
}

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
 * 1. `locateByToken` verifies the token and names the waiting step.
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
	 * Verifies the token and returns the wait it can end. The kind of the token
	 * decides whether `id` names an execution or a step. The target is `null`
	 * when no step accepts the request.
	 *
	 * A request can arrive before the step writes its wait. While the execution
	 * is live, this retries for a short time.
	 *
	 * @throws {ResumeRejectedError} `invalid_token`, `not_found`, `ambiguous` or `step_bound_only`.
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
		const answer = await this.poll<ResumeTarget | 'step_bound_only' | null>(async () => {
			const [status, waits] = await Promise.all([
				this.loadStatus(executionId),
				this.stepStore.loadWaitingSteps(executionId),
			]);
			// An execution ends before its waits are cancelled, so its status decides first.
			if (!isLive(status)) return { done: true, answer: null };
			const executionBound = waits.filter(waitsFor('execution'));
			if (executionBound.length > 1) throw new ResumeRejectedError('ambiguous');
			if (executionBound[0]) {
				const { id, nodeId } = executionBound[0];
				return { done: true, answer: { stepId: id, nodeId } };
			}
			return { done: false, answer: waits.some(waitsFor('step')) ? 'step_bound_only' : null };
		});
		// Holds first, because another branch can still reach an execution-bound
		// wait. The token is valid for this execution, so the caller may learn why.
		if (answer === 'step_bound_only') throw new ResumeRejectedError('step_bound_only');
		return answer;
	}

	/**
	 * The node sends its URL or button while its step runs, and the step waits
	 * only after the node returns. A request can arrive in between: hold as for
	 * an execution-bound request. A settled step never waits again, because a
	 * loop runs its next iteration as a new step.
	 */
	private async locateStepBoundWait(stepId: string): Promise<ResumeLocation> {
		return await this.poll<ResumeLocation>(async () => {
			const step = await this.loadStep(stepId, 'not_found');
			const live = isLive(await this.loadStatus(step.executionId));
			if (live && waitsFor('step')(step)) {
				const target = { stepId: step.id, nodeId: step.nodeId };
				return { done: true, answer: { executionId: step.executionId, target } };
			}
			return {
				done: !live || isSettledStatus(step.status),
				answer: { executionId: step.executionId, target: null },
			};
		});
	}

	/**
	 * Calls `check` until it is done, at most `hold.attempts` times and
	 * `hold.delayMs` apart, and returns its last answer.
	 */
	private async poll<T>(check: () => Promise<{ done: boolean; answer: T }>): Promise<T> {
		let result = await check();
		for (let attempt = 1; !result.done && attempt < this.hold.attempts; attempt++) {
			await sleep(this.hold.delayMs);
			result = await check();
		}
		return result.answer;
	}

	/**
	 * Ends the wait of `stepId` with `outputs`, and announces the step. The
	 * worker that claims it emits the outputs. A second wait does not refuse
	 * the request: `locateByToken` chose the step while it was the only one. The
	 * binding of a step-bound token is not compared here: `locateByToken`
	 * compared it with the request.
	 *
	 * @throws {ResumeRejectedError} `invalid_token` or `not_waiting`.
	 */
	async resolve(stepId: string, token: string, outputs: StepSlots): Promise<StepRecord> {
		const claims = verifyResumeToken(this.secret, token);
		if (!claims) throw new ResumeRejectedError('invalid_token');
		// As a bad token, so a caller cannot learn whether a step id exists.
		const step = await this.loadStep(stepId, 'invalid_token');
		if (!namesStep(claims, step)) throw new ResumeRejectedError('invalid_token');
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

	/**
	 * Records a vote on the ballot of a waiting step. The token must be step
	 * bound and bind `pathAndQuery`, and the vote is read from that bound query
	 * (`voter` and `vote`), so the caller cannot change it. When the votes decide
	 * the ballot, this resumes the step and announces it.
	 *
	 * @throws {ResumeRejectedError} `invalid_token`, `not_found` or `not_waiting`.
	 */
	async castBallotVote(
		stepId: string,
		token: string,
		pathAndQuery: string,
	): Promise<BallotVoteResult> {
		const claims = verifyResumeToken(this.secret, token);
		if (claims?.kind !== 'step-bound' || claims.stepId !== stepId) {
			throw new ResumeRejectedError('invalid_token');
		}
		if (pathAndQuery !== claims.binding) throw new ResumeRejectedError('invalid_token');
		const vote = parseBallotVote(pathAndQuery);
		if (!vote) throw new ResumeRejectedError('invalid_token');

		// The node sends its links while its step runs: hold as `locateByToken` does.
		const { step, live } = await this.poll(async () => {
			const loaded = await this.loadStep(stepId, 'not_found');
			const isLiveNow = isLive(await this.loadStatus(loaded.executionId));
			const answer = { step: loaded, live: isLiveNow };
			return { done: !isLiveNow || loaded.status !== 'running', answer };
		});

		const ballot = step.waitDeclaration?.ballot;
		if (!ballot) {
			if (step.status === 'waiting' || isSettledStatus(step.status)) {
				throw new ResumeRejectedError('not_waiting');
			}
			return { result: 'closed', outcome: 'inactive' };
		}
		if (vote.voter >= ballot.voters.length || (vote.decision === 'd' && !ballot.allowDecline)) {
			throw new ResumeRejectedError('invalid_token');
		}
		if (!live || step.status !== 'waiting')
			return { result: 'closed', outcome: closedOutcome(step) };

		const recorded = await this.stepStore.recordBallotVote(
			step.id,
			vote.voter,
			vote.decision,
			new Date(),
		);
		if (!recorded.recorded) {
			return recorded.step.status === 'waiting'
				? { result: 'duplicate' }
				: { result: 'closed', outcome: closedOutcome(recorded.step) };
		}

		const outcome = evaluateBallot(ballot, recorded.step.ballotVotes ?? {});
		if (!outcome) return { result: 'recorded' };

		const resumed = await this.stepStore.resumeStep(step.id, {
			kind: 'ballot',
			outcome,
			decidedAt: new Date().toISOString(),
		});
		// Another vote that decided the ballot resumed the step first.
		if (!resumed) return { result: 'recorded', outcome };

		// TODO(CAT-2938): a crash here leaves the step `queued` with nothing to announce it.
		await this.stepQueue.publish({
			type: 'step:ready',
			executionId: step.executionId,
			stepId: step.id,
		});
		return { result: 'recorded', outcome };
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
