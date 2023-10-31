import { EventEmitter } from 'events';
import { jsonStringify } from 'n8n-workflow';
import type { IPushDataType } from '@/Interfaces';
import { Logger } from '@/Logger';
import type { User } from '@/databases/entities/User';

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

	send<D>(type: IPushDataType, data: D, sessionId: string | undefined) {
		const { connections } = this;
		if (sessionId !== undefined && connections[sessionId] === undefined) {
			this.logger.error(`The session "${sessionId}" is not registered.`, { sessionId });
			return;
		}

		this.logger.debug(`Send data of type "${type}" to editor-UI`, { dataType: type, sessionId });

		const sendData = jsonStringify({ type, data }, { replaceCircularRefs: true });

		if (sessionId === undefined) {
			// Send to all connected clients
			Object.values(connections).forEach((connection) => this.sendToOne(connection, sendData));
		} else {
			// Send only to a specific client
			this.sendToOne(connections[sessionId], sendData);
		}
	}
}
