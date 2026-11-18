import { describe, expect, it } from 'vitest';

import { ballotDeclarationProblem, ballotResult, evaluateBallot } from '../ballot';
import type { BallotDeclaration, BallotVotes } from '../execution.types';

const ballot = (required: number, voters = 3): BallotDeclaration => ({
	voters: Array.from({ length: voters }, (_, index) => ({ approver: `A${index}` })),
	required,
	allowDecline: true,
});

const votes = (...decisions: Array<'a' | 'd' | undefined>): BallotVotes =>
	Object.fromEntries(
		decisions.flatMap((decision, voter) =>
			decision
				? [[String(voter), { decision, votedAt: `2026-01-0${voter + 1}T00:00:00.000Z` }]]
				: [],
		),
	);

describe('evaluateBallot', () => {
	it('stays open while approval can still be reached', () => {
		expect(evaluateBallot(ballot(2), votes('a'))).toBeUndefined();
		expect(evaluateBallot(ballot(2), votes('d'))).toBeUndefined();
	});

	it('approves when enough voters approve', () => {
		expect(evaluateBallot(ballot(2), votes('a', undefined, 'a'))).toBe('approved');
		expect(evaluateBallot(ballot(1), votes(undefined, 'a'))).toBe('approved');
	});

	it('declines as soon as approval can no longer be reached', () => {
		expect(evaluateBallot(ballot(2), votes('d', 'd'))).toBe('declined');
		expect(evaluateBallot(ballot(3), votes(undefined, 'd'))).toBe('declined');
	});

	it('ignores votes of voters the ballot does not have', () => {
		expect(evaluateBallot(ballot(1, 1), { '5': { decision: 'a', votedAt: '' } })).toBeUndefined();
	});
});

describe('ballotResult', () => {
	it('counts the votes and adds each vote to its voter', () => {
		expect(
			ballotResult(ballot(2), votes('a', 'd'), 'timedOut', '2026-02-01T00:00:00.000Z'),
		).toEqual({
			decision: 'timedOut',
			required: 2,
			total: 3,
			approvals: 1,
			declines: 1,
			pending: 1,
			decidedAt: '2026-02-01T00:00:00.000Z',
			votes: [
				{ approver: 'A0', decision: 'approved', at: '2026-01-01T00:00:00.000Z' },
				{ approver: 'A1', decision: 'declined', at: '2026-01-02T00:00:00.000Z' },
				{ approver: 'A2', decision: 'pending' },
			],
		});
	});
});

describe('ballotDeclarationProblem', () => {
	it('accepts a valid ballot and a wait without one', () => {
		expect(ballotDeclarationProblem({ ballot: ballot(2), resumeBinding: 'step' })).toBeUndefined();
		expect(ballotDeclarationProblem({ resumeBinding: 'execution' })).toBeUndefined();
	});

	it.each([
		['no voters', { ...ballot(1), voters: [] }],
		['too many voters', ballot(1, 101)],
		['zero required', ballot(0)],
		['more required than voters', ballot(4)],
		['a fractional requirement', ballot(1.5)],
	])('refuses %s', (_, declaration) => {
		expect(ballotDeclarationProblem({ ballot: declaration, resumeBinding: 'step' })).toBeDefined();
	});
});
