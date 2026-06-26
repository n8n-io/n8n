// ---------------------------------------------------------------------------
// Workflow test case evaluation orchestrator
//
// Manages the full lifecycle of a workflow test case evaluation:
// authentication, SSE capture, workflow build, scenario execution with
// LLM-mocked HTTP, checklist verification, and result aggregation.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest, InstanceAiEvalExecutionResult } from '@n8n/api-types';
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
import { buildWorkflowContextBlock } from './workflow-context';
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
	conversationUserTurnsAsText,
	failedBuildsPerTurn,
	lastAgentText,
	userTurnsAsText,
} from '../utils/conversation-text';
import { UserProxyLlm, type ProxyDecisionStats } from '../utils/user-proxy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 900_000;
const EVAL_DATA_DIR = path.join(__dirname, '..', '..', '.data');

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
	const timeoutMs = config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS;

	const result: WorkflowTestCaseResult = {
		testCase,
		workflowBuildSuccess: false,
		executionScenarioResults: [],
		n8nBaseUrl: config.baseUrl,
	};

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
			});

	if (config.prebuiltWorkflowId && build.success && !build.workflowChecks) {
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
		if (!config.prebuiltWorkflowId) {
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
			isPrebuilt: config.prebuiltWorkflowId !== undefined,
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

	if (!build.success || !build.workflowId) {
		result.buildError = build.error;
		const expectationResults = await expectationsPromise;
		if (expectationResults.length > 0) result.buildExpectationResults = expectationResults;
		return result;
	}

	result.workflowBuildSuccess = true;
	result.workflowId = build.workflowId;
	result.workflowJson = build.workflowJsons[0];
	result.buildTrace = build.buildTrace;
	const testCaseArtifactName = deriveTestCaseArtifactName(testCase);

	const scenarioStart = Date.now();
	const scenariosPromise = runWithConcurrency(
		testCase.executionScenarios,
		async (scenario) => {
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
				const errorMessage = error instanceof Error ? error.message : String(error);
				logger.error(`    ERROR [${scenario.name}]: ${errorMessage}`);
				return {
					scenario,
					success: false,
					score: 0,
					reasoning: `Error: ${errorMessage}`,
				} satisfies ExecutionScenarioResult;
			}
		},
		MAX_CONCURRENT_SCENARIOS,
	);
	const [scenarioResults, expectationResults] = await Promise.all([
		scenariosPromise,
		expectationsPromise,
	]);
	result.executionScenarioResults = scenarioResults;
	if (expectationResults.length > 0) result.buildExpectationResults = expectationResults;

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
	/** Optional " [lane N/M]" suffix appended to the build log line. */
	laneTag?: string;
	/**
	 * Last-resort workflow discovery by list-diffing visible workflows. Keep this
	 * disabled for normal eval runs because concurrent builds make the diff
	 * non-attributable.
	 */
	allowWorkflowListDiffFallback?: boolean;
	/** Let callers that own their own scoring avoid duplicate binary checks. */
	skipWorkflowChecks?: boolean;
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
			`  Building workflow${isMultiTurn ? ' [multi-turn]' : ''}: "${truncate(openingMessage, 60)}"${config.laneTag ?? ''}`,
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
			{ allowListDiffFallback: config.allowWorkflowListDiffFallback === true },
		);

		if (outcome.workflowsCreated.length === 0) {
			const toolErrors = events
				.filter((e) => e.type === 'tool-error')
				.map((e) => {
					const payload =
						typeof e.data.payload === 'object' && e.data.payload !== null
							? (e.data.payload as Record<string, unknown>)
							: e.data;
					const toolError = payload.error ?? payload.message;
					return typeof toolError === 'string' ? toolError : 'unknown tool error';
				});

			const agentText = events
				.filter((e) => e.type === 'text-delta')
				.map((e) => {
					const text =
						typeof e.data.text === 'string'
							? e.data.text
							: typeof e.data.payload === 'object' &&
									e.data.payload !== null &&
									'text' in (e.data.payload as Record<string, unknown>)
								? String((e.data.payload as Record<string, unknown>).text)
								: '';
					return text;
				})
				.join('');

			const buildError =
				toolErrors.length > 0
					? `Tool errors: ${toolErrors.join('; ')}`
					: agentText.length > 0
						? `Agent response: ${agentText.slice(0, 500)}`
						: 'No workflow produced — no error details captured';

			return {
				success: false,
				error: buildError,
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
					agentText: outcome.finalText,
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

	const execStart = Date.now();
	const evalResult = await client.executeWithLlmMock(
		workflowId,
		scenario.dataSetup,
		timeoutMs,
		pinNodes,
	);
	const execMs = Date.now() - execStart;

	const pinTag = pinNodes ? ` pinned=${pinNodes.join(',')}` : '';
	logger.info(
		`    [${scenario.name}] exec=${String(Math.round(execMs / 1000))}s (${Object.keys(evalResult.nodeResults).length} nodes)${pinTag}`,
	);

	const verifyStart = Date.now();
	const artifact = buildVerificationArtifact(scenario, evalResult, workflowJsons);

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
		workflowId,
		passed,
		result,
		verificationResults,
		verifierAttempts: verification.attempts,
		buildTrace,
		logger,
	});
	const reasoning = result?.reasoning ?? 'No verification result — LLM verifier returned empty';
	const failureCategory = result?.failureCategory ?? (result ? undefined : 'verification_failure');
	const rootCause = result?.rootCause;

	const categoryLabel = failureCategory ? ` [${failureCategory}]` : '';
	logger.info(
		`    [${scenario.name}] ${passed ? 'PASS' : 'FAIL'}${categoryLabel} verify=${String(Math.round(verifyMs / 1000))}s`,
	);
	if (!passed) {
		logger.info(`    [${scenario.name}] ${reasoning}`);
	}

	return {
		scenario,
		success: passed,
		evalResult,
		score: passed ? 1 : 0,
		reasoning,
		failureCategory,
		rootCause,
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
			lines.push('```json', JSON.stringify(branches[0], null, 2), '```');
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
				lines.push('```json', JSON.stringify(branch, null, 2), '```');
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

		for (const req of nr.interceptedRequests) {
			sections.push(`**Request:** ${req.method} ${req.url}`);
			if (req.requestBody) {
				sections.push('```json', JSON.stringify(req.requestBody, null, 2), '```');
			}
			if (req.mockResponse !== undefined) {
				sections.push('**Mock response:**');
				sections.push('```json', JSON.stringify(req.mockResponse, null, 2), '```');
			}
		}

		const nodeOutputs = getNodeOutputs(nr.outputs);
		const outputCount = getNumber(nr.outputCount);
		const truncated = getOptionalBoolean(nr.truncated);
		sections.push(
			...renderNodeOutputs(nodeName, nodeOutputs, outputCount, truncated, wf?.connections),
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
): VerificationArtifact {
	const wf = workflowJsons[0];
	return {
		workflowContext: buildWorkflowContextBlock(wf),
		scenarioContext: buildScenarioContextBlock(scenario, evalResult, wf),
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
