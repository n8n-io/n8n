import { jsonStringify, LoggerProxy as Logger } from 'n8n-workflow';
import type { IPushDataType } from '@/Interfaces';
import { eventBus } from '../eventbus';

export abstract class AbstractPush<T> {
	protected connections: Record<string, T> = {};

	protected abstract close(connection: T): void;
	protected abstract sendToOne(connection: T, data: string): void;

	protected add(sessionId: string, connection: T): void {
		const { connections } = this;
		Logger.debug('Add editor-UI session', { sessionId });
		eventBus.emit('editorUiConnected', sessionId);

		const existingConnection = connections[sessionId];
		if (existingConnection) {
			// Make sure to remove existing connection with the same id
			this.close(existingConnection);
		}

		connections[sessionId] = connection;
	}

	protected remove(sessionId?: string): void {
		if (sessionId !== undefined) {
			Logger.debug('Remove editor-UI session', { sessionId });
			delete this.connections[sessionId];
		}
	}

	send<D>(type: IPushDataType, data: D, sessionId: string | undefined) {
		const { connections } = this;
		if (sessionId !== undefined && connections[sessionId] === undefined) {
			Logger.error(`The session "${sessionId}" is not registered.`, { sessionId });
			return;
		}

		Logger.debug(`Send data of type "${type}" to editor-UI`, { dataType: type, sessionId });

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
