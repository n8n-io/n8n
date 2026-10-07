// ---------------------------------------------------------------------------
// Assistant v2 (Agents runtime) support for the build harness — ASS-1573 PoC.
//
// Assistant v2 has no thread event log: hidden follow-up turns stream to no
// client. The harness polls the thread instead, answers open approval cards
// through `/chat/resume`, and rebuilds the legacy event shapes the outcome,
// transcript and metrics code read from the persisted Agents history.
// ---------------------------------------------------------------------------

import type {
	AgentChatMessagesResponse,
	AgentPersistedMessageDto,
	InstanceAiConfirmRequest,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { setTimeout as delay } from 'node:timers/promises';

import type { BuildTimeout, CapturedEvent } from '../types';
import { USER_TURN_EVENT } from '../types';

const ORCHESTRATOR_AGENT_ID = 'agent-001';
/** Consecutive idle polls before a turn counts as finished. */
const QUIET_POLLS = 3;
const POLL_INTERVAL_MS = 1_500;

export interface AssistantV2Client {
	getThreadStatus(threadId: string): Promise<{ hasActiveRun: boolean; isSuspended: boolean }>;
	getAssistantHistory(threadId: string): Promise<AgentChatMessagesResponse>;
	resumeAssistantRun(runId: string, toolCallId: string, resumeData: unknown): Promise<void>;
	cancelRun(threadId: string): Promise<void>;
}

export interface AssistantV2WaitConfig {
	client: AssistantV2Client;
	threadId: string;
	events: CapturedEvent[];
	approvedRequests: Set<string>;
	/** When the user message of this turn was sent. */
	sentAt: number;
	confirmationStrategy: (
		event: CapturedEvent,
	) => InstanceAiConfirmRequest | Promise<InstanceAiConfirmRequest>;
	proxyResponses?: Map<string, InstanceAiConfirmRequest>;
	timeoutBreach: () => BuildTimeout | undefined;
	onTimeout: (breach: BuildTimeout) => Promise<never>;
	log: (message: string) => void;
}

/**
 * Wait until the thread is quiet: no running or queued turn, no open card.
 * Answers open cards with the confirmation strategy on the way.
 */
export async function waitForAssistantV2Activity(config: AssistantV2WaitConfig): Promise<void> {
	let quiet = 0;
	let sawActivity = false;
	const retries = new Map<string, number>();

	while (true) {
		const breach = config.timeoutBreach();
		if (breach) await config.onTimeout(breach);

		const [status, history] = await Promise.all([
			config.client.getThreadStatus(config.threadId),
			config.client.getAssistantHistory(config.threadId),
		]);
		syncEventsFromHistory(config.events, history);

		for (const suspension of history.openSuspensions) {
			const payload = isRecord(suspension.suspendPayload) ? suspension.suspendPayload : {};
			const requestId =
				typeof payload.requestId === 'string' ? payload.requestId : suspension.toolCallId;
			if (config.approvedRequests.has(requestId) || (retries.get(requestId) ?? 0) >= 5) continue;
			const event: CapturedEvent = {
				timestamp: Date.now(),
				type: 'confirmation-request',
				data: {
					type: 'confirmation-request',
					runId: suspension.runId,
					payload: { ...payload, requestId, toolCallId: suspension.toolCallId },
				},
			};
			try {
				const body = await config.confirmationStrategy(event);
				config.log(`[v2] Answering card ${requestId} with ${body.kind}`);
				await config.client.resumeAssistantRun(suspension.runId, suspension.toolCallId, body);
				config.approvedRequests.add(requestId);
				config.proxyResponses?.set(requestId, body);
			} catch (error) {
				retries.set(requestId, (retries.get(requestId) ?? 0) + 1);
				config.log(
					`[v2] Failed to answer card ${requestId}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		const busy =
			status.hasActiveRun ||
			status.isSuspended ||
			history.openSuspensions.length > 0 ||
			Boolean(history.activeExecutionId);
		if (busy) {
			sawActivity = true;
			quiet = 0;
		} else if (sawActivity || hasAssistantReplySince(history.messages, config.sentAt)) {
			quiet++;
			if (quiet >= QUIET_POLLS) {
				config.log(`[v2] Thread ${config.threadId} is quiet`);
				return;
			}
		}
		await delay(POLL_INTERVAL_MS);
	}
}

function hasAssistantReplySince(messages: AgentPersistedMessageDto[], since: number): boolean {
	return messages.some(
		(message) =>
			message.role === 'assistant' &&
			message.createdAt !== undefined &&
			Date.parse(message.createdAt) >= since,
	);
}

/**
 * Replace the captured events with legacy-shaped events rebuilt from the
 * Agents history. User-turn markers stay, ordered by time.
 */
export function syncEventsFromHistory(
	events: CapturedEvent[],
	history: AgentChatMessagesResponse,
): void {
	const markers = events.filter((event) => event.type === USER_TURN_EVENT);
	const rebuilt = eventsFromHistory(history.messages);
	const merged = [...markers, ...rebuilt].sort((a, b) => a.timestamp - b.timestamp);
	events.length = 0;
	events.push(...merged);
}

export function eventsFromHistory(messages: AgentPersistedMessageDto[]): CapturedEvent[] {
	const events: CapturedEvent[] = [];
	for (const message of messages) {
		if (message.role !== 'assistant') continue;
		const runId = message.executionId ?? message.id;
		const startedAt = firstTimestamp(message);
		const push = (timestamp: number, type: string, payload: Record<string, unknown>) =>
			events.push({
				timestamp,
				type,
				data: { type, runId, agentId: ORCHESTRATOR_AGENT_ID, payload },
			});

		push(startedAt, 'run-start', { messageId: message.id });
		let last = startedAt;
		for (const part of message.content) {
			const at = part.startTime ?? last;
			last = Math.max(last, part.endTime ?? at);
			if (part.type === 'text' && part.text) {
				push(at, 'text-delta', { text: part.text });
				continue;
			}
			if (part.type !== 'tool-call' || !part.toolCallId) continue;
			const toolName = part.toolName ?? '';
			const args = isRecord(part.input) ? part.input : {};
			push(at, 'tool-call', { toolCallId: part.toolCallId, toolName, args });
			if (isRecord(part.suspendPayload)) {
				push(at, 'confirmation-request', {
					...part.suspendPayload,
					toolCallId: part.toolCallId,
					toolName,
				});
			}
			if (part.error) {
				push(part.endTime ?? at, 'tool-error', {
					toolCallId: part.toolCallId,
					toolName,
					error: part.error,
				});
			} else if (part.output !== undefined) {
				push(part.endTime ?? at, 'tool-result', {
					toolCallId: part.toolCallId,
					toolName,
					result: part.output,
				});
			}
		}
		const status = message.executionStatus;
		if (status && status !== 'running') {
			push(last, 'run-finish', { status: status === 'success' ? 'completed' : status });
		}
	}
	return events;
}

function firstTimestamp(message: AgentPersistedMessageDto): number {
	if (message.createdAt) return Date.parse(message.createdAt);
	const first = message.content.find((part) => part.startTime !== undefined);
	return first?.startTime ?? Date.now();
}
