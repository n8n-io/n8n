// ---------------------------------------------------------------------------
// Workflow build via Instance AI
//
// Drives one build conversation end to end: thread + credential-view setup,
// conversation seeding, the (multi-turn) chat loop, outcome discovery from
// the SSE stream, and assembly of the BuildResult consumed by scenario
// execution and cleanup.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import {
	SSE_SETTLE_DELAY_MS,
	startSseConnection,
	waitForAllActivity,
	runMultiTurnConversation,
	recordUserTurn,
	type ConfirmationStrategy,
} from './chat-loop';
import { runWorkflowChecks, summarizeMissingWorkflowError } from './cleanup';
import {
	loadConversationSeed,
	remapSeedWorkflowIds,
	seedFromProse,
	transcriptPrefixFromSeed,
	type ConversationSeed,
} from './conversation-seed';
import { reconstructSeedFromThread, type SeedThreadRef } from './langsmith-seed';
import { type EvalLogger } from './logger';
import { buildSeededTablesNote, dedupeScenarioSeedTables } from './seed-tables';
import type { CheckOutcome } from '../binaryChecks/types';
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
	CapturedEvent,
	ConversationMetrics,
	ConversationTurn,
	ExecutionScenario,
	TestCaseCredential,
	TranscriptTurn,
	WorkflowTestCase,
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

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}
