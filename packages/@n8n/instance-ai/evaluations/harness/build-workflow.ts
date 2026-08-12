// ---------------------------------------------------------------------------
// Workflow build via Instance AI
//
// Drives one build conversation end to end: thread + credential-view setup,
// conversation seeding, the (multi-turn) chat loop, outcome discovery from
// the SSE stream, and assembly of the BuildResult consumed by scenario
// execution and cleanup.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest, InstanceAiWorkflowAttachment } from '@n8n/api-types';
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
	activeSeedAgentId,
	remapSeedArtifactIds,
	SEED_NAME_RE,
	seedNameBase,
	transcriptPrefixFromSeed,
	type ConversationSeed,
} from './conversation-seed';
import { reconstructSeedFromThread } from './langsmith-seed';
import type { EvalLogger } from './logger';
import type { CaseSeed } from './schema';
import {
	buildSeededTablesNote,
	dedupeScenarioSeedTables,
	evictLeftoverSeedTables,
	uniquifyScenarioTableNames,
} from './seed-tables';
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
	attachedWorkflowNote,
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
	/** What the RECORDED opening turn says, when it must differ from what's sent —
	 *  an out-of-band attachment has to be named in the transcript the judge reads.
	 *  Defaults to the sent text. */
	recordedOpeningMessage?: string;
	/** Ids already allowlisted for this thread (from pre-run `createDeclaredCredentials`
	 *  seeding) — wires `UserProxyLlm.credentialCreation` so `manual` can create a
	 *  real credential when a setup card shows zero existing candidates. Omitted
	 *  when the credential view isn't pinned (see `credentialViewPinned`), since
	 *  the allowlist endpoint isn't available in that case either. */
	allowlistedCredentialIds?: string[];
	/** Of those, the ids whose connection test the backend should resolve as
	 *  passing — the proxy must carry them because a mid-run creation replaces
	 *  the whole bypass list too. */
	bypassCredentialTestIds?: string[];
	createdCredentialIds?: Set<string>;
	/** Shared with `createDeclaredCredentials`'s pre-run seeding — see
	 *  `CredentialCreationConfig.nameCounts`. */
	credentialNameCounts?: Map<string, number>;
	/** Resource references sent with the FIRST message only — an attachment is a
	 *  hand-off, not something a user re-sends every turn. */
	openingAttachments?: InstanceAiWorkflowAttachment[];
}

/** A conversation is multi-turn if it has more than one turn, or if the only
 *  turn is from the assistant. Empty conversations are treated as single-turn. */
function isMultiTurnConversation(conversation: ConversationTurn[]): boolean {
	if (conversation.length === 0) return false;
	if (conversation.length > 1) return true;
	return conversation[0].role !== 'user';
}

async function driveMultiTurnConversation(
	config: MultiTurnDriverConfig,
): Promise<ProxyDecisionStats> {
	const openingMessage = config.conversation[0]?.text ?? '';
	const recordedOpeningMessage = config.recordedOpeningMessage ?? openingMessage;
	// The proxy renders both its script and its running transcript from `text` alone,
	// so it needs the recorded opening too — otherwise it audits every plan and
	// follow-up against a blank turn that never mentions the workflow.
	const proxyConversation = config.conversation.map((turn, index) =>
		index === 0 ? { ...turn, text: recordedOpeningMessage } : turn,
	);

	const proxy = new UserProxyLlm({
		conversation: proxyConversation,
		messageBudget: config.messageBudget,
		logger: config.logger,
		...(config.allowlistedCredentialIds !== undefined
			? {
					credentialCreation: {
						client: config.client,
						threadId: config.threadId,
						allowlistedCredentialIds: config.allowlistedCredentialIds,
						bypassCredentialTestIds: config.bypassCredentialTestIds,
						createdCredentialIds: config.createdCredentialIds,
						nameCounts: config.credentialNameCounts,
					},
				}
			: {}),
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

	recordUserTurn(config.events, recordedOpeningMessage);
	await config.client.sendMessage(
		config.threadId,
		openingMessage + (config.openingMessageSuffix ?? ''),
		config.openingAttachments,
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
	/** Agents restored by a seed — tracked here, not just in `artifactRefs`, so one
	 *  the live turn never touched still gets cleaned up. */
	createdAgentIds?: string[];
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
	/** Evidence that the MODEL PROVIDER, not the builder, failed this build (a
	 *  5xx/429 upstream of the n8n instance). Set only after the retry budget is
	 *  spent. Routed to `framework_issue` with `PROVIDER_OUTAGE_ROOT_CAUSE`, so an
	 *  outage never lands in the builder's baseline (TRUST-374). */
	providerOutage?: string;
}

/**
 * True when the build failed for a reason the agent doesn't own — seeding,
 * transport or the model provider. Everything downstream that has to attribute
 * a failure (the scenario row, the ungraded expectations) reads this one
 * predicate so the three answers can't drift apart (TRUST-375).
 */
export function buildFailedOnInfra(build: BuildResult): boolean {
	if (build.success) return false;
	return (
		build.seedingFailed === true ||
		build.transportFailure === true ||
		build.providerOutage !== undefined
	);
}

export interface BuildWorkflowConfig {
	client: N8nClient;
	/** Hand-authored conversation (≥1 turn, first `user`; one user turn →
	 *  auto-approve, more → proxy). Optional when a `replay` seed derives the live turn. */
	conversation?: ConversationTurn[];
	/** Max follow-up messages the proxy will send. Ignored in auto-approve mode. */
	messageBudget?: number;
	/** Credentials this build should see (created for real, view pinned to them). */
	credentials?: TestCaseCredential[];
	/** Run-level registry the created credential IDs are added to for cleanup. */
	createdCredentialIds?: Set<string>;
	/** History restored before the live message — carried in the case
	 *  (`mode: 'inline'`) or reconstructed from a trace (`mode: 'replay'`, which
	 *  also supplies the live turn). */
	seed?: CaseSeed;
	/** Execution scenarios whose declared `seedDataTables` are created + row-seeded
	 *  after a successful build, before any scenario runs (TRUST-311). */
	executionScenarios?: ExecutionScenario[];
	timeoutMs?: number;
	preRunWorkflowIds: Set<string>;
	/** Data tables present before any build on this lane — the only ones the
	 *  scenario-table eviction may delete. Omitted = no eviction. */
	preRunDataTableIds?: Set<string>;
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
	let restoredAgentIds: string[] = [];
	/** The agent the seeded history last targeted — graded and executed first. */
	let seedActiveAgentId: string | undefined;
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
	// Seed-declared workflow id -> the workflow as actually restored (fresh id and
	// name). Lets an authored `attach` reference survive the per-run remap.
	let seedWorkflowsBySeedId = new Map<string, { id: string; name: string }>();

	try {
		const buildStart = Date.now();

		// `replay` derives both seed and live turn from a trace; `inline` carries the
		// seed in the case and the conversation is authored.
		let seed: ConversationSeed | undefined;
		let conversation = config.conversation ?? [];
		try {
			switch (config.seed?.mode) {
				case 'replay': {
					const reconstructed = await reconstructSeedFromThread(config.seed);
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
						`  Reconstructed seed from thread ${config.seed.threadId}: ${String(reconstructed.runCount)} runs → ${String(seed.messages.length)} message(s), ${String(seed.workflows.length)} workflow(s)${contSuffix} [${wsLabel}]${config.laneTag ?? ''}`,
					);
					break;
				}
				case 'inline':
					// The arm is a superset of the restore payload — `mode` is the case
					// schema's discriminant and never reaches restore-thread.
					seed = config.seed;
					break;
				case undefined:
					break;
				default: {
					// A new arm must decide what to restore here; without this the case
					// would silently run UNSEEDED, which is the failure this slot exists
					// to make impossible.
					const unhandled: never = config.seed;
					throw new Error(`Unhandled seed mode: ${JSON.stringify(unhandled)}`);
				}
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
		// Shared with UserProxyLlm's mid-run credential creation (if any) so a
		// credential created during the run doesn't collide on display name with
		// one declared here — both would otherwise default to e.g. "[eval] Slack".
		const credentialNameCounts = new Map<string, number>();
		const createdCredentials = await createDeclaredCredentials(client, declaredCredentials, {
			onCreated: (id) => config.createdCredentialIds?.add(id),
			logger,
			nameCounts: credentialNameCounts,
		});
		const seededCredentialIds = createdCredentials.map((c) => c.id);
		try {
			// A seeded credential models one the user already has connected, so its
			// connection test resolves as passing — same as one set up on a card
			// during the run. Both carry a placeholder token that would really fail.
			await client.setThreadCredentialAllowlist(threadId, seededCredentialIds, seededCredentialIds);
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
				const remapped = remapSeedArtifactIds(seed);
				// The remap preserves order, so index-align the authored ids with the per-run
				// ones. An author writes the id the seed declares; an attachment has to carry
				// the id that actually exists on the instance.
				seedWorkflowsBySeedId = new Map(
					seed.workflows.map((workflow, index) => [workflow.id, remapped.workflows[index]]),
				);
				await evictLeftoverSeedWorkflows(
					client,
					remapped,
					config.preRunWorkflowIds,
					logger,
					config.laneTag,
				);
				const restoreResult = await client.restoreThread(
					threadId,
					remapped.messages,
					remapped.workflows,
					remapped.dataTables,
					remapped.agents,
				);
				restoredWorkflowIds = restoreResult.workflowIds;
				restoredDataTableIds = restoreResult.dataTableIds;
				restoredAgentIds = restoreResult.agentIds;
				// The server binds the thread to the agent the history LAST targeted, so
				// the harness has to grade that same one — array order is an authoring
				// artifact and `findAgentArtifactRef` takes the first ref it sees.
				seedActiveAgentId = activeSeedAgentId(remapped);
				seededTranscript = transcriptPrefixFromSeed(remapped.messages);
				const dtSuffix =
					restoredDataTableIds.length > 0
						? `, ${String(restoredDataTableIds.length)} data table(s)`
						: '';
				const agentSuffix =
					restoredAgentIds.length > 0 ? `, ${String(restoredAgentIds.length)} agent(s)` : '';
				logger.info(
					`  Seeded ${String(restoreResult.restored)} prior message(s), ${String(restoredWorkflowIds.length)} workflow(s)${dtSuffix}${agentSuffix}${config.laneTag ?? ''}`,
				);
			} catch (error: unknown) {
				seedingFailed = true;
				throw new Error(
					`Seeding failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// TRUST-311 follow-up: create the case's execution-scenario data tables EMPTY
		// BEFORE the build turn, so the agent discovers the real table (Data Table
		// list/schema) and binds its real id — the production-faithful flow where the
		// user's table pre-exists. Rows are reset+seeded per scenario
		// (reseedScenarioTables) because a build-time self-verification execution can
		// mutate them. The created ids fold into restoredDataTableIds so the outer
		// catch and cleanupBuild already cover them (a build failure still cleans them
		// up); a create failure is a harness problem, so flag seedingFailed → the CLI
		// attributes framework_issue.
		try {
			const scenarioSeedTables = dedupeScenarioSeedTables(config.executionScenarios ?? [], logger);
			if (scenarioSeedTables.length > 0) {
				await evictLeftoverSeedTables(
					client,
					scenarioSeedTables,
					config.preRunDataTableIds,
					logger,
					config.laneTag,
				);
				// `uniquifyNames: false` stays — the harness mints the suffix so it knows
				// which name to give the agent below.
				const schemasOnly = uniquifyScenarioTableNames(scenarioSeedTables).map((table) => ({
					...table,
					rows: undefined,
				}));
				const { dataTableIds } = await client.restoreThread(threadId, [], [], schemasOnly, [], {
					uniquifyNames: false,
				});
				// restoreThread returns ids in input order; a length mismatch means we
				// can't safely map names to ids, so fail rather than mis-seed.
				if (dataTableIds.length !== scenarioSeedTables.length) {
					throw new Error(
						`Pre-seeding created ${String(dataTableIds.length)} data table(s) but the case declares ${String(scenarioSeedTables.length)}; cannot map names to ids.`,
					);
				}
				// Keyed by the DECLARED name — what a scenario writes.
				scenarioSeedTables.forEach((table, index) => {
					scenarioTableIdsByName[table.name] = dataTableIds[index];
				});
				restoredDataTableIds = [...restoredDataTableIds, ...dataTableIds];
				// The agent looks up the name that exists, not the declared one.
				scenarioSeedTablesNote = buildSeededTablesNote(schemasOnly);
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

		// The opening turn may hand the agent a seeded workflow, the way the editor does.
		// Resolved AFTER the restore so it carries the id that exists on the instance;
		// the case schema already refused an `attach` no seeded workflow declares.
		const attachedSeedWorkflow = conversation[0]?.attach?.workflow;
		const restoredForAttach =
			attachedSeedWorkflow === undefined
				? undefined
				: seedWorkflowsBySeedId.get(attachedSeedWorkflow);
		// The schema already refused an `attach` no seeded workflow declares, so a miss
		// here means the restore/remap dropped it. Fail loudly: sending no attachment
		// would silently downgrade a hand-off case to a find-it one.
		if (attachedSeedWorkflow !== undefined && restoredForAttach === undefined) {
			seedingFailed = true;
			throw new Error(
				`The opening turn attaches seeded workflow "${attachedSeedWorkflow}", but the restore produced no workflow for that id — refusing to run the case unattached (it would silently become a find-it test).`,
			);
		}
		const openingAttachments: InstanceAiWorkflowAttachment[] | undefined = restoredForAttach
			? [{ type: 'workflow', id: restoredForAttach.id, name: restoredForAttach.name }]
			: undefined;
		// Name the out-of-band attachment in the RECORDED turn, or the judge and the
		// prompt-aware checks read a text-less hand-off as a bare empty message — see
		// `attachedWorkflowNote`. Mirrors `openingMessageSuffix`, which diverges
		// sent-vs-recorded the other way.
		const recordedOpeningMessage = [attachedWorkflowNote(restoredForAttach?.name), openingMessage]
			.filter(Boolean)
			.join(' ');

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
				// Only wired when the credential view is actually pinned — the
				// allowlist endpoint a mid-run creation depends on isn't available
				// otherwise either (see the catch above).
				...(credentialViewPinned
					? {
							allowlistedCredentialIds: seededCredentialIds,
							bypassCredentialTestIds: seededCredentialIds,
							createdCredentialIds: config.createdCredentialIds,
							credentialNameCounts,
						}
					: {}),
				// The pre-seeded-table note goes to the agent, but the recorded turn
				// (and the graded transcript) keeps the clean user prompt.
				openingMessageSuffix: scenarioSeedTablesNote,
				openingAttachments,
				recordedOpeningMessage,
			});
		} else {
			recordUserTurn(events, recordedOpeningMessage);
			await client.sendMessage(
				threadId,
				openingMessage + scenarioSeedTablesNote,
				openingAttachments,
			);
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
		// Same for a restored agent, without which a live turn that never calls
		// `build-agent` would grade against no agent at all — so a seeded agent alone
		// marks the case agent-anchored.
		const seenAgentIds = new Set(
			eventOutcome.artifactRefs.filter((ref) => ref.type === 'agent').map((ref) => ref.id),
		);
		// Active agent first, so `findAgentArtifactRef` picks the one the restored
		// thread actually continues rather than whichever the seed happened to list first.
		const restoredAgentOrder =
			seedActiveAgentId && restoredAgentIds.includes(seedActiveAgentId)
				? [seedActiveAgentId, ...restoredAgentIds.filter((id) => id !== seedActiveAgentId)]
				: restoredAgentIds;
		const artifactRefs: ArtifactRef[] = [
			...eventOutcome.artifactRefs,
			...restoredAgentOrder
				.filter((id) => !seenAgentIds.has(id))
				.map((id) => ({ type: 'agent' as const, id })),
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
					artifactRefs,
					createdWorkflowIds: restoredWorkflowIds,
					createdDataTableIds: [...outcome.dataTablesCreated, ...restoredDataTableIds],
					createdAgentIds: restoredAgentIds,
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
				createdAgentIds: restoredAgentIds,
				artifactRefs,
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
			createdAgentIds: restoredAgentIds,
			seededScenarioTableIdsByName: scenarioTableIdsByName,
			artifactRefs,
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
			createdAgentIds: restoredAgentIds,
			conversationMetrics,
			events,
			threadId,
			credentialViewPinned,
			seedingFailed,
		};
	}
}

/**
 * Delete leftover seed workflows sharing this seed's base name before restoring.
 *
 * A seeded case's live turn addresses the workflow the way a user would — often by
 * name, sometimes loosely ("the batch image workflow"). Any same-named copy left on
 * the instance is a candidate the agent can rationally ground on instead, and it
 * will prefer the one with failed executions when the message mentions a failure.
 * The judge then grades a different artifact than the agent edited, which produces
 * false greens as readily as false reds. Seen for real: three iterations all grounded
 * on a leftover from an earlier calibration run; one read the leftover's
 * already-applied fix, correctly concluded there was nothing to do, and scored 2/6.
 *
 * Leftovers accumulate because `--keep-workflows` is the documented calibration
 * flow, and because a crashed or timed-out run skips its own cleanup.
 *
 * Only names this module minted are ever touched — the `[seed <8 hex>]` suffix is
 * applied at remap time and by nothing else, so a real workflow, and any workflow
 * the agent itself built, are both out of reach. Two iterations of one case can't
 * race here either: the lane allocator refuses to run the same case key twice
 * concurrently on a lane, so a sibling's fresh restore is never in the blast radius.
 *
 * Best-effort: a failure here must not fail an otherwise valid build, so it is
 * logged and the restore proceeds.
 */
async function evictLeftoverSeedWorkflows(
	client: N8nClient,
	seed: ConversationSeed,
	preRunWorkflowIds: Set<string>,
	logger: EvalLogger,
	laneTag?: string,
): Promise<void> {
	const baseNames = new Set(
		seed.workflows.map((workflow) =>
			seedNameBase(SEED_NAME_RE.exec(workflow.name)?.[1] ?? workflow.name),
		),
	);
	if (baseNames.size === 0) return;
	try {
		const existing = await client.listWorkflows();
		const stale = existing.filter((workflow) => {
			// A matching suffix alone does NOT prove a leftover. A lane admits several
			// different case slugs at once, and it is released as soon as `buildWorkflow`
			// returns even though that build's restored workflow stays live for scenario
			// execution and judging. So a sibling case sharing this seed's base name
			// would be selectable here — and hard-deleting its artifact mid-run is worse
			// than the collision this exists to prevent.
			//
			// The pre-run snapshot settles it: taken once per lane before any build, so
			// anything created DURING the run (a sibling's fresh restore, or the
			// workflow the agent is building) is absent by construction. What remains is
			// what was already lying there — a previous run's `--keep-workflows`
			// leftover, or a crashed run that skipped its own cleanup.
			if (!preRunWorkflowIds.has(workflow.id)) return false;
			const base = SEED_NAME_RE.exec(workflow.name)?.[1];
			return base !== undefined && baseNames.has(base);
		});
		// Per-workflow, because best-effort has to mean each one: letting a single
		// failed delete abort the loop leaves the rest of the leftovers selectable
		// by name, which is the collision this eviction exists to prevent.
		let evicted = 0;
		for (const workflow of stale) {
			try {
				// deleteWorkflow archives first — a non-archived workflow can't be deleted.
				await client.deleteWorkflow(workflow.id);
				evicted++;
			} catch (error: unknown) {
				logger.info(
					`  Could not evict leftover seed workflow "${workflow.name}" (continuing): ${error instanceof Error ? error.message : String(error)}${laneTag ?? ''}`,
				);
			}
		}
		if (evicted > 0) {
			logger.info(
				`  Evicted ${String(evicted)} leftover seed workflow(s) before restore${laneTag ?? ''}`,
			);
		}
	} catch (error: unknown) {
		logger.info(
			`  Could not evict leftover seed workflows (continuing): ${error instanceof Error ? error.message : String(error)}${laneTag ?? ''}`,
		);
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
