import { assert, jsonStringify } from 'n8n-workflow';
import type { IPushDataType } from '@/Interfaces';
import type { Logger } from '@/Logger';

/**
 * Abstract class for two-way push communication.
 * Keeps track of user sessions and enables sending messages.
 *
 * @emits message when a message is received from a client
 */
export abstract class AbstractPush<T> {
	protected connections: Record<string, T> = {};

	protected abstract close(connection: T): void;
	protected abstract sendToOneConnection(connection: T, data: string): void;

	constructor(protected readonly logger: Logger) {}

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

	sendToOne(type: IPushDataType, data: unknown, pushRef: string) {
		if (this.connections[pushRef] === undefined) {
			this.logger.error(`The session "${pushRef}" is not registered.`, { pushRef });
			return;
		}

		this.sendTo(type, data, [pushRef]);
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
