import type { CliArgs } from '../cli/args';
import type { EvalLogger } from '../harness/logger';
import { cleanupBuild, type BuildResult } from '../harness/runner';
import { BUILD_ONLY_SCENARIO_NAME } from '../langsmith/dataset-sync';
import type { BuildOrchestrator, CachedBuild, LaneState } from '../run/build-orchestrator';
import { createCasePipeline, type CasePipelineDeps } from '../run/case-pipeline';
import type { WorkflowTestCase } from '../types';

// Characterization tests for the per-row execution pipeline extracted in
// TRUST-261: sentinel / build-fail / agent / workflow dispatch, transient
// retry, expectation attachment, the framework_issue guard, and eager
// per-build cleanup. Both drivers run rows through runRow — keep these green
// through the decomposition.

vi.mock('../harness/runner', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../harness/runner')>();
	return {
		...actual,
		cleanupBuild: vi.fn().mockResolvedValue(true),
		warnAgentSeedDataTablesIgnored: vi.fn(),
	};
});

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

function okBuild(overrides: Partial<BuildResult> = {}): BuildResult {
	return {
		success: true,
		workflowId: 'wf-1',
		workflowJsons: [{ nodes: [{}, {}] } as never],
		createdWorkflowIds: [],
		createdDataTableIds: [],
		...overrides,
	};
}

function makeLane(): LaneState {
	return {
		runner: {
			client: {} as never,
			baseUrl: 'http://lane1.test',
			preRunWorkflowIds: new Set<string>(),
			claimedWorkflowIds: new Set<string>(),
			createdCredentialIds: new Set<string>(),
			workflowIdsToDelete: new Set<string>(),
		},
		laneNum: 1,
		activeBuilds: 0,
		inflightKeys: new Set<string>(),
		tracedBuild: vi.fn() as unknown as LaneState['tracedBuild'],
		tracedExecute: vi.fn() as unknown as LaneState['tracedExecute'],
		tracedExecuteAgent: vi.fn() as unknown as LaneState['tracedExecuteAgent'],
	};
}

function scenarioCase(scenarioNames: string[]): WorkflowTestCase {
	return {
		conversation: [{ role: 'user', text: 'build a thing' }],
		complexity: 'simple',
		tags: [],
		datasets: ['full'],
		executionScenarios: scenarioNames.map((name) => ({
			name,
			description: 'd',
			dataSetup: 's',
			successCriteria: 'c',
		})),
	};
}

function rowInputs(
	scenarioName: string,
): Parameters<ReturnType<typeof createCasePipeline>['runRow']>[0] {
	return {
		testCaseFile: 'case-a',
		scenarioName,
		scenarioDescription: 'd',
		dataSetup: 's',
		successCriteria: 'c',
		_iteration: 0,
	};
}

function makeOrchestrator(cached: CachedBuild): BuildOrchestrator {
	const buildCache = new Map<string, Promise<CachedBuild>>([['0:case-a', Promise.resolve(cached)]]);
	return {
		getOrBuild: vi.fn().mockResolvedValue(cached),
		buildCache,
		orphanedBuilds: [],
		buildDurations: new Map(),
	};
}

function makeDeps(
	orchestrator: BuildOrchestrator,
	overrides: Partial<CasePipelineDeps> = {},
): CasePipelineDeps {
	return {
		args: { timeoutMs: 900_000, keepWorkflows: false } as CliArgs,
		logger: silentLogger,
		testCaseByFileSlug: new Map([['case-a', scenarioCase(['happy-path'])]]),
		orchestrator,
		buildExpectationsByKey: new Map(),
		agentContextByKey: new Map(),
		runDebugByThreadId: new Map(),
		...overrides,
	};
}

beforeEach(() => {
	vi.mocked(cleanupBuild).mockClear();
	vi.mocked(cleanupBuild).mockResolvedValue(true);
});

describe('createCasePipeline', () => {
	it('runs a workflow scenario row and eagerly cleans up after the last row', async () => {
		const lane = makeLane();
		vi.mocked(lane.tracedExecute).mockResolvedValue({
			success: true,
			score: 1,
			reasoning: 'works',
			workflowId: 'wf-exec',
		} as never);
		const cached: CachedBuild = {
			build: okBuild(),
			lane,
			buildDurationMs: 42,
			buildSpend: { costUsd: 0.42, turns: 6 },
		};
		const orchestrator = makeOrchestrator(cached);
		const pipeline = createCasePipeline(makeDeps(orchestrator));

		const output = await pipeline.runRow(rowInputs('happy-path'));

		expect(output).toMatchObject({
			buildSuccess: true,
			passed: true,
			score: 1,
			workflowId: 'wf-1',
			scenarioWorkflowId: 'wf-exec',
			nodeCount: 2,
			buildDurationMs: 42,
			// `claude` spend (--build-via-mcp) rides on every row of the case's build.
			buildCostUsd: 0.42,
			buildTurns: 6,
		});
		// Single-scenario case → this was the last row → artifacts deleted eagerly.
		expect(vi.mocked(cleanupBuild)).toHaveBeenCalledTimes(1);
		expect(orchestrator.buildCache.size).toBe(0);
	});

	it('keeps everything when --keep-workflows is set', async () => {
		const lane = makeLane();
		vi.mocked(lane.tracedExecute).mockResolvedValue({
			success: true,
			score: 1,
			reasoning: 'works',
		} as never);
		const orchestrator = makeOrchestrator({ build: okBuild(), lane, buildDurationMs: 1 });
		const pipeline = createCasePipeline(
			makeDeps(orchestrator, { args: { timeoutMs: 900_000, keepWorkflows: true } as CliArgs }),
		);

		await pipeline.runRow(rowInputs('happy-path'));

		expect(vi.mocked(cleanupBuild)).not.toHaveBeenCalled();
		expect(orchestrator.buildCache.size).toBe(1);
	});

	it('cleans up only after the last row of a multi-scenario case', async () => {
		const lane = makeLane();
		vi.mocked(lane.tracedExecute).mockResolvedValue({
			success: true,
			score: 1,
			reasoning: 'works',
		} as never);
		const orchestrator = makeOrchestrator({ build: okBuild(), lane, buildDurationMs: 1 });
		const pipeline = createCasePipeline(
			makeDeps(orchestrator, {
				testCaseByFileSlug: new Map([['case-a', scenarioCase(['s1', 's2'])]]),
			}),
		);

		await pipeline.runRow(rowInputs('s1'));
		expect(vi.mocked(cleanupBuild)).not.toHaveBeenCalled();

		await pipeline.runRow(rowInputs('s2'));
		expect(vi.mocked(cleanupBuild)).toHaveBeenCalledTimes(1);
	});

	it('returns a build_failure row when the build failed for agent reasons', async () => {
		const lane = makeLane();
		const orchestrator = makeOrchestrator({
			build: okBuild({ success: false, workflowId: undefined, error: 'agent gave up' }),
			lane,
			buildDurationMs: 5,
		});
		const pipeline = createCasePipeline(makeDeps(orchestrator));

		const output = await pipeline.runRow(rowInputs('happy-path'));

		expect(output).toMatchObject({
			buildSuccess: false,
			passed: false,
			failureCategory: 'build_failure',
			execErrors: ['agent gave up'],
		});
	});

	it('classifies transport-failed builds as framework_issue, not build_failure', async () => {
		const lane = makeLane();
		const orchestrator = makeOrchestrator({
			build: okBuild({
				success: false,
				workflowId: undefined,
				error: 'fetch failed',
				transportFailure: true,
			}),
			lane,
			buildDurationMs: 5,
		});
		const pipeline = createCasePipeline(makeDeps(orchestrator));

		const output = await pipeline.runRow(rowInputs('happy-path'));

		expect(output.failureCategory).toBe('framework_issue');
	});

	it('scores a build-only sentinel row from the expectation verdicts', async () => {
		const lane = makeLane();
		const orchestrator = makeOrchestrator({ build: okBuild(), lane, buildDurationMs: 7 });
		const pipeline = createCasePipeline(
			makeDeps(orchestrator, {
				testCaseByFileSlug: new Map([['case-a', scenarioCase([])]]),
				buildExpectationsByKey: new Map([
					[
						'0:case-a',
						Promise.resolve([
							{ expectation: 'sends a digest', pass: true, reason: 'found it' },
							{ expectation: 'no code node', pass: false, reason: 'code node present' },
						]),
					],
				]),
			}),
		);

		const output = await pipeline.runRow(rowInputs(BUILD_ONLY_SCENARIO_NAME));

		// One failing verdict → the sentinel row fails, and verdicts ride along.
		expect(output.buildSuccess).toBe(true);
		expect(output.passed).toBe(false);
		expect(output.expectationResults).toHaveLength(2);
		expect(lane.tracedExecute).not.toHaveBeenCalled();
	});

	it('retries a transient scenario-execution error before giving up', async () => {
		const lane = makeLane();
		vi.mocked(lane.tracedExecute)
			.mockRejectedValueOnce(new Error('fetch failed'))
			.mockResolvedValueOnce({ success: true, score: 1, reasoning: 'works' } as never);
		const orchestrator = makeOrchestrator({ build: okBuild(), lane, buildDurationMs: 1 });
		const pipeline = createCasePipeline(makeDeps(orchestrator));

		const output = await pipeline.runRow(rowInputs('happy-path'));

		expect(output.passed).toBe(true);
		expect(lane.tracedExecute).toHaveBeenCalledTimes(2);
	});

	it('converts a build-phase throw into a framework_issue row instead of rejecting', async () => {
		const lane = makeLane();
		const orchestrator = makeOrchestrator({ build: okBuild(), lane, buildDurationMs: 1 });
		vi.mocked(orchestrator.getOrBuild).mockRejectedValue(new Error('lane exploded'));
		const pipeline = createCasePipeline(makeDeps(orchestrator));

		const output = await pipeline.runRow(rowInputs('happy-path'));

		expect(output).toMatchObject({
			buildSuccess: false,
			passed: false,
			failureCategory: 'framework_issue',
			execErrors: ['lane exploded'],
		});
	});

	it('routes agent-anchored builds through the agent scenario path', async () => {
		const lane = makeLane();
		vi.mocked(lane.tracedExecuteAgent).mockResolvedValue({
			success: true,
			score: 1,
			reasoning: 'agent did it',
			agentEvalResult: { errors: [] },
		} as never);
		const build = okBuild({
			workflowId: undefined,
			workflowJsons: [],
			transcript: [] as never,
			artifactRefs: [{ type: 'agent', id: 'agent-1' }] as never,
		});
		const orchestrator = makeOrchestrator({ build, lane, buildDurationMs: 3 });
		const pipeline = createCasePipeline(
			makeDeps(orchestrator, {
				agentContextByKey: new Map([['0:case-a', Promise.resolve('AGENT CONTEXT')]]),
			}),
		);

		const output = await pipeline.runRow(rowInputs('happy-path'));

		expect(output).toMatchObject({
			buildSuccess: true,
			passed: true,
			agentId: 'agent-1',
			agentContext: 'AGENT CONTEXT',
			reasoning: 'agent did it',
		});
		expect(lane.tracedExecute).not.toHaveBeenCalled();
		expect(lane.tracedExecuteAgent).toHaveBeenCalledTimes(1);
	});
});

function deferred(): { promise: Promise<unknown>; resolve: (v: unknown) => void } {
	let resolve!: (v: unknown) => void;
	const promise = new Promise<unknown>((r) => (resolve = r));
	return { promise, resolve };
}

describe('seed-table scenarios (TRUST-311 parity)', () => {
	function seededCase(names: string[]): WorkflowTestCase {
		return {
			...scenarioCase(names),
			executionScenarios: names.map((name) => ({
				name,
				description: 'd',
				dataSetup: 's',
				successCriteria: 'c',
				seedDataTables: [
					{
						id: 'seed-table-1',
						name: 'Jobs',
						columns: [{ name: 'id', type: 'string' as const }],
						rows: [{ id: 'row_001' }],
					},
				],
			})),
		};
	}

	it('merges the authored scenario and passes the build seed context to execution', async () => {
		const lane = makeLane();
		vi.mocked(lane.tracedExecute).mockResolvedValue({
			success: true,
			score: 1,
			reasoning: 'ok',
		} as never);
		const orchestrator = makeOrchestrator({
			build: okBuild({ threadId: 'thread-1', seededScenarioTableIdsByName: { Jobs: 'dt-real-1' } }),
			lane,
			buildDurationMs: 1,
		});
		const pipeline = createCasePipeline(
			makeDeps(orchestrator, {
				testCaseByFileSlug: new Map([['case-a', seededCase(['happy-path'])]]),
			}),
		);

		await pipeline.runRow(rowInputs('happy-path'));

		expect(lane.tracedExecute).toHaveBeenCalledWith(
			expect.objectContaining({
				scenario: expect.objectContaining({
					seedDataTables: [expect.objectContaining({ name: 'Jobs' })],
				}) as unknown,
				seedContext: { threadId: 'thread-1', tableIdsByName: { Jobs: 'dt-real-1' } },
			}),
		);
	});

	it('refuses to run a seeded scenario when the build carries no seeded-table mapping', async () => {
		const lane = makeLane();
		// MCP/prebuilt-shaped build: success, but no thread or table mapping —
		// running would grade the workflow against empty tables.
		const orchestrator = makeOrchestrator({ build: okBuild(), lane, buildDurationMs: 1 });
		const pipeline = createCasePipeline(
			makeDeps(orchestrator, {
				testCaseByFileSlug: new Map([['case-a', seededCase(['happy-path'])]]),
			}),
		);

		const output = await pipeline.runRow(rowInputs('happy-path'));

		expect(lane.tracedExecute).not.toHaveBeenCalled();
		expect(output).toMatchObject({
			passed: false,
			failureCategory: 'framework_issue',
			reasoning: expect.stringContaining('no seeded-table mapping') as unknown,
		});
	});

	it('serializes rows of a seeded case so table reseeding cannot interleave', async () => {
		const lane = makeLane();
		const started: string[] = [];
		const first = deferred();
		const second = deferred();
		vi.mocked(lane.tracedExecute).mockImplementation(((execArgs: {
			scenario: { name: string };
		}) => {
			started.push(execArgs.scenario.name);
			return (started.length === 1 ? first.promise : second.promise) as never;
		}) as never);
		const orchestrator = makeOrchestrator({
			build: okBuild({ threadId: 'thread-1', seededScenarioTableIdsByName: { Jobs: 'dt-real-1' } }),
			lane,
			buildDurationMs: 1,
		});
		const pipeline = createCasePipeline(
			makeDeps(orchestrator, {
				testCaseByFileSlug: new Map([['case-a', seededCase(['s1', 's2'])]]),
			}),
		);

		const rows = Promise.all([pipeline.runRow(rowInputs('s1')), pipeline.runRow(rowInputs('s2'))]);
		await vi.waitFor(() => expect(started).toHaveLength(1));
		for (let i = 0; i < 5; i++) await Promise.resolve();
		// The second seeded row must not start while the first still runs.
		expect(started).toEqual(['s1']);

		first.resolve({ success: true, score: 1, reasoning: 'ok' });
		await vi.waitFor(() => expect(started).toHaveLength(2));
		second.resolve({ success: true, score: 1, reasoning: 'ok' });
		await rows;
	});

	it('does not serialize rows of an unseeded case', async () => {
		const lane = makeLane();
		const started: string[] = [];
		const first = deferred();
		const second = deferred();
		vi.mocked(lane.tracedExecute).mockImplementation(((execArgs: {
			scenario: { name: string };
		}) => {
			started.push(execArgs.scenario.name);
			return (started.length === 1 ? first.promise : second.promise) as never;
		}) as never);
		const orchestrator = makeOrchestrator({ build: okBuild(), lane, buildDurationMs: 1 });
		const pipeline = createCasePipeline(
			makeDeps(orchestrator, {
				testCaseByFileSlug: new Map([['case-a', scenarioCase(['s1', 's2'])]]),
			}),
		);

		const rows = Promise.all([pipeline.runRow(rowInputs('s1')), pipeline.runRow(rowInputs('s2'))]);
		await vi.waitFor(() => expect(started).toHaveLength(2));
		first.resolve({ success: true, score: 1, reasoning: 'ok' });
		second.resolve({ success: true, score: 1, reasoning: 'ok' });
		await rows;
	});
});
