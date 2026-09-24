import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { InstanceSettings } from 'n8n-core';

import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';

import type { initSseStream } from './agent-sse-stream';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';

type QueueStreamEvent = PubSubCommandMap['relay-agent-queued-chat'];

@Service()
export class AgentQueuedPreviewStreamService {
	private static readonly RECOVERY_GRACE_MS = 10_000;
	private static readonly RELAY_HEARTBEAT_MS = 5_000;
	private static readonly RELAY_TIMEOUT_MS = 30_000;

	private readonly listeners = new Map<
		string,
		{
			accepted: boolean;
			sequence: number;
			recoveryDeadline?: number;
			relayDeadline?: number;
			send: (event: AgentSseEvent) => void;
			close: () => void;
		}
	>();
	private readonly stopRelays = new Set<() => void>();

	constructor(
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
		private readonly repository: AgentMessageQueueRepository,
		private readonly logger: Logger,
		subscriber: Subscriber,
	) {
		if (!this.instanceSettings.isMultiMain) return;
		subscriber.getClient().on('close', () => {
			for (const listener of this.listeners.values()) listener.close();
		});
		this.publisher.getClient().on('close', () => {
			for (const stop of this.stopRelays) stop();
		});
	}

	subscribe(queueId: string, stream: ReturnType<typeof initSseStream>) {
		const done = createDeferredPromise();
		const close = () => {
			this.listeners.delete(queueId);
			stream.abortSignal.removeEventListener('abort', close);
			stream.close();
			done.resolve();
		};
		const listener = { accepted: false, sequence: 0, send: stream.send, close };
		this.listeners.set(queueId, listener);
		stream.abortSignal.addEventListener('abort', close, { once: true });
		if (stream.abortSignal.aborted) close();
		return {
			done: done.promise,
			close,
			accepted: () => {
				listener.accepted = true;
			},
		};
	}

	createSender(queueId: string) {
		let sequence = 0;
		let pending = Promise.resolve();
		let failed = false;
		let heartbeat: NodeJS.Timeout | undefined;
		const stopped = createDeferredPromise();
		const stop = () => {
			failed = true;
			clearInterval(heartbeat);
			this.listeners.get(queueId)?.close();
			stopped.resolve();
		};
		if (this.instanceSettings.isMultiMain) {
			this.stopRelays.add(stop);
			if (this.publisher.getClient().status !== 'ready') stop();
		}
		const send = (event: QueueStreamEvent['event']) => {
			if (failed) return;
			const payload = { queueId, sequence: ++sequence, event };
			this.handleRelay(payload);
			if (!this.instanceSettings.isMultiMain) return;
			pending = pending
				.then(async () => {
					if (!failed)
						await this.publisher.publishCommand({ command: 'relay-agent-queued-chat', payload });
				})
				.catch((error: unknown) => {
					stop();
					this.logger.warn('Failed to relay queued agent output', { queueId, error });
				});
		};
		if (this.instanceSettings.isMultiMain && !failed) {
			heartbeat = setInterval(
				() => send(undefined),
				AgentQueuedPreviewStreamService.RELAY_HEARTBEAT_MS,
			);
			heartbeat.unref();
		}
		return {
			send: (event: AgentSseEvent) => send(event),
			close: async () => {
				clearInterval(heartbeat);
				send(null);
				// Redis can retain an in-flight publish while disconnected. It must not stall the queue.
				await Promise.race([pending, stopped.promise]);
				this.stopRelays.delete(stop);
			},
		};
	}

	@OnPubSubEvent('relay-agent-queued-chat', { instanceType: 'main' })
	handleRelay({ queueId, sequence, event }: QueueStreamEvent): void {
		const listener = this.listeners.get(queueId);
		if (!listener || sequence <= listener.sequence) return;
		if (sequence !== listener.sequence + 1 || event === null) {
			listener.close();
			return;
		}
		listener.sequence = sequence;
		listener.recoveryDeadline = undefined;
		listener.relayDeadline = Date.now() + AgentQueuedPreviewStreamService.RELAY_TIMEOUT_MS;
		if (event !== undefined) listener.send(event);
	}

	/** A lost producer cannot send EOF. Let the client recover from recorded history. */
	async closeSettledStreams(): Promise<void> {
		for (const [id, listener] of this.listeners) {
			if (!listener.accepted) continue;
			const item = await this.repository.findDeliveryState(id);
			if (item && (!item.execution || item.execution.status === 'running')) {
				listener.recoveryDeadline = undefined;
				if (item.execution && this.instanceSettings.isMultiMain) {
					listener.relayDeadline ??= Date.now() + AgentQueuedPreviewStreamService.RELAY_TIMEOUT_MS;
					if (Date.now() >= listener.relayDeadline) listener.close();
				}
				continue;
			}
			// Allow final relay events to arrive after database settlement.
			listener.recoveryDeadline ??= Date.now() + AgentQueuedPreviewStreamService.RECOVERY_GRACE_MS;
			if (Date.now() >= listener.recoveryDeadline) listener.close();
		}
	}
}
