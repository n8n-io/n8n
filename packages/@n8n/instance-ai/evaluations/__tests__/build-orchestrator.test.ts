import type { CliArgs } from '../cli/args';
import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { runWorkflowChecks, type BuildResult } from '../harness/runner';
import {
	createBuildOrchestrator,
	type BuildOrchestratorDeps,
	type LaneState,
} from '../run/build-orchestrator';
import { LaneAllocator } from '../run/lane-allocator';
import type { WorkflowTestCase } from '../types';

// Characterization tests for the build phase extracted in TRUST-261: cache
// dedup, transient-retry across lanes, transport eviction vs cached agent
// verdicts, the prebuilt branch, and per-build side-band capture. Written
// against the behavior runWithLangSmith relied on while getOrBuild was a
// closure — keep them green through the decomposition.

vi.mock('../harness/runner', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../harness/runner')>();
	return { ...actual, runWorkflowChecks: vi.fn().mockResolvedValue([]) };
});

vi.mock('../harness/capture-run-debug', () => ({
	captureThreadRunDebug: vi.fn().mockResolvedValue([]),
}));

vi.mock('../build-expectations/verifier', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../build-expectations/verifier')>();
	return {
		...actual,
		verifyBuildExpectations: vi
			.fn()
			.mockResolvedValue([{ expectation: 'sends a digest', pass: true, reason: 'ok' }]),
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
		workflowJsons: [],
		createdWorkflowIds: [],
		createdDataTableIds: [],
		...overrides,
	};
}

function failedBuild(error: string): BuildResult {
	return {
		success: false,
		error,
		workflowJsons: [],
		createdWorkflowIds: [],
		createdDataTableIds: [],
	};
}

function makeLane(num: number, tracedBuild: LaneState['tracedBuild']): LaneState {
	return {
		runner: {
			client: {} as unknown as N8nClient,
			baseUrl: `http://lane${String(num)}.test`,
			preRunWorkflowIds: new Set<string>(),
			claimedWorkflowIds: new Set<string>(),
			createdCredentialIds: new Set<string>(),
			workflowIdsToDelete: new Set<string>(),
		},
		laneNum: num,
		activeBuilds: 0,
		inflightKeys: new Set<string>(),
		tracedBuild,
		tracedExecute: vi.fn() as unknown as LaneState['tracedExecute'],
		tracedExecuteAgent: vi.fn() as unknown as LaneState['tracedExecuteAgent'],
	};
}

function baseCase(overrides: Partial<WorkflowTestCase> = {}): WorkflowTestCase {
	return {
		conversation: [{ role: 'user', text: 'build a thing' }],
		complexity: 'simple',
		tags: [],
		datasets: ['full'],
		...overrides,
	};
}

function makeDeps(
	laneStates: LaneState[],
	overrides: Partial<BuildOrchestratorDeps> = {},
): BuildOrchestratorDeps {
	return {
		args: { buildViaMcp: false, timeoutMs: 900_000, keepWorkflows: false } as CliArgs,
		logger: silentLogger,
		laneStates,
		allocator: new LaneAllocator(laneStates, 4, { probe: vi.fn().mockResolvedValue(true) }),
		testCaseByFileSlug: new Map([['case-a', baseCase()]]),
		prebuiltManifest: undefined,
		cleanupBuiltWorkflows: false,
		mcpBuildLogDir: undefined,
		mcpBuildSpend: [],
		transcriptByThreadId: new Map(),
		buildExpectationsByKey: new Map(),
		runDebugByThreadId: new Map(),
		agentContextByKey: new Map(),
		...overrides,
	};
}

/** The eviction handler runs on a microtask after getOrBuild resolves. */
async function settleMicrotasks(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('createBuildOrchestrator', () => {
	it('builds once per (iteration, fileSlug) and caches the promise', async () => {
		const tracedBuild = vi.fn().mockResolvedValue(okBuild());
		const orchestrator = createBuildOrchestrator(makeDeps([makeLane(1, tracedBuild)]));

		const [first, second] = await Promise.all([
			orchestrator.getOrBuild(0, 'case-a'),
			orchestrator.getOrBuild(0, 'case-a'),
		]);
		expect(tracedBuild).toHaveBeenCalledTimes(1);
		expect(first.build).toBe(second.build);

		await orchestrator.getOrBuild(1, 'case-a');
		expect(tracedBuild).toHaveBeenCalledTimes(2);
		expect(orchestrator.buildDurations.has('0:case-a')).toBe(true);
		expect(orchestrator.buildDurations.has('1:case-a')).toBe(true);
	});

	it('retries a transient transport failure on another lane', async () => {
		const failing = vi.fn().mockResolvedValue(failedBuild('fetch failed'));
		const healthy = vi.fn().mockResolvedValue(okBuild());
		const orchestrator = createBuildOrchestrator(
			makeDeps([makeLane(1, failing), makeLane(2, healthy)]),
		);

		const { build } = await orchestrator.getOrBuild(0, 'case-a');

		expect(build.success).toBe(true);
		expect(failing).toHaveBeenCalledTimes(1);
		expect(healthy).toHaveBeenCalledTimes(1);
	});

	it('gives up after MAX_BUILD_ATTEMPTS, evicts the entry, and rebuilds on the next request', async () => {
		const failing1 = vi.fn().mockResolvedValue(failedBuild('fetch failed'));
		const failing2 = vi.fn().mockResolvedValue(failedBuild('fetch failed'));
		const orchestrator = createBuildOrchestrator(
			makeDeps([makeLane(1, failing1), makeLane(2, failing2)]),
		);

		const { build } = await orchestrator.getOrBuild(0, 'case-a');
		expect(build.success).toBe(false);
		expect(build.transportFailure).toBe(true);
		expect(failing1.mock.calls.length + failing2.mock.calls.length).toBe(3);

		await settleMicrotasks();
		expect(orchestrator.buildCache.size).toBe(0);
		expect(orchestrator.orphanedBuilds).toHaveLength(1);

		// Transport failures are not verdicts — a later scenario rebuilds.
		await orchestrator.getOrBuild(0, 'case-a');
		expect(failing1.mock.calls.length + failing2.mock.calls.length).toBe(6);
	});

	it('keeps a non-transient build failure cached — it is the verdict', async () => {
		// Non-transient error strings fall through to the lane health probe.
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		const failing = vi.fn().mockResolvedValue(failedBuild('agent gave up'));
		const orchestrator = createBuildOrchestrator(makeDeps([makeLane(1, failing)]));

		const first = await orchestrator.getOrBuild(0, 'case-a');
		await settleMicrotasks();
		const second = await orchestrator.getOrBuild(0, 'case-a');

		expect(failing).toHaveBeenCalledTimes(1);
		expect(first.build).toBe(second.build);
		expect(first.build.transportFailure).toBe(false);
		expect(orchestrator.buildCache.size).toBe(1);
		expect(orchestrator.orphanedBuilds).toHaveLength(0);
	});

	it('serves prebuilt workflows by fetching them, never invoking the builder', async () => {
		const tracedBuild = vi.fn().mockResolvedValue(okBuild());
		const lane = makeLane(1, tracedBuild);
		const getWorkflow = vi.fn().mockResolvedValue({
			id: 'wf-123',
			name: 'Prebuilt',
			active: false,
			versionId: 'v1',
			nodes: [],
			connections: {},
		});
		lane.runner.client = { getWorkflow } as unknown as N8nClient;

		const orchestrator = createBuildOrchestrator(
			makeDeps([lane], {
				prebuiltManifest: { 'case-a': ['wf-123'] },
				cleanupBuiltWorkflows: true,
			}),
		);
		const { build } = await orchestrator.getOrBuild(0, 'case-a');

		expect(build.success).toBe(true);
		expect(getWorkflow).toHaveBeenCalledWith('wf-123');
		expect(tracedBuild).not.toHaveBeenCalled();
		// Prebuilt builds own no created workflows, so cleanupBuild (which only
		// deletes createdWorkflowIds) can never delete the prebuilt workflow itself.
		expect(build.createdWorkflowIds).toEqual([]);
		// Registered for deletion only because cleanup was opted in.
		expect(lane.runner.workflowIdsToDelete.has('wf-123')).toBe(true);
		// Prompt-aware checks grade against the authored request, not "".
		expect(vi.mocked(runWorkflowChecks)).toHaveBeenCalledWith(
			expect.objectContaining({ prompt: 'build a thing' }),
		);
	});

	it('does not register prebuilt workflows for deletion without cleanup opt-in', async () => {
		const lane = makeLane(1, vi.fn().mockResolvedValue(okBuild()));
		lane.runner.client = {
			getWorkflow: vi.fn().mockResolvedValue({
				id: 'wf-123',
				name: 'Prebuilt',
				active: false,
				versionId: 'v1',
				nodes: [],
				connections: {},
			}),
		} as unknown as N8nClient;

		const orchestrator = createBuildOrchestrator(
			makeDeps([lane], { prebuiltManifest: { 'case-a': ['wf-123'] } }),
		);
		await orchestrator.getOrBuild(0, 'case-a');

		expect(lane.runner.workflowIdsToDelete.size).toBe(0);
	});

	it('captures per-build side-band state for reshape/target to consume', async () => {
		const transcript = [{ role: 'user' as const, content: 'build a thing', steps: [] }];
		const tracedBuild = vi
			.fn()
			.mockResolvedValue(okBuild({ threadId: 'thread-9', transcript: transcript as never }));
		const deps = makeDeps([makeLane(1, tracedBuild)], {
			testCaseByFileSlug: new Map([
				['case-a', baseCase({ outcomeExpectations: ['sends a digest'] })],
			]),
		});
		const orchestrator = createBuildOrchestrator(deps);

		await orchestrator.getOrBuild(0, 'case-a');

		expect(deps.transcriptByThreadId.get('thread-9')).toBe(transcript);
		expect(deps.runDebugByThreadId.has('thread-9')).toBe(true);
		await expect(deps.buildExpectationsByKey.get('0:case-a')).resolves.toEqual([
			{ expectation: 'sends a digest', pass: true, reason: 'ok' },
		]);
	});
});
