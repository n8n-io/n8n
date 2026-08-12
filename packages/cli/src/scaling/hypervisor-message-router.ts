import { Service } from '@n8n/di';

/** The subset of `cluster.Worker` a handler needs — keeps handlers testable without `cluster`. */
export type HypervisorWorker = {
	id: number;
	send: (message: unknown) => void;
	process: { pid?: number };
};

/**
 * A pluggable coordination feature hosted by the hypervisor primary. Each handler
 * owns one message-type prefix (e.g. `leader:` / `registry:`); the router forwards
 * matching IPC messages, child exits, and periodic ticks to it.
 */
export interface HypervisorMessageHandler {
	readonly prefix: string;
	onMessage(worker: HypervisorWorker, message: { type: string }, now: number): void;
	onExit?(worker: HypervisorWorker): void;
	onTick?(now: number): void;
}

function isTypedMessage(message: unknown): message is { type: string } {
	return (
		typeof message === 'object' &&
		message !== null &&
		typeof (message as { type?: unknown }).type === 'string'
	);
}

/**
 * Routes the hypervisor primary's cluster IPC messages to registered handlers by
 * message-type prefix. The command wires `cluster.on('message'/'exit')` and a
 * periodic tick here once; adding a coordination feature is a new handler +
 * `register()`, not new branching. Cluster-agnostic (and the single home of
 * `Date.now()`) so both router and handlers unit-test without `cluster`.
 */
@Service()
export class HypervisorMessageRouter {
	private readonly handlers: HypervisorMessageHandler[] = [];

	register(handler: HypervisorMessageHandler): void {
		this.handlers.push(handler);
	}

	handleMessage(worker: HypervisorWorker, message: unknown): void {
		if (!isTypedMessage(message)) return;
		const now = Date.now();
		for (const handler of this.handlers) {
			if (message.type.startsWith(handler.prefix)) handler.onMessage(worker, message, now);
		}
	}

	handleExit(worker: HypervisorWorker): void {
		for (const handler of this.handlers) handler.onExit?.(worker);
	}

	tick(now: number): void {
		for (const handler of this.handlers) handler.onTick?.(now);
	}
}
