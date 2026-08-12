import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type {
	HypervisorMessageHandler,
	HypervisorWorker,
} from '@/scaling/hypervisor-message-router';

import type { MessageTransport } from './message-transport.interface';

export type PubSubPublish = { type: 'pubsub:publish'; channel: string; message: string };
export type PubSubSubscribe = { type: 'pubsub:subscribe'; channel: string };
export type PubSubMessage = PubSubPublish | PubSubSubscribe;

function isPubSubPublish(message: unknown): message is PubSubPublish {
	return (
		typeof message === 'object' &&
		message !== null &&
		(message as { type?: unknown }).type === 'pubsub:publish'
	);
}

function isPubSubSubscribe(message: unknown): message is PubSubSubscribe {
	return (
		typeof message === 'object' &&
		message !== null &&
		(message as { type?: unknown }).type === 'pubsub:subscribe'
	);
}

type MessageHandler = (message: string, channel: string) => void;

/**
 * `MessageTransport` over the cluster IPC channel set up by `n8n hypervisor`
 * (see {@link PubSubHost} below, the primary-side broker this talks to). Only
 * ever constructed in a child forked by the hypervisor -
 * `TransportModeService.validateAtBoot()` rejects `pubsub=ipc` otherwise - so
 * there is no bind race or broker election to do here: the primary always
 * exists before it forks this process.
 */
@Service()
export class HypervisorMessageTransport implements MessageTransport {
	private readonly handlersByChannel = new Map<string, MessageHandler[]>();

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped(['scaling', 'pubsub']);
		process.on('message', this.onMessage);
	}

	async publish(channel: string, message: string) {
		process.send?.({ type: 'pubsub:publish', channel, message } satisfies PubSubPublish);
	}

	async subscribe(channel: string, onMessage: MessageHandler) {
		const handlers = this.handlersByChannel.get(channel) ?? [];
		handlers.push(onMessage);
		this.handlersByChannel.set(channel, handlers);

		process.send?.({ type: 'pubsub:subscribe', channel } satisfies PubSubSubscribe);
	}

	shutdown() {
		process.off('message', this.onMessage);
	}

	private onMessage = (message: unknown) => {
		if (!isPubSubPublish(message)) return;

		for (const handler of this.handlersByChannel.get(message.channel) ?? []) {
			handler(message.message, message.channel);
		}
	};
}

/**
 * Primary-side counterpart of {@link HypervisorMessageTransport}: relays pub/sub
 * messages between children over the cluster IPC channel. Tracks each
 * connection's subscribed channels and broadcasts a publish to every worker
 * currently subscribed to that channel. No bind race to resolve, unlike a
 * self-electing broker over a shared socket, since the primary always exists
 * before it forks anyone.
 */
@Service()
export class PubSubHost implements HypervisorMessageHandler {
	readonly prefix = 'pubsub:';

	private readonly subscriptions = new Map<
		number,
		{ worker: HypervisorWorker; channels: Set<string> }
	>();

	onMessage(worker: HypervisorWorker, message: { type: string }): void {
		if (isPubSubSubscribe(message)) this.onSubscribe(worker, message.channel);
		else if (isPubSubPublish(message)) this.onPublish(message);
	}

	onExit(worker: HypervisorWorker): void {
		this.subscriptions.delete(worker.id);
	}

	private onSubscribe(worker: HypervisorWorker, channel: string): void {
		const entry = this.subscriptions.get(worker.id) ?? { worker, channels: new Set<string>() };
		entry.channels.add(channel);
		this.subscriptions.set(worker.id, entry);
	}

	private onPublish(message: PubSubPublish): void {
		for (const { worker, channels } of this.subscriptions.values()) {
			if (channels.has(message.channel)) worker.send(message);
		}
	}
}
