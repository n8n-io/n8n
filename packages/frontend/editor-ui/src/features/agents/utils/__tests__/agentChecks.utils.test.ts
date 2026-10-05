import { describe, expect, it } from 'vitest';

import type { AgentEvalCase, AgentEvalResultRecord } from '../../agentEvals.types';
import {
	buildChecks,
	checkCounts,
	exampleState,
	matchesFilter,
	nameFromRule,
	singleState,
	toolCallParts,
} from '../agentChecks.utils';

const evalCase = (rowId: number, over: Partial<AgentEvalCase> = {}): AgentEvalCase => ({
	rowId,
	input: `Message ${rowId}`,
	whatToCheck: 'Ask which ticket when none is named',
	...over,
});

const result = (
	id: string,
	rowId: number,
	verdict: 'pass' | 'needs_work' | null,
	over: Partial<AgentEvalResultRecord> = {},
): AgentEvalResultRecord => ({
	id,
	runId: 'run',
	sourceRowId: String(rowId),
	runIndex: 0,
	status: 'success',
	input: null,
	output: { finalText: `Reply ${id}` },
	toolCalls: { calls: [{ tool: 'search', kind: 'node', mocked: true, interceptedRequests: [] }] },
	metrics: verdict
		? { verdict: { result: verdict, reason: `Reason ${id}`, judgedBy: 'agent_model' } }
		: null,
	runAt: null,
	completedAt: '2026-10-01T10:00:00.000Z',
	errorCode: null,
	errorDetails: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-01T10:00:00.000Z',
	...over,
});

describe('agentChecks.utils', () => {
	describe('buildChecks', () => {
		it('groups examples by check name and falls back to the rule', () => {
			const checks = buildChecks(
				[
					evalCase(1, { check: 'Asks which ticket' }),
					evalCase(2, { check: 'Asks which ticket' }),
					evalCase(3, { whatToCheck: 'Never share phone numbers.' }),
				],
				[],
			);

			expect(checks.map((c) => [c.name, c.examples.length])).toEqual([
				['Asks which ticket', 2],
				['Never share phone numbers', 1],
			]);
		});

		it("takes each example's newest result across partial runs", () => {
			// Newest run covered only row 2; row 1's newest result is in the older run.
			const checks = buildChecks(
				[evalCase(1, { check: 'A' }), evalCase(2, { check: 'A' })],
				[
					[result('new-2', 2, 'pass')],
					[result('old-1', 1, 'needs_work'), result('old-2', 2, 'needs_work')],
				],
			);

			const [check] = checks;
			expect(check.examples.map((ex) => [ex.rowId, ex.result?.id, ex.state])).toEqual([
				[1, 'old-1', 'needs_work'],
				[2, 'new-2', 'pass'],
			]);
			expect(check.needsWork).toBe(1);
			expect(check.examples[0].reason).toBe('Reason old-1');
			expect(check.examples[0].toolCalls).toHaveLength(1);
		});

		it('marks a check broke when an example went from passing to needs work', () => {
			const [check] = buildChecks(
				[evalCase(1, { check: 'A' })],
				[[result('r2', 1, 'needs_work')], [result('r1', 1, 'pass')]],
			);
			expect(check.change).toBe('broke');
		});

		it('marks a check fixed when an example went from needs work to passing', () => {
			const [check] = buildChecks(
				[evalCase(1, { check: 'A' })],
				[[result('r2', 1, 'pass')], [result('r1', 1, 'needs_work')]],
			);
			expect(check.change).toBe('fixed');
		});

		it('counts an example marked "Actually fine" as passing', () => {
			const [check] = buildChecks(
				[evalCase(1, { check: 'A' })],
				[[result('r1', 1, 'needs_work')]],
				new Set(['r1']),
			);
			expect(check.examples[0].state).toBe('pass');
			expect(check.needsWork).toBe(0);
		});

		it('sorts checks that need work first', () => {
			const checks = buildChecks(
				[evalCase(1, { check: 'Passes' }), evalCase(2, { check: 'Breaks' })],
				[[result('a', 1, 'pass'), result('b', 2, 'needs_work')]],
			);
			expect(checks.map((c) => c.name)).toEqual(['Breaks', 'Passes']);
		});
	});

	describe('exampleState', () => {
		it('reads running, failed, not run and unjudged results', () => {
			expect(exampleState(null)).toBe('not_run');
			expect(exampleState(result('a', 1, null, { status: 'running' }))).toBe('running');
			expect(exampleState(result('a', 1, null, { status: 'error' }))).toBe('failed');
			expect(exampleState(result('a', 1, null, { status: 'cancelled' }))).toBe('not_run');
			expect(exampleState(result('a', 1, null))).toBe('pass');
		});

		it('counts a result the judge failed on as failed, not as a pass', () => {
			const unjudged = result('a', 1, null, {
				metrics: { judgeError: 'The judge returned an unreadable verdict.' },
			});

			expect(exampleState(unjudged)).toBe('failed');
			expect(exampleState(unjudged, true)).toBe('pass');
		});
	});

	describe('checkCounts, matchesFilter and singleState', () => {
		const checks = buildChecks(
			[evalCase(1, { check: 'A' }), evalCase(2, { check: 'B' }), evalCase(3, { check: 'C' })],
			[[result('r1', 1, 'needs_work'), result('r2', 2, 'pass')]],
		);

		it('counts checks that need work, pass and were never run', () => {
			expect(checkCounts(checks)).toEqual({ total: 3, needsWork: 1, pass: 1, notRun: 1 });
		});

		it('filters by state', () => {
			expect(checks.filter((c) => matchesFilter(c, 'needs_work')).map((c) => c.name)).toEqual([
				'A',
			]);
			expect(checks.filter((c) => matchesFilter(c, 'pass')).map((c) => c.name)).toEqual(['B']);
			expect(checks.filter((c) => matchesFilter(c, 'not_run')).map((c) => c.name)).toEqual(['C']);
			expect(checks.filter((c) => matchesFilter(c, 'all'))).toHaveLength(3);
		});

		it('names the one state every check is in, or none when they differ', () => {
			expect(singleState(checkCounts(checks))).toBeNull();
			const allPass = buildChecks([evalCase(1, { check: 'A' })], [[result('r1', 1, 'pass')]]);
			expect(singleState(checkCounts(allPass))).toBe('pass');
			const allFail = buildChecks([evalCase(1, { check: 'A' })], [[result('r1', 1, 'needs_work')]]);
			expect(singleState(checkCounts(allFail))).toBe('needs_work');
			expect(singleState(checkCounts([]))).toBeNull();
		});
	});

	describe('toolCallParts', () => {
		it('formats the tool name and takes the first text input as the detail', () => {
			expect(
				toolCallParts({
					tool: 'search_tickets',
					kind: 'node',
					mocked: true,
					interceptedRequests: [],
					input: { query: 'SSO', limit: 5 },
				}),
			).toEqual({ tool: 'Search tickets', detail: 'SSO' });
			expect(
				toolCallParts({
					tool: 'post_message',
					kind: 'node',
					mocked: true,
					interceptedRequests: [],
				}),
			).toEqual({ tool: 'Post message', detail: null });
		});
	});

	describe('nameFromRule', () => {
		it('drops the final punctuation and shortens long rules', () => {
			expect(nameFromRule('Never share phone numbers.')).toBe('Never share phone numbers');
			expect(nameFromRule('one two three four five six seven eight nine ten')).toBe(
				'one two three four five six seven eight…',
			);
		});
	});
});
