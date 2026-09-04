// ---------------------------------------------------------------------------
// Workflow build via Instance AI
//
// Drives one build conversation end to end: thread + credential-view setup,
// conversation seeding, the (multi-turn) chat loop, outcome discovery from
// the SSE stream, and assembly of the BuildResult consumed by scenario
// execution and cleanup.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest, InstanceAiWorkflowAttachment } from '@n8n/api-types';
import { truncate } from '@n8n/utils/string/truncate';
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
import {
	credentialsCreatedByThisBuild,
	probeCredentialValue,
	redactTranscriptSecrets,
	type CredentialValueProbe,
} from './credential-setup-checks';
import {
	resolveFixtureForCredentialType,
	startCredentialSetupLane,
	type CredentialSetupLane,
	type LaneSelection,
} from './credential-setup-lane';
import { loadProviderFixtures } from './fixture-server';
import { reconstructSeedFromThread } from './langsmith-seed';
import type { EvalLogger } from './logger';
import { executePriorRuns } from './prior-runs';
import { redactSecretsInTextDeep } from './redact';
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
	/** Projects a seed created. Torn down in `cleanupBuild` rather than at the
	 *  end of the build turn: deleting a project cascades to what lives in it, and if
	 *  a regression ever did let the agent write into one, an early delete would
	 *  destroy the workflow under grading and read as a build failure. */
	createdProjectIds?: string[];
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
	/** True when the credential-setup lane never came up (no extension build, no
	 *  extension-capable Chromium, no openssl, relay disabled). The agent never
	 *  got a browser, so the red belongs to the runner, not to the model. */
	laneBootFailed?: boolean;
	/** Transport-level failure (network error, or the lane unreachable right
	 *  after failing — e.g. timed out against a dead lane). Routed to `framework_issue`. */
	transportFailure?: boolean;
	/** Set when a `seed.priorRuns` staging run produced no execution record, so the
	 *  history the case grades against does not exist. Unlike the other infra flags this
	 *  one applies even when the BUILD SUCCEEDED, which is exactly the case that would
	 *  otherwise be scored as an agent failure. */
	priorRunFailed?: string;
	/** Evidence that the MODEL PROVIDER, not the builder, failed this build (a
	 *  5xx/429 upstream of the n8n instance). Set only after the retry budget is
	 *  spent. Routed to `framework_issue` with `PROVIDER_OUTAGE_ROOT_CAUSE`, so an
	 *  outage never lands in the builder's baseline (TRUST-374). */
	providerOutage?: string;
	/** Ledger from the credential-setup lane, when one ran. Absent for every
	 *  ordinary case; present even on a failed build, so the deterministic checks
	 *  can report WHY nothing was created. */
	credentialSetup?: CredentialSetupRunFacts;
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
		build.laneBootFailed === true ||
		build.transportFailure === true ||
		build.providerOutage !== undefined
	);
}

/** Pre-scrub text for the leak scan, held OUTSIDE the BuildResult: `traceable`
 *  serialises the returned build, so a raw-text field there would ship the very
 *  key the scrub removes. */
const leakHaystacks = new WeakMap<CredentialSetupRunFacts, string>();

/** The raw (pre-redaction) run text for these facts, if this was a scrubbed
 *  local run. The leak scan needs it; nothing else should. */
export function leakHaystackFor(facts: CredentialSetupRunFacts): string | undefined {
	return leakHaystacks.get(facts);
}

/**
 * Strip a LOCAL run's real provider key from everything the build carries out.
 *
 * Must run INSIDE the traced call: LangSmith's `traceable` records the returned
 * BuildResult as the run output, so scrubbing after the call returns still ships
 * the key upstream. The orchestrator calls it again before stashing — idempotent
 * via the haystack entry, so whichever runs first wins and the other is a no-op.
 *
 * The leak CHECK needs the raw text, so it is snapshotted here, before the
 * scrub, into `leakHaystacks`.
 */
export function scrubLocalSecretsFromBuild(build: BuildResult): BuildResult {
	const facts = build.credentialSetup;
	if (!facts?.local || leakHaystacks.has(facts)) return build;
	const prefixes = localScrubPrefixes(facts);
	leakHaystacks.set(facts, searchableBuildText(build));

	// Everything the build carries out, minus the facts — a DENYLIST, because
	// `traceable` serialises the whole object and an allowlist made each new
	// field opt-in-secure. Five were added one at a time before this.
	const { credentialSetup, ...rest } = build;
	let redacted: Omit<BuildResult, 'credentialSetup'> = rest;
	for (const prefix of prefixes) {
		redacted = redactTranscriptSecrets(redacted, prefix);
	}
	// Fixture-independent floor. `prefixes` only knows the providers with a
	// fixture on disk, and a local case usually declares no credential type at
	// all, so a key from any other provider would otherwise pass through.
	redacted = redactSecretsInTextDeep(redacted) as Omit<BuildResult, 'credentialSetup'>;
	Object.assign(build, redacted);

	// The facts ride separately only because `leakHaystacks` is keyed on their
	// identity. `valueProbe.detail` is n8n's message from a credential test fired
	// at the REAL provider, so it can quote the key back.
	if (facts.valueProbe) {
		let probe = facts.valueProbe;
		for (const prefix of prefixes) probe = redactTranscriptSecrets(probe, prefix);
		facts.valueProbe = redactSecretsInTextDeep(probe) as CredentialValueProbe;
	}
	return build;
}

/** Every surface of a build the artifacts can carry, as one string. The leak
 *  scan's haystack in local mode and its hermetic-mode equivalent are the same
 *  question, so they read the same function rather than two field lists kept in
 *  step by a comment. */
export function searchableBuildText(build: BuildResult): string {
	const { credentialSetup: _facts, ...rest } = build;
	return JSON.stringify(rest);
}

/** Key shapes to strip from a local run, or THROW. Shared so the two scrub entry
 *  points cannot drift into one failing open — an empty list reads downstream as
 *  "nothing to scrub", which is how a real key gets persisted. */
function localScrubPrefixes(facts: CredentialSetupRunFacts): string[] {
	const prefixes = facts.scrubPrefixes?.length
		? facts.scrubPrefixes
		: facts.secretPrefix
			? [facts.secretPrefix]
			: [];
	if (prefixes.length === 0) {
		throw new Error(
			'Local run has no key shapes to scrub with (no scrubPrefixes and no secretPrefix). ' +
				'Refusing to persist rather than risk shipping a real key.',
		);
	}
	return prefixes;
}

/** Apply a local run's scrub to anything fetched AFTER the build was scrubbed —
 *  run debug is re-read from n8n and would otherwise reach the report raw.
 *  Throws on an unscrubale local run, exactly like the build scrub. */
export function redactLocalRunSecrets<T>(value: T, facts?: CredentialSetupRunFacts): T {
	if (!facts?.local) return value;
	let out = value;
	for (const prefix of localScrubPrefixes(facts)) {
		out = redactTranscriptSecrets(out, prefix);
	}
	return out;
}

/** What the credential-setup lane knows once a build is over — the input to the
 *  deterministic checks. Data only: judging lives in `credential-setup-checks.ts`. */
export interface CredentialSetupRunFacts {
	/** Credential type the case targets. Undefined in local mode = "any type". */
	credentialType?: string;
	/** The exact secret the fixture minted for this run. Absent in local mode —
	 *  the key is real and its value is never revealed to the harness. */
	mintedSecret?: string;
	/** True when this ran against the REAL provider site. */
	local?: boolean;
	/** Provider key prefix for the shape-based leak scan in local mode. Resolved
	 *  from the credential the agent saved, so it can be absent on a failed run —
	 *  which is why the SCRUB keys on `scrubPrefixes`, not on this. */
	secretPrefix?: string;
	/** Every key shape to strip from a local run's artifacts, known before the
	 *  build. Empty for hermetic runs, whose minted secret is not real. */
	scrubPrefixes?: string[];
	/** Whether the fixture's create-key action was actually invoked. */
	secretWasIssued: boolean;
	/** Credential ids that existed BEFORE the build — the diff base, so a
	 *  credential an earlier run left behind can't satisfy the "created" check. */
	credentialIdsBefore: string[];
	/** Ids a CONCURRENT build created during this one. Excluded from the diff:
	 *  lanes share a login, so another build's seed would otherwise read as this
	 *  agent's work. */
	foreignCredentialIds?: string[];
	/** Provider-API stand-in for the credential test, when the fixture ships one
	 *  AND n8n can reach it. Undefined => the value check is DISCARDED (reported
	 *  unverifiable) rather than failed. */
	verifyBaseUrl?: string;
	/** Result of running the credential's own test against that stand-in.
	 *  Gathered HERE, not in the checks, because the fixture server dies with the
	 *  lane in the `finally` below — by the time the orchestrator judges, the
	 *  stand-in is gone and every probe would look like a rejection. */
	valueProbe?: CredentialValueProbe;
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
	/** What the credential-setup lane should do for this case, already resolved
	 *  by the session. `{kind:'none'}` (or absent) for every ordinary case — and
	 *  then no browser launches and no port opens. */
	credentialSetupSelection?: LaneSelection;
	/** Credential type for a `local` run, where there is no fixture manifest to
	 *  read it from. */
	credentialSetupType?: string;
	/** Which case this build is, and which repeat of it. Recorded on the thread
	 *  as sourceContext, which n8n surfaces on the LangSmith trace — the only
	 *  thing that distinguishes one build from the hundreds of near-identical
	 *  ones a suite produces. */
	caseIdentity?: { fileSlug: string; iteration: number };
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
	/** Projects this run created, torn down after it — instance-level, so they
	 *  outlive the thread and would otherwise pile up across runs. */
	const seededProjectIds: string[] = [];
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
	let priorRunFailed: string | undefined;
	// Seed-declared workflow id -> the workflow as actually restored (fresh id and
	// name). Lets an authored `attach` reference survive the per-run remap.
	let seedWorkflowsBySeedId = new Map<string, { id: string; name: string }>();
	// Credential-setup lane (fixture server + extension-loaded browser). Stays
	// undefined unless the session resolved a fixture for this case.
	let credentialSetupLane: CredentialSetupLane | undefined;
	let credentialIdsBefore: string[] = [];
	/** Lane-registry ids present when this build started. Anything added AFTER
	 *  is another build's seeder or user-proxy creating a credential during our
	 *  window — the browser agent's own credential never lands here, because it
	 *  is made through the console, not through either of those. */
	let laneCredentialIdsAtStart: Set<string> = new Set();
	let laneBootFailed = false;
	/** Snapshot the lane's ledger for the BuildResult. Called on every return
	 *  path, and always BEFORE teardown, so `secretWasIssued` is still readable
	 *  and the provider stand-in is still listening. */
	const credentialSetupFacts = async (): Promise<CredentialSetupRunFacts | undefined> => {
		if (!credentialSetupLane) return undefined;
		const lane = credentialSetupLane;
		// Hand anything the AGENT created to the lane's cleanup registry — the
		// same one seeded credentials use. Nothing else knows about these: they
		// are created through the browser, not by the seeder, so without this
		// every credential-setup run leaves one behind in the eval account.
		// (The provider-side key of a `local` run is a separate matter, and
		// deliberately not ours to revoke — see docs/browser-eval-lane.md.)
		// Ids other builds registered while ours ran. Excluded from the "created"
		// diff below: builds on a lane share one login, so a concurrent seed would
		// otherwise satisfy this case's created-check and could be probed in place
		// of the agent's own credential.
		const foreignCredentialIds = [...(config.createdCredentialIds ?? [])].filter(
			(id) => !laneCredentialIdsAtStart.has(id),
		);
		if (config.createdCredentialIds) {
			// No `foreign` filter here on purpose: those ids are already in this set
			// (that is where the list comes from), so excluding them would be a no-op
			// that reads as though cleanup skips them.
			const before = new Set(credentialIdsBefore);
			for (const id of await client.listCredentialIds().catch(() => [] as string[])) {
				if (!before.has(id)) config.createdCredentialIds.add(id);
			}
		}
		return {
			foreignCredentialIds,
			credentialType: lane.credentialType,
			// Local runs mint nothing: the key is real and we never learn its value.
			mintedSecret: lane.fixture?.mintedSecret,
			secretWasIssued: lane.fixture?.secretWasIssued ?? false,
			local: lane.local,
			// Local runs have no fixture, but the registry still knows this
			// provider's key shape — enough for a shape-based leak scan.
			secretPrefix: await resolveSecretPrefix(
				client,
				lane,
				credentialIdsBefore,
				foreignCredentialIds,
			),
			scrubPrefixes: await resolveScrubPrefixes(lane),
			credentialIdsBefore,
			verifyBaseUrl: lane.verifyBaseUrl,
			valueProbe: await probeCredentialValue({
				client,
				credentialType: lane.credentialType,
				credentialIdsBefore,
				foreignCredentialIds,
				fixture: lane.fixture,
				verifyBaseUrl: lane.verifyBaseUrl,
				urlField: lane.credentialUrlField,
				local: lane.local,
				logger,
			}),
		};
	};

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
		await client.ensureThread(
			threadId,
			projectId,
			config.caseIdentity
				? {
						evalCase: config.caseIdentity.fileSlug,
						evalIteration: config.caseIdentity.iteration,
					}
				: undefined,
		);

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
		// `createDeclaredCredentials` returns one entry per `declaredCredentials`, in
		// the same order — index-zip to find which seeded ids the case marked
		// already-broken (`valid: false`) or empty (`blank: true`) and must NOT
		// bypass, so their real connection test runs and fails.
		const bypassCredentialTestIds = createdCredentials
			.filter((_, i) => declaredCredentials[i]?.valid !== false && !declaredCredentials[i]?.blank)
			.map((c) => c.id);
		try {
			// A seeded credential models one the user already has connected, so its
			// connection test resolves as passing — same as one set up on a card
			// during the run. Both carry a placeholder token that would really fail.
			await client.setThreadCredentialAllowlist(
				threadId,
				seededCredentialIds,
				bypassCredentialTestIds,
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

		// Credential-setup lane, after the pin so the "created" diff base is the
		// same credential set the build starts from.
		if (config.credentialSetupSelection && config.credentialSetupSelection.kind !== 'none') {
			// Opened before the listing too: a failure there is the same class of
			// infrastructure problem, and an unmarked throw reads downstream as an
			// agent regression.
			laneBootFailed = true;
			credentialIdsBefore = await client.listCredentialIds();
			laneCredentialIdsAtStart = new Set(config.createdCredentialIds ?? []);
			// Coverage is asserted HERE, not on the return path: by then the browser
			// has already driven the real console and the key exists. Only checkable
			// when the case declares a type — local cases usually do not, which is
			// why the scrub also carries a fixture-independent floor.
			if (
				config.credentialSetupSelection.kind === 'local' &&
				config.credentialSetupType &&
				!(await resolveFixtureForCredentialType(config.credentialSetupType))
			) {
				throw new Error(
					`Local run targets \`${config.credentialSetupType}\`, which no provider fixture covers, so its key shape is unknown. ` +
						'Add a fixture for it (evaluations/fixtures/providers/) before running this case locally.',
				);
			}
			credentialSetupLane = await startCredentialSetupLane({
				client,
				selection: config.credentialSetupSelection,
				logger,
				localCredentialType: config.credentialSetupType,
			});
			laneBootFailed = false;
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
				// Seeded projects are instance-level, so they go through the project API
				// rather than `restore-thread` (which seeds into the thread's project).
				// Created BEFORE the live turn so the agent's first `list-projects` already
				// sees them.
				//
				// Deliberately NOT uniquified, unlike seed workflow names: the case names
				// this project in its LIVE turn, and the harness only rewrites mentions
				// inside seeded history — a suffixed name would leave the prompt asking for
				// a project that doesn't exist. Leftovers from a crashed run are evicted by
				// name first so repeated runs don't accumulate duplicates the agent would
				// have to disambiguate.
				for (const project of remapped.projects) {
					await evictLeftoverSeedProjects(client, project.name, logger, config.laneTag);
					const created = await client.createTeamProject(project.name);
					seededProjectIds.push(created.id);
				}
				// A fixture-only seed (projects, no history) has nothing thread-scoped to
				// restore, and `restore-thread` with an empty message list would be a
				// pointless round-trip that logs "Seeded 0 prior message(s)".
				const hasThreadScopedSeed =
					remapped.messages.length > 0 ||
					remapped.workflows.length > 0 ||
					remapped.dataTables.length > 0 ||
					remapped.agents.length > 0;
				const restoreResult = hasThreadScopedSeed
					? await client.restoreThread(
							threadId,
							remapped.messages,
							remapped.workflows,
							remapped.dataTables,
							remapped.agents,
						)
					: { restored: 0, workflowIds: [], dataTableIds: [], agentIds: [] };
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
				// Logged explicitly, not folded into the counts above: a project-scope case
				// is graded on the agent SEEING this project, so a run where the fixture
				// silently didn't land has to be readable from the log alone.
				const projectSuffix =
					seededProjectIds.length > 0 ? `, ${String(seededProjectIds.length)} project(s)` : '';
				logger.info(
					`  Seeded ${String(restoreResult.restored)} prior message(s), ${String(restoredWorkflowIds.length)} workflow(s)${dtSuffix}${agentSuffix}${projectSuffix}${config.laneTag ?? ''}`,
				);
			} catch (error: unknown) {
				seedingFailed = true;
				throw new Error(
					`Seeding failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
			// Run AFTER the seeding try/catch, so a prior-run problem is not reported as
			// "Seeding failed" — the artifacts did land, it is the pre-turn history that did
			// not. Before the live turn, so the agent's first look already sees it.
			if (config.seed?.mode === 'inline' && config.seed.priorRuns?.length) {
				// A throw here (an id the seed never created) is an authoring/harness fault.
				// Without the flag the outer catch returns a plain failed build and the case
				// is recorded as `build_failure` / `builder_issue` — a builder red for
				// something the builder had no part in.
				try {
					const outcomes = await executePriorRuns({
						client,
						priorRuns: config.seed.priorRuns,
						// Already maps authored seed id → the restored workflow, and it is built
						// from `remapped`, which the server pins its ids to.
						seedWorkflows: seedWorkflowsBySeedId,
						logger,
						laneTag: config.laneTag,
					});
					// A staged run that never produced an execution record leaves the case's
					// premise missing, so the graded turn answers a question the instance cannot
					// support. Recorded rather than thrown: the build itself is fine, and the
					// case is routed to infra instead of scored.
					const missing = outcomes.filter((outcome) => !outcome.ran);
					if (missing.length > 0) {
						priorRunFailed = missing
							.map((outcome) => `${outcome.workflow}: ${outcome.errors.join('; ') || 'unknown'}`)
							.join(' | ');
					}
				} catch (error: unknown) {
					seedingFailed = true;
					throw error;
				}
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
							bypassCredentialTestIds,
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
					createdProjectIds: seededProjectIds,
					conversationMetrics,
					events,
					threadId,
					proxyDecisionStats,
					transcript,
					credentialViewPinned,
					seedingFailed,
					...(priorRunFailed ? { priorRunFailed } : {}),
					credentialSetup: await credentialSetupFacts(),
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
				createdProjectIds: seededProjectIds,
				artifactRefs,
				conversationMetrics,
				events,
				threadId,
				proxyDecisionStats,
				transcript,
				credentialViewPinned,
				seedingFailed,
				...(priorRunFailed ? { priorRunFailed } : {}),
				credentialSetup: await credentialSetupFacts(),
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
			// Carried on the SUCCESS path too. A staged run that never landed is the one
			// infra signal that outlives a healthy build, and that is exactly the case
			// `case-pipeline` has to catch — the graded turn answered a question the
			// instance cannot support.
			...(priorRunFailed ? { priorRunFailed } : {}),
			workflowId: outcome.workflowsCreated[0].id,
			workflowJsons: outcome.workflowJsons,
			buildTrace,
			createdWorkflowIds: outcome.workflowsCreated.map((wf) => wf.id),
			createdDataTableIds: [...outcome.dataTablesCreated, ...restoredDataTableIds],
			createdAgentIds: restoredAgentIds,
			createdProjectIds: seededProjectIds,
			seededScenarioTableIdsByName: scenarioTableIdsByName,
			artifactRefs,
			conversationMetrics,
			events,
			threadId,
			proxyDecisionStats,
			transcript,
			workflowChecks,
			credentialViewPinned,
			credentialSetup: await credentialSetupFacts(),
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
			createdProjectIds: seededProjectIds,
			conversationMetrics,
			events,
			threadId,
			credentialViewPinned,
			seedingFailed,
			...(priorRunFailed ? { priorRunFailed } : {}),
			laneBootFailed,
			credentialSetup: await credentialSetupFacts(),
		};
	} finally {
		// Covers every return path above: a leaked browser or an open fixture port
		// would outlive the case and poison the next one.
		if (credentialSetupLane) {
			await credentialSetupLane.close().catch((error: unknown) => {
				logger.warn(
					`  Credential-setup lane teardown failed: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			});
		}
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

/**
 * Delete any team project already sitting on the instance under a seed project's
 * name, so a crashed run's leftover doesn't turn into a second "Foobar" the agent
 * has to disambiguate. Exact-name match: seed project names are NOT suffixed (the
 * live turn names them), so there is no pattern to key off — which also means this
 * would delete a same-named project a human created. Seed names should therefore be
 * distinctive enough not to collide with real ones.
 *
 * Best-effort: a failure here is logged and the run continues, since a duplicate
 * duplicate still leaves the case's premise (a visible project that isn't the bound
 * one) intact.
 */
async function evictLeftoverSeedProjects(
	client: N8nClient,
	name: string,
	logger: EvalLogger,
	laneTag?: string,
): Promise<void> {
	try {
		const stale = (await client.listTeamProjects()).filter((project) => project.name === name);
		for (const project of stale) {
			try {
				await client.deleteProject(project.id);
				logger.info(`  Evicted leftover seed project "${name}" before restore${laneTag ?? ''}`);
			} catch (error: unknown) {
				logger.info(
					`  Could not evict leftover seed project "${name}" (continuing): ${error instanceof Error ? error.message : String(error)}${laneTag ?? ''}`,
				);
			}
		}
	} catch (error: unknown) {
		logger.info(
			`  Could not list projects to evict leftovers (continuing): ${error instanceof Error ? error.message : String(error)}${laneTag ?? ''}`,
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

/**
 * The provider key shape for the leak scan.
 *
 * A fixture run knows it from the manifest. A LOCAL run does not know the
 * credential type up front (the case declares none), so infer it from what the
 * agent actually created and look the fixture up by that — which is exactly
 * what `findFixtureForCredentialType` is for. Undefined => the leak check
 * reports itself unverifiable rather than guessing.
 */
/** Every key shape to strip from a local run's artifacts. NOT `[secretPrefix]`:
 *  that is resolved from the credential the agent saved, so a run that leaked
 *  and then failed before saving would have been skipped. */
async function resolveScrubPrefixes(lane: CredentialSetupLane): Promise<string[]> {
	if (!lane.local) return [];
	// Deliberately NOT caught — an empty list is indistinguishable from "nothing
	// to scrub", so a broken fixtures dir would silently ship a real key.
	const fixtures = await loadProviderFixtures();
	const prefixes = [...new Set(fixtures.map((f) => f.manifest.secretPrefix))];
	if (prefixes.length === 0) {
		throw new Error(
			'No provider fixtures found, so a local run has no key shapes to scrub. Refusing to run rather than persist a real key.',
		);
	}
	// A non-empty list is not the same as the RIGHT list. The prefixes come from
	// the fixtures on disk, so a `local` case targeting a provider none of them
	// covers scrubs with shapes that cannot match — the real key persists into
	// eval-results.json while the leak check merely reports itself unverifiable.
	if (
		lane.credentialType &&
		!fixtures.some((f) => f.manifest.credentialType === lane.credentialType)
	) {
		throw new Error(
			`Local run targets \`${lane.credentialType}\`, which no provider fixture covers, so its key shape is unknown and cannot be scrubbed. ` +
				'Add a fixture for it (evaluations/fixtures/providers/) before running this case locally.',
		);
	}
	return prefixes;
}

async function resolveSecretPrefix(
	client: N8nClient,
	lane: CredentialSetupLane,
	credentialIdsBefore: string[],
	foreignCredentialIds: string[],
): Promise<string | undefined> {
	if (lane.fixture) return lane.fixture.manifestSecretPrefix;
	try {
		const type =
			lane.credentialType ??
			(await inferCreatedType(client, credentialIdsBefore, foreignCredentialIds));
		if (!type) return undefined;
		return (await resolveFixtureForCredentialType(type))?.manifest.secretPrefix;
	} catch {
		return undefined;
	}
}

async function inferCreatedType(
	client: N8nClient,
	credentialIdsBefore: string[],
	foreignCredentialIds: string[],
): Promise<string | undefined> {
	// Shares the predicate with the checks and the probe: this one picks the leak
	// scan's key prefix, so a concurrent build's credential here would set local
	// mode's scrub shape to the wrong provider.
	const all = await client.listCredentials();
	return credentialsCreatedByThisBuild(all, {
		before: credentialIdsBefore,
		foreign: foreignCredentialIds,
	})[0]?.type;
}
