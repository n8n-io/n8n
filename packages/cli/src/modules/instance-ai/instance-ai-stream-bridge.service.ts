import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type { InstanceAiEvent, ChatHubPushMessage } from '@n8n/api-types';

import { Push } from '@/push';
import { InProcessEventBus } from './event-bus/in-process-event-bus';

interface StoredEvent {
	id: number;
	event: InstanceAiEvent;
}

/**
 * Bridges Instance AI events to Chat Hub push events.
 *
 * When an Instance AI run is started via Chat Hub's provider routing,
 * this service subscribes to the in-process event bus for the thread
 * and translates Instance AI domain events into Chat Hub push events
 * that the unified frontend can consume.
 */
@Service()
export class InstanceAiStreamBridgeService {
	private readonly activeSubscriptions = new Map<string, () => void>();

	private sequenceCounters = new Map<string, number>();

	constructor(
		private readonly logger: Logger,
		private readonly push: Push,
		private readonly eventBus: InProcessEventBus,
	) {
		this.logger = this.logger.scoped('instance-ai');
	}

	/**
	 * Start bridging events for a thread to a user's push connections.
	 * The bridge translates Instance AI events into Chat Hub push format.
	 */
	startBridge(threadId: string, userId: string, sessionId: string, messageId: string): void {
		// Clean up any existing bridge for this thread
		this.stopBridge(threadId);

		this.sequenceCounters.set(threadId, 0);

		const unsubscribe = this.eventBus.subscribe(threadId, (storedEvent: StoredEvent) => {
			const pushMessages = this.translateEvent(storedEvent.event, sessionId, messageId, threadId);

			for (const msg of pushMessages) {
				this.push.sendToUsers(msg, [userId]);
			}
		});

		this.activeSubscriptions.set(threadId, unsubscribe);
	}

	/**
	 * Stop bridging events for a thread.
	 */
	stopBridge(threadId: string): void {
		const unsub = this.activeSubscriptions.get(threadId);
		if (unsub) {
			unsub();
			this.activeSubscriptions.delete(threadId);
			this.sequenceCounters.delete(threadId);
		}
	}

	private nextSequence(threadId: string): number {
		const current = this.sequenceCounters.get(threadId) ?? 0;
		const next = current + 1;
		this.sequenceCounters.set(threadId, next);
		return next;
	}

	private translateEvent(
		event: InstanceAiEvent,
		sessionId: string,
		messageId: string,
		threadId: string,
	): ChatHubPushMessage[] {
		const baseMetadata = {
			sessionId,
			messageId,
			sequenceNumber: this.nextSequence(threadId),
			timestamp: Date.now(),
		};

		switch (event.type) {
			case 'text-delta':
				return [
					{
						type: 'chatHubStreamChunk',
						data: {
							...baseMetadata,
							content: event.payload.text,
						},
					},
				];

			case 'agent-spawned':
				return [
					{
						type: 'chatHubInstanceAiAgentSpawned',
						data: {
							...baseMetadata,
							agentId: event.agentId,
							role: event.payload.role,
							parentAgentId: event.payload.parentId,
						},
					},
				];

			case 'agent-completed':
				return [
					{
						type: 'chatHubInstanceAiAgentCompleted',
						data: {
							...baseMetadata,
							agentId: event.agentId,
							status: event.payload.error ? 'error' : 'completed',
						},
					},
				];

			case 'tool-call':
				return [
					{
						type: 'chatHubInstanceAiToolCall',
						data: {
							...baseMetadata,
							agentId: event.agentId,
							toolName: event.payload.toolName,
							toolCallId: event.payload.toolCallId,
						},
					},
				];

			case 'tool-result':
				return [
					{
						type: 'chatHubInstanceAiToolResult',
						data: {
							...baseMetadata,
							toolCallId: event.payload.toolCallId,
							status: 'completed',
							result:
								typeof event.payload.result === 'string'
									? event.payload.result.slice(0, 500)
									: undefined,
						},
					},
				];

			case 'tool-error':
				return [
					{
						type: 'chatHubInstanceAiToolResult',
						data: {
							...baseMetadata,
							toolCallId: event.payload.toolCallId,
							status: 'error',
							result: event.payload.error,
						},
					},
				];

			case 'run-start':
				return [
					{
						type: 'chatHubStreamBegin',
						data: {
							...baseMetadata,
							previousMessageId: null,
							retryOfMessageId: null,
							executionId: null,
						},
					},
				];

			case 'run-finish':
				return [
					{
						type: 'chatHubStreamEnd',
						data: {
							...baseMetadata,
							status: event.payload.status === 'error' ? 'error' : 'success',
						},
					},
					{
						type: 'chatHubExecutionEnd',
						data: {
							sessionId,
							status: event.payload.status === 'error' ? 'error' : 'success',
							timestamp: Date.now(),
						},
					},
				];

			case 'error':
				return [
					{
						type: 'chatHubStreamError',
						data: {
							...baseMetadata,
							error: event.payload.content ?? 'An error occurred',
						},
					},
				];

			default:
				// Other Instance AI events (reasoning-delta, confirmation-request,
				// tasks-update, filesystem-request) don't have Chat Hub equivalents yet
				return [];
		}
	}
}
