import { type Readable } from 'stream';
import { JsonStreamStringify } from 'json-stream-stringify';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type { IPushDataType } from '@/Interfaces';

export abstract class AbstractPush<T> {
	protected connections: Record<string, T> = {};

	protected abstract close(connection: T): void;
	protected abstract sendTo(clients: T[], stream: Readable): Promise<void>;
	protected abstract pingAll(): void;

	private messageQueue: Array<[T[], Readable]> = [];

	constructor() {
		// Ping all connected clients every 60 seconds
		setInterval(() => this.pingAll(), 60 * 1000);
	}

	protected add(sessionId: string, connection: T): void {
		const { connections } = this;
		Logger.debug('Add editor-UI session', { sessionId });

		const existingConnection = connections[sessionId];
		if (existingConnection) {
			// Make sure to remove existing connection with the same id
			this.close(existingConnection);
		}

		connections[sessionId] = connection;
	}

	protected remove(sessionId: string): void {
		Logger.debug('Remove editor-UI session', { sessionId });
		delete this.connections[sessionId];
	}

	send<D>(type: IPushDataType, data: D, sessionId: string) {
		const { connections } = this;
		if (connections[sessionId] === undefined) {
			Logger.error(`The session "${sessionId}" is not registered.`, { sessionId });
			return;
		}

		Logger.debug(`Send data of type "${type}" to editor-UI`, { dataType: type, sessionId });

		return this.enqueue([connections[sessionId]], type, data);
	}

	broadcast<D>(type: IPushDataType, data?: D) {
		return this.enqueue(Object.values(this.connections), type, data);
	}

	// Push messages need to be
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
}
