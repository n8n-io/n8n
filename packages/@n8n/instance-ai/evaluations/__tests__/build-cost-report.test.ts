import { jsonParse } from 'n8n-workflow';
import { afterEach, vi } from 'vitest';

import {
	greenStats,
	persistedSpendCosts,
	renderMarkdown,
	sumThreadCost,
	threadJoinCosts,
} from '../cli/build-cost-report';
import type { ArmSummary, EvalResults, ReportTestCase } from '../cli/build-cost-report';

const scenarioRun = (passed: boolean, incomplete = false) => ({ passed, incomplete });
const expectation = (pass: boolean, incomplete = false) => ({ pass, incomplete });

const testCase = (overrides: Partial<ReportTestCase> = {}): ReportTestCase => ({
	name: 'case',
	status: 'completed',
	totalRuns: 3,
	...overrides,
});

describe('greenStats', () => {
	it.each([
		{
			label: 'every evaluated unit passing → all iterations green',
			tc: testCase({
				scenarios: [{ name: 's', runs: [scenarioRun(true), scenarioRun(true), scenarioRun(true)] }],
			}),
			expected: { green: 3, evaluated: 3 },
		},
		{
			label: 'one failing scenario run reddens only its iteration',
			tc: testCase({
				scenarios: [
					{ name: 's', runs: [scenarioRun(true), scenarioRun(false), scenarioRun(true)] },
				],
			}),
			expected: { green: 2, evaluated: 3 },
		},
		{
			label: 'a failing build expectation reddens an iteration whose scenarios passed',
			tc: testCase({
				totalRuns: 2,
				scenarios: [{ name: 's', runs: [scenarioRun(true), scenarioRun(true)] }],
				buildExpectationResultsPerRun: [[expectation(true)], [expectation(false)]],
			}),
			expected: { green: 1, evaluated: 2 },
		},
		{
			label: 'incomplete units count neither way; only-incomplete iterations are not evaluated',
			tc: testCase({
				totalRuns: 2,
				scenarios: [{ name: 's', runs: [scenarioRun(true), scenarioRun(false, true)] }],
			}),
			expected: { green: 1, evaluated: 1 },
		},
		{
			label: 'build-only cases evaluate on expectations alone',
			tc: testCase({
				totalRuns: 2,
				buildExpectationResultsPerRun: [
					[expectation(true), expectation(true)],
					[expectation(true), expectation(false)],
				],
			}),
			expected: { green: 1, evaluated: 2 },
		},
		{
			label: 'iterations with no verdicts at all are not evaluated',
			tc: testCase({ totalRuns: 2 }),
			expected: { green: 0, evaluated: 0 },
		},
		{
			label: 'short scenario-run arrays and null expectation rows are skipped, not failed',
			tc: testCase({
				totalRuns: 3,
				scenarios: [{ name: 's', runs: [scenarioRun(true)] }],
				buildExpectationResultsPerRun: [null, [expectation(true)], null],
			}),
			expected: { green: 2, evaluated: 2 },
		},
	])('$label', ({ tc, expected }) => {
		expect(greenStats(tc)).toEqual(expected);
	});
});

describe('persistedSpendCosts', () => {
	it('carries per-iteration spend through and means turns over known iterations', () => {
		const results: EvalResults = {
			totalRuns: 3,
			testCases: [
				testCase({
					name: 'case-a',
					testCaseFile: 'case-a.json',
					buildCostUsdPerRun: [0.1, null, 0.3],
					buildTurnsPerRun: [10, null, 20],
					scenarios: [
						{ name: 's', runs: [scenarioRun(true), scenarioRun(true), scenarioRun(false)] },
					],
				}),
			],
		};

		const [caseCost] = persistedSpendCosts(results);

		expect(caseCost.slug).toBe('case-a.json');
		expect(caseCost.costPerIteration).toEqual([0.1, null, 0.3]);
		expect(caseCost.meanTurns).toBe(15);
		expect(caseCost.greenIterations).toBe(2);
		expect(caseCost.evaluatedIterations).toBe(3);
	});

	it('records unknown cost (null), not $0, when no spend was persisted', () => {
		const results: EvalResults = {
			totalRuns: 2,
			testCases: [testCase({ name: 'case-b', totalRuns: 2 })],
		};

		const [caseCost] = persistedSpendCosts(results);

		expect(caseCost.costPerIteration).toEqual([null, null]);
		expect(caseCost.meanTurns).toBeUndefined();
	});
});

describe('LangSmith thread costs', () => {
	const ls = { apiUrl: 'https://langsmith.test', headers: {} };

	const stubRunsQuery = (runsByThread: Record<string, unknown[]>) => {
		vi.stubGlobal(
			'fetch',
			vi.fn((_url: unknown, init?: RequestInit) => {
				const body = typeof init?.body === 'string' ? init.body : '{}';
				const { filter } = jsonParse<{ filter: string }>(body);
				const threadId = /eq\(thread_id, "([^"]+)"\)/.exec(filter)?.[1] ?? '';
				return { ok: true, status: 200, json: () => ({ runs: runsByThread[threadId] ?? [] }) };
			}),
		);
	};

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe('sumThreadCost', () => {
		it('returns null (unknown) for a thread with no runs in the project', async () => {
			stubRunsQuery({});

			expect(await sumThreadCost(ls, 'project-1', 'thread-x')).toBeNull();
		});

		it('sums cost, tokens and turns over the thread root runs', async () => {
			stubRunsQuery({
				'thread-x': [
					{ id: 'r1', total_cost: 0.5, total_tokens: 100 },
					{ id: 'r2', total_cost: 0.25, total_tokens: 50 },
					{ id: 'r3', total_cost: null, total_tokens: null },
				],
			});

			expect(await sumThreadCost(ls, 'project-1', 'thread-x')).toEqual({
				costUsd: 0.75,
				tokens: 150,
				turns: 3,
			});
		});

		it('warns when the page limit is hit so truncated totals are not silent', async () => {
			stubRunsQuery({
				'thread-x': Array.from({ length: 100 }, (_, i) => ({
					id: `r${i}`,
					total_cost: 0.01,
					total_tokens: 10,
				})),
			});
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const cost = await sumThreadCost(ls, 'project-1', 'thread-x');

			expect(cost?.turns).toBe(100);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('undercounted'));
		});
	});

	describe('threadJoinCosts', () => {
		it('sums resolved threads and records unresolved ones as unknown, not $0', async () => {
			stubRunsQuery({
				'thread-resolved': [
					{ id: 'r1', total_cost: 0.5, total_tokens: 100 },
					{ id: 'r2', total_cost: 0.25, total_tokens: 50 },
				],
			});
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const results: EvalResults = {
				totalRuns: 2,
				testCases: [
					testCase({
						name: 'resolved',
						totalRuns: 2,
						threadIds: ['thread-resolved', null],
						scenarios: [{ name: 's', runs: [scenarioRun(true), scenarioRun(true)] }],
					}),
					testCase({ name: 'unresolved', totalRuns: 1, threadIds: ['thread-missing'] }),
				],
			};

			const [resolved, unresolved] = await threadJoinCosts(results, ls, 'project-1', 5);

			expect(resolved.costPerIteration).toEqual([0.75, null]);
			expect(resolved.meanTurns).toBe(2);
			expect(resolved.meanTokens).toBe(150);
			expect(unresolved.costPerIteration).toEqual([null]);
			expect(unresolved.meanTurns).toBeUndefined();
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('thread-missing'));
		});
	});
});

describe('renderMarkdown', () => {
	it('renders unknown costs as — and keeps known means intact', () => {
		const arms: ArmSummary[] = [
			{
				label: 'aia',
				source: 'LangSmith thread pricing',
				cases: [
					{
						slug: 'known-case',
						costPerIteration: [0.2, 0.4],
						meanTurns: 3,
						greenIterations: 2,
						evaluatedIterations: 2,
					},
					{
						slug: 'unknown-case',
						costPerIteration: [null],
						greenIterations: 1,
						evaluatedIterations: 1,
					},
				],
			},
		];

		const markdown = renderMarkdown(arms);

		expect(markdown).toContain('| known-case | $0.300 | 2/2 | 3.0 |');
		expect(markdown).toContain('| unknown-case | — | 1/1 | — |');
		expect(markdown).toContain('2 builds with cost');
	});
});
