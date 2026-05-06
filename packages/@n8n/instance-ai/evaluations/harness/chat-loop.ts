// ---------------------------------------------------------------------------
// Shared agent-run chat loop
//
// Drives an agent run to completion: opens an SSE event stream, waits for
// the main run to finish, drains background sub-agents, auto-approves any
// confirmation requests, and surfaces the captured events.
//
// Used by `harness/runner.ts` (workflow eval) and the computer-use eval
// harness. Both consume the same primitives so any fix here lands in both
// flows automatically.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { setTimeout as delay } from 'node:timers/promises';

import type { EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';
import { consumeSseStream } from '../clients/sse-client';
import type { CapturedEvent } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SSE_SETTLE_DELAY_MS = 200;
export const POLL_INTERVAL_MS = 500;
export const BACKGROUND_TASK_POLL_INTERVAL_MS = 2_000;
export const MAX_CONFIRMATION_RETRIES = 5;

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

export interface WaitConfig {
	client: N8nClient;
	threadId: string;
	events: CapturedEvent[];
	approvedRequests: Set<string>;
	startTime: number;
	timeoutMs: number;
	logger: EvalLogger;
}

export async function waitForAllActivity(config: WaitConfig): Promise<void> {
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
		config.logger.verbose('No sub-agents spawned -- skipping background task wait');
		return;
	}

	config.logger.verbose('Sub-agent(s) detected -- waiting for background tasks...');

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

// ---------------------------------------------------------------------------
// Confirmation auto-approval
// ---------------------------------------------------------------------------

const confirmationRetries = new Map<string, number>();

export async function processConfirmationRequests(config: WaitConfig): Promise<void> {
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
			await config.client.confirmAction(requestId, buildAutoApprovePayload(event));
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

/** Map a confirmation-request event to the most-permissive approval payload of the
 *  matching kind. The eval runner has no real credentials and no human in the loop —
 *  we just need a structurally-valid payload that lets the agent proceed. */
export function buildAutoApprovePayload(event: CapturedEvent): InstanceAiConfirmRequest {
	const payload = getNestedRecord(event.data, 'payload') ?? {};

	if (getNestedRecord(payload, 'domainAccess')) {
		return { kind: 'domainAccessApprove', domainAccessAction: 'allow_all' };
	}

	const resourceDecision = getNestedRecord(payload, 'resourceDecision');
	if (resourceDecision) {
		const options = Array.isArray(resourceDecision.options)
			? (resourceDecision.options as unknown[]).filter((o): o is string => typeof o === 'string')
			: [];
		const allowOption = options.find((o) => o.toLowerCase().includes('allow')) ?? options[0];
		return { kind: 'resourceDecision', resourceDecision: allowOption ?? 'allowOnce' };
	}

	if (Array.isArray(payload.setupRequests)) {
		return { kind: 'setupWorkflowApply' };
	}

	if (Array.isArray(payload.credentialRequests)) {
		return { kind: 'credentialSelection', credentials: {} };
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
