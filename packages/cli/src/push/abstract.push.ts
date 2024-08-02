import { Service } from 'typedi';
import { type Readable } from 'stream';
import { JsonStreamStringify } from 'json-stream-stringify';

import type { IPushDataType } from '@/Interfaces';
import { Logger } from '@/Logger';

@Service()
export abstract class AbstractPush<T> {
	protected connections: Record<string, T> = {};

	protected abstract close(connection: T): void;
	protected abstract sendTo(clients: T[], stream: Readable): Promise<void>;
	protected abstract ping(connection: T): void;

	private messageQueue: Array<[T[], Readable]> = [];

	constructor(protected readonly logger: Logger) {
		// Ping all connected clients every 60 seconds
		setInterval(() => this.pingAll(), 60 * 1000);
	}

	protected add(pushRef: string, connection: T) {
		const { connections } = this;
		this.logger.debug('Add editor-UI session', { pushRef });

		const existingConnection = connections[pushRef];

		if (existingConnection) {
			// Make sure to remove existing connection with the same ID
			this.close(existingConnection);
		}

		connections[pushRef] = connection;
	}

	protected remove(pushRef?: string) {
		if (!pushRef) return;

		this.logger.debug('Removed editor-UI session', { pushRef });

		delete this.connections[pushRef];
	}

	sendToOne(type: IPushDataType, data: unknown, pushRef: string) {
		const client = this.connections[pushRef];
		if (client === undefined) {
			this.logger.error(`The session "${pushRef}" is not registered.`, { pushRef });
			return;
		}
		this.enqueue([client], type, data);
	}

	sendToAll(type: IPushDataType, data?: unknown) {
		const clients = Object.values(this.connections);
		this.enqueue(clients, type, data);
	}

	private pingAll() {
		for (const pushRef in this.connections) {
			this.ping(this.connections[pushRef]);
		}
	}

	private enqueue<D>(clients: T[], type: IPushDataType, data?: D) {
		const stream = new JsonStreamStringify({ type, data }, undefined, undefined, true);
		this.messageQueue.push([clients, stream]);
		setImmediate(async () => this.processQueue());
	}

	private async processQueue() {
		while (this.messageQueue.length) {
			const [clients, stream] = this.messageQueue.shift()!;
			await this.sendTo(clients, stream);
		}
	}

	closeAllConnections() {
		for (const pushRef in this.connections) {
			// Signal the connection that we want to close it.
			// We are not removing the sessions here because it should be
			// the implementation's responsibility to do so once the connection
			// has actually closed.
			this.close(this.connections[pushRef]);
		}
	}

	hasPushRef(pushRef: string) {
		return this.connections[pushRef] !== undefined;
	}
}
