import type { Client } from 'langsmith';
import { vi } from 'vitest';
import type { Mock } from 'vitest';

import {
	BASELINE_EXPERIMENT_PREFIX,
	fetchBaselineBucket,
	findLatestBaseline,
} from '../comparison/fetch-baseline';
import { BUILD_ONLY_SCENARIO_NAME } from '../langsmith/dataset-sync';

interface FakeProject {
	name?: string;
	start_time?: string;
	extra?: Record<string, unknown>;
}

/**
 * Mock a LangSmith client whose `listProjects` yields the given projects.
 * `nameContains` is a server-side substring filter, so the mock yields
 * everything — exercising findLatestBaseline's own `startsWith` guard.
 */
function clientWith(projects: FakeProject[]): { client: Client; listProjects: Mock } {
	const listProjects = vi.fn(() =>
		(async function* () {
			await Promise.resolve();
			for (const p of projects) yield p;
		})(),
	);
	const readProject = vi.fn(async ({ projectName }: { projectName: string }) => {
		const project = projects.find((p) => p.name === projectName);
		if (!project) throw new Error(`not found: ${projectName}`);
		return await Promise.resolve(project);
	});
	return { client: { listProjects, readProject } as unknown as Client, listProjects };
}

/** Aggregate metadata written by the CLI only when a run completes. */
const COMPLETED = { metadata: { pass_rate_per_iter: '78%' } };

describe('findLatestBaseline', () => {
	it('queries with the default instance-ai baseline prefix when none is given', async () => {
		const { client, listProjects } = clientWith([]);
		await findLatestBaseline(client);
		expect(listProjects).toHaveBeenCalledWith({ nameContains: BASELINE_EXPERIMENT_PREFIX });
	});

	it('queries with a custom prefix (MCP isolation)', async () => {
		const { client, listProjects } = clientWith([]);
		await findLatestBaseline(client, 'mcp-baseline-');
		expect(listProjects).toHaveBeenCalledWith({ nameContains: 'mcp-baseline-' });
	});

	it('returns the most recently started matching experiment', async () => {
		const { client } = clientWith([
			{ name: 'mcp-baseline-old', start_time: '2024-01-01T00:00:00Z' },
			{ name: 'mcp-baseline-new', start_time: '2024-06-01T00:00:00Z' },
			{ name: 'mcp-baseline-mid', start_time: '2024-03-01T00:00:00Z' },
		]);
		expect(await findLatestBaseline(client, 'mcp-baseline-')).toBe('mcp-baseline-new');
	});

	it('ignores names that contain but do not start with the prefix', async () => {
		// The isolation guarantee: a custom MCP prefix must not select an unrelated
		// cohort whose name merely contains the substring (here, the newer one).
		const { client } = clientWith([
			{ name: 'not-mcp-baseline-1', start_time: '2024-09-01T00:00:00Z' },
			{ name: 'mcp-baseline-1', start_time: '2024-01-01T00:00:00Z' },
		]);
		expect(await findLatestBaseline(client, 'mcp-baseline-')).toBe('mcp-baseline-1');
	});

	it('returns undefined when nothing matches the prefix', async () => {
		const { client } = clientWith([
			{ name: 'instance-ai-baseline-1', start_time: '2024-01-01T00:00:00Z' },
		]);
		expect(await findLatestBaseline(client, 'mcp-baseline-')).toBeUndefined();
	});

	it('skips nameless projects and treats a missing start_time as oldest', async () => {
		const { client } = clientWith([
			{ start_time: '2024-09-01T00:00:00Z' }, // no name → skipped despite being newest
			{ name: 'mcp-baseline-no-ts' }, // no start_time → ts 0, still the only match
		]);
		expect(await findLatestBaseline(client, 'mcp-baseline-')).toBe('mcp-baseline-no-ts');
	});

	it('skips a newer capture that never wrote the completion marker (killed run)', async () => {
		const { client } = clientWith([
			{ name: 'instance-ai-baseline-done', start_time: '2026-07-08T00:00:00Z', extra: COMPLETED },
			{ name: 'instance-ai-baseline-killed', start_time: '2026-07-09T00:00:00Z', extra: {} },
		]);
		expect(await findLatestBaseline(client)).toBe('instance-ai-baseline-done');
	});

	it('picks the newest among completed captures', async () => {
		const { client } = clientWith([
			{ name: 'instance-ai-baseline-old', start_time: '2026-07-01T00:00:00Z', extra: COMPLETED },
			{ name: 'instance-ai-baseline-new', start_time: '2026-07-08T00:00:00Z', extra: COMPLETED },
		]);
		expect(await findLatestBaseline(client)).toBe('instance-ai-baseline-new');
	});

	it('falls back to the newest candidate when none carry the marker', async () => {
		const { client } = clientWith([
			{ name: 'instance-ai-baseline-a', start_time: '2026-07-01T00:00:00Z' },
			{ name: 'instance-ai-baseline-b', start_time: '2026-07-08T00:00:00Z' },
		]);
		expect(await findLatestBaseline(client)).toBe('instance-ai-baseline-b');
	});
});

interface FakeRun {
	inputs?: Record<string, unknown>;
	outputs?: Record<string, unknown> | null;
}

/** Mock a LangSmith client whose `listRuns` yields the given root runs. */
function bucketClient(runs: FakeRun[]): Client {
	return {
		readProject: vi.fn(async () => await Promise.resolve({ id: 'proj-1' })),
		listRuns: vi.fn(() =>
			(async function* () {
				await Promise.resolve();
				for (const r of runs) yield r;
			})(),
		),
	} as unknown as Client;
}

function scenarioRun(
	scenarioName: string,
	passed: boolean,
	extra?: Record<string, unknown>,
): FakeRun {
	return {
		inputs: { testCaseFile: 'my-case', scenarioName },
		outputs: { passed, ...extra },
	};
}

describe('fetchBaselineBucket', () => {
	it('accumulates per-scenario pass/fail counts across iterations', async () => {
		const client = bucketClient([
			scenarioRun('happy-path', true),
			scenarioRun('happy-path', false, { failureCategory: 'builder_issue' }),
			scenarioRun('edge-case', true),
		]);
		const bucket = await fetchBaselineBucket(client, 'instance-ai-baseline-x');

		expect(bucket.evaluationUnits.get('my-case/happy-path')).toMatchObject({
			kind: 'scenario',
			passed: 1,
			total: 2,
		});
		expect(bucket.evaluationUnits.get('my-case/edge-case')).toMatchObject({ passed: 1, total: 1 });
		expect(bucket.trialTotal).toBe(3);
		expect(bucket.failureCategoryTotals).toEqual({ builder_issue: 1 });
	});

	it('never counts __build_only__ sentinel rows as scenario trials', async () => {
		const client = bucketClient([
			scenarioRun(BUILD_ONLY_SCENARIO_NAME, false),
			scenarioRun('real-scenario', true),
		]);
		const bucket = await fetchBaselineBucket(client, 'instance-ai-baseline-x');

		expect([...bucket.evaluationUnits.keys()]).toEqual(['my-case/real-scenario']);
		expect(bucket.trialTotal).toBe(1);
	});

	it('skips runs with missing/empty outputs and verifier-incomplete rows', async () => {
		const client = bucketClient([
			{ inputs: { testCaseFile: 'my-case', scenarioName: 'happy-path' }, outputs: null },
			{ inputs: { testCaseFile: 'my-case', scenarioName: 'happy-path' }, outputs: {} },
			scenarioRun('happy-path', false, { incomplete: true }),
			scenarioRun('happy-path', true),
		]);
		const bucket = await fetchBaselineBucket(client, 'instance-ai-baseline-x');

		expect(bucket.evaluationUnits.get('my-case/happy-path')).toMatchObject({
			passed: 1,
			total: 1,
		});
		expect(bucket.trialTotal).toBe(1);
	});

	it('ingests expectation verdicts once per (case, iteration) even when every row carries them', async () => {
		const verdicts = [
			{ expectation: 'asks first', pass: true, reason: 'did' },
			{ expectation: 'stays quiet', pass: false, reason: 'did not' },
		];
		const client = bucketClient([
			// Two scenario rows of the same case+iteration both embed the same verdicts.
			{
				inputs: { testCaseFile: 'my-case', scenarioName: 's1', _iteration: 0 },
				outputs: { passed: true, expectationResults: verdicts },
			},
			{
				inputs: { testCaseFile: 'my-case', scenarioName: 's2', _iteration: 0 },
				outputs: { passed: true, expectationResults: verdicts },
			},
			// Second iteration accumulates on top.
			{
				inputs: { testCaseFile: 'my-case', scenarioName: 's1', _iteration: 1 },
				outputs: { passed: true, expectationResults: verdicts },
			},
		]);
		const bucket = await fetchBaselineBucket(client, 'instance-ai-baseline-x');

		expect(bucket.evaluationUnits.get('my-case#expectation:asks first')).toMatchObject({
			kind: 'expectation',
			passed: 2,
			total: 2,
		});
		expect(bucket.evaluationUnits.get('my-case#expectation:stays quiet')).toMatchObject({
			passed: 0,
			total: 2,
		});
		// Expectation trials never enter the scenario trialTotal.
		expect(bucket.trialTotal).toBe(3);
	});

	it('defaults a missing _iteration to 0 so single-iteration rows dedupe together', async () => {
		const verdicts = [{ expectation: 'asks first', pass: true, reason: 'did' }];
		const client = bucketClient([
			{
				inputs: { testCaseFile: 'my-case', scenarioName: 's1' },
				outputs: { passed: true, expectationResults: verdicts },
			},
			{
				inputs: { testCaseFile: 'my-case', scenarioName: 's2', _iteration: 0 },
				outputs: { passed: true, expectationResults: verdicts },
			},
		]);
		const bucket = await fetchBaselineBucket(client, 'instance-ai-baseline-x');

		expect(bucket.evaluationUnits.get('my-case#expectation:asks first')).toMatchObject({
			passed: 1,
			total: 1,
		});
	});

	it('ingests expectations from sentinel and scenario-incomplete rows', async () => {
		const client = bucketClient([
			// Build-only case: the sentinel row is the only expectation carrier.
			{
				inputs: { testCaseFile: 'build-only', scenarioName: BUILD_ONLY_SCENARIO_NAME },
				outputs: {
					passed: true,
					expectationResults: [{ expectation: 'built it', pass: true, reason: 'ok' }],
				},
			},
			// Verifier-incomplete scenario row: skipped as a trial, verdicts still valid.
			{
				inputs: { testCaseFile: 'my-case', scenarioName: 's1' },
				outputs: {
					passed: false,
					incomplete: true,
					expectationResults: [{ expectation: 'asks first', pass: true, reason: 'ok' }],
				},
			},
		]);
		const bucket = await fetchBaselineBucket(client, 'instance-ai-baseline-x');

		expect(bucket.evaluationUnits.get('build-only#expectation:built it')).toMatchObject({
			passed: 1,
			total: 1,
		});
		expect(bucket.evaluationUnits.get('my-case#expectation:asks first')).toMatchObject({
			passed: 1,
			total: 1,
		});
		expect(bucket.trialTotal).toBe(0);
	});

	it('skips judge-incomplete verdicts and produces no expectation units from old baselines', async () => {
		const client = bucketClient([
			{
				inputs: { testCaseFile: 'my-case', scenarioName: 's1' },
				outputs: {
					passed: true,
					expectationResults: [
						{ expectation: 'asks first', pass: true, reason: 'ok' },
						{ expectation: 'no verdict', pass: false, reason: '', incomplete: true },
					],
				},
			},
			// Old-baseline row: no expectationResults field at all.
			scenarioRun('legacy-scenario', true),
		]);
		const bucket = await fetchBaselineBucket(client, 'instance-ai-baseline-x');

		expect(bucket.evaluationUnits.get('my-case#expectation:no verdict')).toBeUndefined();
		expect(bucket.evaluationUnits.get('my-case#expectation:asks first')).toMatchObject({
			passed: 1,
			total: 1,
		});
		const expectationUnits = [...bucket.evaluationUnits.values()].filter(
			(u) => u.kind === 'expectation',
		);
		expect(expectationUnits).toHaveLength(1);
	});
});
