// ---------------------------------------------------------------------------
// Chat loop for the computer-use eval.
//
// Sends a single prompt to the agent, captures the SSE event stream, and
// resolves once the run has fully settled (run-finish observed, no pending
// background sub-agents, no unanswered confirmation requests). Returns a
// trace consumable by graders.
//
// Mirrors the relevant bits of `harness/runner.ts` but slim — no workflow
// extraction, no checklist verification, no concurrency wrapper.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import type { N8nClient } from '../clients/n8n-client';
import { consumeSseStream } from '../clients/sse-client';
import type { EvalLogger } from '../harness/logger';
import { buildAutoApprovePayload } from '../harness/runner';
import { extractOutcomeFromEvents } from '../outcome/event-parser';
import type { CapturedEvent } from '../types';
import { computeTokenStats } from './tokens';
import type { CapturedConfirmation, ScenarioTrace } from './types';

const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 500;
const BACKGROUND_TASK_POLL_INTERVAL_MS = 2_000;

export interface RunChatOptions {
	client: N8nClient;
	prompt: string;
	timeoutMs: number;
	logger: EvalLogger;
}

/**
 * Run a chat against the agent and return the captured trace.
 *
 * Throws if the run exceeds `timeoutMs` — which means the agent got stuck.
 * That's almost always a real signal worth bubbling up rather than papering
 * over.
 */
export async function runChat(options: RunChatOptions): Promise<ScenarioTrace> {
	const { client, prompt, timeoutMs, logger } = options;
	const threadId = `cu-eval-${crypto.randomUUID()}`;
	const startTime = Date.now();

	const abortController = new AbortController();
	const events: CapturedEvent[] = [];
	const approvedRequests = new Set<string>();

	const ssePromise = startSseConnection(client, threadId, events, abortController.signal).catch(
		() => {},
	);

	try {
		await delay(SSE_SETTLE_DELAY_MS);
		await client.sendMessage(threadId, prompt);

		await waitForAllActivity({
			client,
			threadId,
			events,
			approvedRequests,
			startTime,
			timeoutMs,
			logger,
		});
	} finally {
		abortController.abort();
		await ssePromise.catch(() => {});
	}

	const outcome = extractOutcomeFromEvents(events);
	return {
		events,
		toolCalls: outcome.toolCalls,
		confirmations: extractConfirmations(events, approvedRequests),
		finalText: outcome.finalText,
		durationMs: Date.now() - startTime,
		tokens: computeTokenStats(outcome.toolCalls),
		threadId,
	};
}

/**
 * Pull every confirmation-request event out of the raw stream as a typed
 * record. The harness still auto-approves them in {@link processConfirmationRequests};
 * this function preserves the signal for graders and the report rather than
 * letting it dissolve into the events array.
 */
function extractConfirmations(
	events: CapturedEvent[],
	approvedRequests: Set<string>,
): CapturedConfirmation[] {
	const out: CapturedConfirmation[] = [];
	const seen = new Set<string>();
	for (const event of events) {
		if (event.type !== 'confirmation-request') continue;
		const requestId = extractConfirmationRequestId(event);
		if (!requestId || seen.has(requestId)) continue;
		seen.add(requestId);
		out.push({
			requestId,
			timestamp: event.timestamp,
			summary: extractConfirmationSummary(event),
			autoApproved: approvedRequests.has(requestId),
		});
	}
	return out;
}

function extractConfirmationSummary(event: CapturedEvent): string | undefined {
	const payload = nestedRecord(event.data, 'payload');
	const candidates = [
		payload && typeof payload.summary === 'string' ? payload.summary : undefined,
		payload && typeof payload.message === 'string' ? payload.message : undefined,
		typeof event.data.summary === 'string' ? event.data.summary : undefined,
		typeof event.data.message === 'string' ? event.data.message : undefined,
	];
	const found = candidates.find((c): c is string => typeof c === 'string' && c.length > 0);
	return found ? found.slice(0, 280) : undefined;
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
	await consumeSseStream(
		client.getEventsUrl(threadId),
		client.cookie,
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
// Wait for run + sub-agents to finish
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

		const remaining = Math.max(0, config.timeoutMs - (Date.now() - config.startTime));
		await waitForBackgroundTasks(config, remaining);

		await delay(SSE_SETTLE_DELAY_MS);
		const newRunStarts = countEvents(config.events, 'run-start');
		const currentRunFinishes = countEvents(config.events, 'run-finish');
		if (newRunStarts <= currentRunFinishes) return;

		if (Date.now() - config.startTime > config.timeoutMs) {
			throw new Error(`chat run timed out after ${String(config.timeoutMs)}ms`);
		}
	}
}

async function waitForRunFinish(config: WaitConfig, expectedFinishCount: number): Promise<void> {
	while (countEvents(config.events, 'run-finish') <= expectedFinishCount) {
		const elapsed = Date.now() - config.startTime;
		if (elapsed > config.timeoutMs) {
			await config.client.cancelRun(config.threadId).catch(() => {});
			throw new Error(`chat run timed out after ${String(config.timeoutMs)}ms`);
		}

		await processConfirmationRequests(config);
		await delay(POLL_INTERVAL_MS);
	}
}

async function waitForBackgroundTasks(config: WaitConfig, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	const hasSpawned = config.events.some((e) => e.type === 'agent-spawned');
	if (!hasSpawned) return;

	while (Date.now() < deadline) {
		await processConfirmationRequests(config);

		const status = await config.client.getThreadStatus(config.threadId);
		const restRunning = (status.backgroundTasks ?? []).filter((t) => t.status === 'running');
		const ssePending = pendingAgentIds(config.events);

		if (restRunning.length === 0 && ssePending.length === 0) {
			await delay(1_000);
			return;
		}

		await delay(BACKGROUND_TASK_POLL_INTERVAL_MS);
	}
}

// ---------------------------------------------------------------------------
// Auto-approval of confirmation requests (e.g. resource access prompts)
// ---------------------------------------------------------------------------

async function processConfirmationRequests(config: WaitConfig): Promise<void> {
	const events = config.events.filter((e) => e.type === 'confirmation-request');
	for (const event of events) {
		const requestId = extractConfirmationRequestId(event);
		if (!requestId || config.approvedRequests.has(requestId)) continue;

		try {
			await config.client.confirmAction(requestId, buildAutoApprovePayload(event));
			config.approvedRequests.add(requestId);
		} catch (error) {
			config.logger.verbose(
				`[chat] failed to auto-approve ${requestId}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countEvents(events: CapturedEvent[], type: string): number {
	return events.filter((e) => e.type === type).length;
}

function pendingAgentIds(events: CapturedEvent[]): string[] {
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
	const payload = nestedRecord(event.data, 'payload');
	if (payload && typeof payload.requestId === 'string') return payload.requestId;
	if (typeof event.data.requestId === 'string') return event.data.requestId;
	return undefined;
}

function extractAgentId(event: CapturedEvent): string | undefined {
	if (typeof event.data.agentId === 'string') return event.data.agentId;
	const payload = nestedRecord(event.data, 'payload');
	if (payload && typeof payload.agentId === 'string') return payload.agentId;
	return undefined;
}

function nestedRecord(
	obj: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const value = obj[key];
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return undefined;
}
