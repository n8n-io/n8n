// ---------------------------------------------------------------------------
// Workflow test case evaluation orchestrator
//
// Manages the full lifecycle of a workflow test case evaluation:
// authentication, SSE capture, workflow build, scenario execution with
// LLM-mocked HTTP, checklist verification, and result aggregation.
// ---------------------------------------------------------------------------

import type {
	InstanceAiConfirmRequest,
	InstanceAiEvalAgentExecutionResult,
	InstanceAiEvalExecutionResult,
	InstanceAiEvalSeedDataTable,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { agentHandler } from './artifacts/agent-handler';
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
import {
	classifyScenarioExecutionError,
	isTransientExecutionAbort,
	MAX_EXEC_ATTEMPTS,
} from './transient-error';
import { buildWorkflowContextBlock } from './workflow-context';
import { isMockableTriggerNodeType } from '../../src/tools/workflows/workflow-json-utils';
import { SONNET_MODEL } from '../../src/utils/eval-agents';
import { runBinaryChecks } from '../binaryChecks/index';
import type { BinaryCheckContext, CheckOutcome } from '../binaryChecks/types';
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
	ArtifactRef,
	BuildTrace,
	ChecklistItem,
	ChecklistResult,
	CapturedEvent,
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

/**
 * Synthetic result for a test case whose run threw before it could produce one
 * (a budget/timeout abort, a lane meltdown, an OOM). Recording it — instead of
 * letting the throw reject the batch — keeps every OTHER case's already-completed
 * results, and keeps this case index-aligned so the aggregator counts it rather
 * than losing the whole run. One `framework_issue` row per declared scenario
 * carries the pinned cross-repo contract (timeout-flavoured rootCause for budget
 * aborts) so the lang-tracer side buckets it as infra, not product quality.
 */
export function abortedWorkflowTestCaseResult(
	testCase: WorkflowTestCase,
	baseUrl: string,
	errorMessage: string,
): WorkflowTestCaseResult {
	const classified = classifyScenarioExecutionError(errorMessage);
	return {
		testCase,
		workflowBuildSuccess: false,
		buildError: errorMessage,
		n8nBaseUrl: baseUrl,
		executionScenarioResults: (testCase.executionScenarios ?? []).map((scenario) => ({
			scenario,
			success: false,
			score: 0,
			...classified,
		})),
	};
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
	/** Appended to the FIRST sent message only (pre-seeded-table hint); the
	 *  recorded turn and the proxy's conversation keep the clean prompt. */
	openingMessageSuffix?: string;
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
	await config.client.sendMessage(
		config.threadId,
		openingMessage + (config.openingMessageSuffix ?? ''),
	);

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
	/** Maps each scenario seed table's declared NAME to the real id it was created
	 *  under (empty) before the build turn, so each scenario can reset+seed its
	 *  rows into the table the built workflow actually bound (TRUST-311 follow-up).
	 *  Absent when the case declares no scenario seed tables. */
	seededScenarioTableIdsByName?: Record<string, string>;
	/** Non-workflow artifact refs (agent, config-eval) captured from the SSE stream,
	 *  fed to the build-expectations judge context. Empty/undefined for prebuilt runs. */
	artifactRefs?: ArtifactRef[];
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
	/** Transport-level failure (network error, or the lane unreachable right
	 *  after failing — e.g. timed out against a dead lane). Routed to `framework_issue`. */
	transportFailure?: boolean;
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
	/** Execution scenarios whose declared `seedDataTables` are created + row-seeded
	 *  after a successful build, before any scenario runs (TRUST-311). */
	executionScenarios?: ExecutionScenario[];
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
	// TRUST-311 follow-up: scenario seed tables are created empty before the build
	// turn (so the agent binds their real id); this maps declared name → real id
	// for the per-scenario row seeding, and the note tells the agent they exist.
	const scenarioTableIdsByName: Record<string, string> = {};
	let scenarioSeedTablesNote = '';
	// Ids the build itself produced (the agent's workflow + any data tables it
	// made). Tracked here so a throw AFTER the build lands — scenario-table
	// seeding, workflow checks — still hands them to the caller's cleanup rather
	// than leaking them into the shared eval project.
	let builtWorkflowIds: string[] = [];
	let builtDataTableIds: string[] = [];
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

		// TRUST-311 follow-up: create the case's execution-scenario data tables EMPTY
		// under their EXACT declared names BEFORE the build turn, so the agent
		// discovers the real table (Data Table list/schema) and binds its real id —
		// the production-faithful flow where the user's table pre-exists. Rows are
		// reset+seeded per scenario (reseedScenarioTables) because a build-time
		// self-verification execution can mutate them. The created ids fold into
		// restoredDataTableIds so the outer catch and cleanupBuild already cover them
		// (a build failure still cleans them up); a create failure is a harness
		// problem, so flag seedingFailed → the CLI attributes framework_issue.
		try {
			const scenarioSeedTables = dedupeScenarioSeedTables(config.executionScenarios ?? [], logger);
			if (scenarioSeedTables.length > 0) {
				const schemasOnly = scenarioSeedTables.map((table) => ({ ...table, rows: undefined }));
				const { dataTableIds } = await client.restoreThread(threadId, [], [], schemasOnly, {
					uniquifyNames: false,
				});
				// restoreThread returns ids in input order; a length mismatch means we
				// can't safely map names to ids, so fail rather than mis-seed.
				if (dataTableIds.length !== scenarioSeedTables.length) {
					throw new Error(
						`Pre-seeding created ${String(dataTableIds.length)} data table(s) but the case declares ${String(scenarioSeedTables.length)}; cannot map names to ids.`,
					);
				}
				scenarioSeedTables.forEach((table, index) => {
					scenarioTableIdsByName[table.name] = dataTableIds[index];
				});
				restoredDataTableIds = [...restoredDataTableIds, ...dataTableIds];
				scenarioSeedTablesNote = buildSeededTablesNote(scenarioSeedTables);
				logger.info(
					`  Pre-seeded ${String(dataTableIds.length)} scenario data table schema(s)${config.laneTag ?? ''}`,
				);
			}
		} catch (error: unknown) {
			seedingFailed = true;
			throw error;
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
				// The pre-seeded-table note goes to the agent, but the recorded turn
				// (and the graded transcript) keeps the clean user prompt.
				openingMessageSuffix: scenarioSeedTablesNote,
			});
		} else {
			recordUserTurn(events, openingMessage);
			await client.sendMessage(threadId, openingMessage + scenarioSeedTablesNote);
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
		builtWorkflowIds = outcome.workflowsCreated.map((wf) => wf.id);
		builtDataTableIds = outcome.dataTablesCreated;

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
					artifactRefs: eventOutcome.artifactRefs,
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
				artifactRefs: eventOutcome.artifactRefs,
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

		// The case's scenario data tables were created empty before the build turn
		// (see the pre-build block above), so the agent bound their real ids; their
		// per-scenario rows are seeded in runScenario via seededScenarioTableIdsByName.
		return {
			success: true,
			workflowId: outcome.workflowsCreated[0].id,
			workflowJsons: outcome.workflowJsons,
			buildTrace,
			createdWorkflowIds: outcome.workflowsCreated.map((wf) => wf.id),
			createdDataTableIds: [...outcome.dataTablesCreated, ...restoredDataTableIds],
			seededScenarioTableIdsByName: scenarioTableIdsByName,
			artifactRefs: eventOutcome.artifactRefs,
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
			createdWorkflowIds: [...restoredWorkflowIds, ...builtWorkflowIds],
			createdDataTableIds: [...restoredDataTableIds, ...builtDataTableIds],
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
	seedContext?: ScenarioSeedContext,
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
		seedContext,
	);
}

/** Per-scenario row-seeding context: the run's thread and the name→real-id map
 *  of the tables created empty before the build turn (TRUST-311 follow-up). */
export interface ScenarioSeedContext {
	threadId: string;
	tableIdsByName: Record<string, string>;
}

/** Max distinct scenario seed tables per case — mirrors the restore-thread
 *  DTO's `dataTables` cap, since the whole union is sent in one call. */
const MAX_SEED_DATA_TABLES = 20;

/**
 * Deduplicate the data tables an execution-scenario case declares
 * (`seedDataTables`) into the union a case shares across its scenarios
 * (TRUST-311). A table name is unique per project and the built workflow binds
 * it by name, so a case shares ONE table per name across its scenarios; the
 * first declaration wins. A later same-name declaration with a different shape
 * (columns/rows) is dropped with a warning — the by-name binding can only
 * resolve to one table, so keeping the first silently would be data loss for the
 * author. Throws if the distinct-name union exceeds the restore-thread DTO's cap
 * (the whole union is created in one call). The returned tables carry their
 * declared `rows`, but the pre-build creation seeds only the schema — rows are
 * reset+seeded per scenario (`reseedScenarioTables`).
 */
export function dedupeScenarioSeedTables(
	scenarios: ExecutionScenario[],
	logger: EvalLogger,
): InstanceAiEvalSeedDataTable[] {
	const byName = new Map<string, InstanceAiEvalSeedDataTable>();
	for (const scenario of scenarios) {
		for (const table of scenario.seedDataTables ?? []) {
			const existing = byName.get(table.name);
			if (existing) {
				if (!sameSeedTableShape(existing, table)) {
					logger.warn(
						`  Scenario seed table "${table.name}" is declared more than once with different columns/rows; keeping the first declaration and ignoring the rest.`,
					);
				}
				continue;
			}
			byName.set(table.name, table);
		}
	}
	if (byName.size > MAX_SEED_DATA_TABLES) {
		throw new Error(
			`A case declares ${String(byName.size)} distinct scenario seed data tables, exceeding the ${String(MAX_SEED_DATA_TABLES)}-table restore limit; reduce the number of distinct table names.`,
		);
	}
	return [...byName.values()];
}

/**
 * A note appended to the build's opening message naming the data tables that
 * already exist in the workspace (created empty before the build turn) so the
 * agent discovers and binds the REAL table (via the Data Table node's
 * list/schema) instead of creating a duplicate — the production-faithful flow
 * where the user's table pre-exists (TRUST-311 follow-up). Empty when the case
 * declares no scenario seed tables.
 */
export function buildSeededTablesNote(tables: InstanceAiEvalSeedDataTable[]): string {
	if (tables.length === 0) return '';
	const lines = tables.map((table) => {
		const columns = table.columns.map((column) => `${column.name}: ${column.type}`).join(', ');
		return `- "${table.name}" (columns: ${columns})`;
	});
	return `\n\nThe following data table(s) already exist in this workspace — reuse them (look them up with the Data Table node's list/schema) instead of creating new ones:\n${lines.join('\n')}`;
}

/**
 * True when any scenario declares seed tables. All of a case's scenarios share
 * one table per name, so their per-scenario row reset+seed
 * (`reseedScenarioTables`) must run serially — concurrent scenarios would race
 * on the shared table's rows. Callers gate scenario concurrency to 1 for such
 * cases.
 */
export function scenariosRequireSerialSeeding(scenarios: ExecutionScenario[]): boolean {
	return scenarios.some((scenario) => (scenario.seedDataTables?.length ?? 0) > 0);
}

/**
 * Reset + row-seed a scenario's declared data tables into their pre-seeded real
 * ids, just before that scenario executes (TRUST-311). Clears whatever rows a
 * prior scenario — or a build-time self-verification execution — left, then
 * inserts this scenario's declared rows, so each scenario runs against exactly
 * the state it declared (and scenarios may carry different rows for the same
 * table). `tableIdsByName` maps the declared table name to the real id created
 * before the build turn; a name missing from it means the table was never
 * pre-seeded, which is a harness bug, so throw rather than silently skip.
 */
export async function reseedScenarioTables(
	client: N8nClient,
	scenario: ExecutionScenario,
	threadId: string,
	tableIdsByName: Record<string, string>,
	logger: EvalLogger,
): Promise<void> {
	for (const table of scenario.seedDataTables ?? []) {
		const tableId = tableIdsByName[table.name];
		if (!tableId) {
			throw new Error(
				`Scenario "${scenario.name}" declares seed table "${table.name}" that was not pre-seeded before the build; cannot bind its rows.`,
			);
		}
		await client.seedDataTableRows(threadId, tableId, table.rows ?? []);
		logger.verbose(
			`    [${scenario.name}] reseeded data table "${table.name}" (${String((table.rows ?? []).length)} row(s))`,
		);
	}
}

/** Two seed tables bind the same way iff their columns + rows match (the id
 *  differs per declaration and is cosmetic under by-name seeding). */
function sameSeedTableShape(
	a: InstanceAiEvalSeedDataTable,
	b: InstanceAiEvalSeedDataTable,
): boolean {
	return (
		JSON.stringify({ columns: a.columns, rows: a.rows }) ===
		JSON.stringify({ columns: b.columns, rows: b.rows })
	);
}

/**
 * Clean up workflows, data tables and any built agent created during a build.
 *
 * Returns false when any deletion failed so callers can retry later.
 */
export async function cleanupBuild(
	client: N8nClient,
	build: BuildResult,
	logger: EvalLogger,
): Promise<boolean> {
	let clean = true;

	for (const id of build.createdWorkflowIds) {
		try {
			await client.deleteWorkflow(id);
		} catch {
			clean = false; // Best-effort cleanup
		}
	}

	// Agent-anchored builds create a first-class Agent — delete it with the
	// rest of the build's artifacts so no caller has to remember to.
	const agentRef = findAgentArtifactRef(build.artifactRefs);
	if (agentRef) {
		try {
			await client.deleteAgent(await client.getPersonalProjectId(), agentRef.id);
		} catch {
			clean = false; // Best-effort cleanup
		}
	}

	if (build.createdDataTableIds.length > 0) {
		try {
			const projectId = await client.getPersonalProjectId();
			for (const dtId of build.createdDataTableIds) {
				try {
					await client.deleteDataTable(projectId, dtId);
				} catch {
					clean = false; // Best-effort cleanup
				}
			}
			logger.verbose(`  Cleaned up ${String(build.createdDataTableIds.length)} data table(s)`);
		} catch {
			clean = false; // Non-fatal — project ID lookup may fail
		}
	}

	// Clears backend thread state (run-state registries, memory) that otherwise
	// grows one entry per build for the container's lifetime.
	if (build.threadId) {
		try {
			await client.deleteThread(build.threadId);
		} catch {
			clean = false; // Best-effort cleanup
		}
	}

	return clean;
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
	seedContext?: ScenarioSeedContext,
): Promise<ExecutionScenarioResult> {
	const pinNodes = pinAiRoots && pinAiRoots.length > 0 ? pinAiRoots : undefined;
	const targetWorkflowId = selectScenarioWorkflowId(scenario, workflowId, workflowJsons, logger);

	// Reset + seed this scenario's declared rows into the tables the build bound,
	// just before it runs — clears any prior scenario's (or build-time) rows so
	// each scenario runs against exactly the state it declared (TRUST-311). Runs
	// serially per case (see scenariosRequireSerialSeeding) to avoid racing on the
	// shared table.
	if (seedContext) {
		await reseedScenarioTables(
			client,
			scenario,
			seedContext.threadId,
			seedContext.tableIdsByName,
			logger,
		);
	}

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

/** Shared routing rule for both eval paths: an agent ref marks the case
 *  agent-anchored — the agent, not any co-built helper workflow, is the target. */
/** Agent scenarios don't seed data-table rows (tables exist but stay empty) — shared warning for both orchestration paths. */
export function warnAgentSeedDataTablesIgnored(
	logger: EvalLogger,
	scenarioName: string,
	seedDataTables: unknown[] | undefined,
): void {
	if ((seedDataTables?.length ?? 0) > 0) {
		logger.warn(
			`    [${scenarioName}] seedDataTables are not seeded on the agent execution path — tables exist but stay empty`,
		);
	}
}

export function findAgentArtifactRef(
	artifactRefs: ArtifactRef[] | undefined,
): ArtifactRef | undefined {
	return (artifactRefs ?? []).find((ref) => ref.type === 'agent');
}

/**
 * Fetch + render the agent's config and skills — the stable verification
 * context every scenario of the build shares (the agent-artifact analog of
 * the workflow JSON block). Falls back to a marker string so a fetch failure
 * degrades verification instead of failing the scenario.
 */
export async function fetchAgentScenarioContext(
	client: N8nClient,
	ref: ArtifactRef,
	logger: EvalLogger,
): Promise<string> {
	try {
		const agentArtifact = await agentHandler.fetch(ref, client);
		return agentHandler.renderArtifact(agentArtifact);
	} catch (error: unknown) {
		logger.warn(
			`  Agent config fetch failed — verifying scenarios without it: ${error instanceof Error ? error.message : String(error)}`,
		);
		return '(agent configuration could not be fetched)';
	}
}

/**
 * Execute one scenario against a built first-class Agent and verify the
 * result — the agent-artifact counterpart of runScenario. The agent reasons
 * with its real model; its tools' outbound HTTP is served by the mock layer.
 */
export async function executeAgentScenario(
	client: N8nClient,
	agentId: string,
	scenario: ExecutionScenario,
	agentContext: string,
	logger: EvalLogger,
	timeoutMs?: number,
	testCaseName?: string,
	buildTrace?: BuildTrace,
): Promise<ExecutionScenarioResult> {
	const execStart = Date.now();
	const projectId = await client.getPersonalProjectId();
	let evalResult = await client.executeAgentWithLlmMock(
		agentId,
		projectId,
		scenario.dataSetup,
		timeoutMs,
	);
	// Same in-band transient-abort retry as the workflow path.
	for (
		let attempt = 1;
		!evalResult.success &&
		isTransientExecutionAbort(evalResult.errors) &&
		attempt < MAX_EXEC_ATTEMPTS;
		attempt++
	) {
		logger.warn(
			`    [${scenario.name}] agent execution aborted by transient DB error (attempt ${String(attempt)}/${String(MAX_EXEC_ATTEMPTS)}: ${evalResult.errors.join('; ')}); retrying`,
		);
		await delay(500 * attempt);
		evalResult = await client.executeAgentWithLlmMock(
			agentId,
			projectId,
			scenario.dataSetup,
			timeoutMs,
		);
	}
	const execMs = Date.now() - execStart;

	logger.info(
		`    [${scenario.name}] agent exec=${String(Math.round(execMs / 1000))}s (${String(evalResult.toolCalls.length)} tool calls, ${String(evalResult.modelTurns.length)} model turns)`,
	);

	const verifyStart = Date.now();
	const artifact = buildAgentVerificationArtifact(scenario, agentContext, evalResult);

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
		testCaseName: testCaseName ?? `agent-${agentId}`,
		scenarioName: scenario.name,
		workflowId: `agent:${agentId}`,
		passed,
		result,
		verificationResults,
		verifierAttempts: verification.attempts,
		buildTrace,
		logger,
	});
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
		agentEvalResult: evalResult,
		agentId,
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

/** Agent-artifact counterpart of buildVerificationArtifact: the agent's
 *  config + skills play the workflow-JSON role (stable across scenarios of
 *  the same build), the recorded agent run plays the execution trace. */
export function buildAgentVerificationArtifact(
	scenario: ExecutionScenario,
	agentContext: string,
	evalResult: InstanceAiEvalAgentExecutionResult,
): VerificationArtifact {
	return {
		workflowContext: [
			'## Agent under test',
			'',
			'This scenario ran against a first-class n8n Agent, not a workflow. The agent reasoned with its real configured model; every outbound HTTP request its tools made was intercepted and served by the eval mock layer.',
			'',
			agentContext,
		].join('\n'),
		scenarioContext: buildAgentScenarioContextBlock(scenario, evalResult),
	};
}

function agentJsonBlock(value: unknown, cap = 2_000): string {
	let serialized: string;
	try {
		serialized = JSON.stringify(value, null, 1) ?? 'null';
	} catch {
		return '[unserializable]';
	}
	if (serialized.length > cap) return `${serialized.slice(0, cap)}… [truncated]`;
	return serialized;
}

function buildAgentScenarioContextBlock(
	scenario: ExecutionScenario,
	evalResult: InstanceAiEvalAgentExecutionResult,
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
	for (const warning of evalResult.seed.warnings) {
		preAnalysis.push(`⚠ FRAMEWORK ISSUE: ${warning}`);
	}
	for (const skipped of evalResult.skippedFeatures) {
		preAnalysis.push(
			`⚠ HARNESS LIMITATION: agent feature "${skipped.feature}" was disabled for this run (${skipped.reason}) — do not fail the scenario for behaviour that would require it.`,
		);
	}
	for (const call of evalResult.toolCalls) {
		for (const req of call.interceptedRequests) {
			if (isRecord(req.mockResponse) && '_evalMockError' in req.mockResponse) {
				const msg = req.mockResponse.message;
				preAnalysis.push(
					`⚠ MOCK ISSUE: tool "${call.tool}" ${req.method} ${req.url} → mock generation failed: ${typeof msg === 'string' ? msg : 'unknown'}`,
				);
			}
		}
	}
	if (preAnalysis.length > 0) {
		sections.push('## Pre-analysis (automated flags)', '', ...preAnalysis, '');
	}

	sections.push(
		'## Agent run',
		'',
		`**Opening user message (generated from the data setup):** ${evalResult.seed.openingMessage}`,
		`**Run status:** ${evalResult.success ? 'completed' : 'FAILED'}${evalResult.finishReason ? ` (finishReason: ${evalResult.finishReason})` : ''}${evalResult.model ? ` — model: ${evalResult.model}` : ''}`,
		'',
	);
	if (evalResult.errors.length > 0) {
		sections.push('**Run errors:**', ...evalResult.errors.map((error) => `- ${error}`), '');
	}

	// Looping agents can rack up dozens of calls — elide the middle so the
	// verifier prompt stays bounded (start + end carry the decisive activity).
	const MAX_RENDERED_CALLS = 30;
	const TAIL_CALLS = 8;
	const MAX_RENDERED_REQUESTS_PER_CALL = 5;
	const allCalls = evalResult.toolCalls.map((call, index) => ({ call, ordinal: index + 1 }));
	const renderedCalls =
		allCalls.length <= MAX_RENDERED_CALLS
			? allCalls
			: [...allCalls.slice(0, MAX_RENDERED_CALLS - TAIL_CALLS), ...allCalls.slice(-TAIL_CALLS)];
	const elidedCallCount = allCalls.length - renderedCalls.length;
	if (evalResult.toolCalls.length === 0) {
		sections.push('**Tool calls:** none — the agent made no tool calls in this run.', '');
	} else {
		sections.push(`## Tool calls (${String(evalResult.toolCalls.length)})`, '');
		if (elidedCallCount > 0) {
			sections.push(
				`_Showing the first ${String(MAX_RENDERED_CALLS - TAIL_CALLS)} and last ${String(TAIL_CALLS)} calls; ${String(elidedCallCount)} middle calls elided._`,
				'',
			);
		}
		renderedCalls.forEach(({ call, ordinal }) => {
			sections.push(
				`### ${String(ordinal)}. ${call.tool} (${call.kind})${call.error ? ' — ERRORED' : ''}${call.autoApproved ? ' [approval auto-granted by the harness]' : ''}`,
				'',
			);
			if (call.input !== undefined) {
				sections.push('**Input:**', '```json', agentJsonBlock(call.input), '```', '');
			}
			if (call.error) {
				sections.push(`**Error:** ${call.error}`, '');
			}
			if (call.output !== undefined) {
				sections.push('**Output:**', '```json', agentJsonBlock(call.output), '```', '');
			}
			const requests = call.interceptedRequests ?? [];
			for (const req of requests.slice(0, MAX_RENDERED_REQUESTS_PER_CALL)) {
				sections.push(`**Intercepted request:** ${req.method} ${req.url} (${req.nodeType})`);
				if (req.requestBody !== undefined) {
					sections.push('Request body:', '```json', agentJsonBlock(req.requestBody, 1_000), '```');
				}
				sections.push(
					'Mock response:',
					'```json',
					agentJsonBlock(req.mockResponse, 1_500),
					'```',
					'',
				);
			}
			if (requests.length > MAX_RENDERED_REQUESTS_PER_CALL) {
				sections.push(
					`_${String(requests.length - MAX_RENDERED_REQUESTS_PER_CALL)} further intercepted request(s) for this call elided._`,
					'',
				);
			}
		});
	}

	sections.push(
		'## Agent final reply',
		'',
		evalResult.finalText.length > 0 ? evalResult.finalText : '(no final text)',
		'',
	);

	sections.push(
		`**Model turns:** ${String(evalResult.modelTurns.length)} real call(s) to ${evalResult.model ?? 'the configured model'}${evalResult.usage ? ` — ~${String(evalResult.usage.inputTokens ?? 0)} input / ${String(evalResult.usage.outputTokens ?? 0)} output tokens` : ''}.`,
		'',
		'Verify the checklist against how the agent actually behaved in this run — its tool calls, the intercepted requests and mock responses, and its final reply.',
	);

	return sections.join('\n');
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
