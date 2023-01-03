import * as WebSocket from 'ws';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type { IPushData, IPushDataType } from '@/Interfaces';

export class Push {
	// Holds all active connections
	private connections: Record<string, WebSocket> = {};

	/**
	 * Adds a new push connection
	 *
	 * @param {WebSocket} ws The websocket connection
	 * @param {string} sessionId The session id of the client
	 */
	add(ws: WebSocket, sessionId: string) {
		Logger.debug('Add editor-UI session', { sessionId });

		if (this.connections[sessionId] !== undefined) {
			// Make sure to remove existing connection with the same id
			this.connections[sessionId].close();
			delete this.connections[sessionId];
		}

		this.connections[sessionId] = ws;

		// Makes sure to remove the session if the connection is closed
		ws.on('close', () => {
			if (sessionId !== undefined) {
				Logger.debug('Remove editor-UI session', { sessionId });
				delete this.connections[sessionId];
			}
		});
	}

	/**
	 * Sends data to the client which is connected via a specific session
	 *
	 * @param {IPushDataType} type The type of data to send
	 * @param {*} data The data to send
	 * @param {string} [sessionId] The session id of the client to send to
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	send(type: IPushDataType, data: any, sessionId?: string) {
		if (sessionId !== undefined && this.connections[sessionId] === undefined) {
			Logger.error(`The session "${sessionId}" is not registered.`, { sessionId });
			return;
		}

		Logger.debug(`Send data of type "${type}" to editor-UI`, { dataType: type, sessionId });

		const sendData: IPushData = {
			type,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			data,
		};

		// TODO: Check if this is still needed
		if (sessionId === undefined) {
			// Send to all connected clients
			Object.values(this.connections).forEach((ws) => {
				ws.send(JSON.stringify(sendData));
			});
		} else {
			// Send only to a specific client
			this.connections[sessionId].send(JSON.stringify(sendData));
		}
	}
}

let activePushInstance: Push | undefined;

export function getInstance(): Push {
	if (activePushInstance === undefined) {
		activePushInstance = new Push();
	}

	return activePushInstance;
}
