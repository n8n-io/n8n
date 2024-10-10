import type { PushPayload, PushType } from '@n8n/api-types';
import { assert, jsonStringify } from 'n8n-workflow';
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

	protected abstract close(connection: Connection): void;
	protected abstract sendToOneConnection(connection: Connection, data: string): void;
	protected abstract ping(connection: Connection): void;

	constructor(protected readonly logger: Logger) {
		super();
		// Ping all connected clients every 60 seconds
		setInterval(() => this.pingAll(), 60 * 1000);
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

	private sendTo<Type extends PushType>(type: Type, data: PushPayload<Type>, pushRefs: string[]) {
		this.logger.debug(`Send data of type "${type}" to editor-UI`, {
			dataType: type,
			pushRefs: pushRefs.join(', '),
		});

		const stringifiedPayload = jsonStringify({ type, data }, { replaceCircularRefs: true });

		for (const pushRef of pushRefs) {
			const connection = this.connections[pushRef];
			assert(connection);
			this.sendToOneConnection(connection, stringifiedPayload);
		}
	}

	private pingAll() {
		for (const pushRef in this.connections) {
			this.ping(this.connections[pushRef]);
		}
	}

	sendToAll<Type extends PushType>(type: Type, data: PushPayload<Type>) {
		this.sendTo(type, data, Object.keys(this.connections));
	}

	sendToOne<Type extends PushType>(type: Type, data: PushPayload<Type>, pushRef: string) {
		if (this.connections[pushRef] === undefined) {
			this.logger.error(`The session "${pushRef}" is not registered.`, { pushRef });
			return;
		}

		this.sendTo(type, data, [pushRef]);
	}

	sendToUsers<Type extends PushType>(
		type: Type,
		data: PushPayload<Type>,
		userIds: Array<User['id']>,
	) {
		const { connections } = this;
		const userPushRefs = Object.keys(connections).filter((pushRef) =>
			userIds.includes(this.userIdByPushRef[pushRef]),
		);

		this.sendTo(type, data, userPushRefs);
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
