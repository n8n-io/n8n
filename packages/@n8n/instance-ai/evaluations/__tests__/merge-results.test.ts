import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	combineShards,
	isCoverageComplete,
	parseShardFile,
	recomputeSummary,
	renderSummaryMarkdown,
	resolveInputPaths,
	type EvalResults,
} from '../cli/mcp/merge-results';

// Build a minimal shard artifact. Defaults keep call sites focused on the
// fields each test actually asserts on.
function shard(overrides: {
	totalRuns?: number;
	duration?: number;
	workflowChecks?: unknown;
	testCases: Array<{
		slug: string;
		buildSuccessCount?: number;
		scenarios?: Array<{
			name: string;
			passCount: number;
			passAtK: number;
			passHatK: number;
			passedPerRun: boolean[];
		}>;
	}>;
}): Record<string, unknown> {
	const totalRuns = overrides.totalRuns ?? 2;
	return {
		timestamp: new Date().toISOString(),
		duration: overrides.duration ?? 1000,
		totalRuns,
		summary: {
			passAtK: 0,
			passHatK: 0,
			...(overrides.workflowChecks ? { workflowChecks: overrides.workflowChecks } : {}),
		},
		testCases: overrides.testCases.map((tc) => ({
			name: tc.slug,
			testCaseFile: tc.slug,
			buildSuccessCount: tc.buildSuccessCount ?? totalRuns,
			totalRuns,
			workflowChecksPerRun: [],
			buildExpectationResultsPerRun: [],
			buildExpectations: [],
			threadIds: [],
			scenarios: (tc.scenarios ?? []).map((s) => ({
				name: s.name,
				passCount: s.passCount,
				totalRuns,
				passAtK: s.passAtK,
				passHatK: s.passHatK,
				runs: s.passedPerRun.map((passed) => ({
					workflowId: 'wf',
					passed,
					score: passed ? 1 : 0,
					reasoning: passed ? '' : 'boom',
					failureCategory: passed ? undefined : 'logic_error',
					execErrors: [],
				})),
			})),
		})),
	};
}

function writeShard(dir: string, name: string, body: Record<string, unknown>): string {
	const path = join(dir, name, 'eval-results.json');
	mkdirSync(join(dir, name), { recursive: true });
	writeFileSync(path, JSON.stringify(body));
	return path;
}

const shardA = shard({
	testCases: [
		{
			slug: 'slug-a',
			buildSuccessCount: 2,
			scenarios: [
				{ name: 's1', passCount: 2, passAtK: 1, passHatK: 1, passedPerRun: [true, true] },
			],
		},
	],
	workflowChecks: {
		scoredBuilds: 2,
		perCheck: {
			check1: { kind: 'deterministic', dimension: 'structure', passes: 2, fails: 0, nA: 0 },
		},
	},
});

const shardB = shard({
	testCases: [
		{
			slug: 'slug-b',
			buildSuccessCount: 1,
			scenarios: [
				{ name: 's1', passCount: 1, passAtK: 0.5, passHatK: 0.25, passedPerRun: [true, false] },
			],
		},
	],
});

describe('parseShardFile', () => {
	it('returns undefined for an unreadable path', () => {
		expect(parseShardFile('/no/such/eval-results.json')).toBeUndefined();
	});

	it('returns undefined for malformed JSON shape (missing totalRuns)', () => {
		const dir = mkdtempSync(join(tmpdir(), 'merge-bad-'));
		const path = join(dir, 'eval-results.json');
		writeFileSync(path, JSON.stringify({ testCases: [] }));
		expect(parseShardFile(path)).toBeUndefined();
	});

	it('parses a valid shard artifact', () => {
		const dir = mkdtempSync(join(tmpdir(), 'merge-ok-'));
		const path = writeShard(dir, 'shard1', shardA);
		const parsed = parseShardFile(path);
		expect(parsed?.testCases[0].testCaseFile).toBe('slug-a');
	});
});

describe('recomputeSummary', () => {
	it('averages terminal per-unit pass@k/pass^k and counts builds + scenarios', () => {
		const combined = combineShards([parseShardFileFrom(shardA), parseShardFileFrom(shardB)]);
		expect(combined.summary.testCases).toBe(2);
		expect(combined.summary.built).toBe(2);
		expect(combined.summary.scenariosTotal).toBe(2);
		// units pass@k = mean(1, 0.5) = 0.75 ; pass^k = mean(1, 0.25) = 0.625
		expect(combined.summary.passAtK).toBeCloseTo(0.75, 6);
		expect(combined.summary.passHatK).toBeCloseTo(0.625, 6);
	});

	it('computes per-iteration pass rate index-aligned across shards', () => {
		const combined = combineShards([parseShardFileFrom(shardA), parseShardFileFrom(shardB)]);
		// iter0: both pass -> 2/2 = 100% ; iter1: a passes, b fails -> 1/2 = 50%
		expect(combined.summary.passRatePerIter).toBe('100% / 50%');
	});

	it('ignores build-expectations with evaluatedCount 0', () => {
		const summary = recomputeSummary(
			[
				{
					name: 'x',
					testCaseFile: 'x',
					buildSuccessCount: 0,
					totalRuns: 1,
					workflowChecksPerRun: [],
					buildExpectationResultsPerRun: [],
					buildExpectations: [
						{
							expectation: 'never judged',
							passCount: 0,
							evaluatedCount: 0,
							passAtK: 0,
							passHatK: 0,
						},
					],
					scenarios: [],
				},
			],
			1,
		);
		// No units -> headline 0, but the test case is still counted.
		expect(summary.testCases).toBe(1);
		expect(summary.passAtK).toBe(0);
		expect(summary.passRatePerIter).toBe('');
	});
});

describe('combineShards', () => {
	it('throws when shards share a slug (must be disjoint)', () => {
		expect(() => combineShards([parseShardFileFrom(shardA), parseShardFileFrom(shardA)])).toThrow(
			/Overlapping slugs/,
		);
	});

	it('sums per-shard workflow-check aggregates', () => {
		const combined = combineShards([parseShardFileFrom(shardA), parseShardFileFrom(shardB)]);
		expect(combined.summary.workflowChecks?.scoredBuilds).toBe(2);
		expect(combined.summary.workflowChecks?.perCheck.check1.passes).toBe(2);
	});

	it('uses the slowest shard duration (parallel wall-clock proxy)', () => {
		const fast = parseShardFileFrom(shard({ duration: 1000, testCases: [{ slug: 'a' }] }));
		const slow = parseShardFileFrom(shard({ duration: 5000, testCases: [{ slug: 'b' }] }));
		expect(combineShards([fast, slow]).durationMs).toBe(5000);
	});
});

describe('renderSummaryMarkdown', () => {
	it('renders the aggregate headline and a malformed-artifact warning', () => {
		const combined = combineShards([parseShardFileFrom(shardA), parseShardFileFrom(shardB)]);
		const md = renderSummaryMarkdown(combined, { malformedArtifacts: ['/x/eval-results.json'] });
		expect(md).toContain('### MCP Workflow Eval (sharded)');
		expect(md).toContain('pass@2 75%');
		expect(md).toContain('2/2 built');
		expect(md).toContain('1 shard artifact(s) were unreadable or malformed');
		expect(md).toContain('`slug-b/s1`'); // failure detail for the failed scenario
	});

	it('warns on incomplete coverage and notes the skipped unified upload', () => {
		const combined = combineShards([parseShardFileFrom(shardA), parseShardFileFrom(shardB)]);
		const md = renderSummaryMarkdown(combined, {
			expectedShards: 4,
			reportedShards: 2,
			uploadSkipped: true,
		});
		expect(md).toContain('> [!WARNING]');
		expect(md).toContain('only 2 of 4 shard(s) reported');
		expect(md).toContain('2 did not report');
		expect(md).toContain('not uploaded');
	});

	it('omits the coverage warning when every planned shard reported', () => {
		const combined = combineShards([parseShardFileFrom(shardA), parseShardFileFrom(shardB)]);
		const md = renderSummaryMarkdown(combined, { expectedShards: 2, reportedShards: 2 });
		expect(md).not.toContain('[!WARNING]');
		expect(md).not.toContain('Incomplete coverage');
	});

	it('links the unified experiment when a URL is provided, else shows the bare name', () => {
		const combined = combineShards([parseShardFileFrom(shardA), parseShardFileFrom(shardB)]);
		const url = 'https://smith.langchain.com/o/tenant/projects/p/exp-123';
		const linked = renderSummaryMarkdown(combined, {
			experimentName: 'mcp-merged-abc',
			experimentUrl: url,
		});
		expect(linked).toContain(`_Unified LangSmith experiment: [mcp-merged-abc](${url})_`);

		const noLink = renderSummaryMarkdown(combined, { experimentName: 'mcp-merged-abc' });
		expect(noLink).toContain('_Unified LangSmith experiment: `mcp-merged-abc`_');
		expect(noLink).not.toContain('](http');
	});
});

describe('resolveInputPaths', () => {
	it('discovers eval-results.json under --input-dir and dedups', () => {
		const dir = mkdtempSync(join(tmpdir(), 'merge-dir-'));
		writeShard(dir, 'shard1', shardA);
		writeShard(dir, 'shard2', shardB);
		const explicit = writeShard(dir, 'shard3', shardA);
		const paths = resolveInputPaths({ inputDir: dir, inputs: [explicit], outputDir: dir });
		expect(paths.length).toBe(3);
		expect(new Set(paths).size).toBe(3);
	});
});

describe('isCoverageComplete', () => {
	it('is complete when the reported shards meet or exceed the expected count', () => {
		expect(isCoverageComplete(4, 4)).toBe(true);
		expect(isCoverageComplete(5, 4)).toBe(true);
	});

	it('is incomplete when fewer shards reported than planned', () => {
		expect(isCoverageComplete(3, 4)).toBe(false);
	});

	it('is optimistically complete when no expected count is known (local merge)', () => {
		expect(isCoverageComplete(1)).toBe(true);
	});
});

// Round-trip a fixture object through the parser so tests exercise the Zod
// schema (defaults, coercions) exactly as the CLI does.
function parseShardFileFrom(body: Record<string, unknown>): EvalResults {
	const dir = mkdtempSync(join(tmpdir(), 'merge-fx-'));
	const path = join(dir, 'eval-results.json');
	writeFileSync(path, JSON.stringify(body));
	const parsed = parseShardFile(path);
	if (!parsed) throw new Error('fixture failed to parse');
	return parsed;
}
