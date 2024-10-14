import type { PushPayload, PushType } from '@n8n/api-types';
import { JsonStreamStringify } from 'json-stream-stringify';
import type { Readable } from 'node:stream';
import { ErrorReporter } from 'n8n-core';
import { Service } from 'typedi';

import type { User } from '@/databases/entities/user';
import { Logger } from '@/logging/logger.service';
import type { OnPushMessage } from '@/push/types';
import { TypedEmitter } from '@/typed-emitter';

export interface AbstractPushEvents {
	message: OnPushMessage;
}

/**
 * Abstract class for two-way push communication.
 * Keeps track of user sessions and enables sending messages.
 *
 * @emits message when a message is received from a client
 */
@Service()
export abstract class AbstractPush<Connection> extends TypedEmitter<AbstractPushEvents> {
	protected connections: Record<string, Connection> = {};

	protected userIdByPushRef: Record<string, string> = {};

	private messageQueue: Array<[Connection[], Readable]> = [];

	protected abstract close(connection: Connection): void;
	protected abstract sendTo(connections: Connection[], stream: Readable): Promise<void>;
	protected abstract ping(connection: Connection): void;

	// Ping all connected clients every 60 seconds
	private pingTimer = setInterval(() => this.pingAll(), 60 * 1000);

	constructor(
		protected readonly logger: Logger,
		protected readonly errorReporter: ErrorReporter,
	) {
		super();
	}

	protected add(pushRef: string, userId: User['id'], connection: Connection) {
		const { connections, userIdByPushRef } = this;
		this.logger.debug('Add editor-UI session', { pushRef });

		const existingConnection = connections[pushRef];

		if (existingConnection) {
			// Make sure to remove existing connection with the same ID
			this.close(existingConnection);
		}

		connections[pushRef] = connection;
		userIdByPushRef[pushRef] = userId;
	}

	protected onMessageReceived(pushRef: string, msg: unknown) {
		this.logger.debug('Received message from editor-UI', { pushRef, msg });

		const userId = this.userIdByPushRef[pushRef];

		this.emit('message', { pushRef, userId, msg });
	}

	protected remove(pushRef?: string) {
		if (!pushRef) return;

		this.logger.debug('Removed editor-UI session', { pushRef });

		delete this.connections[pushRef];
		delete this.userIdByPushRef[pushRef];
	}

	private pingAll() {
		for (const pushRef in this.connections) {
			this.ping(this.connections[pushRef]);
		}
	}

	sendToAll<Type extends PushType>(type: Type, data: PushPayload<Type>) {
		this.enqueue(Object.values(this.connections), type, data);
	}

	sendToOne<Type extends PushType>(type: Type, data: PushPayload<Type>, pushRef: string) {
		const client = this.connections[pushRef];
		if (client === undefined) {
			this.logger.warn(`The session "${pushRef}" is not registered.`, { pushRef });
			return;
		}
		this.enqueue([client], type, data);
	}

	sendToUsers<Type extends PushType>(
		type: Type,
		data: PushPayload<Type>,
		userIds: Array<User['id']>,
	) {
		const userConnections = Object.entries(this.connections)
			.filter(([pushRef]) => userIds.includes(this.userIdByPushRef[pushRef]))
			.map(([_, connection]) => connection);
		this.enqueue(userConnections, type, data);
	}

	closeAllConnections() {
		for (const pushRef in this.connections) {
			// Signal the connection that we want to close it.
			// We are not removing the sessions here because it should be
			// the implementation's responsibility to do so once the connection
			// has actually closed.
			this.close(this.connections[pushRef]);
		}
		clearInterval(this.pingTimer);
	}

	hasPushRef(pushRef: string) {
		return this.connections[pushRef] !== undefined;
	}

	private enqueue<Type extends PushType>(
		connections: Connection[],
		type: Type,
		data: PushPayload<Type>,
	) {
		const stream = new JsonStreamStringify({ type, data }, undefined, undefined, true);
		this.messageQueue.push([connections, stream]);
		setImmediate(() => void this.processQueue());
	}

	private async processQueue() {
		while (this.messageQueue.length) {
			const [clients, stream] = this.messageQueue.shift()!;
			await this.sendTo(clients, stream);
		}
	}
}
