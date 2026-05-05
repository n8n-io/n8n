// ---------------------------------------------------------------------------
// Chat loop for the computer-use eval.
//
// Sends a single prompt to the agent, captures the SSE event stream, and
// resolves once the run has fully settled (run-finish observed, no pending
// background sub-agents, no unanswered confirmation requests). Returns a
// trace consumable by graders.
//
// The SSE/wait/confirmation primitives live in `harness/chat-loop.ts` and
// are shared with the workflow eval harness.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import type { N8nClient } from '../clients/n8n-client';
import {
	SSE_SETTLE_DELAY_MS,
	extractConfirmationRequestId,
	startSseConnection,
	waitForAllActivity,
} from '../harness/chat-loop';
import type { EvalLogger } from '../harness/logger';
import { extractOutcomeFromEvents } from '../outcome/event-parser';
import type { CapturedEvent } from '../types';
import { computeTokenStats } from './tokens';
import type { CapturedConfirmation, ScenarioTrace } from './types';

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
 * record. The chat-loop module already auto-approves these; this function
 * preserves the signal for graders and the report rather than letting it
 * dissolve into the events array.
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
