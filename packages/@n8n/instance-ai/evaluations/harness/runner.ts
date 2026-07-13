// ---------------------------------------------------------------------------
// Workflow test case evaluation orchestrator
//
// Manages the full lifecycle of a workflow test case evaluation:
// authentication, SSE capture, workflow build, scenario execution with
// LLM-mocked HTTP, checklist verification, and result aggregation.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest, InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { captureThreadRunDebug } from './capture-run-debug';
import {
	SSE_SETTLE_DELAY_MS,
	startSseConnection,
	waitForAllActivity,
	runMultiTurnConversation,
	recordUserTurn,
	type ConfirmationStrategy,
} from './chat-loop';
import {
	loadConversationSeed,
	remapSeedWorkflowIds,
	seedFromProse,
	transcriptPrefixFromSeed,
	type ConversationSeed,
} from './conversation-seed';
import { reconstructSeedFromThread, type SeedThreadRef } from './langsmith-seed';
import { type EvalLogger } from './logger';
import { fetchPrebuiltBuild } from './prebuilt-workflows';
import {
	extractErrorMessage,
	isTransientExecutionAbort,
	MAX_EXEC_ATTEMPTS,
	shouldRetryScenarioExecution,
} from './transient-error';
import { buildWorkflowContextBlock } from './workflow-context';
import { isMockableTriggerNodeType } from '../../src/tools/workflows/workflow-json-utils';
import { SONNET_MODEL } from '../../src/utils/eval-agents';
import { runBinaryChecks } from '../binaryChecks/index';
import type { BinaryCheckContext, CheckOutcome } from '../binaryChecks/types';
import { selectAuthorExpectations } from '../build-expectations/select';
import { allFailVerdicts, verifyBuildExpectations } from '../build-expectations/verifier';
import { type VerifierAttemptDebug, verifyChecklist } from '../checklist/verifier';
import { N8nApiError, type N8nClient, type WorkflowResponse } from '../clients/n8n-client';
import { createDeclaredCredentials } from '../credentials/seeder';
import {
	buildConversationMetrics,
	extractOutcomeFromEvents,
	mergeSeededConversationMetrics,
} from '../outcome/event-parser';
import { buildTranscriptFromEvents } from '../outcome/transcript-from-events';
import { buildAgentOutcome, extractWorkflowIdsFromMessages } from '../outcome/workflow-discovery';
import type {
	BuildTrace,
	ChecklistItem,
	ChecklistResult,
	CapturedEvent,
	BuildExpectationResult,
	ConversationMetrics,
	ConversationTurn,
	ExecutionScenarioResult,
	ExecutionScenario,
	TestCaseCredential,
	TranscriptTurn,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';
import {
	agentTurnsAsText,
	conversationUserTurnsAsText,
	failedBuildsPerTurn,
	lastAgentText,
	userTurnsAsText,
} from '../utils/conversation-text';
import { UserProxyLlm, type ProxyDecisionStats } from '../utils/user-proxy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 15 min. Lanes with heavy multi-agent scenarios (large mocked payloads)
// legitimately need more — the MCP CI workflow passes --timeout-ms 1500000
// explicitly (observed: trading-bot at 863s with a 15-row dataset, hard
// timeouts at 32 rows). Do NOT raise this default: a timed-out attempt is
// retried once, so under high-concurrency contention (the Instance AI
// experiments suite runs ~4x the MCP lane's concurrency) a generous default
// lets starved scenarios hold lane slots for 2x the budget and amplify the
// very contention that starved them (observed: run 28779266673).
const DEFAULT_TIMEOUT_MS = 900_000;
const EVAL_DATA_DIR = path.join(__dirname, '..', '..', '.data');

/**
 * Per-case budget: `complex` cases get 1.5× the base timeout. The heaviest
 * builds (multi-agent fan-outs, 5-integration pipelines) legitimately run at
 * the shared default's cap — observed 777–900s with 4/10 builds timing out on
 * weekly-social-content-scheduler in run 29012884140 — while the default must
 * NOT rise globally (see the comment above: a generous default lets starved
 * scenarios amplify the contention that starved them). Keyed off the authored
 * `complexity` field so the budget travels with the case (incl. through the
 * lang-tracer mirror) instead of a bespoke per-case knob.
 */
export function effectiveTimeoutMs(
	complexity: WorkflowTestCase['complexity'] | undefined,
	baseMs: number,
): number {
	return complexity === 'complex' ? Math.round(baseMs * 1.5) : baseMs;
}

function getMaxConcurrentScenarios(): number {
	const raw = process.env.N8N_EVAL_MAX_CONCURRENT_SCENARIOS;
	const parsed = raw ? Number.parseInt(raw, 10) : 4;
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}

/**
 * Max concurrent scenario executions per test case.
 *
 * Each scenario can trigger multiple LLM calls (mock generation + verifier),
 * so effectively-unbounded fan-out causes provider-side throttling and turns
 * verifier/model errors into noisy batch-wide failures.
 */
const MAX_CONCURRENT_SCENARIOS = getMaxConcurrentScenarios();

function makeArtifactTimestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

function slugifyArtifactSegment(value: string, fallback: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);

	return slug.length > 0 ? slug : fallback;
}

function deriveTestCaseArtifactName(testCase: WorkflowTestCase): string {
	return slugifyArtifactSegment(testCase.conversation?.[0]?.text ?? '', 'workflow');
}

function eventPayload(event: CapturedEvent): Record<string, unknown> {
	return typeof event.data.payload === 'object' && event.data.payload !== null
		? (event.data.payload as Record<string, unknown>)
		: event.data;
}

/**
 * Best-effort explanation for a run that produced no workflow, drawn from the
 * captured event stream. Tool errors are most specific; run-level `error`
 * events (e.g. the terminal-fallback emitted when the run throws before doing
 * any work — a crashed sandbox, a failed model call) carry the actual failure
 * reason and must be surfaced, otherwise a crashed run reports nothing at all.
 */
export function summarizeMissingWorkflowError(events: CapturedEvent[]): string {
	const toolErrors = events
		.filter((e) => e.type === 'tool-error')
		.map((e) => {
			const payload = eventPayload(e);
			const toolError = payload.error ?? payload.message;
			return typeof toolError === 'string' ? toolError : 'unknown tool error';
		});
	if (toolErrors.length > 0) return `Tool errors: ${toolErrors.join('; ')}`;

	const runErrors = events
		.filter((e) => e.type === 'error')
		.map((e) => {
			const payload = eventPayload(e);
			const runError = payload.content ?? payload.error ?? payload.message;
			return typeof runError === 'string' ? runError : 'unknown agent error';
		});
	if (runErrors.length > 0) return `Agent error: ${runErrors.join('; ')}`;

	const agentText = events
		.filter((e) => e.type === 'text-delta')
		.map((e) => {
			const payload = eventPayload(e);
			if (typeof e.data.text === 'string') return e.data.text;
			return typeof payload.text === 'string' ? payload.text : '';
		})
		.join('');
	if (agentText.length > 0) return `Agent response: ${agentText.slice(0, 500)}`;

	return 'No workflow produced — no error details captured';
}

async function writeScenarioVerificationSnapshot(input: {
	testCaseName: string;
	scenarioName: string;
	workflowId: string;
	passed: boolean;
	result: ChecklistResult | undefined;
	verificationResults: ChecklistResult[];
	verifierAttempts: VerifierAttemptDebug[];
	buildTrace?: BuildTrace;
	logger: EvalLogger;
}): Promise<void> {
	const timestamp = makeArtifactTimestamp();
	const fileName = `${slugifyArtifactSegment(input.testCaseName, 'workflow')}_${slugifyArtifactSegment(input.scenarioName, 'scenario')}_${timestamp}.json`;
	const filePath = path.join(EVAL_DATA_DIR, fileName);

	try {
		await mkdir(EVAL_DATA_DIR, { recursive: true });
		await writeFile(
			filePath,
			JSON.stringify(
				{
					timestamp,
					workflowId: input.workflowId,
					testCaseName: input.testCaseName,
					scenarioName: input.scenarioName,
					passed: input.passed,
					result: input.result ?? null,
					verificationResults: input.verificationResults,
					verifierAttempts: input.verifierAttempts,
					buildTrace: input.buildTrace ?? null,
				},
				null,
				2,
			),
			'utf8',
		);
		input.logger.verbose(`    [${input.scenarioName}] wrote verifier snapshot: ${filePath}`);
	} catch (error) {
		input.logger.warn(
			`    [${input.scenarioName}] failed to write verifier snapshot: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// ---------------------------------------------------------------------------
// Workflow test case runner — build once, run scenarios against it
// ---------------------------------------------------------------------------

interface WorkflowTestCaseConfig {
	client: N8nClient;
	/** Base URL of the n8n instance behind `client`, forwarded for the HTML report. */
	baseUrl: string;
	testCase: WorkflowTestCase;
	timeoutMs: number;
	/** Run-level registry of credentials created for test cases; cleaned up by the CLI. */
	createdCredentialIds: Set<string>;
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	logger: EvalLogger;
	keepWorkflows: boolean;
	/** Optional " [lane N/M]" suffix appended to per-build log lines. */
	laneTag?: string;
	/** When set, skip the orchestrator build and verify this existing workflow
	 *  instead. The harness leaves it in place — caller owns its lifecycle. */
	prebuiltWorkflowId?: string;
	/** AI root nodes (Agent, Chain) to keep pinned — opt-out from the default-on
	 *  wire-server interception path. Omit (or pass empty) to intercept every
	 *  interceptable AI root the workflow contains. Server-side gated by the
	 *  `085_eval_vendor_sdk_interception` PostHog flag. */
	pinAiRoots?: string[];
}

/**
 * All-in-one test case runner: build workflow + run all scenarios + cleanup.
 * Used by the CLI. The split API (buildWorkflow + executeScenario + cleanupBuild)
 * is available for custom orchestration (e.g. LangSmith evaluate).
 */
export async function runWorkflowTestCase(
	config: WorkflowTestCaseConfig,
): Promise<WorkflowTestCaseResult> {
	const { client, testCase, logger } = config;
	const baseTimeoutMs = config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS;
	const timeoutMs = effectiveTimeoutMs(testCase.complexity, baseTimeoutMs);
	if (timeoutMs !== baseTimeoutMs) {
		logger.info(`  Complex case: per-iteration budget ${String(Math.round(timeoutMs / 1000))}s`);
	}

	const result: WorkflowTestCaseResult = {
		testCase,
		workflowBuildSuccess: false,
		executionScenarioResults: [],
		n8nBaseUrl: config.baseUrl,
	};

	const isPrebuilt = config.prebuiltWorkflowId !== undefined;
	const build = config.prebuiltWorkflowId
		? await fetchPrebuiltBuild(client, config.prebuiltWorkflowId, logger)
		: await buildWorkflow({
				client,
				conversation: testCase.conversation,
				messageBudget: testCase.messageBudget,
				credentials: testCase.credentials,
				seedFile: testCase.seedFile,
				priorConversation: testCase.priorConversation,
				seedThread: testCase.seedThread,
				createdCredentialIds: config.createdCredentialIds,
				timeoutMs,
				preRunWorkflowIds: config.preRunWorkflowIds,
				claimedWorkflowIds: config.claimedWorkflowIds,
				logger,
				laneTag: config.laneTag,
				workflowExpected: workflowExpectedForCase(testCase),
			});

	if (isPrebuilt && build.success && !build.workflowChecks) {
		// No transcript in prebuilt mode, but the authored conversation still
		// carries the user's request — feed it so prompt-aware checks (e.g.
		// fulfills_user_request) grade against real intent instead of "".
		build.workflowChecks = await runWorkflowChecks({
			workflow: build.workflowJsons[0],
			prompt: conversationUserTurnsAsText(testCase.conversation),
			agentText: undefined,
			logger,
		});
	}

	if (build.conversationMetrics) {
		result.conversationMetrics = build.conversationMetrics;
	}
	if (build.threadId) {
		result.threadId = build.threadId;
		if (!isPrebuilt) {
			result.runDebug = await captureThreadRunDebug(client, build.threadId, logger);
		}
	}
	if (build.transcript) {
		result.transcript = build.transcript;
	}
	if (build.workflowChecks) {
		result.workflowChecks = build.workflowChecks;
	}

	// Optional author expectations — informational, judged concurrently with scenarios.
	const { expectations: expectationsToJudge, transcript: expectationsTranscript } =
		selectAuthorExpectations({
			testCase,
			transcript: build.transcript,
			buildSucceeded: build.success,
			isPrebuilt,
			logger,
		});
	const expectationsPromise: Promise<BuildExpectationResult[]> =
		expectationsToJudge.length > 0
			? verifyBuildExpectations(expectationsToJudge, {
					transcript: expectationsTranscript,
					workflowJson: build.workflowJsons[0],
					metrics: build.conversationMetrics,
				}).catch((error: unknown) => {
					logger.warn(
						`  Author expectations judge errored: ${error instanceof Error ? error.message : String(error)}`,
					);
					return allFailVerdicts(expectationsToJudge, 'judge error');
				})
			: Promise.resolve<BuildExpectationResult[]>([]);

	// Answer-only cases (workflowExpectedForCase === false) legitimately end
	// without a saved workflow — buildWorkflow reports them as a successful
	// no-workflow build. Grade them on the conversation via the author
	// expectations below; there are no scenarios to execute.
	if (build.success && !build.workflowId) {
		result.workflowBuildSuccess = true;
		result.buildTrace = build.buildTrace;
		const expectationResults = await expectationsPromise;
		if (expectationResults.length > 0) result.buildExpectationResults = expectationResults;
		return result;
	}

	if (!build.success || !build.workflowId) {
		result.buildError = build.error;
		const expectationResults = await expectationsPromise;
		const buildExpectationResults = expectationResults;
		if (buildExpectationResults.length > 0)
			result.buildExpectationResults = buildExpectationResults;
		return result;
	}

	result.workflowBuildSuccess = true;
	result.workflowId = build.workflowId;
	result.workflowJson = build.workflowJsons[0];
	result.buildTrace = build.buildTrace;
	const testCaseArtifactName = deriveTestCaseArtifactName(testCase);

	const scenarioStart = Date.now();
	const scenariosPromise = runWithConcurrency(
		testCase.executionScenarios ?? [],
		async (scenario) => {
			for (let attempt = 1; ; attempt++) {
				try {
					return await executeScenario(
						client,
						build.workflowId!,
						scenario,
						build.workflowJsons,
						logger,
						timeoutMs,
						testCaseArtifactName,
						build.buildTrace,
						config.pinAiRoots,
					);
				} catch (error: unknown) {
					const errorMessage = extractErrorMessage(error);
					if (shouldRetryScenarioExecution(errorMessage, attempt)) {
						logger.warn(
							`    [${scenario.name}] execution attempt ${attempt}/${MAX_EXEC_ATTEMPTS} failed (${errorMessage}); retrying`,
						);
						await delay(500 * attempt);
						continue;
					}
					// executeScenario categorizes builder/mock/verification failures
					// internally; an error escaping it is an infra/framework problem
					// (network drop, n8n API error, verifier timeout). Tag it
					// framework_issue so the report and baseline keep it out of builder
					// regressions instead of scoring it as an uncategorized failure.
					logger.error(`    ERROR [${scenario.name}]: ${errorMessage}`);
					return {
						scenario,
						success: false,
						score: 0,
						reasoning: `Scenario execution error: ${errorMessage}`,
						failureCategory: 'framework_issue',
					} satisfies ExecutionScenarioResult;
				}
			}
		},
		MAX_CONCURRENT_SCENARIOS,
	);
	const [scenarioResults, expectationResults] = await Promise.all([
		scenariosPromise,
		expectationsPromise,
	]);
	result.executionScenarioResults = scenarioResults;
	const buildExpectationResults = expectationResults;
	if (buildExpectationResults.length > 0) result.buildExpectationResults = buildExpectationResults;

	const scenarioMs = Date.now() - scenarioStart;
	logger.info(
		`  Scenarios done: ${String(result.executionScenarioResults.length)} scenarios [${String(Math.round(scenarioMs / 1000))}s]${config.laneTag ?? ''}`,
	);

	if (!config.keepWorkflows) {
		await cleanupBuild(client, build, logger);
	}

	return result;
}

// ---------------------------------------------------------------------------
// Multi-turn driver — wires UserProxyLlm into runMultiTurnConversation
// ---------------------------------------------------------------------------

interface MultiTurnDriverConfig {
	client: N8nClient;
	threadId: string;
	conversation: ConversationTurn[];
	messageBudget?: number;
	events: CapturedEvent[];
	approvedRequests: Set<string>;
	startTime: number;
	timeoutMs: number;
	logger: EvalLogger;
	proxyResponses?: Map<string, InstanceAiConfirmRequest>;
	followUpMessagesOut?: string[];
}

async function driveMultiTurnConversation(
	config: MultiTurnDriverConfig,
): Promise<ProxyDecisionStats> {
	const openingMessage = config.conversation[0]?.text ?? '';

	const proxy = new UserProxyLlm({
		conversation: config.conversation,
		messageBudget: config.messageBudget,
		logger: config.logger,
	});

	const confirmationStrategy: ConfirmationStrategy = proxy.respondToConfirmation.bind(proxy);

	const nextMessageDecider = async () => {
		proxy.ingestEvents(config.events);
		const decision = await proxy.decideFollowUp();
		if (decision.kind === 'followUp') {
			config.followUpMessagesOut?.push(decision.message);
		}
		return decision;
	};

	recordUserTurn(config.events, openingMessage);
	await config.client.sendMessage(config.threadId, openingMessage);

	await runMultiTurnConversation({
		client: config.client,
		threadId: config.threadId,
		events: config.events,
		approvedRequests: config.approvedRequests,
		startTime: config.startTime,
		timeoutMs: config.timeoutMs,
		logger: config.logger,
		confirmationStrategy,
		nextMessageDecider,
		proxyResponses: config.proxyResponses,
	});

	return { ...proxy.getDecisionStats() };
}

// ---------------------------------------------------------------------------
// Split API: build once, run scenarios independently
// ---------------------------------------------------------------------------

export interface BuildResult {
	success: boolean;
	workflowId?: string;
	workflowJsons: WorkflowResponse[];
	error?: string;
	buildTrace?: BuildTrace;
	/** IDs to pass to cleanupBuild() */
	createdWorkflowIds: string[];
	createdDataTableIds: string[];
	/** Per-turn deterministic counters extracted from the captured event stream. */
	conversationMetrics?: ConversationMetrics;
	/** Captured SSE events from the build run. */
	events?: CapturedEvent[];
	/** The thread id used during the build — keys the LangSmith trace lookup. */
	threadId?: string;
	/** Counts of UserProxyLlm decisions by category (multi-turn builds only). */
	proxyDecisionStats?: ProxyDecisionStats;
	/** Chat-style transcript built from the SSE event stream + proxy responses. */
	transcript?: TranscriptTurn[];
	workflowChecks?: CheckOutcome[];
	/** False when the backend lacks the credential-pin endpoint and the build ran unpinned. */
	credentialViewPinned?: boolean;
	/** True when the build failed while setting up the conversation seed (trace
	 *  gone, reconstruction drift, restore failed) — a harness/framework problem,
	 *  not an agent build failure. Routed to `framework_issue`. */
	seedingFailed?: boolean;
}

export interface BuildWorkflowConfig {
	client: N8nClient;
	/** Hand-authored conversation (≥1 turn, first `user`; one user turn →
	 *  auto-approve, more → proxy). Optional when `seedThread` derives the live turn. */
	conversation?: ConversationTurn[];
	/** Max follow-up messages the proxy will send. Ignored in auto-approve mode. */
	messageBudget?: number;
	/** Credentials this build should see (created for real, view pinned to them). */
	credentials?: TestCaseCredential[];
	/** Run-level registry the created credential IDs are added to for cleanup. */
	createdCredentialIds?: Set<string>;
	/** Synthetic seed file (path) restored before the live message. */
	seedFile?: string;
	/** Prose turns seeded as plain-text history. */
	priorConversation?: ConversationTurn[];
	/** Reproduce a real conversation from its LangSmith trace (seed = before the
	 *  last user message, live = that message). */
	seedThread?: SeedThreadRef;
	timeoutMs?: number;
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	logger: EvalLogger;
	/** Optional " [lane N/M]" suffix appended to the scenario log line. */
	laneTag?: string;
	/**
	 * Last-resort workflow discovery by list-diffing visible workflows. Keep this
	 * disabled for normal eval runs because concurrent builds make the diff
	 * non-attributable.
	 */
	allowWorkflowListDiffFallback?: boolean;
	/** Let callers that own their own scoring avoid duplicate binary checks. */
	skipWorkflowChecks?: boolean;
	/** False for answer-only cases: ending the conversation without a saved
	 *  workflow is then a valid outcome, not a failed build. Defaults to true. */
	workflowExpected?: boolean;
}

/** A case needs a workflow iff something judges one: execution scenarios or
 *  outcome expectations. Cases with neither are graded on the conversation. */
export function workflowExpectedForCase(
	testCase: Pick<WorkflowTestCase, 'executionScenarios' | 'outcomeExpectations'>,
): boolean {
	return (
		(testCase.executionScenarios?.length ?? 0) > 0 ||
		(testCase.outcomeExpectations?.length ?? 0) > 0
	);
}

/** A conversation is multi-turn if it has more than one turn, or if the only
 *  turn is from the assistant. Empty conversations are treated as single-turn. */
function isMultiTurnConversation(conversation: ConversationTurn[]): boolean {
	if (conversation.length === 0) return false;
	if (conversation.length > 1) return true;
	return conversation[0].role !== 'user';
}

/**
 * Build a workflow via Instance AI. Returns the workflow ID for use with
 * executeScenario(). Call cleanupBuild() when done.
 */
export async function buildWorkflow(config: BuildWorkflowConfig): Promise<BuildResult> {
	const { client, logger } = config;
	const threadId = crypto.randomUUID();
	const startTime = Date.now();
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	const abortController = new AbortController();
	const events: CapturedEvent[] = [];
	const approvedRequests = new Set<string>();
	const proxyResponses = new Map<string, InstanceAiConfirmRequest>();
	const followUpMessages: string[] = [];
	let credentialViewPinned = true;
	let restoredWorkflowIds: string[] = [];
	let restoredDataTableIds: string[] = [];
	let seededTranscript: TranscriptTurn[] = [];
	let seedingFailed = false;

	try {
		const buildStart = Date.now();

		// `seedThread` derives both seed and live turn from a trace; otherwise the
		// seed (if any) is a file/prose prelude and the conversation is authored.
		let seed: ConversationSeed | undefined;
		let conversation = config.conversation ?? [];
		try {
			if (config.seedThread) {
				const reconstructed = await reconstructSeedFromThread(config.seedThread);
				seed = reconstructed.seed;
				// The trace's last user message is the live opening; any authored
				// `conversation` continues from there (proxy-driven follow-ups).
				conversation = [
					{ role: 'user', text: reconstructed.liveTurn },
					...(config.conversation ?? []),
				];
				const contSuffix =
					(config.conversation?.length ?? 0) > 0
						? ` + ${String(config.conversation!.length)} continuation turn(s)`
						: '';
				const wsLabel = reconstructed.sourceWorkspace
					? `${reconstructed.sourceWorkspace}/${reconstructed.sourceProject}`
					: reconstructed.sourceProject;
				logger.info(
					`  Reconstructed seed from thread ${config.seedThread.threadId}: ${String(reconstructed.runCount)} runs → ${String(seed.messages.length)} message(s), ${String(seed.workflows.length)} workflow(s)${contSuffix} [${wsLabel}]${config.laneTag ?? ''}`,
				);
			} else if (config.seedFile) {
				seed = loadConversationSeed(config.seedFile);
			} else if (config.priorConversation && config.priorConversation.length > 0) {
				seed = seedFromProse(config.priorConversation);
			}
		} catch (error: unknown) {
			// A seed that can't be resolved is a harness/framework problem, not an
			// agent build failure — tag it and fail before spending a live turn.
			seedingFailed = true;
			throw new Error(`Seeding failed: ${error instanceof Error ? error.message : String(error)}`);
		}

		const openingMessage = conversation[0]?.text ?? '';
		const isMultiTurn = isMultiTurnConversation(conversation);
		logger.info(
			`  Running case${isMultiTurn ? ' [multi-turn]' : ''}: "${truncate(openingMessage, 60)}"${config.laneTag ?? ''}`,
		);

		const projectId = await client.getPersonalProjectId();
		await client.ensureThread(threadId, projectId);

		// Pin the thread's credential view to the case's declared set (empty by
		// default) before the first message, so every build-workflow call inside
		// the build sees the same deterministic environment.
		const declaredCredentials = config.credentials ?? [];
		const createdCredentials = await createDeclaredCredentials(client, declaredCredentials, {
			onCreated: (id) => config.createdCredentialIds?.add(id),
			logger,
		});
		try {
			await client.setThreadCredentialAllowlist(
				threadId,
				createdCredentials.map((c) => c.id),
			);
		} catch (error: unknown) {
			// Only a missing endpoint (older backend) may degrade to the legacy
			// unpinned view, and only for cases that declared nothing — any other
			// failure must fail the build rather than silently change which
			// credentials it sees.
			const endpointMissing = error instanceof N8nApiError && error.status === 404;
			if (!endpointMissing || declaredCredentials.length > 0) throw error;
			credentialViewPinned = false;
			logger.info(
				`  Credential-pin endpoint unavailable, building unpinned${config.laneTag ?? ''}`,
			);
		}

		// Restore the seed before the first live message. No degraded mode: a
		// seeded case can't run unseeded, so any restore failure fails the build.
		if (seed) {
			try {
				const remapped = remapSeedWorkflowIds(seed);
				const restoreResult = await client.restoreThread(
					threadId,
					remapped.messages,
					remapped.workflows,
					remapped.dataTables,
				);
				restoredWorkflowIds = restoreResult.workflowIds;
				restoredDataTableIds = restoreResult.dataTableIds;
				seededTranscript = transcriptPrefixFromSeed(remapped.messages);
				const dtSuffix =
					restoredDataTableIds.length > 0
						? `, ${String(restoredDataTableIds.length)} data table(s)`
						: '';
				logger.info(
					`  Seeded ${String(restoreResult.restored)} prior message(s), ${String(restoredWorkflowIds.length)} workflow(s)${dtSuffix}${config.laneTag ?? ''}`,
				);
			} catch (error: unknown) {
				seedingFailed = true;
				throw new Error(
					`Seeding failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		const ssePromise = startSseConnection(client, threadId, events, abortController.signal).catch(
			() => {},
		);

		await delay(SSE_SETTLE_DELAY_MS);

		let proxyDecisionStats: ProxyDecisionStats | undefined;
		if (isMultiTurn) {
			proxyDecisionStats = await driveMultiTurnConversation({
				client,
				threadId,
				conversation,
				messageBudget: config.messageBudget,
				events,
				approvedRequests,
				startTime,
				timeoutMs,
				logger,
				proxyResponses,
				followUpMessagesOut: followUpMessages,
			});
		} else {
			recordUserTurn(events, openingMessage);
			await client.sendMessage(threadId, openingMessage);
			await waitForAllActivity({
				client,
				threadId,
				events,
				approvedRequests,
				startTime,
				timeoutMs,
				logger,
				proxyResponses,
			});
		}

		abortController.abort();
		await ssePromise.catch(() => {});

		const conversationMetrics = mergeSeededConversationMetrics(
			seededTranscript,
			buildConversationMetrics(events),
		);
		const transcript = [
			...seededTranscript,
			...buildTranscriptFromEvents({
				events,
				openingMessage,
				followUpMessages,
				proxyResponses,
			}),
		];

		let threadMessages;
		try {
			threadMessages = await client.getThreadMessages(threadId);
		} catch {
			threadMessages = { messages: [] };
		}

		const messageWorkflowIds = extractWorkflowIdsFromMessages(threadMessages.messages);
		const eventOutcome = extractOutcomeFromEvents(events);
		// Restored workflows keep a seeded build scoreable/cleanable even if the
		// live turn touches no workflow tool; live ids stay first (primary artifact).
		const threadWorkflowIds = [
			...new Set([...eventOutcome.workflowIds, ...messageWorkflowIds, ...restoredWorkflowIds]),
		];
		const buildTrace: BuildTrace = {
			finalText:
				eventOutcome.finalText.length > 0 ? eventOutcome.finalText : lastAgentText(transcript),
			toolCalls: eventOutcome.toolCalls,
			agentActivities: eventOutcome.agentActivities,
		};
		const outcome = await buildAgentOutcome(
			client,
			{ ...eventOutcome, workflowIds: threadWorkflowIds },
			config.preRunWorkflowIds,
			config.claimedWorkflowIds,
			{ allowListDiffFallback: config.allowWorkflowListDiffFallback === true, logger },
		);

		if (outcome.workflowsCreated.length === 0) {
			// Answer-only cases (no execution scenarios, no outcome expectations)
			// are graded on the conversation — ending without a workflow is a
			// valid outcome for them, not a failed build.
			if (config.workflowExpected === false) {
				logger.info(
					`  Conversation completed without a workflow (none expected) [${String(Math.round((Date.now() - buildStart) / 1000))}s] [thread ${threadId}]`,
				);
				return {
					success: true,
					workflowJsons: [],
					buildTrace,
					createdWorkflowIds: restoredWorkflowIds,
					createdDataTableIds: [...outcome.dataTablesCreated, ...restoredDataTableIds],
					conversationMetrics,
					events,
					threadId,
					proxyDecisionStats,
					transcript,
					credentialViewPinned,
					seedingFailed,
				};
			}
			return {
				success: false,
				error: summarizeMissingWorkflowError(events),
				workflowJsons: [],
				buildTrace,
				createdWorkflowIds: restoredWorkflowIds,
				createdDataTableIds: [...outcome.dataTablesCreated, ...restoredDataTableIds],
				conversationMetrics,
				events,
				threadId,
				proxyDecisionStats,
				transcript,
				credentialViewPinned,
				seedingFailed,
			};
		}

		const buildMs = Date.now() - buildStart;
		const proxySuffix = formatProxyStatsSuffix(proxyDecisionStats);
		logger.info(
			`  Workflow built: ${outcome.workflowsCreated[0].name} (${String(outcome.workflowsCreated[0].nodeCount)} nodes) [${String(Math.round(buildMs / 1000))}s]${isMultiTurn ? ` (${String(conversationMetrics.turnCount)} turn${conversationMetrics.turnCount === 1 ? '' : 's'})` : ''}${proxySuffix} [thread ${threadId}]`,
		);

		const workflowChecks = config.skipWorkflowChecks
			? undefined
			: await runWorkflowChecks({
					workflow: outcome.workflowJsons[0],
					prompt: userTurnsAsText(transcript),
					agentText: agentTurnsAsText(transcript),
					failedBuildsPerTurn: failedBuildsPerTurn(transcript),
					logger,
				});

		return {
			success: true,
			workflowId: outcome.workflowsCreated[0].id,
			workflowJsons: outcome.workflowJsons,
			buildTrace,
			createdWorkflowIds: outcome.workflowsCreated.map((wf) => wf.id),
			createdDataTableIds: [...outcome.dataTablesCreated, ...restoredDataTableIds],
			conversationMetrics,
			events,
			threadId,
			proxyDecisionStats,
			transcript,
			workflowChecks,
			credentialViewPinned,
		};
	} catch (error: unknown) {
		abortController.abort();
		// Try to surface partial metrics so timeouts still produce a per-turn report.
		const conversationMetrics = events.length > 0 ? buildConversationMetrics(events) : undefined;
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			workflowJsons: [],
			createdWorkflowIds: restoredWorkflowIds,
			createdDataTableIds: restoredDataTableIds,
			conversationMetrics,
			events,
			threadId,
			credentialViewPinned,
			seedingFailed,
		};
	}
}

function formatProxyStatsSuffix(stats: ProxyDecisionStats | undefined): string {
	if (!stats) return '';
	const entries = Object.entries(stats).sort(([, a], [, b]) => b - a);
	if (entries.length === 0) return '';
	return ` [proxy: ${entries.map(([k, v]) => `${k}=${String(v)}`).join(', ')}]`;
}

/**
 * Execute a single scenario against a pre-built workflow and verify the result.
 */
export async function executeScenario(
	client: N8nClient,
	workflowId: string,
	scenario: ExecutionScenario,
	workflowJsons: WorkflowResponse[],
	logger: EvalLogger,
	timeoutMs?: number,
	testCaseName?: string,
	buildTrace?: BuildTrace,
	pinAiRoots?: string[],
): Promise<ExecutionScenarioResult> {
	return await runScenario(
		client,
		scenario,
		workflowId,
		workflowJsons,
		logger,
		timeoutMs,
		testCaseName,
		buildTrace,
		pinAiRoots,
	);
}

/**
 * Clean up workflows and data tables created during a build.
 */
export async function cleanupBuild(
	client: N8nClient,
	build: BuildResult,
	logger: EvalLogger,
): Promise<void> {
	for (const id of build.createdWorkflowIds) {
		try {
			await client.deleteWorkflow(id);
		} catch {
			// Best-effort cleanup
		}
	}

	if (build.createdDataTableIds.length > 0) {
		try {
			const projectId = await client.getPersonalProjectId();
			for (const dtId of build.createdDataTableIds) {
				try {
					await client.deleteDataTable(projectId, dtId);
				} catch {
					// Best-effort cleanup
				}
			}
			logger.verbose(`  Cleaned up ${String(build.createdDataTableIds.length)} data table(s)`);
		} catch {
			// Non-fatal — project ID lookup may fail
		}
	}
}

// ---------------------------------------------------------------------------
// Scenario execution (internal)
// ---------------------------------------------------------------------------

const SCENARIO_MATCH_STOPWORDS = new Set([
	'the',
	'and',
	'for',
	'with',
	'that',
	'this',
	'from',
	'tool',
	'test',
	'node',
	'workflow',
	'when',
	'then',
	'should',
	'returns',
	'return',
]);

function scenarioMatchTokens(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((t) => t.length >= 3 && !SCENARIO_MATCH_STOPWORDS.has(t)),
	);
}

/** Workflow ids referenced by enabled Execute Workflow nodes (database source,
 *  plain string or resource-locator value) — those targets are dependencies of
 *  this workflow, not entry points. */
function executeWorkflowReferences(wf: WorkflowResponse): string[] {
	const ids: string[] = [];
	for (const node of wf.nodes) {
		if (node.disabled || node.type !== 'n8n-nodes-base.executeWorkflow') continue;
		const params = node.parameters ?? {};
		if (typeof params.source === 'string' && params.source !== 'database') continue;
		const raw = isRecord(params.workflowId) ? params.workflowId.value : params.workflowId;
		if (typeof raw === 'string' && raw.trim() !== '' && !raw.startsWith('=')) ids.push(raw.trim());
	}
	return ids;
}

/**
 * Compositional builds split the system across multiple workflows (SKILL.md
 * endorses this), but execution historically always ran `build.workflowId` —
 * scenarios targeting a sibling workflow failed as phantom builder issues
 * while the expectations judge (which sees every workflowJson) passed the
 * same build. Mirror reality instead: a caller hits the specific endpoint, so
 * route the scenario to the workflow whose trigger-bearing content best
 * matches it. Sub-workflows referenced by another candidate's Execute Workflow
 * node are dependencies, not entry points — executing one directly starts it
 * once with an empty payload, so they're demoted whenever an entry point
 * remains. A single-candidate pool routes to that candidate: `workflowId`
 * itself may be a sub-workflow (whichever the agent happened to save first).
 */
export function selectScenarioWorkflowId(
	scenario: ExecutionScenario,
	workflowId: string,
	workflowJsons: WorkflowResponse[],
	logger: EvalLogger,
): string {
	const candidates = workflowJsons.filter(
		(wf) =>
			wf?.id && Array.isArray(wf.nodes) && wf.nodes.some((n) => isMockableTriggerNodeType(n.type)),
	);
	if (candidates.length === 0) return workflowId;

	const referencedIds = new Set(candidates.flatMap(executeWorkflowReferences));
	const entryPoints = candidates.filter((wf) => !referencedIds.has(wf.id));
	const pool = entryPoints.length > 0 ? entryPoints : candidates;
	const fallbackId = pool.some((wf) => wf.id === workflowId) ? workflowId : pool[0].id;
	const scenarioTokens = scenarioMatchTokens(`${scenario.name} ${scenario.dataSetup}`);
	if (pool.length === 1 || scenarioTokens.size === 0) {
		if (fallbackId !== workflowId) {
			logger.info(
				`    [${scenario.name}] multi-workflow build: routing to entry point ${fallbackId}`,
			);
		}
		return fallbackId;
	}

	let bestId = fallbackId;
	let bestScore = -1;
	let tied = false;
	for (const wf of pool) {
		const haystackParts: string[] = [wf.name ?? ''];
		for (const node of wf.nodes) {
			haystackParts.push(String(node.name ?? ''));
			try {
				haystackParts.push(JSON.stringify(node.parameters ?? {}).slice(0, 500));
			} catch {
				// skip unserializable parameters
			}
		}
		const haystackTokens = scenarioMatchTokens(haystackParts.join(' '));
		let score = 0;
		for (const token of scenarioTokens) if (haystackTokens.has(token)) score++;
		if (score > bestScore) {
			bestScore = score;
			bestId = wf.id;
			tied = false;
		} else if (score === bestScore) {
			tied = true;
		}
	}

	if (tied || bestScore <= 0) bestId = fallbackId;
	if (bestId !== workflowId) {
		logger.info(
			`    [${scenario.name}] multi-workflow build: routing to workflow ${bestId} (score ${String(bestScore)})`,
		);
	}
	return bestId;
}

async function runScenario(
	client: N8nClient,
	scenario: ExecutionScenario,
	workflowId: string,
	workflowJsons: WorkflowResponse[],
	logger: EvalLogger,
	timeoutMs?: number,
	testCaseName?: string,
	buildTrace?: BuildTrace,
	pinAiRoots?: string[],
): Promise<ExecutionScenarioResult> {
	const pinNodes = pinAiRoots && pinAiRoots.length > 0 ? pinAiRoots : undefined;
	const targetWorkflowId = selectScenarioWorkflowId(scenario, workflowId, workflowJsons, logger);

	const execStart = Date.now();
	let evalResult = await client.executeWithLlmMock(
		targetWorkflowId,
		scenario.dataSetup,
		timeoutMs,
		pinNodes,
	);
	// DB write races abort the execution before any node runs and are reported
	// in-band (success:false), bypassing the throw-based transient retry —
	// retry them here so they don't pollute builder reliability stats.
	for (
		let attempt = 1;
		!evalResult.success &&
		isTransientExecutionAbort(evalResult.errors) &&
		attempt < MAX_EXEC_ATTEMPTS;
		attempt++
	) {
		logger.warn(
			`    [${scenario.name}] execution aborted by transient DB error (attempt ${String(attempt)}/${String(MAX_EXEC_ATTEMPTS)}: ${evalResult.errors.join('; ')}); retrying`,
		);
		await delay(500 * attempt);
		evalResult = await client.executeWithLlmMock(
			targetWorkflowId,
			scenario.dataSetup,
			timeoutMs,
			pinNodes,
		);
	}
	const execMs = Date.now() - execStart;

	const pinTag = pinNodes ? ` pinned=${pinNodes.join(',')}` : '';
	logger.info(
		`    [${scenario.name}] exec=${String(Math.round(execMs / 1000))}s (${Object.keys(evalResult.nodeResults).length} nodes)${pinTag}`,
	);

	const verifyStart = Date.now();
	const artifact = buildVerificationArtifact(scenario, evalResult, workflowJsons, targetWorkflowId);
	const savedChars = artifact.truncationSavedChars ?? 0;
	if (savedChars > 0) {
		logger.info(
			`    [${scenario.name}] scenario context capped: saved ${String(savedChars)} chars (~${String(Math.round(savedChars / 4))} tokens)`,
		);
	}

	const scenarioChecklist: ChecklistItem[] = [
		{
			id: 1,
			description: scenario.successCriteria,
			category: 'execution',
			strategy: 'llm',
		},
	];

	const verification = await verifyChecklist(scenarioChecklist, artifact);
	const verificationResults = verification.results;

	const verifyMs = Date.now() - verifyStart;
	const passed = verificationResults.length > 0 && verificationResults[0].pass;
	const result = verificationResults[0];
	await writeScenarioVerificationSnapshot({
		testCaseName: testCaseName ?? `workflow-${workflowId}`,
		scenarioName: scenario.name,
		workflowId: targetWorkflowId,
		passed,
		result,
		verificationResults,
		verifierAttempts: verification.attempts,
		buildTrace,
		logger,
	});
	// Empty verification = the verifier itself failed after all attempts. The run
	// is excluded from scoring (mirrors incomplete build expectations) but stays
	// visible in console/report/artifact under `verification_failure`.
	const incomplete = verificationResults.length === 0;
	const attemptErrors = verification.attempts
		.map((a) => a.error)
		.filter((e): e is string => e !== null);
	const reasoning =
		result?.reasoning ??
		`No verification result — verifier exhausted all attempts${attemptErrors.length > 0 ? ` (${attemptErrors.join('; ')})` : ''}`;
	const failureCategory = result?.failureCategory ?? (result ? undefined : 'verification_failure');
	const rootCause = result?.rootCause;

	const categoryLabel = failureCategory ? ` [${failureCategory}]` : '';
	const statusLabel = incomplete ? 'INCOMPLETE (excluded from scoring)' : passed ? 'PASS' : 'FAIL';
	logger.info(
		`    [${scenario.name}] ${statusLabel}${categoryLabel} verify=${String(Math.round(verifyMs / 1000))}s`,
	);
	if (!passed) {
		logger.info(`    [${scenario.name}] ${reasoning}`);
	}

	return {
		scenario,
		success: passed,
		evalResult,
		workflowId: targetWorkflowId,
		score: passed ? 1 : 0,
		reasoning,
		failureCategory,
		rootCause,
		...(incomplete ? { incomplete: true } : {}),
	};
}

// ---------------------------------------------------------------------------
// Verification artifact builder
// ---------------------------------------------------------------------------

export interface VerificationArtifact {
	/** Workflow structure + connections + node configs. Stable across scenarios of the same build (cacheable). */
	workflowContext: string;
	/** Scenario + execution trace + errors. Fresh per scenario. */
	scenarioContext: string;
	/** Chars dropped from oversized JSON blocks / request lists (head/tail truncation). */
	truncationSavedChars?: number;
}

/** Per-JSON-block char cap in the scenario context (~1.5k tokens). */
const SCENARIO_JSON_BLOCK_CAP = 6_000;
/** Max intercepted requests rendered per node — first/last half beyond this. */
const MAX_RENDERED_REQUESTS_PER_NODE = 12;

/** Head/tail-truncate an oversized JSON block, keeping shape + boundaries. */
function capJsonBlock(json: string, saved: { chars: number }): string {
	if (json.length <= SCENARIO_JSON_BLOCK_CAP) return json;
	const half = Math.floor(SCENARIO_JSON_BLOCK_CAP / 2);
	const omitted = json.length - 2 * half;
	saved.chars += omitted;
	return `${json.slice(0, half)}\n… [${String(omitted)} chars truncated] …\n${json.slice(json.length - half)}`;
}

/** Keep the first/last half of an oversized list, dropping the middle. */
function elideMiddle<T>(items: T[], max: number): { head: T[]; tail: T[]; omitted: T[] } {
	if (items.length <= max) return { head: items, tail: [], omitted: [] };
	const half = Math.floor(max / 2);
	return {
		head: items.slice(0, half),
		tail: items.slice(items.length - half),
		omitted: items.slice(half, items.length - half),
	};
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNodeOutputs(value: unknown): value is Record<string, unknown[][]> {
	if (!isObjectRecord(value)) return false;
	return Object.values(value).every(
		(branches) => Array.isArray(branches) && branches.every((branch) => Array.isArray(branch)),
	);
}

function getNodeOutputs(value: unknown): Record<string, unknown[][]> {
	return isNodeOutputs(value) ? value : {};
}

function getNumber(value: unknown, fallback = 0): number {
	return typeof value === 'number' ? value : fallback;
}

function getOptionalBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

/** For a given node + connection type, return downstream node names per output port. */
function getDownstreamsByBranch(
	nodeName: string,
	connectionType: string,
	connections: Record<string, unknown> | undefined,
): string[][] {
	if (!connections) return [];
	const nodeConns = connections[nodeName];
	if (!isObjectRecord(nodeConns)) return [];
	const typeConns = nodeConns[connectionType];
	if (!Array.isArray(typeConns)) return [];
	return typeConns.map((branch) => {
		if (!Array.isArray(branch)) return [];
		const targets: string[] = [];
		for (const c of branch) {
			if (isObjectRecord(c) && typeof c.node === 'string') targets.push(c.node);
		}
		return targets;
	});
}

/** Render per-node outputs grouped by connection type + branch, with downstream labels. */
function renderNodeOutputs(
	nodeName: string,
	outputs: Record<string, unknown[][]>,
	outputCount: number,
	truncated: boolean | undefined,
	connections: Record<string, unknown> | undefined,
	saved: { chars: number },
): string[] {
	const lines: string[] = [];
	const connTypes = Object.keys(outputs);
	// "Output: none" only when no branches exist on any port — distinct from "branches exist but all empty".
	// An `outputs.main = [[]]` (one connected branch, zero items) falls through and renders as `Output [main]: 0 items`.
	if (connTypes.length === 0 || connTypes.every((k) => outputs[k].length === 0)) {
		lines.push('**Output:** none');
		return lines;
	}
	for (const connType of connTypes) {
		const branches = outputs[connType];
		if (branches.length === 0) continue;
		const downstreams = getDownstreamsByBranch(nodeName, connType, connections);
		const isMultiBranch = branches.length > 1 || connType !== 'main';
		if (!isMultiBranch) {
			lines.push(`**Output [${connType}]:** ${String(branches[0].length)} items`);
			lines.push('```json', capJsonBlock(JSON.stringify(branches[0], null, 2), saved), '```');
			continue;
		}
		for (let i = 0; i < branches.length; i++) {
			const branch = branches[i];
			const targets = downstreams[i] ?? [];
			const targetLabel =
				targets.length > 0 ? `→ ${targets.join(', ')}` : '→ (no downstream connection)';
			lines.push(
				`**Output [${connType} branch ${String(i)}] ${targetLabel}:** ${String(branch.length)} items`,
			);
			if (branch.length > 0) {
				lines.push('```json', capJsonBlock(JSON.stringify(branch, null, 2), saved), '```');
			}
		}
	}
	if (truncated) {
		lines.push(
			`_(items truncated for size; full count across all branches: ${String(outputCount)})_`,
		);
	}
	return lines;
}

/** Render the per-scenario context: scenario, pre-analysis, execution summary, errors, per-node trace. */
function buildScenarioContextBlock(
	scenario: ExecutionScenario,
	evalResult: InstanceAiEvalExecutionResult,
	wf: WorkflowResponse | undefined,
	saved: { chars: number },
): string {
	const sections: string[] = [];

	sections.push(
		'## Scenario',
		'',
		`**Name:** ${scenario.name} — ${scenario.description}`,
		`**Data setup:** ${scenario.dataSetup}`,
		'',
	);

	// Pre-analysis: programmatic flags
	const preAnalysis: string[] = [];
	if (evalResult.hints.warnings.length > 0) {
		for (const warning of evalResult.hints.warnings) {
			preAnalysis.push(`⚠ FRAMEWORK ISSUE: ${warning}`);
		}
	}
	if (Object.keys(evalResult.hints.triggerContent).length === 0) {
		preAnalysis.push(
			'⚠ FRAMEWORK ISSUE: Trigger content is empty — the start node received no input data. All downstream failures are likely caused by this, not by the workflow builder.',
		);
	}
	for (const [nodeName, nr] of Object.entries(evalResult.nodeResults)) {
		if (nr.configIssues && Object.keys(nr.configIssues).length > 0) {
			preAnalysis.push(
				`⚠ BUILDER ISSUE: "${nodeName}" has missing config: ${Object.values(nr.configIssues).flat().join('; ')}`,
			);
		}
		for (const req of nr.interceptedRequests) {
			if (
				typeof req.mockResponse === 'object' &&
				req.mockResponse !== null &&
				'_evalMockError' in (req.mockResponse as Record<string, unknown>)
			) {
				const msg = (req.mockResponse as Record<string, unknown>).message;
				const msgStr = typeof msg === 'string' ? msg : 'unknown';
				preAnalysis.push(
					`⚠ MOCK ISSUE: "${nodeName}" ${req.method} ${req.url} → mock generation failed: ${msgStr}`,
				);
			}
		}
	}
	if (preAnalysis.length > 0) {
		sections.push('## Pre-analysis (automated flags)', '', ...preAnalysis, '');
	}

	// Execution summary
	const mockedNodes: string[] = [];
	const pinnedNodes: string[] = [];
	const realNodes: string[] = [];
	const ranNodes = new Set<string>();
	for (const [nodeName, nr] of Object.entries(evalResult.nodeResults)) {
		if (nr.executionMode === 'mocked') mockedNodes.push(nodeName);
		else if (nr.executionMode === 'pinned') pinnedNodes.push(nodeName);
		else realNodes.push(nodeName);
		// Pinned nodes (trigger / bypass) get their data from pin data and never appear in runData,
		// so `iterationCount` stays 0 — count them as "ran" anyway to keep them out of `didNotRun`.
		if (nr.iterationCount > 0 || nr.executionMode !== 'real') ranNodes.add(nodeName);
	}
	const didNotRun: string[] =
		wf?.nodes
			.map((n) => n.name)
			.filter((name): name is string => typeof name === 'string' && !ranNodes.has(name)) ?? [];
	sections.push(
		'## Execution summary',
		'',
		`**Status:** ${evalResult.success ? 'success' : 'failed'}`,
		`**Mocked nodes** (HTTP intercepted): ${mockedNodes.join(', ') || 'none'}`,
		`**Pinned nodes** (synthetic input): ${pinnedNodes.join(', ') || 'none'}`,
		`**Real nodes** (executed with actual logic): ${realNodes.join(', ') || 'none'}`,
		`**Did not run** (no execution data): ${didNotRun.join(', ') || 'none'}`,
		'',
	);

	if (evalResult.errors.length > 0) {
		sections.push('## Errors', '', ...evalResult.errors.map((e) => `- ${e}`), '');
	}

	// Per-node execution trace, sorted by start time
	sections.push('## Execution trace', '');
	const sortedNodeResults = Object.entries(evalResult.nodeResults).sort(
		([, a], [, b]) => (a.startTime ?? 0) - (b.startTime ?? 0),
	);
	for (const [nodeName, nr] of sortedNodeResults) {
		const iterTag = nr.iterationCount > 1 ? ` · ran ${String(nr.iterationCount)}×` : '';
		const errTag =
			nr.firstErrorIteration !== undefined
				? ` · first error at iter ${String(nr.firstErrorIteration)}`
				: '';
		sections.push(`### ${nodeName} [${nr.executionMode}${iterTag}${errTag}]`);

		if (nr.configIssues && Object.keys(nr.configIssues).length > 0) {
			sections.push(`**Config issues:** ${Object.values(nr.configIssues).flat().join('; ')}`);
		}

		const renderRequest = (req: (typeof nr.interceptedRequests)[number]): void => {
			sections.push(`**Request:** ${req.method} ${req.url}`);
			if (req.requestBody) {
				sections.push(
					'```json',
					capJsonBlock(JSON.stringify(req.requestBody, null, 2), saved),
					'```',
				);
			}
			if (req.mockResponse !== undefined) {
				sections.push('**Mock response:**');
				sections.push(
					'```json',
					capJsonBlock(JSON.stringify(req.mockResponse, null, 2), saved),
					'```',
				);
			}
		};
		const reqs = elideMiddle(nr.interceptedRequests, MAX_RENDERED_REQUESTS_PER_NODE);
		for (const req of reqs.head) renderRequest(req);
		if (reqs.omitted.length > 0) {
			saved.chars += reqs.omitted.reduce((n, r) => n + JSON.stringify(r).length, 0);
			sections.push(`_… ${String(reqs.omitted.length)} further requests omitted for size …_`);
		}
		for (const req of reqs.tail) renderRequest(req);

		const nodeOutputs = getNodeOutputs(nr.outputs);
		const outputCount = getNumber(nr.outputCount);
		const truncated = getOptionalBoolean(nr.truncated);
		sections.push(
			...renderNodeOutputs(nodeName, nodeOutputs, outputCount, truncated, wf?.connections, saved),
		);

		sections.push('');
	}

	return sections.join('\n');
}

/** Build a verification artifact split into a cacheable workflow block + a fresh scenario block. */
export function buildVerificationArtifact(
	scenario: ExecutionScenario,
	evalResult: InstanceAiEvalExecutionResult,
	workflowJsons: WorkflowResponse[],
	workflowId?: string,
): VerificationArtifact {
	const wf = workflowJsons.find((w) => w.id === workflowId) ?? workflowJsons[0];
	const saved = { chars: 0 };
	return {
		workflowContext: buildWorkflowContextBlock(wf),
		scenarioContext: buildScenarioContextBlock(scenario, evalResult, wf, saved),
		truncationSavedChars: saved.chars,
	};
}

// ---------------------------------------------------------------------------
// Concurrency control
// ---------------------------------------------------------------------------

/**
 * Run tasks with bounded concurrency. Like Promise.all but limits how many
 * tasks execute simultaneously to avoid API rate limits.
 */
export async function runWithConcurrency<T, R>(
	items: T[],
	fn: (item: T) => Promise<R>,
	limit: number,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let nextIndex = 0;

	async function worker(): Promise<void> {
		while (nextIndex < items.length) {
			const index = nextIndex++;
			results[index] = await fn(items[index]);
		}
	}

	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => await worker());
	await Promise.all(workers);
	return results;
}

export async function runWorkflowChecks(args: {
	workflow: WorkflowResponse | undefined;
	prompt: string;
	agentText: string | undefined;
	/** Per-live-turn failed build-workflow attempt counts; feeds the efficiency check. */
	failedBuildsPerTurn?: number[];
	logger: EvalLogger;
}): Promise<CheckOutcome[] | undefined> {
	if (!args.workflow) return undefined;

	const modelId = hasAnthropicKey() ? SONNET_MODEL : undefined;
	const ctx: BinaryCheckContext = {
		prompt: args.prompt,
		...(modelId ? { modelId } : {}),
		...(args.agentText ? { agentTextResponse: args.agentText } : {}),
		...(args.failedBuildsPerTurn ? { failedBuildsPerTurn: args.failedBuildsPerTurn } : {}),
	};

	try {
		const { outcomes } = await runBinaryChecks(args.workflow, ctx);
		const failed = outcomes.filter((o) => o.status === 'fail');
		if (failed.length > 0) {
			args.logger.info(
				`  Workflow checks: ${String(failed.length)} failing (${failed.map((o) => o.name).join(', ')})`,
			);
		}
		const errored = outcomes.filter((o) => o.status === 'error');
		if (errored.length > 0) {
			args.logger.warn(
				`  Workflow checks: ${String(errored.length)} errored, excluded from scoring (${errored.map((o) => o.name).join(', ')})`,
			);
		}
		return outcomes;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		args.logger.warn(`  Workflow checks errored: ${message}`);
		return undefined;
	}
}

function hasAnthropicKey(): boolean {
	return Boolean(
		process.env.N8N_INSTANCE_AI_MODEL_API_KEY ??
			process.env.N8N_AI_ANTHROPIC_KEY ??
			process.env.ANTHROPIC_API_KEY,
	);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}
