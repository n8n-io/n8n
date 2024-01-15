import { EventEmitter } from 'events';
import { assert, jsonStringify } from 'n8n-workflow';
import type { IPushDataType } from '@/Interfaces';
import type { Logger } from '@/Logger';
import type { User } from '@db/entities/User';
import type { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';

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
	protected abstract sendToOneConnection(connection: T, data: string): void;

	constructor(
		protected readonly logger: Logger,
		private readonly multiMainSetup: MultiMainSetup,
	) {
		super();
	}

	protected add(sessionId: string, userId: User['id'], connection: T) {
		const { connections, userIdBySessionId: userIdsBySessionId } = this;
		this.logger.debug('Add editor-UI session', { sessionId });

		const existingConnection = connections[sessionId];

		if (existingConnection) {
			// Make sure to remove existing connection with the same ID
			this.close(existingConnection);
		}

		connections[sessionId] = connection;
		userIdsBySessionId[sessionId] = userId;
	}

	protected onMessageReceived(sessionId: string, msg: unknown) {
		this.logger.debug('Received message from editor-UI', { sessionId, msg });

		const userId = this.userIdBySessionId[sessionId];

		this.emit('message', { sessionId, userId, msg });
	}

	protected remove(sessionId?: string) {
		if (!sessionId) return;

		this.logger.debug('Removed editor-UI session', { sessionId });

		delete this.connections[sessionId];
		delete this.userIdBySessionId[sessionId];
	}

	private sendToSessions(type: IPushDataType, data: unknown, sessionIds: string[]) {
		this.logger.debug(`Send data of type "${type}" to editor-UI`, {
			dataType: type,
			sessionIds: sessionIds.join(', '),
		});

		const stringifiedPayload = jsonStringify({ type, data }, { replaceCircularRefs: true });

		for (const sessionId of sessionIds) {
			const connection = this.connections[sessionId];
			assert(connection);
			this.sendToOneConnection(connection, stringifiedPayload);
		}
	}

	sendToAllSessions(type: IPushDataType, data?: unknown) {
		this.sendToSessions(type, data, Object.keys(this.connections));
	}

	sendToOneSession(type: IPushDataType, data: unknown, sessionId: string) {
		/**
		 * Multi-main setup: In a manual webhook execution, the main process that
		 * handles a webhook might not be the same as the main process that created
		 * the webhook. If so, the handler process commands the creator process to
		 * relay the former's execution lifecyle events to the creator's frontend.
		 */
		if (this.multiMainSetup.isEnabled && !this.hasSessionId(sessionId)) {
			const payload = { type, args: data, sessionId };

			void this.multiMainSetup.publish('relay-execution-lifecycle-event', payload);

			return;
		}

		if (this.connections[sessionId] === undefined) {
			this.logger.error(`The session "${sessionId}" is not registered.`, { sessionId });
			return;
		}

		this.sendToSessions(type, data, [sessionId]);
	}

	sendToUsers(type: IPushDataType, data: unknown, userIds: Array<User['id']>) {
		const { connections } = this;
		const userSessionIds = Object.keys(connections).filter((sessionId) =>
			userIds.includes(this.userIdBySessionId[sessionId]),
		);

		this.sendToSessions(type, data, userSessionIds);
	}

	closeAllConnections() {
		for (const sessionId in this.connections) {
			// Signal the connection that we want to close it.
			// We are not removing the sessions here because it should be
			// the implementation's responsibility to do so once the connection
			// has actually closed.
			this.close(this.connections[sessionId]);
		}
	}

	hasSessionId(sessionId: string) {
		return this.connections[sessionId] !== undefined;
	}
}
