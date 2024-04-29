import { EventEmitter } from 'events';
import { assert, jsonStringify } from 'n8n-workflow';
import type { IPushDataType } from '@/Interfaces';
import type { Logger } from '@/Logger';
import type { User } from '@db/entities/User';
import type { OrchestrationService } from '@/services/orchestration.service';

/**
 * Abstract class for two-way push communication.
 * Keeps track of user sessions and enables sending messages.
 *
 * @emits message when a message is received from a client
 */
export abstract class AbstractPush<T> extends EventEmitter {
	protected connections: Record<string, T> = {};

	protected userIdByPushRef: Record<string, string> = {};

	protected abstract close(connection: T): void;
	protected abstract sendToOneConnection(connection: T, data: string): void;

	constructor(
		protected readonly logger: Logger,
		private readonly orchestrationService: OrchestrationService,
	) {
		super();
	}

	protected add(pushRef: string, userId: User['id'], connection: T) {
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

	private sendTo(type: IPushDataType, data: unknown, pushRefs: string[]) {
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

	sendToAll(type: IPushDataType, data?: unknown) {
		this.sendTo(type, data, Object.keys(this.connections));
	}

	sendToOneSession(type: IPushDataType, data: unknown, pushRef: string) {
		/**
		 * Multi-main setup: In a manual webhook execution, the main process that
		 * handles a webhook might not be the same as the main process that created
		 * the webhook. If so, the handler process commands the creator process to
		 * relay the former's execution lifecycle events to the creator's frontend.
		 */
		if (this.orchestrationService.isMultiMainSetupEnabled && !this.hasPushRef(pushRef)) {
			const payload = { type, args: data, pushRef };

			void this.orchestrationService.publish('relay-execution-lifecycle-event', payload);

			return;
		}

		if (this.connections[pushRef] === undefined) {
			this.logger.error(`The session "${pushRef}" is not registered.`, { pushRef });
			return;
		}

		this.sendTo(type, data, [pushRef]);
	}

	sendToUsers(type: IPushDataType, data: unknown, userIds: Array<User['id']>) {
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
