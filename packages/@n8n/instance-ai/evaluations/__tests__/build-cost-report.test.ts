import { jsonParse } from 'n8n-workflow';
import { afterEach, vi } from 'vitest';

import {
	DEFAULT_TOKEN_RATES,
	greenStats,
	persistedSpendCosts,
	persistedTokenCosts,
	priceTokens,
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

describe('priceTokens', () => {
	it('prices each token class at its own rate', () => {
		// 1M uncached @3 + 1M cacheRead @0.3 + 1M cacheWrite @3.75 + 1M output @15
		const cost = priceTokens(
			{
				uncachedInput: 1_000_000,
				cacheRead: 1_000_000,
				cacheWrite: 1_000_000,
				output: 1_000_000,
				totalTokens: 4_000_000,
				steps: 1,
			},
			DEFAULT_TOKEN_RATES,
		);
		expect(cost).toBeCloseTo(22.05, 6);
	});

	it('prices cache reads far below uncached input', () => {
		// The reason the breakdown is persisted at all: folding cache reads into
		// input would hide the largest cost term a memory change moves.
		const base = { cacheWrite: 0, output: 0, totalTokens: 0, steps: 1 };
		const uncached = priceTokens(
			{ ...base, uncachedInput: 1_000_000, cacheRead: 0 },
			DEFAULT_TOKEN_RATES,
		);
		const cached = priceTokens(
			{ ...base, uncachedInput: 0, cacheRead: 1_000_000 },
			DEFAULT_TOKEN_RATES,
		);
		expect(cached).toBeLessThan(uncached);
	});
});

describe('persistedTokenCosts', () => {
	const tokens = (over: Partial<Record<string, number>> = {}) => ({
		uncachedInput: 100_000,
		cacheRead: 0,
		cacheWrite: 0,
		output: 0,
		totalTokens: 100_000,
		steps: 2,
		...over,
	});

	it('prices each iteration locally and means tokens and tool calls', () => {
		const results: EvalResults = {
			experimentName: 'candidate',
			totalRuns: 2,
			testCases: [
				testCase({
					totalRuns: 2,
					buildTokensPerRun: [tokens(), tokens({ uncachedInput: 300_000, totalTokens: 300_000 })],
					buildToolCallsPerRun: [4, 8],
					scenarios: [{ name: 's', runs: [scenarioRun(true), scenarioRun(true)] }],
				}),
			],
		};
		const [c] = persistedTokenCosts(results, DEFAULT_TOKEN_RATES);
		expect(c.costPerIteration[0]).toBeCloseTo(0.3, 6);
		expect(c.costPerIteration[1]).toBeCloseTo(0.9, 6);
		expect(c.meanTokens).toBe(200_000);
		expect(c.meanToolCalls).toBe(6);
		expect(c.greenIterations).toBe(2);
	});

	it('records unknown cost (null), not $0, for an iteration that captured nothing', () => {
		const results: EvalResults = {
			totalRuns: 2,
			testCases: [
				testCase({
					totalRuns: 2,
					buildTokensPerRun: [null, tokens()],
					buildToolCallsPerRun: [null, 3],
				}),
			],
		};
		const [c] = persistedTokenCosts(results, DEFAULT_TOKEN_RATES);
		expect(c.costPerIteration[0]).toBeNull();
		expect(c.costPerIteration[1]).not.toBeNull();
		expect(c.meanToolCalls).toBe(3);
	});

	it('honours overridden rates', () => {
		const results: EvalResults = {
			totalRuns: 1,
			testCases: [testCase({ totalRuns: 1, buildTokensPerRun: [tokens()] })],
		};
		const [c] = persistedTokenCosts(results, { ...DEFAULT_TOKEN_RATES, uncachedInput: 30 });
		expect(c.costPerIteration[0]).toBeCloseTo(3, 6);
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

	it('keeps header and row cells aligned when only one arm has token columns', () => {
		// The column set is decided per arm; if the header and the rows disagreed on
		// which optional columns exist, every cell after the mismatch would shift into
		// the wrong column and the report would be quietly wrong rather than broken.
		const arms: ArmSummary[] = [
			{
				label: 'tokens-arm',
				source: 'persisted tokens (priced locally)',
				cases: [
					{
						slug: 'shared-case',
						costPerIteration: [0.5],
						meanTurns: 2,
						meanTokens: 1_234,
						meanToolCalls: 7,
						greenIterations: 1,
						evaluatedIterations: 1,
					},
				],
			},
			{
				label: 'spend-arm',
				source: 'persisted `claude` spend',
				cases: [
					{
						slug: 'shared-case',
						costPerIteration: [0.25],
						meanTurns: 4,
						greenIterations: 1,
						evaluatedIterations: 1,
					},
					{
						slug: 'spend-only-case',
						costPerIteration: [0.1],
						greenIterations: 0,
						evaluatedIterations: 1,
					},
				],
			},
		];

		const markdown = renderMarkdown(arms);
		const lines = markdown.split('\n').filter((l) => l.startsWith('|'));
		const cellCount = (line: string) => line.split('|').length;

		// Header, separator and every row must have identical cell counts.
		const counts = new Set(lines.map(cellCount));
		expect(counts.size).toBe(1);

		// tokens-arm earns tokens+tools columns; spend-arm earns neither.
		expect(markdown).toContain('tokens-arm tokens');
		expect(markdown).toContain('tokens-arm tools');
		expect(markdown).not.toContain('spend-arm tokens');
		expect(markdown).not.toContain('spend-arm tools');

		// A case missing from the token arm still pads that arm's optional columns.
		const missingRow = lines.find((l) => l.includes('spend-only-case'));
		expect(missingRow).toContain('missing');
		expect(cellCount(missingRow!)).toBe(cellCount(lines[0]));
	});
});

describe('renderMarkdown — context outcome tally', () => {
	const armWith = (label: string, outcomes: Record<string, number>): ArmSummary => ({
		label,
		source: 'persisted tokens (priced locally)',
		cases: [
			{
				slug: 'case-a',
				costPerIteration: [0.1],
				greenIterations: 1,
				evaluatedIterations: 1,
				contextOutcomes: outcomes,
			},
		],
	});

	it('shows each arm whether context arrived, not just what it cost', () => {
		const md = renderMarkdown([
			armWith('baseline', { 'retrieval-gap': 4, working: 1 }),
			armWith('candidate', { working: 4, 'unattributed-success': 1 }),
		]);
		expect(md).toContain('never retrieved 4');
		expect(md).toContain('context used 4');
		// The cell that would flatter a useless system must be visible.
		expect(md).toContain('passed without it 1');
	});

	it('omits the line for an arm with no classified iterations', () => {
		const md = renderMarkdown([armWith('spend-arm', {})]);
		expect(md).not.toContain('context:');
	});

	it('still reports a cell name it was not taught to order', () => {
		const md = renderMarkdown([armWith('future', { 'some-new-cell': 2 })]);
		expect(md).toContain('some-new-cell 2');
	});
});
