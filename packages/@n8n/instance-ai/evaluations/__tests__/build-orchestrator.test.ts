import { verifyBuildExpectations } from '../build-expectations/verifier';
import type { CliArgs } from '../cli/args';
import type { N8nClient } from '../clients/n8n-client';
import { resolveArtifactContext } from '../harness/artifacts/artifact-context';
import {
	leakHaystackFor,
	redactLocalRunSecrets,
	scrubLocalSecretsFromBuild,
	type BuildResult,
} from '../harness/build-workflow';
import { runWorkflowChecks } from '../harness/cleanup';
import { runCredentialSetupChecks } from '../harness/credential-setup-checks';
import type { EvalLogger } from '../harness/logger';
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

vi.mock('../harness/agent-execution', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../harness/agent-execution')>();
	return {
		...actual,
		fetchAgentScenarioContext: vi.fn().mockResolvedValue('AGENT CONTEXT'),
	};
});

vi.mock('../harness/cleanup', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../harness/cleanup')>();
	return {
		...actual,
		runWorkflowChecks: vi.fn().mockResolvedValue([]),
	};
});

vi.mock('../harness/capture-run-debug', () => ({
	captureThreadRunDebug: vi.fn().mockResolvedValue([]),
}));

vi.mock('../harness/credential-setup-checks', async (importOriginal) => ({
	...(await importOriginal<typeof import('../harness/credential-setup-checks')>()),
	// Only the call that would hit n8n is stubbed. `redactTranscriptSecrets`
	// stays REAL: mocking the whole module would have made the leak test below
	// pass against a no-op.
	runCredentialSetupChecks: vi.fn().mockResolvedValue([]),
}));

vi.mock('../harness/artifacts/artifact-context', () => ({
	resolveArtifactContext: vi.fn().mockResolvedValue('RESOLVED ARTIFACTS'),
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
			preRunDataTableIds: new Set<string>(),
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
		// The provider-outage backoff is minutes long in production — never slept here.
		sleep: vi.fn().mockResolvedValue(undefined),
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
	it("forwards the case's credentialFixture to the build", async () => {
		// Load-bearing, and invisible to tsc: `wrap()` erases the callback's
		// parameter type, so a field dropped from the BuildArgs Pick still type-
		// checks. That is exactly how this one shipped broken once — added
		// everywhere EXCEPT the Pick, so the lane silently never booted and the
		// case failed as if the agent had misbehaved.
		const tracedBuild = vi.fn().mockResolvedValue(okBuild());
		const orchestrator = createBuildOrchestrator(
			makeDeps([makeLane(1, tracedBuild)], {
				testCaseByFileSlug: new Map([['case-a', baseCase({ credentialFixture: 'local' })]]),
			}),
		);

		await orchestrator.getOrBuild(0, 'case-a');

		expect(tracedBuild).toHaveBeenCalledWith(
			expect.objectContaining({ credentialFixture: 'local' }),
		);
	});

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

	it('retries a request-level abort on another lane — a wedged lane keeps passing readiness', async () => {
		// Probe answers healthy, so the retry can only come from the message itself.
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		const wedged = vi
			.fn()
			.mockResolvedValue(failedBuild('The operation was aborted due to timeout'));
		const healthy = vi.fn().mockResolvedValue(okBuild());
		const orchestrator = createBuildOrchestrator(
			makeDeps([makeLane(1, wedged), makeLane(2, healthy)]),
		);

		const { build } = await orchestrator.getOrBuild(0, 'case-a');

		expect(build.success).toBe(true);
		expect(wedged).toHaveBeenCalledTimes(1);
		expect(healthy).toHaveBeenCalledTimes(1);
	});

	it("keeps the chat loop's own budget overrun a verdict, not a transport failure", async () => {
		// Same shape, different message: the agent was slow on a healthy lane.
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		const slow = vi.fn().mockResolvedValue(failedBuild('Run timed out after 900000ms'));
		const orchestrator = createBuildOrchestrator(makeDeps([makeLane(1, slow)]));

		const { build } = await orchestrator.getOrBuild(0, 'case-a');

		expect(build.success).toBe(false);
		expect(build.transportFailure).toBe(false);
		expect(slow).toHaveBeenCalledTimes(1);
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

	it('retries a provider outage after a backoff, on a healthy lane', async () => {
		// TRUST-374: the lane is fine — the model provider is not. Unclassified, this
		// failure reads as a builder verdict and is neither retried nor re-attributed.
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		const failing = vi
			.fn()
			.mockResolvedValue(
				failedBuild(
					'Agent error: Internal server error; No output generated. Check the stream for errors.',
				),
			);
		const healthy = vi.fn().mockResolvedValue(okBuild());
		const deps = makeDeps([makeLane(1, failing), makeLane(2, healthy)]);
		const orchestrator = createBuildOrchestrator(deps);

		const { build } = await orchestrator.getOrBuild(0, 'case-a');

		expect(build.success).toBe(true);
		expect(failing).toHaveBeenCalledTimes(1);
		// An instant retry would just re-hit the same upstream.
		expect(vi.mocked(deps.sleep!).mock.calls[0][0]).toBeGreaterThanOrEqual(30_000);
	});

	it('marks an unrecoverable provider outage as infra without rebuilding per scenario', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		const providerError = 'Agent error: Overloaded; No output generated.';
		const failing1 = vi.fn().mockResolvedValue(failedBuild(providerError));
		const failing2 = vi.fn().mockResolvedValue(failedBuild(providerError));
		const orchestrator = createBuildOrchestrator(
			makeDeps([makeLane(1, failing1), makeLane(2, failing2)]),
		);

		const { build } = await orchestrator.getOrBuild(0, 'case-a');

		expect(build.success).toBe(false);
		expect(build.providerOutage).toBe(providerError);
		// framework_issue, not build_failure — the builder never got to run.
		expect(build.transportFailure).toBe(true);
		expect(failing1.mock.calls.length + failing2.mock.calls.length).toBe(3);

		// The retry budget is spent; a later scenario of the case must not pay it again.
		await settleMicrotasks();
		expect(orchestrator.buildCache.size).toBe(1);
		await orchestrator.getOrBuild(0, 'case-a');
		expect(failing1.mock.calls.length + failing2.mock.calls.length).toBe(3);
	});

	it('does not mistake the built workflow-s own upstream 5xx for a provider outage', async () => {
		// A mocked API returning 500 to the workflow is a product signal, so it stays
		// a cached build_failure verdict.
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		const failing = vi.fn().mockResolvedValue(failedBuild('Tool errors: Stripe returned HTTP 500'));
		const orchestrator = createBuildOrchestrator(makeDeps([makeLane(1, failing)]));

		const { build } = await orchestrator.getOrBuild(0, 'case-a');

		expect(build.providerOutage).toBeUndefined();
		expect(build.transportFailure).toBe(false);
		expect(failing).toHaveBeenCalledTimes(1);
		await settleMicrotasks();
		expect(orchestrator.buildCache.size).toBe(1);
	});

	it('records ungraded expectations when the build produced no agent output', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		const providerError = 'Agent error: Overloaded; No output generated.';
		const failing = vi.fn().mockResolvedValue(failedBuild(providerError));
		const deps = makeDeps([makeLane(1, failing)], {
			testCaseByFileSlug: new Map([
				['case-a', baseCase({ outcomeExpectations: ['sends a digest'] })],
			]),
		});
		const orchestrator = createBuildOrchestrator(deps);

		await orchestrator.getOrBuild(0, 'case-a');

		// Never handed to the judge, but still recorded — as incomplete.
		expect(vi.mocked(verifyBuildExpectations)).not.toHaveBeenCalled();
		const verdicts = await deps.buildExpectationsByKey.get('0:case-a');
		expect(verdicts).toHaveLength(1);
		expect(verdicts?.[0].expectation).toBe('sends a digest');
		expect(verdicts?.[0].pass).toBe(false);
		expect(verdicts?.[0].incomplete).toBe(true);
		expect(verdicts?.[0].reason).toContain('no agent output');
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

describe('expectation judging context', () => {
	it('threads the rendered agent artifact into the expectation judge', async () => {
		const tracedBuild = vi.fn().mockResolvedValue(
			okBuild({
				threadId: 'thread-9',
				transcript: [] as never,
				artifactRefs: [{ type: 'agent', id: 'agent-1' }] as never,
			}),
		);
		const deps = makeDeps([makeLane(1, tracedBuild)], {
			testCaseByFileSlug: new Map([
				['case-a', baseCase({ outcomeExpectations: ['the agent has a Slack tool'] })],
			]),
		});
		const orchestrator = createBuildOrchestrator(deps);

		await orchestrator.getOrBuild(0, 'case-a');
		await deps.buildExpectationsByKey.get('0:case-a');

		expect(vi.mocked(resolveArtifactContext)).toHaveBeenCalledWith(
			expect.objectContaining({ artifactRefs: [{ type: 'agent', id: 'agent-1' }] }),
		);
		expect(vi.mocked(verifyBuildExpectations)).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ artifactContext: 'RESOLVED ARTIFACTS' }),
		);
	});

	it('resolves non-agent artifacts (config-eval) for the judge too — not just agent refs', async () => {
		const tracedBuild = vi.fn().mockResolvedValue(
			okBuild({
				threadId: 'thread-9',
				transcript: [] as never,
				artifactRefs: [{ type: 'config-eval', id: 'ce-1' }] as never,
			}),
		);
		const deps = makeDeps([makeLane(1, tracedBuild)], {
			testCaseByFileSlug: new Map([
				['case-a', baseCase({ outcomeExpectations: ['a config eval exists'] })],
			]),
		});
		const orchestrator = createBuildOrchestrator(deps);

		await orchestrator.getOrBuild(0, 'case-a');
		await deps.buildExpectationsByKey.get('0:case-a');

		expect(vi.mocked(resolveArtifactContext)).toHaveBeenCalledWith(
			expect.objectContaining({ artifactRefs: [{ type: 'config-eval', id: 'ce-1' }] }),
		);
		expect(vi.mocked(verifyBuildExpectations)).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ artifactContext: 'RESOLVED ARTIFACTS' }),
		);
	});
});

describe('credential-setup check wiring', () => {
	// This file has no global mock reset; without it the second test counts the
	// first test's call.
	beforeEach(() => {
		vi.mocked(runCredentialSetupChecks).mockClear();
	});

	const SECRET = 'sk-ant-api03-LEAKED-abcdefghijklmnop';

	function credentialSetupBuild() {
		return okBuild({
			credentialSetup: {
				credentialType: 'anthropicApi',
				mintedSecret: SECRET,
				secretWasIssued: true,
				credentialIdsBefore: [],
			},
			transcript: [{ userMessage: 'set up an anthropic credential', steps: [] }],
			// A tool trace carrying the secret — the leak scan's real haystack. The
			// agent won't leak on request (verified live), so the ONLY way to know
			// the scan can still fire is to check what it is handed.
			events: [
				{ type: 'tool_result', data: { output: `{"snapshot":"key ${SECRET} shown"}` } },
			] as unknown as BuildResult['events'],
		});
	}

	it('hands the leak scan both the transcript and the tool traces', async () => {
		// Guards a silent-no-op class of bug: if searchableRunText were assembled
		// wrong (empty, or transcript-only), the leak check would pass forever and
		// nothing would ever reveal it — the same shape as the `tags` bug.
		const orchestrator = createBuildOrchestrator(
			makeDeps([makeLane(1, vi.fn().mockResolvedValue(credentialSetupBuild()))]),
		);

		await orchestrator.getOrBuild(0, 'case-a');

		expect(runCredentialSetupChecks).toHaveBeenCalledTimes(1);
		const arg = vi.mocked(runCredentialSetupChecks).mock.calls[0][0];
		expect(arg.searchableRunText).toContain('set up an anthropic credential');
		expect(arg.searchableRunText).toContain(SECRET);
		expect(arg.facts.mintedSecret).toBe(SECRET);
	});

	it('does not run the checks for an ordinary case', async () => {
		const orchestrator = createBuildOrchestrator(
			makeDeps([makeLane(1, vi.fn().mockResolvedValue(okBuild()))]),
		);

		await orchestrator.getOrBuild(0, 'case-a');

		expect(runCredentialSetupChecks).not.toHaveBeenCalled();
	});
});

describe('local-mode secret scrubbing', () => {
	const PREFIX = 'sk-ant-api03-';
	const KEY = `${PREFIX}abcdefghijklmnopqrstuvwx`;
	// A second provider's shape, so a multi-prefix scrub is actually exercised.
	const OTHER_PREFIX = 'sk-proj-';
	const OTHER_KEY = `${OTHER_PREFIX}zyxwvutsrqponmlkjihgfedc`;

	const localBuild = () =>
		okBuild({
			threadId: 'thread-local',
			transcript: [
				{ userMessage: 'set it up', steps: [{ kind: 'agent-text', text: `saved ${KEY}` }] },
			],
			buildTrace: {
				finalText: 'done',
				toolCalls: [
					{ toolCallId: 't1', toolName: 'browser_type', args: { text: KEY }, durationMs: 1 },
				],
				agentActivities: [],
			},
			credentialSetup: {
				credentialType: undefined,
				mintedSecret: undefined,
				secretWasIssued: false,
				local: true,
				secretPrefix: PREFIX,
				credentialIdsBefore: [],
			},
		} as Partial<BuildResult>);

	it('redacts the key from the transcript the RESULTS artifact is built from', async () => {
		// reshape reads transcriptByThreadId when it writes eval-results.json, so
		// redacting `build.transcript` alone left the artifact holding the real
		// key — the redaction ran and the key shipped anyway.
		const deps = makeDeps([makeLane(1, vi.fn().mockResolvedValue(localBuild()))]);
		const orchestrator = createBuildOrchestrator(deps);

		await orchestrator.getOrBuild(0, 'case-a');

		const persisted = JSON.stringify(deps.transcriptByThreadId.get('thread-local'));
		expect(persisted).not.toContain(KEY);
		expect(persisted).toContain('sk-ant-api03-[REDACTED]');
	});

	it('still gives the leak check the RAW text, or it could never detect a leak', async () => {
		const build = localBuild();
		const deps = makeDeps([makeLane(1, vi.fn().mockResolvedValue(build))], {
			testCaseByFileSlug: new Map([['case-a', baseCase({})]]),
		});

		await createBuildOrchestrator(deps).getOrBuild(0, 'case-a');

		// Asserted on what the CHECK was handed, not on the snapshot we stored:
		// a regression in the `leakHaystackFor(...) ?? JSON.stringify(...)` linkage would
		// feed it the redacted transcript and still leave the snapshot correct.
		const handed = vi.mocked(runCredentialSetupChecks).mock.calls[0]?.[0];
		expect(handed?.searchableRunText).toContain(KEY);
	});

	it('scrubs every known key shape when the prefix could not be identified', async () => {
		// `secretPrefix` is resolved from the credential the agent SAVED. An agent
		// that echoes the key and then fails before saving leaves it undefined, so
		// a scrub gated on it skipped exactly the run that leaked.
		const build = okBuild({
			threadId: 'thread-unidentified',
			transcript: [
				{ userMessage: 'x', steps: [{ kind: 'agent-text', text: `saved ${KEY}` }] },
				{ userMessage: 'y', steps: [{ kind: 'agent-text', text: `and ${OTHER_KEY}` }] },
			],
			credentialSetup: {
				secretWasIssued: false,
				local: true,
				secretPrefix: undefined,
				scrubPrefixes: [PREFIX, OTHER_PREFIX],
				credentialIdsBefore: [],
			},
		} as Partial<BuildResult>);
		const deps = makeDeps([makeLane(1, vi.fn().mockResolvedValue(build))]);

		await createBuildOrchestrator(deps).getOrBuild(0, 'case-a');

		const persisted = JSON.stringify(deps.transcriptByThreadId.get('thread-unidentified'));
		expect(persisted).not.toContain(KEY);
		// The SECOND shape is the point of the list — asserting only the first
		// would pass with a scrub that ignores every prefix after [0].
		expect(persisted).not.toContain(OTHER_KEY);
		expect(persisted).toContain(`${OTHER_PREFIX}[REDACTED]`);
	});

	it('redacts the builder trace, which the HTML report dumps raw', async () => {
		// workflow-report writes `buildTrace.toolCalls` verbatim into the report,
		// and scenario-execution writes it into the verifier snapshot. A key the
		// agent typed into a browser tool call reaches both, so redacting only
		// the transcript left the artifacts holding it.
		const build = localBuild();
		const deps = makeDeps([makeLane(1, vi.fn().mockResolvedValue(build))]);

		await createBuildOrchestrator(deps).getOrBuild(0, 'case-a');

		expect(JSON.stringify(build.buildTrace)).not.toContain(KEY);
		expect(JSON.stringify(build.buildTrace)).toContain('sk-ant-api03-[REDACTED]');
	});

	it('keeps that raw text OFF the build object itself', async () => {
		// The scrub runs inside the traced call because `traceable` records the
		// returned BuildResult as the run output. Parking the pre-scrub text on
		// that same object put the key straight back into what ships upstream —
		// redacted transcript, raw key one field over.
		const build = localBuild();
		const deps = makeDeps([makeLane(1, vi.fn().mockResolvedValue(build))], {
			testCaseByFileSlug: new Map([['case-a', baseCase({})]]),
		});

		await createBuildOrchestrator(deps).getOrBuild(0, 'case-a');

		expect(JSON.stringify(build)).not.toContain(KEY);
	});

	it('leaves a hermetic (non-local) run transcript untouched', async () => {
		const build = okBuild({
			threadId: 'thread-fixture',
			transcript: [{ userMessage: 'x', steps: [{ kind: 'agent-text', text: `saved ${KEY}` }] }],
			credentialSetup: {
				credentialType: 'anthropicApi',
				mintedSecret: KEY,
				secretWasIssued: true,
				credentialIdsBefore: [],
			},
		} as Partial<BuildResult>);
		const deps = makeDeps([makeLane(1, vi.fn().mockResolvedValue(build))]);

		await createBuildOrchestrator(deps).getOrBuild(0, 'case-a');

		expect(JSON.stringify(deps.transcriptByThreadId.get('thread-fixture'))).toContain(KEY);
	});

	it('redacts the built workflow, which the results artifact carries', () => {
		// An agent that hardcodes the key into a node instead of saving a credential
		// is the failure this eval detects — and workflowJsons[0] goes to
		// eval-results.json and the report, so detecting it must not publish it.
		const build = localBuild();
		build.workflowJsons = [
			{ nodes: [{ parameters: { headers: { 'x-api-key': KEY } } }] },
		] as unknown as BuildResult['workflowJsons'];
		build.error = `save failed for ${KEY}`;

		scrubLocalSecretsFromBuild(build);

		expect(JSON.stringify(build.workflowJsons)).not.toContain(KEY);
		expect(build.error).not.toContain(KEY);
		// …and the leak check still sees it, so the run reports the leak.
		expect(leakHaystackFor(build.credentialSetup!)).toContain(KEY);
	});

	it('redacts workflow-check comments, which the report renders', () => {
		// The main build path computes these INSIDE buildWorkflow, from the raw
		// workflow and raw transcript, before the scrub ever runs — so an LLM
		// check can quote the key into its comment and the report shows it.
		const build = localBuild();
		build.workflowChecks = [
			{
				name: 'fulfills_user_request',
				description: 'd',
				kind: 'llm',
				dimension: 'correctness',
				status: 'pass',
				comment: `the agent saved ${KEY} as a credential`,
			},
		] as unknown as BuildResult['workflowChecks'];

		scrubLocalSecretsFromBuild(build);

		expect(JSON.stringify(build.workflowChecks)).not.toContain(KEY);
		expect(leakHaystackFor(build.credentialSetup!)).toContain(KEY);
	});

	it('scrubs a field nobody enumerated — the probe detail from the real provider', () => {
		// The scrub is a denylist over the whole build now. `valueProbe.detail` is
		// n8n's credential-test message, fired at the REAL provider in local mode,
		// and was never on any of the hand-listed surfaces.
		const build = localBuild();
		build.credentialSetup = {
			...build.credentialSetup!,
			valueProbe: { kind: 'rejected', detail: `provider rejected ${KEY}`, target: 'real' },
		};

		scrubLocalSecretsFromBuild(build);

		expect(JSON.stringify(build)).not.toContain(KEY);
	});

	it('scrubs a provider the fixtures do not cover — local cases declare no type', () => {
		// `scrubPrefixes` only knows providers with a fixture on disk, so a key from
		// any other provider reached eval-results.json with the leak check merely
		// reporting itself incomplete.
		const OTHER = 'sk-proj-AAAAAAAAAAAAAAAAAAAAAAAA';
		const build = localBuild();
		build.transcript = [
			{ userMessage: 'x', steps: [{ kind: 'agent-text', text: `saved ${OTHER}` }] },
		] as unknown as BuildResult['transcript'];

		scrubLocalSecretsFromBuild(build);

		expect(JSON.stringify(build)).not.toContain(OTHER);
	});

	it('refuses to hand back an unscrubbed local build when no key shape is known', () => {
		// The empty list is the dangerous state: downstream it is indistinguishable
		// from "nothing to scrub", so returning the build silently persisted a real
		// key. A local run that cannot name a single provider shape must not
		// produce artifacts at all.
		const build = okBuild({
			transcript: [{ userMessage: 'x', steps: [{ kind: 'agent-text', text: `saved ${KEY}` }] }],
			credentialSetup: {
				secretWasIssued: false,
				local: true,
				secretPrefix: undefined,
				scrubPrefixes: [],
				credentialIdsBefore: [],
			},
		} as Partial<BuildResult>);

		expect(() => scrubLocalSecretsFromBuild(build)).toThrow(/scrub/i);
	});
});

describe('surfaces fetched after the scrub', () => {
	const PREFIX = 'sk-ant-api03-';
	const KEY = `${PREFIX}abcdefghijklmnopqrstuvwx`;

	it('redacts run debug, which is re-read from n8n and rendered into the report', () => {
		// captureThreadRunDebug runs after the build was scrubbed, so its payload
		// arrives raw; run-debug-report renders step input/output verbatim.
		const debug = [{ steps: [{ input: { messages: [`saved ${KEY}`] } }] }];

		const out = redactLocalRunSecrets(debug, {
			secretWasIssued: false,
			local: true,
			scrubPrefixes: [PREFIX],
			credentialIdsBefore: [],
		});

		expect(JSON.stringify(out)).not.toContain(KEY);
	});

	it('falls back to the identified prefix when scrubPrefixes is empty', () => {
		// The build scrub takes this fallback; if the post-build one did not, the
		// build shipped redacted and the run debug shipped raw.
		const debug = [{ steps: [{ input: { messages: [`saved ${KEY}`] } }] }];

		const out = redactLocalRunSecrets(debug, {
			secretWasIssued: false,
			local: true,
			scrubPrefixes: [],
			secretPrefix: PREFIX,
			credentialIdsBefore: [],
		});

		expect(JSON.stringify(out)).not.toContain(KEY);
	});

	it('throws rather than returning a local payload it cannot scrub', () => {
		expect(() =>
			redactLocalRunSecrets([{ steps: [{ input: { messages: [`saved ${KEY}`] } }] }], {
				secretWasIssued: false,
				local: true,
				scrubPrefixes: [],
				credentialIdsBefore: [],
			}),
		).toThrow(/scrub/i);
	});

	it('leaves a hermetic run alone — its minted secret is synthetic', () => {
		const debug = [{ steps: [{ input: { messages: [`saved ${KEY}`] } }] }];

		const out = redactLocalRunSecrets(debug, {
			secretWasIssued: true,
			credentialIdsBefore: [],
		});

		expect(JSON.stringify(out)).toContain(KEY);
	});
});
