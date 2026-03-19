// ---------------------------------------------------------------------------
// Checklist evaluation runner
//
// Orchestrates a single evaluation: sends a prompt to the instance-ai agent,
// captures SSE events, auto-approves confirmation requests, waits for the
// run to complete, then verifies the outcome against a checklist.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';

import type { N8nClient } from './n8n-client';
import { consumeSseStream } from './sse-client';
import { verifyChecklist, extractExecutionChecklist } from './checklist';
import {
	extractOutcomeFromEvents,
	buildAgentOutcome,
	buildMetrics,
	buildVerificationArtifactFromMessages,
	extractWorkflowIdsFromMessages,
	extractChatMessages,
	cleanupEvalArtifacts,
	snapshotWorkflowIds,
	runPostBuildExecutions,
} from './verification';
import type {
	InstanceAiResult,
	PromptConfig,
	ChecklistItem,
	ChecklistResult,
	CapturedEvent,
	ExecutionChecklist,
} from './types';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface RunnerConfig {
	n8nClient: N8nClient;
	timeoutMs: number;
	verbose: boolean;
	autoApprove: boolean;
	/** Skip cleanup of created workflows/data tables (caller handles cleanup) */
	skipCleanup?: boolean;
	/** Skip execution-based evaluation (faster runs, only verify build checklist) */
	skipExecutionEval?: boolean;
	/**
	 * Pre-run workflow snapshot (shared across concurrent runs in a batch).
	 * When provided, the runner skips taking its own snapshot and uses this instead.
	 * This prevents concurrent runs from claiming each other's workflows.
	 */
	preRunWorkflowIds?: Set<string>;
	/**
	 * Shared set of workflow IDs already claimed by other concurrent runs.
	 * When a run discovers workflows via snapshot diff, it adds them here so
	 * other concurrent runs in the same batch won't claim them too.
	 */
	claimedWorkflowIds?: Set<string>;
	/** Credential types that were seeded with real tokens (for execution eval) */
	seededCredentialTypes?: string[];
}

const DEFAULT_TIMEOUT_MS = 600_000;
const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 500;
const BACKGROUND_TASK_POLL_INTERVAL_MS = 2_000;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runSingleExample(
	config: RunnerConfig,
	prompt: PromptConfig,
	checklist: ChecklistItem[],
): Promise<InstanceAiResult> {
	const threadId = `eval-${crypto.randomUUID()}`;
	const startTime = Date.now();
	const timeoutMs = config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS;

	const abortController = new AbortController();
	const events: CapturedEvent[] = [];
	const approvedRequests = new Set<string>();

	let runId = '';

	try {
		// 0. Snapshot existing workflows so we can diff after the run
		//    When a shared snapshot is provided (concurrent batch), use it instead
		//    of taking a per-run snapshot to avoid cross-run workflow attribution.
		const preRunWorkflowIds =
			config.preRunWorkflowIds ?? (await snapshotWorkflowIds(config.n8nClient));

		// 1. Start SSE connection in the background
		if (config.verbose) {
			log(`[${threadId}] Starting SSE connection`);
		}

		const ssePromise = startSseConnection(
			config.n8nClient,
			threadId,
			events,
			abortController.signal,
		);

		// 2. Small delay to let SSE connect
		await delay(SSE_SETTLE_DELAY_MS);

		// 3. Send the message
		if (config.verbose) {
			log(`[${threadId}] Sending message: ${truncate(prompt.text, 100)}`);
		}

		const sendResult = await config.n8nClient.sendMessage(threadId, prompt.text);
		runId = sendResult.runId;

		// 4. Wait for all runs + background tasks to complete.
		//    After the main run finishes, sub-agents may still be running. Once they
		//    complete the main agent can resume (new run-start), so we loop until
		//    there's no more activity.
		await waitForAllActivity(config, threadId, events, approvedRequests, startTime, timeoutMs);

		// 5. Abort SSE connection now that all activity is done
		abortController.abort();
		await ssePromise.catch(() => {
			// SSE promise rejects on abort — expected
		});

		// 7. Fetch thread messages and build metrics/outcome
		if (config.verbose) {
			log(`[${threadId}] Fetching thread messages...`);
		}
		const threadMessages = await config.n8nClient.getThreadMessages(threadId);
		const messageWorkflowIds = extractWorkflowIdsFromMessages(threadMessages.messages);

		const metrics = buildMetrics(events, startTime);
		const eventOutcome = extractOutcomeFromEvents(events);
		const outcome = await buildAgentOutcome(
			config.n8nClient,
			eventOutcome,
			preRunWorkflowIds,
			config.claimedWorkflowIds,
		);

		// Filter outcome to only include workflows referenced in the thread messages.
		// This prevents cross-run workflow attribution from snapshot diffing.
		if (messageWorkflowIds.length > 0) {
			const messageWfSet = new Set(messageWorkflowIds);
			outcome.workflowsCreated = outcome.workflowsCreated.filter((wf) => messageWfSet.has(wf.id));
			outcome.workflowJsons = outcome.workflowJsons.filter(
				(wf) => typeof wf.id === 'string' && messageWfSet.has(wf.id),
			);
		} else if (eventOutcome.workflowIds.length === 0) {
			// No workflows referenced in messages or SSE events — clear any snapshot-diff artifacts
			outcome.workflowsCreated = [];
			outcome.workflowJsons = [];
		}

		if (config.verbose && outcome.workflowsCreated.length > 0) {
			log(
				`[${threadId}] Captured ${String(outcome.workflowsCreated.length)} workflow(s): ${outcome.workflowsCreated.map((w) => w.name).join(', ')}`,
			);
		}

		// 7b. Force-execute created workflows that weren't already run
		if (outcome.workflowsCreated.length > 0) {
			if (config.verbose) {
				log(`[${threadId}] Running post-build executions...`);
			}
			await runPostBuildExecutions(config.n8nClient, outcome);
			if (config.verbose) {
				const evalTriggered = outcome.executionsRun.filter((e) => e.triggeredByEval);
				log(
					`[${threadId}] Post-build: ${String(evalTriggered.length)} eval-triggered execution(s)`,
				);
			}
		}

		// 7c. Extract execution checklist and run with test inputs
		const emptyExecChecklist: ExecutionChecklist = { items: [], testInputs: [] };
		let executionChecklist = emptyExecChecklist;

		if (
			!config.skipExecutionEval &&
			outcome.workflowsCreated.length > 0 &&
			outcome.workflowJsons.length > 0
		) {
			if (config.verbose) {
				log(`[${threadId}] Extracting execution checklist...`);
			}
			executionChecklist = await extractExecutionChecklist(
				prompt.text,
				outcome.workflowJsons[0] as Record<string, unknown>,
				config.seededCredentialTypes,
			);

			if (config.verbose) {
				log(
					`[${threadId}] Execution checklist: ${String(executionChecklist.items.length)} items, ${String(executionChecklist.testInputs.length)} test inputs`,
				);
			}

			// 7d. Re-run execution with test inputs
			if (executionChecklist.testInputs.length > 0) {
				if (config.verbose) {
					log(`[${threadId}] Running execution eval with test data...`);
				}
				await runPostBuildExecutions(config.n8nClient, outcome, executionChecklist.testInputs);
			}
		}

		// 8. Build verification artifact from rich messages
		const verificationArtifact = buildVerificationArtifactFromMessages(
			threadMessages.messages,
			outcome,
		);

		if (config.verbose) {
			logToolCallSummary(eventOutcome.toolCalls);
		}

		const checklistResults = await verifyChecklist(verificationArtifact, checklist);
		const checklistScore = calculateScore(checklistResults.map((r) => r.pass));

		if (config.verbose) {
			log(
				`[${threadId}] Checklist score: ${formatPercent(checklistScore)} (${String(checklistResults.filter((r) => r.pass).length)}/${String(checklist.length)} passed)`,
			);
		}

		// 8b. Verify execution checklist
		// If all eval-triggered executions failed, force score to 0
		const evalExecutions = outcome.executionsRun.filter((e) => e.triggeredByEval);
		const allEvalExecutionsFailed =
			evalExecutions.length > 0 &&
			evalExecutions.every((e) => e.status === 'error' || e.status === 'failed');

		let executionChecklistResults: ChecklistResult[];
		if (allEvalExecutionsFailed && executionChecklist.items.length > 0) {
			const failureReasons = evalExecutions
				.filter((e) => e.error)
				.map((e) => e.error)
				.join('; ');
			executionChecklistResults = executionChecklist.items.map((item) => ({
				id: item.id,
				pass: false,
				reasoning: `All executions failed: ${failureReasons || 'unknown error'}`,
			}));
		} else {
			executionChecklistResults =
				executionChecklist.items.length > 0
					? await verifyChecklist(verificationArtifact, executionChecklist.items)
					: [];
		}
		const executionChecklistScore = calculateScore(executionChecklistResults.map((r) => r.pass));

		if (config.verbose && executionChecklist.items.length > 0) {
			log(
				`[${threadId}] Execution score: ${formatPercent(executionChecklistScore)} (${String(executionChecklistResults.filter((r) => r.pass).length)}/${String(executionChecklist.items.length)} passed)`,
			);
		}

		// 9. Cleanup (unless caller wants to handle it)
		if (!config.skipCleanup) {
			await cleanupEvalArtifacts(config.n8nClient, outcome).catch(() => {
				// Best-effort cleanup
			});
		}

		return {
			prompt: prompt.text,
			complexity: prompt.complexity,
			tags: prompt.tags,
			success: true,
			runId,
			threadId,
			metrics,
			outcome,
			chatMessages: extractChatMessages(threadMessages.messages),
			checklist,
			checklistResults,
			checklistScore,
			executionChecklist: executionChecklist.items,
			executionChecklistResults,
			executionChecklistScore,
		};
	} catch (error: unknown) {
		// Ensure SSE is cleaned up on error
		abortController.abort();

		const errorMessage = error instanceof Error ? error.message : String(error);

		if (config.verbose) {
			log(`[${threadId}] Error: ${errorMessage}`);
		}

		return buildErrorResult(prompt, threadId, runId, events, startTime, checklist, errorMessage);
	}
}

// ---------------------------------------------------------------------------
// SSE connection
// ---------------------------------------------------------------------------

function startSseConnection(
	client: N8nClient,
	threadId: string,
	events: CapturedEvent[],
	signal: AbortSignal,
): Promise<void> {
	const url = client.getEventsUrl(threadId);
	const cookie = client.cookie;

	return consumeSseStream(
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
// Wait for run-finish
// ---------------------------------------------------------------------------

/**
 * Wait for all activity: run-finish → background tasks → possible new run → repeat.
 *
 * After the initial run finishes, sub-agents may still be working in the background.
 * When they complete the main agent can resume (new run-start), e.g. to activate the
 * workflow. We loop until no more runs or background tasks appear.
 */
async function waitForAllActivity(
	config: RunnerConfig,
	threadId: string,
	events: CapturedEvent[],
	approvedRequests: Set<string>,
	startTime: number,
	timeoutMs: number,
): Promise<void> {
	let runFinishCount = 0;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		// Wait for the next run-finish event
		await waitForRunFinish(
			config,
			threadId,
			events,
			approvedRequests,
			startTime,
			timeoutMs,
			runFinishCount,
		);
		runFinishCount = countEvents(events, 'run-finish');

		if (config.verbose) {
			const elapsed = Date.now() - startTime;
			const finishEvents = events.filter((e) => e.type === 'run-finish');
			const lastFinish = finishEvents[finishEvents.length - 1];
			const status = lastFinish ? extractRunStatus(lastFinish) : 'unknown';
			log(
				`[${threadId}] Run #${String(runFinishCount)} finished — status: ${status}, time: ${String(elapsed)}ms`,
			);
		}

		// Wait for background tasks (sub-agents) to complete
		const remainingMs = Math.max(0, timeoutMs - (Date.now() - startTime));
		await waitForBackgroundTasks(config, threadId, events, approvedRequests, remainingMs);

		// Check if the main agent started a new run after background tasks completed
		// (e.g. to activate a workflow). Give a brief window for a new run-start to appear.
		await delay(SSE_SETTLE_DELAY_MS);
		const newRunStarts = countEvents(events, 'run-start');
		const currentRunFinishes = countEvents(events, 'run-finish');
		if (newRunStarts <= currentRunFinishes) {
			// No new run started — we're done
			break;
		}

		if (config.verbose) {
			log(
				`[${threadId}] Main agent resumed (run-start #${String(newRunStarts)}) — waiting for completion`,
			);
		}

		// Check timeout before looping
		if (Date.now() - startTime > timeoutMs) {
			throw new Error(`Run timed out after ${String(timeoutMs)}ms`);
		}
	}
}

async function waitForRunFinish(
	config: RunnerConfig,
	threadId: string,
	events: CapturedEvent[],
	approvedRequests: Set<string>,
	startTime: number,
	timeoutMs: number,
	expectedFinishCount: number,
): Promise<void> {
	while (countEvents(events, 'run-finish') <= expectedFinishCount) {
		const elapsed = Date.now() - startTime;
		if (elapsed > timeoutMs) {
			// Try to cancel the run before throwing
			await config.n8nClient.cancelRun(threadId).catch(() => {
				// Best-effort cancel
			});
			throw new Error(`Run timed out after ${String(timeoutMs)}ms`);
		}

		// Handle auto-approval of confirmation requests
		if (config.autoApprove) {
			await processConfirmationRequests(config, events, approvedRequests);
		}

		await delay(POLL_INTERVAL_MS);
	}
}

function countEvents(events: CapturedEvent[], type: string): number {
	return events.filter((e) => e.type === type).length;
}

// ---------------------------------------------------------------------------
// Confirmation auto-approval
// ---------------------------------------------------------------------------

/** Track retry state for confirmation requests that fail */
const confirmationRetries = new Map<string, number>();
const MAX_CONFIRMATION_RETRIES = 5;

async function processConfirmationRequests(
	config: RunnerConfig,
	events: CapturedEvent[],
	approvedRequests: Set<string>,
): Promise<void> {
	const confirmationEvents = events.filter((e) => e.type === 'confirmation-request');

	for (const event of confirmationEvents) {
		const requestId = extractConfirmationRequestId(event);
		if (!requestId || approvedRequests.has(requestId)) {
			continue;
		}

		// Skip if we've exhausted retries for this request
		const retryCount = confirmationRetries.get(requestId) ?? 0;
		if (retryCount >= MAX_CONFIRMATION_RETRIES) {
			continue;
		}

		if (config.verbose && retryCount === 0) {
			const title = extractConfirmationTitle(event);
			log(`[auto-approve] Approving confirmation: ${title} (${requestId})`);
		}

		try {
			await config.n8nClient.confirmAction(requestId, true);
			approvedRequests.add(requestId);
			confirmationRetries.delete(requestId);
		} catch (error: unknown) {
			// Track retry — don't add to approvedRequests so we retry next cycle
			confirmationRetries.set(requestId, retryCount + 1);
			const msg = error instanceof Error ? error.message : String(error);
			if (config.verbose) {
				log(
					`[auto-approve] Failed to approve ${requestId} (attempt ${String(retryCount + 1)}/${String(MAX_CONFIRMATION_RETRIES)}): ${msg}`,
				);
			}
		}
	}
}

function extractConfirmationRequestId(event: CapturedEvent): string | undefined {
	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.requestId === 'string') {
		return payload.requestId;
	}

	// Fallback: check top-level data
	if (typeof event.data.requestId === 'string') {
		return event.data.requestId;
	}

	return undefined;
}

function extractConfirmationTitle(event: CapturedEvent): string {
	const payload = getNestedRecord(event.data, 'payload') ?? event.data;
	return typeof payload.title === 'string' ? payload.title : 'unknown';
}

function extractRunStatus(event: CapturedEvent): string {
	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.status === 'string') {
		return payload.status;
	}
	if (typeof event.data.status === 'string') {
		return event.data.status;
	}
	return 'unknown';
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
// Wait for background tasks
// ---------------------------------------------------------------------------

async function waitForBackgroundTasks(
	config: RunnerConfig,
	threadId: string,
	events: CapturedEvent[],
	approvedRequests: Set<string>,
	timeoutMs: number,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	// Check if any sub-agents were spawned — if not, no background work to wait for
	const hasSpawnedAgents = events.some((e) => e.type === 'agent-spawned');
	if (!hasSpawnedAgents) {
		if (config.verbose) {
			log('No sub-agents spawned — skipping background task wait');
		}
		return;
	}

	if (config.verbose) {
		log('Sub-agent(s) detected — waiting for background tasks to complete...');
	}

	while (Date.now() < deadline) {
		// Auto-approve confirmation requests from sub-agents (they arrive after run-finish)
		if (config.autoApprove) {
			await processConfirmationRequests(config, events, approvedRequests);
		}

		// Primary: check REST API for background task status
		const status = await config.n8nClient.getThreadStatus(threadId);
		const tasks = status.backgroundTasks ?? [];
		const restRunning = tasks.filter((t) => t.status === 'running');

		// Fallback: check SSE events for unmatched agent-spawned / agent-completed
		const ssePending = getPendingAgentIds(events);

		if (restRunning.length === 0 && ssePending.length === 0) {
			if (config.verbose) {
				log(`All background tasks completed (${String(tasks.length)} REST tasks, 0 SSE pending)`);
			}
			// Brief extra wait for any trailing events (workflow save, etc.)
			await delay(1000);
			return;
		}

		if (config.verbose) {
			if (restRunning.length > 0) {
				const roles = restRunning.map((t) => t.role || t.taskId);
				log(`Waiting for ${String(restRunning.length)} REST task(s): ${roles.join(', ')}`);
			}
			if (ssePending.length > 0) {
				log(`Waiting for ${String(ssePending.length)} SSE agent(s): ${ssePending.join(', ')}`);
			}
		}

		await delay(BACKGROUND_TASK_POLL_INTERVAL_MS);
	}

	if (config.verbose) {
		log(`Background task wait timed out after ${String(timeoutMs)}ms — continuing`);
	}
}

/** Compare agent-spawned vs agent-completed SSE events to find pending agent IDs */
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

function extractAgentId(event: CapturedEvent): string | undefined {
	if (typeof event.data.agentId === 'string') return event.data.agentId;

	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.agentId === 'string') return payload.agentId;

	return undefined;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function calculateScore(passes: boolean[]): number {
	if (passes.length === 0) return 0;
	const passed = passes.filter(Boolean).length;
	return passed / passes.length;
}

// ---------------------------------------------------------------------------
// Error result builder
// ---------------------------------------------------------------------------

function buildErrorResult(
	prompt: PromptConfig,
	threadId: string,
	runId: string,
	events: CapturedEvent[],
	startTime: number,
	checklist: ChecklistItem[],
	errorMessage: string,
): InstanceAiResult {
	const metrics = buildMetrics(events, startTime);

	return {
		prompt: prompt.text,
		complexity: prompt.complexity,
		tags: prompt.tags,
		success: false,
		runId,
		threadId,
		metrics,
		outcome: {
			workflowsCreated: [],
			executionsRun: [],
			dataTablesCreated: [],
			finalText: '',
			workflowJsons: [],
		},
		checklist,
		checklistResults: [],
		checklistScore: 0,
		executionChecklist: [],
		executionChecklistResults: [],
		executionChecklistScore: 0,
		error: errorMessage,
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string): void {
	const timestamp = new Date().toISOString();
	console.log(`[eval ${timestamp}] ${message}`);
}

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}

function formatPercent(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}

function logToolCallSummary(toolCalls: Array<{ toolName: string; error?: string }>): void {
	if (toolCalls.length === 0) return;

	const summary = new Map<string, number>();
	for (const tc of toolCalls) {
		const count = summary.get(tc.toolName) ?? 0;
		summary.set(tc.toolName, count + 1);
	}

	const parts = Array.from(summary.entries())
		.map(([name, count]) => `${name}(${String(count)})`)
		.join(', ');
	log(`Tool calls: ${parts}`);

	const errors = toolCalls.filter((tc) => tc.error);
	if (errors.length > 0) {
		log(
			`Tool errors: ${String(errors.length)} — ${errors.map((tc) => `${tc.toolName}: ${tc.error ?? ''}`).join('; ')}`,
		);
	}
}
