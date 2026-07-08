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
	return { client: { listProjects } as unknown as Client, listProjects };
}

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

		expect(bucket.scenarios.get('my-case/happy-path')).toMatchObject({ passed: 1, total: 2 });
		expect(bucket.scenarios.get('my-case/edge-case')).toMatchObject({ passed: 1, total: 1 });
		expect(bucket.trialTotal).toBe(3);
		expect(bucket.failureCategoryTotals).toEqual({ builder_issue: 1 });
	});

	it('never counts __build_only__ sentinel rows as scenario trials', async () => {
		const client = bucketClient([
			scenarioRun(BUILD_ONLY_SCENARIO_NAME, false),
			scenarioRun('real-scenario', true),
		]);
		const bucket = await fetchBaselineBucket(client, 'instance-ai-baseline-x');

		expect([...bucket.scenarios.keys()]).toEqual(['my-case/real-scenario']);
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

		expect(bucket.scenarios.get('my-case/happy-path')).toMatchObject({ passed: 1, total: 1 });
		expect(bucket.trialTotal).toBe(1);
	});
});
