import type { InstanceAiEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { StoredEvent } from '@n8n/instance-ai';
import { OperationalError } from 'n8n-workflow';

import { InProcessEventBus } from '@/modules/instance-ai/event-bus/in-process-event-bus';
import { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';

import { SlackWebClient } from './slack-web-client';
import type {
	SlackChunk,
	SlackTaskStatus,
	StreamTarget,
	StreamTransport,
} from './slack-web-client';
import { labelForTool } from './tool-labels';

type TasksUpdateEvent = Extract<InstanceAiEvent, { type: 'tasks-update' }>;
type ToolInputStartEvent = Extract<InstanceAiEvent, { type: 'tool-input-start' }>;
type ToolCallEvent = Extract<InstanceAiEvent, { type: 'tool-call' }>;
type StatusEvent = Extract<InstanceAiEvent, { type: 'status' }>;
type ErrorEvent = Extract<InstanceAiEvent, { type: 'error' }>;
type RunFinishEvent = Extract<InstanceAiEvent, { type: 'run-finish' }>;
export type ConfirmationRequestEvent = Extract<InstanceAiEvent, { type: 'confirmation-request' }>;
type TaskItemStatus = TasksUpdateEvent['payload']['tasks']['tasks'][number]['status'];

export interface SlackStreamRendererTarget {
	botToken: string;
	channelId: string;
	threadTs: string;
	recipientUserId: string;
	recipientTeamId: string;
}

export type SlackConfirmationRequestHandler = (
	threadId: string,
	event: ConfirmationRequestEvent,
	target: SlackStreamRendererTarget,
) => Promise<void>;

const FLUSH_INTERVAL_MS = 1000;
const IDLE_CHECK_INTERVAL_MS = 5000;
const HEARTBEAT_IDLE_MS = 25000;
const HEARTBEAT_DETAIL = 'Still working, this step is a big one';
const CONFIRMATION_TASK_ID = 'confirmation-request';
const CONFIRMATION_TASK_TITLE = 'Waiting for your go-ahead';
const PLAN_TITLE = 'Plan';
const RUN_ERROR_MESSAGE =
	'I hit a problem and stopped. Steps marked done above did happen; nothing else was changed.';
const OPEN_FAILURE_MESSAGE =
	"I couldn't start a live progress stream for this thread, so you won't see step-by-step updates here.";

interface TrackedTask {
	title: string;
	status: SlackTaskStatus;
	detail?: string;
}

function mapTaskStatus(status: TaskItemStatus): SlackTaskStatus {
	switch (status) {
		case 'todo':
			return 'pending';
		case 'in_progress':
			return 'in_progress';
		case 'done':
			return 'complete';
		case 'failed':
		case 'cancelled':
			return 'error';
	}
}

function toStreamTarget(target: SlackStreamRendererTarget): StreamTarget {
	return {
		channel: target.channelId,
		threadTs: target.threadTs,
		recipientUserId: target.recipientUserId,
		recipientTeamId: target.recipientTeamId,
	};
}

function slackErrorCode(error: unknown): string | undefined {
	if (!(error instanceof OperationalError)) return undefined;
	const code = error.tags.slackErrorCode;
	return typeof code === 'string' ? code : undefined;
}

interface StreamSessionDeps {
	webClient: SlackWebClient;
	eventBus: InProcessEventBus;
	instanceAiService: InstanceAiService;
	logger: Logger;
	getConfirmationHandler: () => SlackConfirmationRequestHandler | undefined;
	onClosed: () => void;
}

/**
 * Owns one thread's live Slack stream: subscribes to the Instance AI event
 * bus, translates events into `SlackChunk`s, and manages the transport's
 * lifecycle (reopen on a stale-stream error, idle-debounced close, cancel on
 * user-initiated stop). All outbound Slack calls for this thread go through a
 * single serialized queue so a slow in-flight `append()` can never be
 * overtaken by a later one — the flush timer, tool events and status updates
 * all enqueue onto it rather than firing independently.
 */
class StreamSession {
	private transport: StreamTransport;

	private unsubscribe: (() => void) | undefined;

	private flushTimer: NodeJS.Timeout | undefined;

	private idleTimer: NodeJS.Timeout | undefined;

	private heartbeatTimer: NodeJS.Timeout | undefined;

	private queue: Promise<void> = Promise.resolve();

	private textBuffer = '';

	private markdownFlushCount = 0;

	private closed = false;

	private hasPlan = false;

	private planEmitted = false;

	private readonly tasks = new Map<string, TrackedTask>();

	private lastActiveTaskId: string | undefined;

	private lastActiveTitle: string | undefined;

	constructor(
		private readonly threadId: string,
		private readonly target: SlackStreamRendererTarget,
		transport: StreamTransport,
		private readonly deps: StreamSessionDeps,
	) {
		this.transport = transport;
	}

	start(): void {
		this.unsubscribe = this.deps.eventBus.subscribe(this.threadId, (stored) =>
			this.handleStoredEvent(stored),
		);
		this.flushTimer = setInterval(() => {
			this.enqueue(async () => await this.flushTextIfAny());
		}, FLUSH_INTERVAL_MS);
		this.resetHeartbeat();
	}

	private handleStoredEvent(stored: StoredEvent): void {
		if (this.closed) return;
		this.resetHeartbeat();

		const event = stored.event;
		switch (event.type) {
			case 'tasks-update':
				this.onTasksUpdate(event);
				break;
			case 'tool-input-start':
				this.onToolStart(event);
				break;
			case 'tool-call':
				this.onToolCall(event);
				break;
			case 'tool-result':
				this.onToolEnd(event.payload.toolCallId, 'complete');
				break;
			case 'tool-error':
				this.onToolEnd(event.payload.toolCallId, 'error', event.payload.error);
				break;
			case 'tool-interrupted':
				this.onToolEnd(event.payload.toolCallId, 'error', event.payload.error);
				break;
			case 'text-delta':
				this.textBuffer += event.payload.text;
				break;
			case 'status':
				this.onStatus(event);
				break;
			case 'error':
				this.onError(event);
				break;
			case 'confirmation-request':
				this.onConfirmationRequest(event);
				break;
			case 'run-finish':
				this.onRunFinish(event);
				break;
			case 'run-start':
				this.hasPlan = false;
				break;
			default:
				break;
		}
	}

	private onTasksUpdate(event: TasksUpdateEvent): void {
		this.hasPlan = true;
		const chunks: SlackChunk[] = [];
		if (!this.planEmitted) {
			this.planEmitted = true;
			chunks.push({ type: 'plan_update', title: PLAN_TITLE });
		}

		for (const task of event.payload.tasks.tasks) {
			const status = mapTaskStatus(task.status);
			const previous = this.tasks.get(task.id);
			if (
				previous &&
				previous.status === status &&
				previous.title === task.description &&
				previous.detail === task.detail
			) {
				continue;
			}

			this.tasks.set(task.id, { title: task.description, status, detail: task.detail });
			this.trackActiveTask(task.id, task.description, status);
			chunks.push({
				type: 'task_update',
				id: task.id,
				title: task.description,
				status,
				details: task.detail,
			});
		}

		if (chunks.length > 0) this.enqueue(async () => await this.send(chunks));
	}

	private onToolStart(event: ToolInputStartEvent): void {
		this.setToolTask(event.payload.toolCallId, labelForTool(event.payload.toolName));
	}

	private onToolCall(event: ToolCallEvent): void {
		this.setToolTask(
			event.payload.toolCallId,
			labelForTool(event.payload.toolName, event.payload.args),
		);
	}

	private setToolTask(toolCallId: string, title: string): void {
		if (this.hasPlan) return;
		this.tasks.set(toolCallId, { title, status: 'in_progress' });
		this.trackActiveTask(toolCallId, title, 'in_progress');
		this.enqueue(
			async () =>
				await this.send([{ type: 'task_update', id: toolCallId, title, status: 'in_progress' }]),
		);
	}

	private onToolEnd(toolCallId: string, status: SlackTaskStatus, error?: string): void {
		if (this.hasPlan) return;
		const existing = this.tasks.get(toolCallId);
		if (!existing) return;

		this.tasks.set(toolCallId, { ...existing, status });
		this.trackActiveTask(toolCallId, existing.title, status);

		const chunk: SlackChunk =
			error === undefined
				? { type: 'task_update', id: toolCallId, title: existing.title, status }
				: { type: 'task_update', id: toolCallId, title: existing.title, status, details: error };
		this.enqueue(async () => await this.send([chunk]));
	}

	private trackActiveTask(id: string, title: string, status: SlackTaskStatus): void {
		if (status === 'in_progress') {
			this.lastActiveTaskId = id;
			this.lastActiveTitle = title;
		} else if (this.lastActiveTaskId === id) {
			this.lastActiveTaskId = undefined;
			this.lastActiveTitle = undefined;
		}
	}

	private onStatus(event: StatusEvent): void {
		this.enqueue(async () => {
			try {
				await this.deps.webClient.setStatus(this.target.botToken, {
					channelId: this.target.channelId,
					threadTs: this.target.threadTs,
					status: event.payload.message,
				});
			} catch (error) {
				this.deps.logger.error('Failed to set Slack assistant status', {
					threadId: this.threadId,
					error,
				});
			}
		});
	}

	private onError(event: ErrorEvent): void {
		this.enqueue(
			async () =>
				await this.send([this.markdownChunk(`Ran into a problem: ${event.payload.content}`)]),
		);
	}

	private onConfirmationRequest(event: ConfirmationRequestEvent): void {
		const handler = this.deps.getConfirmationHandler();
		if (handler) {
			void handler(this.threadId, event, this.target).catch((error: unknown) => {
				this.deps.logger.error('onConfirmationRequest handler failed', {
					threadId: this.threadId,
					error,
				});
			});
		}

		this.enqueue(
			async () =>
				await this.send([
					{
						type: 'task_update',
						id: CONFIRMATION_TASK_ID,
						title: CONFIRMATION_TASK_TITLE,
						status: 'pending',
					},
				]),
		);
	}

	private onRunFinish(event: RunFinishEvent): void {
		if (event.payload.status === 'error') {
			this.enqueue(async () => await this.flushTextIfAny());
			this.enqueue(async () => await this.send([this.markdownChunk(RUN_ERROR_MESSAGE)]));
		}
		this.scheduleIdleCheck();
	}

	private markdownChunk(text: string): SlackChunk {
		const prefixed = this.markdownFlushCount > 0 ? `\n\n${text}` : text;
		this.markdownFlushCount += 1;
		return { type: 'markdown_text', text: prefixed };
	}

	private async flushTextIfAny(): Promise<void> {
		if (!this.textBuffer) return;
		const text = this.textBuffer;
		this.textBuffer = '';
		await this.send([this.markdownChunk(text)]);
	}

	private enqueue(fn: () => Promise<void>): void {
		this.queue = this.queue.then(fn, fn);
	}

	private async send(chunks: SlackChunk[]): Promise<void> {
		if (this.closed) return;
		try {
			await this.transport.append(chunks);
		} catch (error) {
			await this.handleSendError(error);
		}
	}

	private async handleSendError(error: unknown): Promise<void> {
		const code = slackErrorCode(error);
		if (code === 'stopped_by_user') {
			await this.handleStoppedByUser();
			return;
		}
		if (code === 'message_not_in_streaming_state') {
			await this.reopenTransport();
			return;
		}
		this.deps.logger.error('Failed to append Slack stream chunk', {
			threadId: this.threadId,
			error,
		});
	}

	private async handleStoppedByUser(): Promise<void> {
		this.cleanup();
		try {
			await this.deps.instanceAiService.routeCancelRun(this.threadId);
		} catch (error) {
			this.deps.logger.error('Failed to route cancel-run after Slack stopped the stream', {
				threadId: this.threadId,
				error,
			});
		}
	}

	private async reopenTransport(): Promise<void> {
		try {
			this.transport = await this.deps.webClient.openStream(
				this.target.botToken,
				toStreamTarget(this.target),
				'native',
			);
		} catch (error) {
			this.deps.logger.error('Failed to reopen Slack stream transport', {
				threadId: this.threadId,
				error,
			});
		}
	}

	private scheduleIdleCheck(): void {
		if (this.closed) return;
		if (this.idleTimer) clearTimeout(this.idleTimer);
		this.idleTimer = setTimeout(() => {
			void this.checkIdle();
		}, IDLE_CHECK_INTERVAL_MS);
	}

	private async checkIdle(): Promise<void> {
		if (this.closed) return;
		const status = this.deps.instanceAiService.getThreadStatus(this.threadId);
		const idle = !status.hasActiveRun && !status.isSuspended && status.backgroundTasks.length === 0;
		if (!idle) {
			this.scheduleIdleCheck();
			return;
		}

		this.cleanup();
		try {
			await this.transport.close();
		} catch (error) {
			this.deps.logger.error('Failed to close Slack stream transport', {
				threadId: this.threadId,
				error,
			});
		}
	}

	private resetHeartbeat(): void {
		if (this.closed) return;
		if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
		this.heartbeatTimer = setTimeout(() => {
			this.fireHeartbeat();
		}, HEARTBEAT_IDLE_MS);
	}

	private fireHeartbeat(): void {
		if (this.closed) return;
		const taskId = this.lastActiveTaskId;
		const title = this.lastActiveTitle;
		if (taskId !== undefined && title !== undefined) {
			this.enqueue(
				async () =>
					await this.send([
						{
							type: 'task_update',
							id: taskId,
							title,
							status: 'in_progress',
							details: HEARTBEAT_DETAIL,
						},
					]),
			);
		}
		this.resetHeartbeat();
	}

	private cleanup(): void {
		if (this.closed) return;
		this.closed = true;
		if (this.flushTimer) clearInterval(this.flushTimer);
		if (this.idleTimer) clearTimeout(this.idleTimer);
		if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
		this.unsubscribe?.();
		this.deps.onClosed();
	}
}

/**
 * Turns an Instance AI thread's live event bus activity into Slack Thinking
 * Steps. One `attach()` call opens a stream transport for the thread and
 * keeps it updated until the thread goes fully idle (no active run,
 * suspended state, or background tasks) — detached tasks and auto
 * follow-up runs keep the same stream open across `run-finish` events.
 */
@Service()
export class SlackStreamRenderer {
	private readonly sessions = new Map<string, StreamSession>();

	private readonly attaching = new Set<string>();

	onConfirmationRequest: SlackConfirmationRequestHandler | undefined;

	constructor(
		private readonly webClient: SlackWebClient,
		private readonly eventBus: InProcessEventBus,
		private readonly instanceAiService: InstanceAiService,
		private readonly logger: Logger,
	) {}

	async attach(threadId: string, target: SlackStreamRendererTarget): Promise<void> {
		if (this.attaching.has(threadId)) return;
		this.attaching.add(threadId);

		let transport: StreamTransport;
		try {
			transport = await this.webClient.openStream(
				target.botToken,
				toStreamTarget(target),
				'native',
			);
		} catch (error) {
			this.attaching.delete(threadId);
			this.logger.error('Failed to open Slack stream transport', { threadId, error });
			await this.webClient.postMessage(target.botToken, {
				channel: target.channelId,
				threadTs: target.threadTs,
				text: OPEN_FAILURE_MESSAGE,
			});
			return;
		}

		const session = new StreamSession(threadId, target, transport, {
			webClient: this.webClient,
			eventBus: this.eventBus,
			instanceAiService: this.instanceAiService,
			logger: this.logger,
			getConfirmationHandler: () => this.onConfirmationRequest,
			onClosed: () => {
				this.sessions.delete(threadId);
				this.attaching.delete(threadId);
			},
		});
		this.sessions.set(threadId, session);
		session.start();
	}
}
