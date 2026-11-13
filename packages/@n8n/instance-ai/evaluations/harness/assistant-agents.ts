// ---------------------------------------------------------------------------
// Turn wait and event rebuild for the Assistant agent on the Agents runtime.
//
// The Agents runtime has no thread event log. The harness polls the history route until the
// thread is quiet, answers open cards through `/chat/resume`, and rebuilds the
// legacy event shapes from the history. The outcome, transcript and metrics
// code reads those events and stays the same for both runtimes.
// ---------------------------------------------------------------------------

import type {
	AgentChatMessagesResponse,
	AgentExecutionStatus,
	AgentExecutionUsage,
	AgentPersistedMessageDto,
	AgentThreadUsageResponse,
	InstanceAiConfirmRequest,
	InstanceAiRunDebugResponse,
} from '@n8n/api-types';
import { unwrapToolCatalogCall } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { setTimeout as delay } from 'node:timers/promises';

import type { BuildTimeout, CapturedEvent } from '../types';
import { USER_TURN_EVENT } from '../types';

/** Instance AI tags orchestrator events with this agent id. The outcome code expects it. */
const ORCHESTRATOR_AGENT_ID = 'agent-001';

/** Consecutive idle polls before a turn counts as finished. */
export const ASSISTANT_AGENT_QUIET_POLLS = 3;
export const ASSISTANT_AGENT_POLL_INTERVAL_MS = 1_500;

/** The Agents runtime calls that the wait loop makes. `AssistantAgentsApi` implements them. */
export interface AssistantAgentWaitClient {
	getHistory(threadId: string): Promise<AgentChatMessagesResponse>;
	resume(runId: string, toolCallId: string, resumeData: InstanceAiConfirmRequest): Promise<void>;
	getUsage(threadId: string): Promise<AgentThreadUsageResponse>;
}

export interface AssistantAgentWaitConfig {
	client: AssistantAgentWaitClient;
	threadId: string;
	events: CapturedEvent[];
	approvedRequests: Set<string>;
	/** When the user message of this turn was sent (epoch ms). */
	sentAt: number;
	confirmationStrategy: (
		event: CapturedEvent,
	) => InstanceAiConfirmRequest | Promise<InstanceAiConfirmRequest>;
	/** Per-conversation retry count by request id. */
	confirmationRetries: Map<string, number>;
	maxConfirmationRetries: number;
	proxyResponses?: Map<string, InstanceAiConfirmRequest>;
	timeoutBreach: () => BuildTimeout | undefined;
	onTimeout: (breach: BuildTimeout) => Promise<never>;
	log: (message: string) => void;
	quietPolls?: number;
	pollIntervalMs?: number;
	/** Injectable pause between polls. Tests pass a no-op. */
	pause?: (ms: number) => Promise<unknown>;
}

/**
 * Wait until the thread is quiet: no running turn and no unanswered card, for
 * `quietPolls` polls in a row. Answers open cards on the way.
 *
 * A card at the retry cap stays unanswered, so the thread stays busy until a
 * budget fires. Instance AI does the same: its run never finishes.
 */
export async function waitForAssistantAgentActivity(
	config: AssistantAgentWaitConfig,
): Promise<void> {
	const quietPolls = config.quietPolls ?? ASSISTANT_AGENT_QUIET_POLLS;
	const pollIntervalMs = config.pollIntervalMs ?? ASSISTANT_AGENT_POLL_INTERVAL_MS;
	const pause = config.pause ?? delay;
	let quiet = 0;
	let sawActivity = false;

	while (true) {
		const breach = config.timeoutBreach();
		if (breach) await config.onTimeout(breach);

		const history = await config.client.getHistory(config.threadId);
		// Rebuild first, so a strategy that reads the transcript sees this turn.
		syncEventsFromHistory(config.events, history);

		let unanswered = 0;
		for (const suspension of history.openSuspensions) {
			const payload = isRecord(suspension.suspendPayload) ? suspension.suspendPayload : {};
			const requestId = requestIdOf(payload, suspension.toolCallId);
			if (config.approvedRequests.has(requestId)) continue;
			unanswered++;
			const retryCount = config.confirmationRetries.get(requestId) ?? 0;
			if (retryCount >= config.maxConfirmationRetries) continue;
			const event: CapturedEvent = {
				timestamp: Date.now(),
				type: 'confirmation-request',
				data: {
					type: 'confirmation-request',
					runId: suspension.runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { ...payload, requestId, toolCallId: suspension.toolCallId },
				},
			};
			try {
				const body = await config.confirmationStrategy(event);
				config.log(`[agents] Answering card ${requestId} with ${body.kind}`);
				await config.client.resume(suspension.runId, suspension.toolCallId, body);
				config.approvedRequests.add(requestId);
				config.proxyResponses?.set(requestId, body);
				config.confirmationRetries.delete(requestId);
				unanswered--;
			} catch (error: unknown) {
				config.confirmationRetries.set(requestId, retryCount + 1);
				config.log(
					`[agents] Failed to answer card ${requestId} (attempt ${String(retryCount + 1)}/${String(config.maxConfirmationRetries)}): ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		const busy = Boolean(history.activeExecutionId) || unanswered > 0;
		if (busy) {
			sawActivity = true;
			quiet = 0;
		} else if (sawActivity || executionMessagesSince(history.messages, config.sentAt).length > 0) {
			quiet++;
			if (quiet >= quietPolls) {
				config.log(`[agents] Thread ${config.threadId} is quiet`);
				// Instance AI rejects a turn that cannot run, so the build fails. The Agents runtime queues the
				// message first and the turn fails later, so report that failure here.
				const failure =
					failedTurnWithoutOutput(history.messages, config.sentAt) ??
					(await failedTurnWithoutMessage(config, history.messages));
				if (failure !== undefined) throw new Error(`Assistant agent turn failed: ${failure}`);
				return;
			}
		}
		await pause(pollIntervalMs);
	}
}

/** The card id the Instance AI code keys answers by. Cards without one use the tool call id. */
function requestIdOf(payload: Record<string, unknown>, toolCallId: string): string {
	return typeof payload.requestId === 'string' && payload.requestId
		? payload.requestId
		: toolCallId;
}

/**
 * The error of the latest execution since `since` when it failed and the turn
 * wrote no text or tool call. Undefined in every other case, so a turn that
 * fails part-way is graded on what it produced, like on Instance AI. A turn can
 * span more than one execution: the answer to a card starts a new one.
 */
export function failedTurnWithoutOutput(
	messages: AgentPersistedMessageDto[],
	since: number,
): string | undefined {
	const turnMessages = assistantMessagesSince(messages, since);
	const latest = turnMessages.at(-1);
	if (latest === undefined || !isFailedStatus(latest.executionStatus)) return undefined;
	if (turnMessages.some(hasOutput)) return undefined;
	return latest.executionError ?? 'unknown error';
}

function isFailedStatus(status: AgentExecutionStatus | undefined): boolean {
	return status === 'error' || status === 'interrupted';
}

function assistantMessagesSince(
	messages: AgentPersistedMessageDto[],
	since: number,
): AgentPersistedMessageDto[] {
	return messages.filter(
		(message) =>
			message.role === 'assistant' &&
			message.executionStatus !== undefined &&
			createdSince(message, since),
	);
}

function hasOutput(message: AgentPersistedMessageDto): boolean {
	return message.content.some(
		(part) => (part.type === 'text' && Boolean(part.text)) || part.type === 'tool-call',
	);
}

function createdSince(message: AgentPersistedMessageDto, since: number): boolean {
	return message.createdAt !== undefined && Date.parse(message.createdAt) >= since;
}

/**
 * The messages of the turns that started since `since`. An execution takes the
 * user message, so its id is on the user message also when the turn writes no reply.
 */
function executionMessagesSince(
	messages: AgentPersistedMessageDto[],
	since: number,
): AgentPersistedMessageDto[] {
	return messages.filter(
		(message) => message.executionId !== undefined && createdSince(message, since),
	);
}

/**
 * The history leaves out a failed execution that wrote nothing and has no
 * error text. Read the status of the latest such execution from the usage
 * route, which lists every execution.
 */
async function failedTurnWithoutMessage(
	config: AssistantAgentWaitConfig,
	messages: AgentPersistedMessageDto[],
): Promise<string | undefined> {
	const latestExecutionId = executionMessagesSince(messages, config.sentAt).at(-1)?.executionId;
	if (latestExecutionId === undefined) return undefined;
	const hasReply = messages.some(
		(message) => message.role === 'assistant' && message.executionId === latestExecutionId,
	);
	if (hasReply) return undefined;
	// An earlier execution of the turn (before a card) wrote output: grade it.
	if (assistantMessagesSince(messages, config.sentAt).some(hasOutput)) return undefined;
	const usage = await config.client.getUsage(config.threadId);
	const execution = usage.executions.find((entry) => entry.executionId === latestExecutionId);
	if (execution?.status !== 'error' && execution?.status !== 'interrupted') return undefined;
	return `the execution ended with status "${execution.status}" and no error message`;
}

/**
 * Replace the captured events with events rebuilt from the history. The
 * harness user-turn markers stay. The sort uses timestamps, so it expects the
 * harness and n8n to share one clock (true for local and CI runs).
 */
export function syncEventsFromHistory(
	events: CapturedEvent[],
	history: Pick<AgentChatMessagesResponse, 'messages'> &
		Partial<Pick<AgentChatMessagesResponse, 'openSuspensions' | 'activeExecutionId'>>,
): void {
	const markers = events.filter((event) => event.type === USER_TURN_EVENT);
	const settled = history.openSuspensions?.length === 0 && !history.activeExecutionId;
	const rebuilt = eventsFromHistory(history.messages, { settled });
	// Stable sort: on a tie the marker comes first.
	const merged = [...markers, ...rebuilt].sort((a, b) => a.timestamp - b.timestamp);
	events.length = 0;
	events.push(...merged);
}

/** Instance AI `run-finish` status for a settled Agents execution. Undefined while it still runs. */
function runFinishStatus(status: AgentExecutionStatus): string | undefined {
	switch (status) {
		case 'success':
			return 'completed';
		case 'cancelled':
			return 'cancelled';
		case 'error':
		case 'interrupted':
			return 'error';
		case 'running':
		case 'awaiting':
			return undefined;
	}
}

/**
 * Rebuild Instance AI events from the assistant messages of live turns. A
 * message without `executionStatus` did not come from an execution of this
 * run (seeded history), so it is skipped: the seeded transcript covers it.
 *
 * On the Agents runtime the answer to a card starts a new execution. Instance AI
 * resumes the same run, so one user request gives one run-start and one
 * run-finish. To match it, an execution that stopped at a card gets no
 * run-finish, and the execution after it (its continuation) gets no run-start.
 * Each execution keeps its own run id, so the usage records still join by run id.
 * The runtime admits no new user message while a card is open, so the next
 * execution without a user message before it is the continuation.
 *
 * `settled`: the thread has no open card and no running execution. Then a
 * suspended execution without a continuation in the history gets its
 * run-finish: the continuation ended without a message.
 */
export function eventsFromHistory(
	messages: AgentPersistedMessageDto[],
	options: { settled?: boolean } = {},
): CapturedEvent[] {
	const events: CapturedEvent[] = [];
	// The deferred run-finish of the last execution when it stopped at a card.
	let pendingFinish: (() => void) | undefined;
	for (const message of messages) {
		if (message.role === 'user') {
			// A new user request: the turn before it is over.
			pendingFinish?.();
			pendingFinish = undefined;
			continue;
		}
		if (message.role !== 'assistant' || message.executionStatus === undefined) continue;
		const continuation = pendingFinish !== undefined;
		pendingFinish = undefined;
		const runId = message.executionId ?? message.id;
		const startedAt = firstTimestamp(message);
		const push = (timestamp: number, type: string, payload: Record<string, unknown>) =>
			events.push({
				timestamp,
				type,
				data: { type, runId, agentId: ORCHESTRATOR_AGENT_ID, payload },
			});

		if (!continuation) push(startedAt, 'run-start', { messageId: message.id });
		let last = startedAt;
		for (const part of message.content) {
			const at = part.startTime ?? last;
			last = Math.max(last, part.endTime ?? at);
			if (part.type === 'text' && part.text) {
				push(at, 'text-delta', { text: part.text });
				continue;
			}
			if (part.type !== 'tool-call' || !part.toolCallId) continue;
			const toolCallId = part.toolCallId;
			// The Assistant agent runs most tools through the tool catalog's `call_tool`.
			// The outcome parser keys on the real tool, so record that one. The result
			// is already the real tool's output.
			const { toolName, args } = unwrapToolCatalogCall(
				part.toolName ?? '',
				isRecord(part.input) ? part.input : {},
			);
			push(at, 'tool-call', { toolCallId, toolName, args });
			if (isRecord(part.suspendPayload)) {
				push(at, 'confirmation-request', {
					...part.suspendPayload,
					requestId: requestIdOf(part.suspendPayload, toolCallId),
					toolCallId,
					toolName,
				});
			}
			if (part.error) {
				push(part.endTime ?? at, 'tool-error', { toolCallId, toolName, error: part.error });
			} else if (part.output !== undefined) {
				push(part.endTime ?? at, 'tool-result', { toolCallId, toolName, result: part.output });
			}
		}
		const status = runFinishStatus(message.executionStatus);
		// Instance AI sends a run-level `error` event for a failed run. The failure summary
		// and the provider-outage check read it.
		if (status === 'error' && message.executionError) {
			push(last, 'error', { content: message.executionError });
		}
		const finishedAt = last;
		const finish = (finishStatus: string) =>
			push(finishedAt, 'run-finish', {
				status: finishStatus,
				...(message.executionError ? { error: message.executionError } : {}),
			});
		// A chat turn that stops at a card is saved as 'success' ('awaiting' for tasks).
		const suspended =
			(status === 'completed' || message.executionStatus === 'awaiting') &&
			message.content.some((part) => part.type === 'tool-call' && isRecord(part.suspendPayload));
		if (suspended) {
			pendingFinish = () => finish('completed');
		} else if (status) {
			finish(status);
		}
	}
	if (options.settled) pendingFinish?.();
	return events;
}

function firstTimestamp(message: AgentPersistedMessageDto): number {
	if (message.createdAt) {
		const parsed = Date.parse(message.createdAt);
		if (!Number.isNaN(parsed)) return parsed;
	}
	const first = message.content.find((part) => part.startTime !== undefined);
	return first?.startTime ?? Date.now();
}

/**
 * Express Agents thread usage in the run-debug shape, so the transcript headings
 * and token totals work on both runtimes. One record per turn, keyed by the
 * execution id that the rebuilt events carry as `runId`. Each record has one
 * synthetic step with the turn total (its delegated runs included): the Agents runtime does
 * not report LLM calls one by one, so step counts are turn counts here, and
 * the records carry no prompts and no workflow code.
 */
export function runDebugFromUsage(
	threadId: string,
	usage: AgentThreadUsageResponse,
): InstanceAiRunDebugResponse[] {
	return usage.executions.map((execution) => {
		const startedAt = execution.startedAt ? Date.parse(execution.startedAt) : Number.NaN;
		return {
			threadId,
			runId: execution.executionId,
			startedAt: Number.isNaN(startedAt) ? 0 : startedAt,
			label: 'agents-usage',
			steps: [{ stepNumber: 1, output: usageStepOutput(execution.total, execution.model) }],
			workflowCode: [],
		};
	});
}

/** The AI SDK usage shape that `usageTokens` reads. */
function usageStepOutput(
	usage: AgentExecutionUsage,
	model: string | null,
): Record<string, unknown> {
	return {
		usage: {
			inputTokens: usage.promptTokens ?? 0,
			outputTokens: usage.completionTokens ?? 0,
			inputTokenDetails: {
				cacheReadTokens: usage.cacheReadTokens ?? 0,
				cacheWriteTokens: usage.cacheWriteTokens ?? 0,
			},
		},
		...(usage.cost !== null ? { costUsd: usage.cost } : {}),
		...(model ? { model } : {}),
	};
}
