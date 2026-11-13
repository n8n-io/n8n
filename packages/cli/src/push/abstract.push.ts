import type { PushMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { jsonStringify } from 'n8n-workflow';

import type { OnPushMessage } from '@/push/types';
import { TypedEmitter } from '@/typed-emitter';

export interface AbstractPushEvents {
	message: OnPushMessage;
}

type PushTarget<Connection> = { pushRef: string; userId: User['id']; connection: Connection };

/** User ids are UUIDs with no `:`, so two pairs never share a key. */
const connectionKey = (pushRef: string, userId: User['id']): string => `${userId}:${pushRef}`;

/**
 * Abstract class for two-way push communication.
 * Keeps track of user sessions and enables sending messages.
 *
 * @emits message when a message is received from a client
 */
@Service()
export abstract class AbstractPush<Connection> extends TypedEmitter<AbstractPushEvents> {
	/** One entry per user and push ref, so users on the same push ref never replace each other. */
	protected connections = new Map<string, PushTarget<Connection>>();

	protected abstract close(connection: Connection): void;
	protected abstract sendToOneConnection(
		connection: Connection,
		data: string,
		isBinary: boolean,
	): void;
	protected abstract ping(connection: Connection): void;

	constructor(
		protected readonly logger: Logger,
		protected readonly errorReporter: ErrorReporter,
	) {
		super();
		// Ping all connected clients every 60 seconds
		setInterval(() => this.pingAll(), 60 * 1000);
	}

	protected add(pushRef: string, userId: User['id'], connection: Connection): void {
		this.logger.debug('Add editor-UI session', { pushRef });

		const key = connectionKey(pushRef, userId);
		const existing = this.connections.get(key);

		if (existing) {
			// Make sure to remove the existing connection of this user with the same ID
			this.close(existing.connection);
		}

		this.connections.set(key, { pushRef, userId, connection });
	}

	protected onMessageReceived(pushRef: string, userId: User['id'], msg: unknown): void {
		this.logger.debug('Received message from editor-UI', { pushRef, msg });

		this.emit('message', { pushRef, userId, msg });
	}

	/** Skips the removal when a newer connection of the same user already replaced `connection`. */
	protected remove(pushRef: string, userId: User['id'], connection: Connection): void {
		const key = connectionKey(pushRef, userId);
		if (this.connections.get(key)?.connection === connection) {
			this.logger.debug('Removed editor-UI session', { pushRef });
			this.connections.delete(key);
		}
	}

	private sendTo(
		{ type, data }: PushMessage,
		targets: Array<PushTarget<Connection>>,
		asBinary: boolean = false,
	): void {
		this.logger.debug(`Pushed to frontend: ${type}`, {
			dataType: type,
			pushRefs: targets.map(({ pushRef }) => pushRef).join(', '),
		});

		const stringifiedPayload = jsonStringify({ type, data }, { replaceCircularRefs: true });

		for (const { connection } of targets) {
			this.sendToOneConnection(connection, stringifiedPayload, asBinary);
		}
	}

	private pingAll(): void {
		for (const { connection } of this.connections.values()) {
			this.ping(connection);
		}
	}

	sendToAll(pushMsg: PushMessage): void {
		this.sendTo(pushMsg, [...this.connections.values()]);
	}

	sendToOne(
		pushMsg: PushMessage,
		pushRef: string,
		userId: User['id'] | undefined,
		asBinary: boolean = false,
	): void {
		const target =
			userId === undefined ? undefined : this.connections.get(connectionKey(pushRef, userId));

		if (target) {
			this.sendTo(pushMsg, [target], asBinary);
		} else {
			this.logger.debug(`The session "${pushRef}" is not registered for this user.`, { pushRef });
		}
	}

	sendToUsers(pushMsg: PushMessage, userIds: Array<User['id']>): void {
		const userIdSet = new Set(userIds);
		const userTargets = [...this.connections.values()].filter(({ userId }) =>
			userIdSet.has(userId),
		);

		this.sendTo(pushMsg, userTargets);
	}

	closeAllConnections(): void {
		for (const { connection } of this.connections.values()) {
			// Signal the connection that we want to close it.
			// We are not removing the sessions here because it should be
			// the implementation's responsibility to do so once the connection
			// has actually closed.
			this.close(connection);
		}
	}

	hasPushRef(pushRef: string): boolean {
		return [...this.connections.values()].some((target) => target.pushRef === pushRef);
	}

	hasPushRefOfUser(pushRef: string, userId: User['id'] | undefined): boolean {
		return userId !== undefined && this.connections.has(connectionKey(pushRef, userId));
	}
}
