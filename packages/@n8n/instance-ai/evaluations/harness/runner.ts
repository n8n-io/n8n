// ---------------------------------------------------------------------------
// Workflow test case evaluation orchestrator
//
// Manages the full lifecycle of a workflow test case evaluation:
// authentication, SSE capture, workflow build, scenario execution with
// LLM-mocked HTTP, checklist verification, and result aggregation.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest, InstanceAiEvalExecutionResult } from '@n8n/api-types';
import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import {
	SSE_SETTLE_DELAY_MS,
	startSseConnection,
	waitForAllActivity,
	runMultiTurnConversation,
	type ConfirmationStrategy,
} from './chat-loop';
import { type EvalLogger } from './logger';
import { fetchPrebuiltBuild } from './prebuilt-workflows';
import { SONNET_MODEL } from '../../src/utils/eval-agents';
import { runBinaryChecks } from '../binaryChecks/index';
import type { BinaryCheckContext, CheckOutcome } from '../binaryChecks/types';
import { verifyChecklist } from '../checklist/verifier';
import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import { buildConversationMetrics, extractOutcomeFromEvents } from '../outcome/event-parser';
import { buildTranscriptFromEvents } from '../outcome/transcript-from-events';
import { buildAgentOutcome, extractWorkflowIdsFromMessages } from '../outcome/workflow-discovery';
import type {
	ChecklistItem,
	CapturedEvent,
	ConversationMetrics,
	ConversationTurn,
	ExecutionScenarioResult,
	ExecutionScenario,
	TranscriptTurn,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';
import { userTurnsAsText } from '../utils/conversation-text';
import { UserProxyLlm, type ProxyDecisionStats } from '../utils/user-proxy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 900_000;

/** Max concurrent scenario executions per test case */
const MAX_CONCURRENT_SCENARIOS = 99;

// ---------------------------------------------------------------------------
// Workflow test case runner — build once, run scenarios against it
// ---------------------------------------------------------------------------

interface WorkflowTestCaseConfig {
	client: N8nClient;
	testCase: WorkflowTestCase;
	timeoutMs: number;
	seededCredentialTypes: string[];
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	logger: EvalLogger;
	keepWorkflows: boolean;
	/** Optional " [lane N/M]" suffix appended to per-build log lines. */
	laneTag?: string;
	/** When set, skip the orchestrator build and verify this existing workflow
	 *  instead. The harness leaves it in place — caller owns its lifecycle. */
	prebuiltWorkflowId?: string;
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
	};

	const build = config.prebuiltWorkflowId
		? await fetchPrebuiltBuild(client, config.prebuiltWorkflowId, logger)
		: await buildWorkflow({
				client,
				conversation: testCase.conversation,
				messageBudget: testCase.messageBudget,
				timeoutMs,
				preRunWorkflowIds: config.preRunWorkflowIds,
				claimedWorkflowIds: config.claimedWorkflowIds,
				logger,
				laneTag: config.laneTag,
			});

	if (config.prebuiltWorkflowId && build.success && !build.workflowChecks) {
		// No SSE transcript in prebuilt mode — checks run with empty prompt
		// context. When TRUST-104 lands a LangSmith trace adapter, replace
		// this with `userTurnsAsText(<adapter>(workflowId))`.
		build.workflowChecks = await runWorkflowChecks({
			workflow: build.workflowJsons[0],
			prompt: '',
			agentText: undefined,
			logger,
		});
	}

	if (build.conversationMetrics) {
		result.conversationMetrics = build.conversationMetrics;
	}
	if (build.threadId) {
		result.threadId = build.threadId;
	}
	if (build.transcript) {
		result.transcript = build.transcript;
	}
	if (build.workflowChecks) {
		result.workflowChecks = build.workflowChecks;
	}

	if (!build.success || !build.workflowId) {
		result.buildError = build.error;
		return result;
	}

	result.workflowBuildSuccess = true;
	result.workflowId = build.workflowId;
	result.workflowJson = build.workflowJsons[0];

	const scenarioStart = Date.now();
	result.executionScenarioResults = await runWithConcurrency(
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
	/** IDs to pass to cleanupBuild() */
	createdWorkflowIds: string[];
	createdDataTableIds: string[];
	/** Per-turn deterministic counters extracted from the captured event stream. */
	conversationMetrics?: ConversationMetrics;
	/** The thread id used during the build — keys the LangSmith trace lookup. */
	threadId?: string;
	/** Counts of UserProxyLlm decisions by category (multi-turn builds only). */
	proxyDecisionStats?: ProxyDecisionStats;
	/** Chat-style transcript built from the SSE event stream + proxy responses. */
	transcript?: TranscriptTurn[];
	workflowChecks?: CheckOutcome[];
}

export interface BuildWorkflowConfig {
	client: N8nClient;
	/**
	 * Hand-authored conversation. ≥1 turn, first turn must be `user`.
	 *
	 * - One user turn, no assistant turns → auto-approve all confirmations.
	 * - Anything else → UserProxyLlm engages.
	 */
	conversation: ConversationTurn[];
	/** Max follow-up messages the proxy will send. Ignored in auto-approve mode. */
	messageBudget?: number;
	timeoutMs?: number;
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	logger: EvalLogger;
	/** Optional " [lane N/M]" suffix appended to the build log line. */
	laneTag?: string;
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
	const { client, conversation, logger } = config;
	const openingMessage = conversation[0]?.text ?? '';
	const threadId = `eval-${crypto.randomUUID()}`;
	const startTime = Date.now();
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	const abortController = new AbortController();
	const events: CapturedEvent[] = [];
	const approvedRequests = new Set<string>();
	const proxyResponses = new Map<string, InstanceAiConfirmRequest>();
	const followUpMessages: string[] = [];

	try {
		const buildStart = Date.now();
		const isMultiTurn = isMultiTurnConversation(conversation);
		logger.info(
			`  Building workflow${isMultiTurn ? ' [multi-turn]' : ''}: "${truncate(openingMessage, 60)}"${config.laneTag ?? ''}`,
		);

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

		const conversationMetrics = buildConversationMetrics(events);
		const transcript = buildTranscriptFromEvents({
			events,
			openingMessage,
			followUpMessages,
			proxyResponses,
		});

		let threadMessages;
		try {
			threadMessages = await client.getThreadMessages(threadId);
		} catch {
			threadMessages = { messages: [] };
		}

		const messageWorkflowIds = extractWorkflowIdsFromMessages(threadMessages.messages);
		const eventOutcome = extractOutcomeFromEvents(events);
		const outcome = await buildAgentOutcome(
			client,
			eventOutcome,
			config.preRunWorkflowIds,
			config.claimedWorkflowIds,
		);

		if (messageWorkflowIds.length > 0) {
			const messageWfSet = new Set(messageWorkflowIds);
			outcome.workflowsCreated = outcome.workflowsCreated.filter((wf) => messageWfSet.has(wf.id));
			outcome.workflowJsons = outcome.workflowJsons.filter(
				(wf) => typeof wf.id === 'string' && messageWfSet.has(wf.id),
			);
		}

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
				createdWorkflowIds: [],
				createdDataTableIds: outcome.dataTablesCreated,
				conversationMetrics,
				threadId,
				proxyDecisionStats,
				transcript,
			};
		}

		const buildMs = Date.now() - buildStart;
		const proxySuffix = formatProxyStatsSuffix(proxyDecisionStats);
		logger.info(
			`  Workflow built: ${outcome.workflowsCreated[0].name} (${String(outcome.workflowsCreated[0].nodeCount)} nodes) [${String(Math.round(buildMs / 1000))}s]${isMultiTurn ? ` (${String(conversationMetrics.turnCount)} turn${conversationMetrics.turnCount === 1 ? '' : 's'})` : ''}${proxySuffix}`,
		);

		const workflowChecks = await runWorkflowChecks({
			workflow: outcome.workflowJsons[0],
			prompt: userTurnsAsText(transcript),
			agentText: outcome.finalText,
			logger,
		});

		return {
			success: true,
			workflowId: outcome.workflowsCreated[0].id,
			workflowJsons: outcome.workflowJsons,
			createdWorkflowIds: outcome.workflowsCreated.map((wf) => wf.id),
			createdDataTableIds: outcome.dataTablesCreated,
			conversationMetrics,
			threadId,
			proxyDecisionStats,
			transcript,
			workflowChecks,
		};
	} catch (error: unknown) {
		abortController.abort();
		// Try to surface partial metrics so timeouts still produce a per-turn report.
		const conversationMetrics = events.length > 0 ? buildConversationMetrics(events) : undefined;
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			workflowJsons: [],
			createdWorkflowIds: [],
			createdDataTableIds: [],
			conversationMetrics,
			threadId,
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
): Promise<ExecutionScenarioResult> {
	return await runScenario(client, scenario, workflowId, workflowJsons, logger, timeoutMs);
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
): Promise<ExecutionScenarioResult> {
	const execStart = Date.now();
	const evalResult = await client.executeWithLlmMock(workflowId, scenario.dataSetup, timeoutMs);
	const execMs = Date.now() - execStart;

	logger.info(
		`    [${scenario.name}] exec=${String(Math.round(execMs / 1000))}s (${Object.keys(evalResult.nodeResults).length} nodes)`,
	);

	const verifyStart = Date.now();
	const verificationArtifact = buildVerificationArtifact(scenario, evalResult, workflowJsons);

	const scenarioChecklist: ChecklistItem[] = [
		{
			id: 1,
			description: scenario.successCriteria,
			category: 'execution',
			strategy: 'llm',
		},
	];

	const verificationResults = await verifyChecklist(
		scenarioChecklist,
		verificationArtifact,
		workflowJsons,
	);

	const verifyMs = Date.now() - verifyStart;
	const passed = verificationResults.length > 0 && verificationResults[0].pass;
	const result = verificationResults[0];
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

/**
 * Build a rich verification artifact from the execution result.
 * Includes execution trace with mock responses, config issues,
 * and pre-analysis flags so the verifier can diagnose root causes.
 */
function buildVerificationArtifact(
	scenario: ExecutionScenario,
	evalResult: InstanceAiEvalExecutionResult,
	workflowJsons: WorkflowResponse[],
): string {
	const sections: string[] = [];

	// --- Scenario context ---
	sections.push(
		'## Scenario',
		'',
		`**Name:** ${scenario.name} — ${scenario.description}`,
		`**Data setup:** ${scenario.dataSetup}`,
		'',
	);

	// --- Pre-analysis: flag known issues programmatically ---
	const preAnalysis: string[] = [];

	// Flag Phase 1 failures — these cause empty trigger data and cascade failures
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

	// --- Execution summary ---
	const mockedNodes: string[] = [];
	const pinnedNodes: string[] = [];
	const realNodes: string[] = [];

	for (const [nodeName, nr] of Object.entries(evalResult.nodeResults)) {
		if (nr.executionMode === 'mocked') mockedNodes.push(nodeName);
		else if (nr.executionMode === 'pinned') pinnedNodes.push(nodeName);
		else realNodes.push(nodeName);
	}

	sections.push(
		'## Execution summary',
		'',
		`**Status:** ${evalResult.success ? 'success' : 'failed'}`,
		`**Mocked nodes** (HTTP intercepted, responses generated by LLM): ${mockedNodes.join(', ') || 'none'}`,
		`**Pinned nodes** (trigger data provided, not executed): ${pinnedNodes.join(', ') || 'none'}`,
		`**Real nodes** (executed with actual logic on mock/pinned data): ${realNodes.join(', ') || 'none'}`,
		'',
	);

	if (evalResult.errors.length > 0) {
		sections.push('## Errors', '', ...evalResult.errors.map((e) => `- ${e}`), '');
	}

	// --- Build a node config lookup from workflow JSON ---
	const nodeConfigs = new Map<string, Record<string, unknown>>();
	const wf = workflowJsons[0];
	if (wf) {
		for (const node of wf.nodes) {
			if (node.name && node.parameters) {
				nodeConfigs.set(node.name, { type: node.type, parameters: node.parameters });
			}
		}
	}

	// --- Workflow structure: ALL nodes and connections ---
	const executedNodeNames = new Set(Object.keys(evalResult.nodeResults));
	if (wf) {
		sections.push('## Workflow structure (all nodes)', '');
		for (const node of wf.nodes) {
			const ran = node.name ? executedNodeNames.has(node.name) : false;
			const status = ran ? 'EXECUTED' : 'DID NOT RUN';
			sections.push(`- **${node.name ?? '(unnamed)'}** (${node.type}) — ${status}`);
		}
		sections.push('');
		sections.push(
			'**All node configs** (from saved workflow JSON, including nodes that did not run):',
		);
		sections.push(
			'```json',
			JSON.stringify(
				wf.nodes.map((node) => ({
					name: node.name ?? '(unnamed)',
					type: node.type,
					typeVersion: node.typeVersion,
					...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
					parameters: node.parameters ?? {},
				})),
				null,
				2,
			),
			'```',
		);
		sections.push('');
		sections.push('**Connections:**');
		sections.push('```json', JSON.stringify(wf.connections, null, 2), '```');
		sections.push('');
	}

	// --- Execution trace: per-node detail (sorted by execution order) ---
	sections.push('## Execution trace', '');

	const sortedNodeResults = Object.entries(evalResult.nodeResults).sort(
		([, a], [, b]) => (a.startTime ?? 0) - (b.startTime ?? 0),
	);

	for (const [nodeName, nr] of sortedNodeResults) {
		sections.push(`### ${nodeName} [${nr.executionMode}]`);

		// Node configuration (from workflow JSON)
		const nodeConfig = nodeConfigs.get(nodeName);
		if (nodeConfig) {
			sections.push('**Node config:**');
			sections.push('```json', JSON.stringify(nodeConfig, null, 2), '```');
		}

		// Config issues
		if (nr.configIssues && Object.keys(nr.configIssues).length > 0) {
			sections.push(`**Config issues:** ${Object.values(nr.configIssues).flat().join('; ')}`);
		}

		// Intercepted requests + mock responses (for mocked nodes)
		for (const req of nr.interceptedRequests) {
			sections.push(`**Request:** ${req.method} ${req.url}`);
			if (req.requestBody) {
				sections.push('```json', JSON.stringify(req.requestBody, null, 2), '```');
			}
			if (req.mockResponse) {
				sections.push('**Mock response:**');
				sections.push('```json', JSON.stringify(req.mockResponse, null, 2), '```');
			}
		}

		// Node output
		if (nr.output !== null && nr.output !== undefined) {
			sections.push('**Output:**');
			sections.push('```json', JSON.stringify(nr.output, null, 2), '```');
		} else {
			sections.push('**Output:** none');
		}

		sections.push('');
	}

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
	logger: EvalLogger;
}): Promise<CheckOutcome[] | undefined> {
	if (!args.workflow) return undefined;

	const modelId = hasAnthropicKey() ? SONNET_MODEL : undefined;
	const ctx: BinaryCheckContext = {
		prompt: args.prompt,
		...(modelId ? { modelId } : {}),
		...(args.agentText ? { agentTextResponse: args.agentText } : {}),
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
