import { EventEmitter } from 'events';
import { assert, jsonStringify } from 'n8n-workflow';
import type { IPushDataType } from '@/Interfaces';
import type { Logger } from '@/Logger';
import type { User } from '@db/entities/User';

/**
 * Abstract class for two-way push communication.
 * Keeps track of user sessions and enables sending messages.
 *
 * @emits message when a message is received from a client
 */
export abstract class AbstractPush<T> extends EventEmitter {
	protected connections: Record<string, T> = {};

	protected userIdBySessionId: Record<string, string> = {};

	protected abstract close(connection: T): void;
	protected abstract sendToOne(connection: T, data: string): void;

	constructor(protected readonly logger: Logger) {
		super();
	}

	protected add(sessionId: string, userId: User['id'], connection: T): void {
		const { connections, userIdBySessionId: userIdsBySessionId } = this;
		this.logger.debug('Add editor-UI session', { sessionId });

		const existingConnection = connections[sessionId];
		if (existingConnection) {
			// Make sure to remove existing connection with the same id
			this.close(existingConnection);
		}

		connections[sessionId] = connection;
		userIdsBySessionId[sessionId] = userId;
	}

	protected onMessageReceived(sessionId: string, msg: unknown): void {
		this.logger.debug('Received message from editor-UI', { sessionId, msg });
		const userId = this.userIdBySessionId[sessionId];
		this.emit('message', {
			sessionId,
			userId,
			msg,
		});
	}

	protected remove(sessionId?: string): void {
		if (sessionId !== undefined) {
			this.logger.debug('Remove editor-UI session', { sessionId });
			delete this.connections[sessionId];
			delete this.userIdBySessionId[sessionId];
		}
	}

	private sendToSessions<D>(type: IPushDataType, data: D, sessionIds: string[]) {
		this.logger.debug(`Send data of type "${type}" to editor-UI`, {
			dataType: type,
			sessionIds: sessionIds.join(', '),
		});

		const sendData = jsonStringify({ type, data }, { replaceCircularRefs: true });

		for (const sessionId of sessionIds) {
			const connection = this.connections[sessionId];
			assert(connection);
			this.sendToOne(connection, sendData);
		}
	}

	broadcast<D>(type: IPushDataType, data?: D) {
		this.sendToSessions(type, data, Object.keys(this.connections));
	}

	send<D>(type: IPushDataType, data: D, sessionId: string) {
		const { connections } = this;
		if (connections[sessionId] === undefined) {
			this.logger.error(`The session "${sessionId}" is not registered.`, { sessionId });
			return;
		}

		this.sendToSessions(type, data, [sessionId]);
	}

	/**
	 * Sends the given data to given users' connections
	 */
	sendToUsers<D>(type: IPushDataType, data: D, userIds: Array<User['id']>) {
		const { connections } = this;
		const userSessionIds = Object.keys(connections).filter((sessionId) =>
			userIds.includes(this.userIdBySessionId[sessionId]),
		);

		this.sendToSessions(type, data, userSessionIds);
	}

	/**
	 * Closes all push existing connections
	 */
	closeAllConnections() {
		for (const sessionId in this.connections) {
			// Signal the connection that we want to close it.
			// We are not removing the sessions here because it should be
			// the implementation's responsibility to do so once the connection
			// has actually closed.
			this.close(this.connections[sessionId]);
		}
	}
}
