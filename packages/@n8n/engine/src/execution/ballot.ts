import type { JsonObject } from '../common';
import type {
	BallotDeclaration,
	BallotOutcome,
	BallotVotes,
	ExecutorWaitDeclaration,
} from './execution.types';

/** The most voters one ballot can have. */
export const MAX_BALLOT_VOTERS = 100;

interface Tally {
	approvals: number;
	declines: number;
	pending: number;
}

function tally(ballot: BallotDeclaration, votes: BallotVotes): Tally {
	let approvals = 0;
	let declines = 0;
	for (let voter = 0; voter < ballot.voters.length; voter++) {
		const vote = votes[String(voter)];
		if (vote?.decision === 'a') approvals++;
		if (vote?.decision === 'd') declines++;
	}
	return { approvals, declines, pending: ballot.voters.length - approvals - declines };
}

/**
 * The outcome the votes decide, or `undefined` while the ballot is open. The
 * ballot is declined as soon as the approvals still possible cannot reach
 * `required`.
 */
export function evaluateBallot(
	ballot: BallotDeclaration,
	votes: BallotVotes,
): Exclude<BallotOutcome, 'timedOut'> | undefined {
	const { approvals, pending } = tally(ballot, votes);
	if (approvals >= ballot.required) return 'approved';
	if (approvals + pending < ballot.required) return 'declined';
	return undefined;
}

/** The result of a settled ballot: the counts, and each voter's entry with its vote. */
export function ballotResult(
	ballot: BallotDeclaration,
	votes: BallotVotes,
	outcome: BallotOutcome,
	decidedAt: string,
): JsonObject {
	const { approvals, declines, pending } = tally(ballot, votes);
	return {
		decision: outcome,
		required: ballot.required,
		total: ballot.voters.length,
		approvals,
		declines,
		pending,
		decidedAt,
		votes: ballot.voters.map((voter, index) => {
			const vote = votes[String(index)];
			if (!vote) return { ...voter, decision: 'pending' };
			return {
				...voter,
				decision: vote.decision === 'a' ? 'approved' : 'declined',
				at: vote.votedAt,
			};
		}),
	};
}

/** Why a ballot declaration is invalid, or `undefined` if it is valid. */
export function ballotDeclarationProblem(wait: ExecutorWaitDeclaration): string | undefined {
	const { ballot } = wait;
	if (!ballot) return undefined;
	if (wait.resumeBinding !== 'step')
		return 'a ballot wait must bind its resume requests to the step';
	if (!Array.isArray(ballot.voters) || ballot.voters.length === 0) return 'a ballot has no voters';
	if (ballot.voters.length > MAX_BALLOT_VOTERS) {
		return `a ballot has more than ${MAX_BALLOT_VOTERS} voters`;
	}
	if (
		!Number.isInteger(ballot.required) ||
		ballot.required < 1 ||
		ballot.required > ballot.voters.length
	) {
		return `a ballot requires ${ballot.required} approvals from ${ballot.voters.length} voters`;
	}
	return undefined;
}
