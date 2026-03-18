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
import { verifyChecklist } from './checklist';
import {
	extractOutcomeFromEvents,
	buildAgentOutcome,
	buildMetrics,
	buildVerificationArtifact,
	cleanupEvalArtifacts,
	snapshotWorkflowIds,
} from './verification';
import type { InstanceAiResult, PromptConfig, ChecklistItem, CapturedEvent } from './types';

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
}

const DEFAULT_TIMEOUT_MS = 600_000;
const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 500;
const BACKGROUND_TASK_POLL_INTERVAL_MS = 1_000;
const BACKGROUND_TASK_TIMEOUT_MS = 300_000; // 5 min for complex multi-builder prompts

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
		const preRunWorkflowIds = await snapshotWorkflowIds(config.n8nClient);

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

		// 4. Wait for run-finish while handling auto-approve and timeout
		await waitForRunFinish(config, threadId, events, approvedRequests, startTime, timeoutMs);

		if (config.verbose) {
			const elapsed = Date.now() - startTime;
			const finishEvent = events.find((e) => e.type === 'run-finish');
			const status = finishEvent ? extractRunStatus(finishEvent) : 'unknown';
			log(`[${threadId}] Run finished — status: ${status}, time: ${String(elapsed)}ms`);
		}

		// 5. Wait for background tasks to complete (SSE stays open to capture events)
		await waitForBackgroundTasks(
			config.n8nClient,
			threadId,
			events,
			preRunWorkflowIds,
			config.verbose,
		);

		// 6. Abort SSE connection now that background tasks are done
		abortController.abort();
		await ssePromise.catch(() => {
			// SSE promise rejects on abort — expected
		});

		// 7. Build metrics and outcome (diff workflows against pre-run snapshot)
		const metrics = buildMetrics(events, startTime);
		const eventOutcome = extractOutcomeFromEvents(events);
		const outcome = await buildAgentOutcome(config.n8nClient, eventOutcome, preRunWorkflowIds);

		if (config.verbose && outcome.workflowsCreated.length > 0) {
			log(
				`[${threadId}] Captured ${String(outcome.workflowsCreated.length)} workflow(s): ${outcome.workflowsCreated.map((w) => w.name).join(', ')}`,
			);
		}

		// 8. Build verification artifact and run checklist
		const verificationArtifact = buildVerificationArtifact(
			outcome,
			eventOutcome.toolCalls,
			eventOutcome.agentActivities,
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
			checklist,
			checklistResults,
			checklistScore,
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

async function waitForRunFinish(
	config: RunnerConfig,
	threadId: string,
	events: CapturedEvent[],
	approvedRequests: Set<string>,
	startTime: number,
	timeoutMs: number,
): Promise<void> {
	while (!hasRunFinished(events)) {
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

function hasRunFinished(events: CapturedEvent[]): boolean {
	return events.some((e) => e.type === 'run-finish');
}

// ---------------------------------------------------------------------------
// Confirmation auto-approval
// ---------------------------------------------------------------------------

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

		approvedRequests.add(requestId);

		if (config.verbose) {
			const title = extractConfirmationTitle(event);
			log(`[auto-approve] Approving confirmation: ${title} (${requestId})`);
		}

		try {
			await config.n8nClient.confirmAction(requestId, true);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			if (config.verbose) {
				log(`[auto-approve] Failed to approve ${requestId}: ${msg}`);
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
	_client: N8nClient,
	_threadId: string,
	events: CapturedEvent[],
	_preRunWorkflowIds: Set<string>,
	verbose: boolean,
): Promise<void> {
	const deadline = Date.now() + BACKGROUND_TASK_TIMEOUT_MS;

	// Check if any sub-agents were spawned — if not, no background work to wait for
	const hasSpawnedAgents = events.some((e) => e.type === 'agent-spawned');
	if (!hasSpawnedAgents) {
		if (verbose) {
			log('No sub-agents spawned — skipping background task wait');
		}
		return;
	}

	if (verbose) {
		log('Sub-agent(s) detected — waiting for all to complete via SSE events...');
	}

	// Fundamental approach: wait for every agent-spawned to have a matching
	// agent-completed. The SSE connection is still open, so new events keep
	// arriving in the shared `events` array.
	while (Date.now() < deadline) {
		const { pending, total } = getPendingAgents(events);

		if (pending.length === 0 && total > 0) {
			if (verbose) {
				log(`All ${String(total)} sub-agent(s) completed`);
			}
			// Brief extra wait for any trailing events (workflow save, etc.)
			await delay(1000);
			return;
		}

		if (verbose && pending.length > 0) {
			log(
				`Waiting for ${String(pending.length)}/${String(total)} sub-agent(s): ${pending.join(', ')}`,
			);
		}

		await delay(BACKGROUND_TASK_POLL_INTERVAL_MS);
	}

	const { pending, total } = getPendingAgents(events);
	if (verbose) {
		log(
			`Background task wait timed out — ${String(pending.length)}/${String(total)} agent(s) still pending`,
		);
	}
}

/** Compare agent-spawned vs agent-completed events to find pending agents */
function getPendingAgents(events: CapturedEvent[]): { pending: string[]; total: number } {
	const spawned = new Set<string>();
	const completed = new Set<string>();

	for (const event of events) {
		if (event.type === 'agent-spawned') {
			const agentId = getAgentId(event);
			if (agentId) spawned.add(agentId);
		}
		if (event.type === 'agent-completed') {
			const agentId = getAgentId(event);
			if (agentId) completed.add(agentId);
		}
	}

	const pending = [...spawned].filter((id) => !completed.has(id));
	return { pending, total: spawned.size };
}

function getAgentId(event: CapturedEvent): string | undefined {
	const fromData = typeof event.data.agentId === 'string' ? event.data.agentId : undefined;
	if (fromData) return fromData;

	const payload = event.data.payload;
	if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
		const p = payload as Record<string, unknown>;
		return typeof p.agentId === 'string' ? p.agentId : undefined;
	}
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
