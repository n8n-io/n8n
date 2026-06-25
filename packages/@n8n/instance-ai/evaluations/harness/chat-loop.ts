// ---------------------------------------------------------------------------
// Shared agent-run chat loop
//
// Drives an agent run to completion: opens an SSE event stream, waits for
// the main run to finish, drains background agent tasks, waits for observational-
// memory jobs (via thread status polling), auto-approves any confirmation
// confirmation requests, and surfaces the captured events.
//
// Used by `harness/runner.ts` (workflow eval) and the computer-use eval
// harness. Both consume the same primitives so any fix here lands in both
// flows automatically.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { INSTANCE_AI_MEMORY_TASK_WAIT_TIMEOUT_MS } from '@n8n/api-types';
import { setTimeout as delay } from 'node:timers/promises';

import type { EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';
import { consumeSseStream } from '../clients/sse-client';
import type { CapturedEvent } from '../types';
import { USER_TURN_EVENT } from '../types';
import { getEventPayload, tryInfrastructureResponse } from '../utils/confirmation-payload';
import { getNestedRecord } from '../utils/safe-extract';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SSE_SETTLE_DELAY_MS = 200;
export const POLL_INTERVAL_MS = 500;
export const BACKGROUND_TASK_POLL_INTERVAL_MS = 2_000;
const MEMORY_TASK_POLL_INTERVAL_MS = 500;
export const MAX_CONFIRMATION_RETRIES = 5;

/**
 * Inject a marker into the captured event stream at each user-message send so
 * the transcript can group all of a message's runs — including agent *resumes*,
 * which each emit their own `run-start` — under the one message that triggered
 * them. Without this, runs are aligned to messages positionally and a single
 * message that spans a resume shifts every later message by one turn.
 *
 * Pushed synchronously just before `sendMessage`; `waitForAllActivity` has already
 * drained the prior run (incl. the `SSE_SETTLE_DELAY_MS` settle), so the marker
 * reliably precedes the next run's events rather than racing a straggler.
 */
export function recordUserTurn(events: CapturedEvent[], text: string): void {
	events.push({
		timestamp: Date.now(),
		type: USER_TURN_EVENT,
		data: { type: USER_TURN_EVENT, payload: { text } },
	});
}

// ---------------------------------------------------------------------------
// SSE connection
// ---------------------------------------------------------------------------

export async function startSseConnection(
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

export type ConfirmationStrategy = (
	event: CapturedEvent,
) => InstanceAiConfirmRequest | Promise<InstanceAiConfirmRequest>;

export interface WaitConfig {
	client: N8nClient;
	threadId: string;
	events: CapturedEvent[];
	approvedRequests: Set<string>;
	startTime: number;
	timeoutMs: number;
	logger: EvalLogger;
	confirmationStrategy?: ConfirmationStrategy;
	/** Per-conversation retry count by requestId. Auto-allocated when omitted. */
	confirmationRetries?: Map<string, number>;
	/** Caller-supplied sink for proxy confirmation payloads, keyed by requestId. */
	proxyResponses?: Map<string, InstanceAiConfirmRequest>;
}

export async function waitForAllActivity(config: WaitConfig): Promise<void> {
	// Allocate the retries map once per conversation if the caller didn't
	// pass one; per-call allocation would reset attempt counts every poll.
	config.confirmationRetries ??= new Map<string, number>();

	let runFinishCount = 0;

	while (true) {
		await waitForRunFinish(config, runFinishCount);
		runFinishCount = countEvents(config.events, 'run-finish');

		config.logger.verbose(
			`[${config.threadId}] Run #${String(runFinishCount)} finished -- time: ${String(Date.now() - config.startTime)}ms`,
		);

		// Wait for background agent tasks to complete
		const remainingMs = Math.max(0, config.timeoutMs - (Date.now() - config.startTime));
		await waitForBackgroundTasks(config, remainingMs);

		// Wait for observational-memory jobs (observer/reflector) before the next user turn
		await waitForMemoryTasks(config);

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
			await config.client.cancelRun(config.threadId).catch(() => {});
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
		config.logger.verbose('No background agent tasks spawned -- skipping background task wait');
		return;
	}

	config.logger.verbose('Background agent task(s) detected -- waiting for completion...');

	// Log on count change, plus a heartbeat every 20s so a long stable wait still
	// emits a liveness signal without spamming every poll interval.
	const HEARTBEAT_MS = 20_000;
	let lastLoggedKey = '';
	let lastLogAt = 0;

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

		const key = `${String(restRunning.length)}/${String(ssePending.length)}`;
		const now = Date.now();
		if (key !== lastLoggedKey || now - lastLogAt >= HEARTBEAT_MS) {
			config.logger.verbose(
				`Waiting for ${String(restRunning.length)} REST task(s), ${String(ssePending.length)} SSE agent(s)`,
			);
			lastLoggedKey = key;
			lastLogAt = now;
		}

		await delay(BACKGROUND_TASK_POLL_INTERVAL_MS);
	}

	config.logger.verbose(
		`Background task wait timed out after ${String(timeoutMs)}ms -- continuing`,
	);
}

async function waitForMemoryTasks(config: WaitConfig): Promise<void> {
	const waitStartedAt = Date.now();
	config.logger.verbose(
		`[${config.threadId}] Waiting for observational-memory jobs (timeout ${String(INSTANCE_AI_MEMORY_TASK_WAIT_TIMEOUT_MS)}ms)...`,
	);

	const deadline = Date.now() + INSTANCE_AI_MEMORY_TASK_WAIT_TIMEOUT_MS;
	let lastLoggedPendingCount = -1;
	let lastLogAt = 0;
	let pollCount = 0;
	const HEARTBEAT_MS = 20_000;

	while (Date.now() < deadline) {
		await processConfirmationRequests(config);

		pollCount++;
		const status = await config.client.getThreadStatus(config.threadId);
		const tasks = status.memoryTasks ?? [];
		const pending = tasks.filter((task) => task.status === 'queued' || task.status === 'running');
		const now = Date.now();

		if (
			pollCount === 1 ||
			pending.length !== lastLoggedPendingCount ||
			(pending.length > 0 && now - lastLogAt >= HEARTBEAT_MS)
		) {
			config.logger.verbose(
				`[${config.threadId}] Memory task poll #${String(pollCount)} (${String(now - waitStartedAt)}ms): ${String(pending.length)} pending, ${String(tasks.length)} tracked — ${formatMemoryTasksForLog(tasks)}`,
			);
			lastLoggedPendingCount = pending.length;
			lastLogAt = now;
		}

		if (pending.length === 0) {
			config.logger.verbose(
				`[${config.threadId}] Memory tasks idle after ${String(now - waitStartedAt)}ms (${String(pollCount)} poll(s))`,
			);
			await delay(SSE_SETTLE_DELAY_MS);
			return;
		}

		await delay(MEMORY_TASK_POLL_INTERVAL_MS);
	}

	config.logger.verbose(
		`[${config.threadId}] Memory task wait timed out after ${String(INSTANCE_AI_MEMORY_TASK_WAIT_TIMEOUT_MS)}ms (${String(pollCount)} poll(s), last pending=${String(lastLoggedPendingCount)})`,
	);
}

function formatMemoryTasksForLog(
	tasks: Array<{ taskId: string; taskKind: string; status: string }>,
): string {
	if (tasks.length === 0) {
		return 'none';
	}
	return tasks.map((task) => `${task.taskKind}:${task.status}`).join(', ');
}

// ---------------------------------------------------------------------------
// Multi-turn conversation loop
// ---------------------------------------------------------------------------

export type NextMessageDecision = { kind: 'followUp'; message: string } | { kind: 'done' };

export interface MultiTurnConfig extends WaitConfig {
	nextMessageDecider: () => Promise<NextMessageDecision>;
}

export async function runMultiTurnConversation(config: MultiTurnConfig): Promise<void> {
	while (true) {
		await waitForAllActivity(config);

		if (Date.now() - config.startTime > config.timeoutMs) {
			config.logger.verbose(
				`[multi-turn] Timeout reached after ${String(Date.now() - config.startTime)}ms — exiting loop`,
			);
			return;
		}

		const decision = await config.nextMessageDecider();
		if (decision.kind === 'done') {
			config.logger.verbose('[multi-turn] Proxy returned done — exiting loop');
			return;
		}

		config.logger.verbose(
			`[multi-turn] Sending follow-up: ${decision.message.slice(0, 80)}${decision.message.length > 80 ? '...' : ''}`,
		);
		recordUserTurn(config.events, decision.message);
		try {
			await config.client.sendMessage(config.threadId, decision.message);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			config.logger.verbose(`[multi-turn] sendMessage failed: ${msg} — exiting loop`);
			return;
		}
	}
}

// ---------------------------------------------------------------------------
// Confirmation auto-approval
// ---------------------------------------------------------------------------

export async function processConfirmationRequests(config: WaitConfig): Promise<void> {
	const confirmationEvents = config.events.filter((e) => e.type === 'confirmation-request');
	const strategy = config.confirmationStrategy ?? buildAutoApprovePayload;
	const retries = config.confirmationRetries ?? new Map<string, number>();

	for (const event of confirmationEvents) {
		const requestId = extractConfirmationRequestId(event);
		if (!requestId || config.approvedRequests.has(requestId)) {
			continue;
		}

		const retryCount = retries.get(requestId) ?? 0;
		if (retryCount >= MAX_CONFIRMATION_RETRIES) {
			continue;
		}

		if (retryCount === 0) {
			config.logger.verbose(`[confirm] Responding to confirmation: ${requestId}`);
		}

		try {
			const payload = await strategy(event);
			await config.client.confirmAction(requestId, payload);
			config.approvedRequests.add(requestId);
			config.proxyResponses?.set(requestId, payload);
			retries.delete(requestId);
		} catch (error: unknown) {
			retries.set(requestId, retryCount + 1);
			const msg = error instanceof Error ? error.message : String(error);
			config.logger.verbose(
				`[confirm] Failed to respond to ${requestId} (attempt ${String(retryCount + 1)}/${String(MAX_CONFIRMATION_RETRIES)}): ${msg}`,
			);
		}
	}
}

/** Map a confirmation-request event to the most-permissive approval payload of the
 *  matching kind. The eval runner has no real credentials and no human in the loop —
 *  we just need a structurally-valid payload that lets the agent proceed. */
export function buildAutoApprovePayload(event: CapturedEvent): InstanceAiConfirmRequest {
	const infra = tryInfrastructureResponse(event);
	if (infra) return infra;

	const payload = getEventPayload(event);

	if (Array.isArray(payload.setupRequests)) {
		return { kind: 'setupWorkflowApply' };
	}

	if (payload.inputType === 'questions') {
		return { kind: 'questions', answers: [] };
	}

	return { kind: 'approval', approved: true };
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

export function countEvents(events: CapturedEvent[], type: string): number {
	return events.filter((e) => e.type === type).length;
}

export function getPendingAgentIds(events: CapturedEvent[]): string[] {
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

export function extractConfirmationRequestId(event: CapturedEvent): string | undefined {
	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.requestId === 'string') {
		return payload.requestId;
	}
	if (typeof event.data.requestId === 'string') {
		return event.data.requestId;
	}
	return undefined;
}

export function extractAgentId(event: CapturedEvent): string | undefined {
	if (typeof event.data.agentId === 'string') return event.data.agentId;

	const payload = getNestedRecord(event.data, 'payload');
	if (payload && typeof payload.agentId === 'string') return payload.agentId;

	return undefined;
}
