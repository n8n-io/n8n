// ---------------------------------------------------------------------------
// Workflow test case evaluation orchestrator
//
// Manages the full lifecycle of a workflow test case evaluation:
// authentication, SSE capture, workflow build, scenario execution with
// LLM-mocked HTTP, checklist verification, and result aggregation.
// ---------------------------------------------------------------------------

import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import crypto from 'node:crypto';

import { verifyChecklist } from '../checklist/verifier';
import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import { consumeSseStream } from '../clients/sse-client';
import { extractOutcomeFromEvents } from '../outcome/event-parser';
import { buildAgentOutcome, extractWorkflowIdsFromMessages } from '../outcome/workflow-discovery';
import type {
	ChecklistItem,
	CapturedEvent,
	ScenarioResult,
	TestScenario,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';
import { type EvalLogger } from './logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 600_000;
const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 500;
const BACKGROUND_TASK_POLL_INTERVAL_MS = 2_000;
const MAX_CONFIRMATION_RETRIES = 5;

/** Max concurrent scenario executions per test case */
const MAX_CONCURRENT_SCENARIOS = 99;

// ---------------------------------------------------------------------------
// Workflow test case runner — build once, run scenarios against it
// ---------------------------------------------------------------------------

const SCENARIO_BG_TASK_TIMEOUT_MS = 240_000;

interface WorkflowTestCaseConfig {
	client: N8nClient;
	testCase: WorkflowTestCase;
	timeoutMs: number;
	seededCredentialTypes: string[];
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	logger: EvalLogger;
	keepWorkflows: boolean;
}

export async function runWorkflowTestCase(
	config: WorkflowTestCaseConfig,
): Promise<WorkflowTestCaseResult> {
	const { client, testCase, logger } = config;
	const threadId = `eval-${crypto.randomUUID()}`;
	const startTime = Date.now();
	const timeoutMs = config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS;

	const result: WorkflowTestCaseResult = {
		testCase,
		workflowBuildSuccess: false,
		scenarioResults: [],
	};

	const abortController = new AbortController();
	const events: CapturedEvent[] = [];
	const approvedRequests = new Set<string>();

	try {
		// 1. Send prompt to Instance AI and wait for workflow to be built (ONCE)
		logger.info(`  Building workflow: "${truncate(testCase.prompt, 60)}"`);

		const ssePromise = startSseConnection(client, threadId, events, abortController.signal).catch(
			() => {
				// SSE errors are non-fatal — workflow discovery falls back to event-based approach
			},
		);

		await delay(SSE_SETTLE_DELAY_MS);

		await client.sendMessage(threadId, testCase.prompt);

		// Wait with shorter timeout for scenario mode
		await waitForAllActivity({
			client,
			threadId,
			events,
			approvedRequests,
			startTime,
			timeoutMs: Math.min(timeoutMs, SCENARIO_BG_TASK_TIMEOUT_MS),
			logger,
		});

		abortController.abort();
		await ssePromise.catch(() => {});

		// 2. Capture the built workflow
		let threadMessages;
		try {
			threadMessages = await client.getThreadMessages(threadId);
		} catch {
			logger.verbose(`[${threadId}] Thread messages unavailable — using SSE events only`);
			threadMessages = { messages: [] as never[] };
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
			// Extract error information from SSE events and thread messages
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

			result.buildError = buildError;
			logger.warn(`  No workflow created for: "${truncate(testCase.prompt, 60)}"`);
			logger.warn(`  ${buildError.slice(0, 200)}`);
			return result;
		}

		result.workflowBuildSuccess = true;
		result.workflowId = outcome.workflowsCreated[0].id;
		result.workflowJson = outcome.workflowJsons[0];

		logger.info(
			`  Workflow built: ${outcome.workflowsCreated[0].name} (${String(outcome.workflowsCreated[0].nodeCount)} nodes)`,
		);

		// 3. Run scenarios with bounded concurrency to avoid API rate limits
		const workflowId = outcome.workflowsCreated[0].id;

		for (const scenario of testCase.scenarios) {
			logger.info(`    Scenario: ${scenario.name}`);
		}

		result.scenarioResults = await runWithConcurrency(
			testCase.scenarios,
			async (scenario) => {
				try {
					return await runScenario(client, scenario, workflowId, outcome.workflowJsons, logger);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					logger.error(`    ERROR [${scenario.name}]: ${errorMessage}`);
					return {
						scenario,
						success: false,
						score: 0,
						reasoning: `Error: ${errorMessage}`,
					} satisfies ScenarioResult;
				}
			},
			MAX_CONCURRENT_SCENARIOS,
		);

		// 4. Cleanup — delete workflows created during build (unless --keep-workflows)
		if (!config.keepWorkflows) {
			for (const wf of outcome.workflowsCreated) {
				try {
					await client.deleteWorkflow(wf.id);
				} catch {
					// Best-effort cleanup
				}
			}
		}

		// Clean up data tables created during this run
		if (outcome.dataTablesCreated.length > 0) {
			try {
				const projectId = await client.getPersonalProjectId();
				for (const dtId of outcome.dataTablesCreated) {
					try {
						await client.deleteDataTable(projectId, dtId);
					} catch {
						// Best-effort cleanup
					}
				}
				logger.verbose(`  Cleaned up ${String(outcome.dataTablesCreated.length)} data table(s)`);
			} catch {
				// Non-fatal — project ID lookup may fail
			}
		}
	} catch (error: unknown) {
		abortController.abort();
		const errorMessage = error instanceof Error ? error.message : String(error);
		result.buildError = errorMessage;
		logger.error(`  Build failed: ${errorMessage}`);
	}

	return result;
}

// ---------------------------------------------------------------------------
// Scenario execution
// ---------------------------------------------------------------------------

async function runScenario(
	client: N8nClient,
	scenario: TestScenario,
	workflowId: string,
	workflowJsons: WorkflowResponse[],
	logger: EvalLogger,
): Promise<ScenarioResult> {
	const evalResult = await client.executeWithLlmMock(workflowId, scenario.dataSetup);

	logger.verbose(
		`    [${scenario.name}] Execution ${evalResult.executionId}: ${evalResult.success ? 'success' : 'failed'}` +
			` (${Object.keys(evalResult.nodeResults).length} nodes, ${evalResult.errors.length} errors)`,
	);

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

	const passed = verificationResults.length > 0 && verificationResults[0].pass;
	const result = verificationResults[0];
	const reasoning = result?.reasoning ?? 'No verification result';
	const failureCategory = result?.failureCategory;
	const rootCause = result?.rootCause;

	const categoryLabel = failureCategory ? ` [${failureCategory}]` : '';
	logger.info(
		`    [${scenario.name}] ${passed ? 'PASS' : 'FAIL'}${categoryLabel}: ${reasoning.slice(0, 100)}`,
	);

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
	scenario: TestScenario,
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
// SSE connection
// ---------------------------------------------------------------------------

async function startSseConnection(
	client: N8nClient,
	threadId: string,
	events: CapturedEvent[],
	signal: AbortSignal,
): Promise<void> {
	const url = client.getEventsUrl(threadId);
	const cookie = client.cookie;

	return await consumeSseStream(
		url,
		cookie,
		(sseEvent) => {
			try {
				const parsed = JSON.parse(sseEvent.data) as Record<string, unknown>;
				events.push({
					timestamp: Date.now(),
					type: typeof parsed.type === 'string' ? parsed.type : 'unknown',
					data: parsed,
				});
			} catch {
				// Ignore malformed events
			}
		},
		signal,
	);
}

// ---------------------------------------------------------------------------
// Wait for all activity: run-finish -> background tasks -> possible new run
// ---------------------------------------------------------------------------

interface WaitConfig {
	client: N8nClient;
	threadId: string;
	events: CapturedEvent[];
	approvedRequests: Set<string>;
	startTime: number;
	timeoutMs: number;
	logger: EvalLogger;
}

async function waitForAllActivity(config: WaitConfig): Promise<void> {
	let runFinishCount = 0;

	while (true) {
		await waitForRunFinish(config, runFinishCount);
		runFinishCount = countEvents(config.events, 'run-finish');

		config.logger.verbose(
			`[${config.threadId}] Run #${String(runFinishCount)} finished -- time: ${String(Date.now() - config.startTime)}ms`,
		);

		// Wait for background tasks (sub-agents) to complete
		const remainingMs = Math.max(0, config.timeoutMs - (Date.now() - config.startTime));
		await waitForBackgroundTasks(config, remainingMs);

		// Check if the main agent started a new run after background tasks completed
		await delay(SSE_SETTLE_DELAY_MS);
		const newRunStarts = countEvents(config.events, 'run-start');
		const currentRunFinishes = countEvents(config.events, 'run-finish');
		if (newRunStarts <= currentRunFinishes) {
			break;
		}

		config.logger.verbose(
			`[${config.threadId}] Main agent resumed (run-start #${String(newRunStarts)}) -- waiting for completion`,
		);

		if (Date.now() - config.startTime > config.timeoutMs) {
			throw new Error(`Run timed out after ${String(config.timeoutMs)}ms`);
		}
	}
}

async function waitForRunFinish(config: WaitConfig, expectedFinishCount: number): Promise<void> {
	while (countEvents(config.events, 'run-finish') <= expectedFinishCount) {
		const elapsed = Date.now() - config.startTime;
		if (elapsed > config.timeoutMs) {
			await config.client.cancelRun(config.threadId).catch(() => {});
			throw new Error(`Run timed out after ${String(config.timeoutMs)}ms`);
		}

		await processConfirmationRequests(config);
		await delay(POLL_INTERVAL_MS);
	}
}

async function waitForBackgroundTasks(config: WaitConfig, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	const hasSpawnedAgents = config.events.some((e) => e.type === 'agent-spawned');
	if (!hasSpawnedAgents) {
		config.logger.verbose('No sub-agents spawned -- skipping background task wait');
		return;
	}

	config.logger.verbose('Sub-agent(s) detected -- waiting for background tasks...');

	while (Date.now() < deadline) {
		await processConfirmationRequests(config);

		// Check REST API for background task status
		const status = await config.client.getThreadStatus(config.threadId);
		const tasks = status.backgroundTasks ?? [];
		const restRunning = tasks.filter((t) => t.status === 'running');

		// Check SSE events for unmatched agent-spawned / agent-completed
		const ssePending = getPendingAgentIds(config.events);

		if (restRunning.length === 0 && ssePending.length === 0) {
			config.logger.verbose('All background tasks completed');
			await delay(1000);
			return;
		}

		config.logger.verbose(
			`Waiting for ${String(restRunning.length)} REST task(s), ${String(ssePending.length)} SSE agent(s)`,
		);

		await delay(BACKGROUND_TASK_POLL_INTERVAL_MS);
	}

	config.logger.verbose(
		`Background task wait timed out after ${String(timeoutMs)}ms -- continuing`,
	);
}

// ---------------------------------------------------------------------------
// Confirmation auto-approval
// ---------------------------------------------------------------------------

const confirmationRetries = new Map<string, number>();

async function processConfirmationRequests(config: WaitConfig): Promise<void> {
	const confirmationEvents = config.events.filter((e) => e.type === 'confirmation-request');

	for (const event of confirmationEvents) {
		const requestId = extractConfirmationRequestId(event);
		if (!requestId || config.approvedRequests.has(requestId)) {
			continue;
		}

		const retryCount = confirmationRetries.get(requestId) ?? 0;
		if (retryCount >= MAX_CONFIRMATION_RETRIES) {
			continue;
		}

		if (retryCount === 0) {
			config.logger.verbose(`[auto-approve] Approving confirmation: ${requestId}`);
		}

		try {
			// Always offer mock credentials — the eval runner doesn't have real
			// credentials for most services, so tell Instance AI to use mock data
			await config.client.confirmAction(requestId, true, { mockCredentials: true });
			config.approvedRequests.add(requestId);
			confirmationRetries.delete(requestId);
		} catch (error: unknown) {
			confirmationRetries.set(requestId, retryCount + 1);
			const msg = error instanceof Error ? error.message : String(error);
			config.logger.verbose(
				`[auto-approve] Failed to approve ${requestId} (attempt ${String(retryCount + 1)}/${String(MAX_CONFIRMATION_RETRIES)}): ${msg}`,
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

function countEvents(events: CapturedEvent[], type: string): number {
	return events.filter((e) => e.type === type).length;
}

function getPendingAgentIds(events: CapturedEvent[]): string[] {
	const spawned = new Set<string>();
	const completed = new Set<string>();

	for (const event of events) {
		const agentId = extractAgentId(event);
		if (!agentId) continue;

		if (event.type === 'agent-spawned') spawned.add(agentId);
		if (event.type === 'agent-completed') completed.add(agentId);
	}

	return [...spawned].filter((id) => !completed.has(id));
}

function extractConfirmationRequestId(event: CapturedEvent): string | undefined {
	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.requestId === 'string') {
		return payload.requestId;
	}
	if (typeof event.data.requestId === 'string') {
		return event.data.requestId;
	}
	return undefined;
}

function extractAgentId(event: CapturedEvent): string | undefined {
	if (typeof event.data.agentId === 'string') return event.data.agentId;

	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.agentId === 'string') return payload.agentId;

	return undefined;
}

function getNestedRecord(
	obj: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const value = obj[key];
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return undefined;
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

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

async function delay(ms: number): Promise<void> {
	return await new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}
