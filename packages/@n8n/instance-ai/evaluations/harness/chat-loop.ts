// ---------------------------------------------------------------------------
// Shared agent-run chat loop
//
// Drives an agent run to completion: opens an SSE event stream, waits for
// the main run to finish, drains background agent tasks, waits for observational-
// memory jobs (via thread status polling), auto-approves any confirmation
// confirmation requests, and surfaces the captured events.
//
// Used by `harness/build-workflow.ts` (workflow eval) and the computer-use eval
// harness. Both consume the same primitives so any fix here lands in both
// flows automatically.
// ---------------------------------------------------------------------------

import type { InstanceAiBuildMode, InstanceAiConfirmRequest } from '@n8n/api-types';
import { INSTANCE_AI_MEMORY_TASK_WAIT_TIMEOUT_MS } from '@n8n/api-types';
import { isTerminalExecutionStatus } from 'n8n-workflow';
import { setTimeout as delay } from 'node:timers/promises';

import type { EvalLogger } from './logger';
import { MIN_TURN_BUDGET_MS, RunTimeoutError } from './timeouts';
import type { N8nClient } from '../clients/n8n-client';
import { consumeSseStream } from '../clients/sse-client';
import { lastSavedWorkflowIdFromEvents, savedWorkflowsFromEvents } from '../outcome/event-parser';
import type { BuildTimeout, CapturedEvent } from '../types';
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
	/** When the conversation started (the opening message was sent). */
	startTime: number;
	/** Conversation budget, measured from `startTime`. */
	timeoutMs: number;
	/** Budget of one user turn, measured from `turnStartedAt`. Absent: no per-turn cap. */
	turnTimeoutMs?: number;
	/** When the user message of the turn in flight was sent. */
	turnStartedAt?: number;
	/** Cancel a run in flight after this long without an event. Absent: no bound. */
	inactivityTimeoutMs?: number;
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
		await waitForBackgroundTasks(config, remainingBudgetMs(config));

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

		await cancelOnTimeout(config);
	}
}

/**
 * Conversation budget a follow-up needs before it is sent: the fixed floor, or a
 * quarter of a turn budget when that is smaller (short local budgets). Without
 * a turn budget the loop keeps the old rule: send while any time is left.
 */
function minTurnBudgetMs(config: WaitConfig): number {
	if (config.turnTimeoutMs === undefined) return 0;
	return Math.min(MIN_TURN_BUDGET_MS, config.turnTimeoutMs / 4);
}

/** Time left in the tightest of the conversation and turn budgets. */
function remainingBudgetMs(config: WaitConfig, now = Date.now()): number {
	const conversation = config.timeoutMs - (now - config.startTime);
	const turn =
		config.turnTimeoutMs !== undefined && config.turnStartedAt !== undefined
			? config.turnTimeoutMs - (now - config.turnStartedAt)
			: Infinity;
	return Math.max(0, Math.min(conversation, turn));
}

/**
 * The budget the run in flight has overrun, if any. The conversation budget is
 * the ceiling the other two live inside, so it is checked first. Inactivity
 * reads the last captured event: harness markers count, so a turn whose run has
 * not started yet is measured from its own user message.
 */
export function timeoutBreach(config: WaitConfig, now = Date.now()): BuildTimeout | undefined {
	const turn = Math.max(1, countEvents(config.events, USER_TURN_EVENT));
	const conversationElapsed = now - config.startTime;
	if (conversationElapsed > config.timeoutMs) {
		return { kind: 'conversation', turn, elapsedMs: conversationElapsed };
	}
	if (config.turnTimeoutMs !== undefined && config.turnStartedAt !== undefined) {
		const turnElapsed = now - config.turnStartedAt;
		if (turnElapsed > config.turnTimeoutMs) return { kind: 'turn', turn, elapsedMs: turnElapsed };
	}
	if (config.inactivityTimeoutMs !== undefined) {
		const lastEventAt = config.events.at(-1)?.timestamp ?? config.turnStartedAt ?? config.startTime;
		const idleMs = now - lastEventAt;
		if (idleMs > config.inactivityTimeoutMs) return { kind: 'inactivity', turn, elapsedMs: idleMs };
	}
	return undefined;
}

/** Cancel the run in flight and throw when a budget has fired. */
async function cancelOnTimeout(config: WaitConfig): Promise<void> {
	const breach = timeoutBreach(config);
	if (!breach) return;
	await config.client.cancelRun(config.threadId).catch(() => {});
	throw new RunTimeoutError(breach);
}

async function waitForRunFinish(config: WaitConfig, expectedFinishCount: number): Promise<void> {
	while (countEvents(config.events, 'run-finish') <= expectedFinishCount) {
		await cancelOnTimeout(config);
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

export type NextMessageDecision =
	| {
			kind: 'followUp';
			message: string;
			/**
			 * The user-proxy asked for the last saved workflow to be renamed from
			 * outside the conversation, driven by a stage direction. Lets a case
			 * exercise the optimistic-concurrency path ("modified outside this
			 * conversation"), which the agent otherwise only reaches by accident when
			 * its own setup or credential work happens to advance the checksum.
			 */
			renameWorkflowTo?: string;
			/** A normal user run, performed before delivering the next message. */
			runWorkflowId?: string;
	  }
	| { kind: 'done' };

export interface MultiTurnConfig extends WaitConfig {
	nextMessageDecider: () => Promise<NextMessageDecision>;
	/** Restore the case's declared input rows before a normal user execution. */
	beforeUserExecution?: (deadline: number) => Promise<void>;
	allowUserExecution?: boolean;
	/** Repeat the eval override on each message to bypass the backend assignment. */
	buildMode?: InstanceAiBuildMode;
	promptVersion?: string;
	observerThresholdTokens?: number;
}

/**
 * Drives the conversation until the proxy is done or a budget ends it. Returns
 * the budget that ended it, or undefined when the proxy said done. A budget that
 * fires inside a run throws `RunTimeoutError` from `waitForAllActivity`; one that
 * runs out between turns returns here, with the state saved so far intact.
 */
export async function runMultiTurnConversation(
	config: MultiTurnConfig,
): Promise<BuildTimeout | undefined> {
	while (true) {
		await waitForAllActivity(config);

		const decision = await config.nextMessageDecider();
		if (decision.kind === 'done') {
			config.logger.verbose('[multi-turn] Proxy returned done — exiting loop');
			return undefined;
		}

		// The proxy still has something to say: only a turn that can get a minimal
		// budget is worth starting. Otherwise the conversation ends here and the
		// saved state is graded.
		const nextTurn = countEvents(config.events, USER_TURN_EVENT) + 1;
		const conversationBudgetExhausted = (): BuildTimeout | undefined => {
			const elapsedMs = Date.now() - config.startTime;
			if (config.timeoutMs - elapsedMs >= minTurnBudgetMs(config)) return undefined;
			config.logger.verbose(
				`[multi-turn] ${String(Math.max(0, Math.round((config.timeoutMs - elapsedMs) / 1000)))}s of conversation budget left — not sending user turn ${String(nextTurn)}`,
			);
			return { kind: 'conversation', turn: nextTurn, elapsedMs };
		};
		const exhaustedBeforeEdits = conversationBudgetExhausted();
		if (exhaustedBeforeEdits) return exhaustedBeforeEdits;

		// After the decision, so an edit never lands on the boundary that ends the
		// conversation: there the agent would get no turn to react, and the renamed
		// workflow would still be what the judge and workflow checks read.
		if (decision.renameWorkflowTo !== undefined) {
			await applyExternalRename(config, decision.renameWorkflowTo);
		}

		// Before the follow-up is delivered, so a "I just ran it" message is true
		// by the time the agent reads it and inspects the executions list.
		if (decision.runWorkflowId !== undefined) {
			if (!config.allowUserExecution) throw new Error('User executions are disabled for this case');
			await applyUserExecution(config, decision.runWorkflowId);
		}

		const exhaustedAfterEdits = conversationBudgetExhausted();
		if (exhaustedAfterEdits) return exhaustedAfterEdits;

		config.logger.verbose(
			`[multi-turn] Sending follow-up: ${decision.message.slice(0, 80)}${decision.message.length > 80 ? '...' : ''}`,
		);
		config.turnStartedAt = Date.now();
		recordUserTurn(config.events, decision.message);
		try {
			await config.client.sendMessage(
				config.threadId,
				decision.message,
				undefined,
				config.buildMode,
				config.promptVersion,
				undefined,
				// Re-sent per message: the backend clears an omitted override.
				config.observerThresholdTokens,
			);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			config.logger.verbose(`[multi-turn] sendMessage failed: ${msg} — exiting loop`);
			return undefined;
		}
	}
}

/**
 * Renames the workflow this run last saved, from outside the conversation — the
 * side effect behind a `renameWorkflowTo` stage direction.
 *
 * The proxy only ever sees the transcript, so it decides a workflow exists from
 * what the agent *claimed*. Both guards below re-derive that from ground truth
 * before writing anything.
 *
 * Logging is deliberately loud on every path. Skips and failures are `warn`, and
 * the success is `info` rather than `verbose` — the failure that matters most is
 * a direction that stops driving `renameWorkflowTo` at all, and that one never
 * reaches this function, so it cannot log anything itself. Printing the rename
 * in a normal run is what makes its ABSENCE meaningful: without it, a case whose
 * direction silently stopped working reds on its name assertion and reads as an
 * agent regression, with nothing in the log to say the conflict never happened.
 *
 * A failure is logged and swallowed rather than thrown — the case grades the
 * agent's recovery, and killing the run here would report that as a build
 * failure instead.
 */
async function applyExternalRename(config: MultiTurnConfig, rename: string): Promise<void> {
	// Only builds that actually SAVED. Failed builds are excluded deliberately:
	// they still report a workflowId, and acting on one would rename a workflow
	// this run never created (an attached or pre-existing one). Last rather than
	// first — the proxy fires at a turn boundary, so "the workflow under
	// discussion" is the most recent one to reach the instance.
	const workflowId = lastSavedWorkflowIdFromEvents(config.events);
	if (workflowId === undefined) {
		config.logger.warn(
			`[external-edit] Skipped rename to "${rename}": this run has saved no workflow yet, so there is nothing to conflict`,
		);
		return;
	}

	try {
		const current = await config.client.getWorkflow(workflowId);
		if (current.name === rename) {
			// Re-issuing the same rename advances the checksum a second time and
			// re-conflicts a save the agent may already have recovered from, which
			// would grade a successful recovery as a failure.
			config.logger.warn(
				`[external-edit] Skipped rename of ${workflowId}: it is already named "${rename}"`,
			);
			return;
		}

		await config.client.updateWorkflow(workflowId, { name: rename });
		config.logger.info(
			`[external-edit] Renamed ${workflowId} from "${current.name}" to "${rename}" outside the conversation`,
		);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		config.logger.warn(
			`[external-edit] Failed to rename ${workflowId} to "${rename}": ${message} — the conflict path was not exercised`,
		);
	}
}

/** Use the normal execution route so the agent can inspect user-run evidence. */
async function applyUserExecution(config: MultiTurnConfig, workflowId: string): Promise<void> {
	if (!savedWorkflowsFromEvents(config.events).some((workflow) => workflow.id === workflowId)) {
		throw new Error(`User-run workflow ${workflowId} was not saved in this conversation`);
	}
	const remainingMs = () => {
		const remaining = config.timeoutMs - (Date.now() - config.startTime);
		if (remaining <= 0) throw new Error('Case timed out before the user execution completed');
		return remaining;
	};
	remainingMs();
	await config.beforeUserExecution?.(config.startTime + config.timeoutMs);
	const workflow = await config.client.getWorkflow(workflowId, remainingMs());
	if (Object.keys(workflow.pinData ?? {}).length > 0) {
		throw new Error('User-run evals require a workflow without pinned data');
	}
	if (workflow.nodes.some((node) => Object.keys(node.credentials ?? {}).length > 0)) {
		throw new Error('User-run evals require a workflow without credentials');
	}
	const trigger = workflow.nodes.find((node) =>
		['n8n-nodes-base.manualTrigger', 'n8n-nodes-base.scheduleTrigger'].includes(node.type),
	);
	if (!trigger) throw new Error('User-run evals require a manual or schedule trigger');

	const { executionId } = await config.client.executeWorkflow(
		workflowId,
		trigger.name,
		remainingMs(),
	);
	try {
		while (true) {
			const execution = await config.client.getExecution(executionId, remainingMs());
			if (isTerminalExecutionStatus(execution.status)) {
				config.logger.info(
					`[user-run] Executed ${workflowId}: status=${execution.status} executionId=${executionId}`,
				);
				return;
			}
			await delay(Math.min(POLL_INTERVAL_MS, remainingMs()));
		}
	} catch (error) {
		await config.client.stopExecution(executionId).catch(() => {
			config.logger.warn(`[user-run] Could not stop execution ${executionId}`);
		});
		throw error;
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
