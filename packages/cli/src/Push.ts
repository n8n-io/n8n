import SSEChannel from 'sse-channel';
import type { Request, Response } from 'express';

import { LoggerProxy as Logger } from 'n8n-workflow';
import type { IPushData, IPushDataType } from '@/Interfaces';

export class Push {
	private channel = new SSEChannel();

	private connections: Record<string, Response> = {};

	constructor() {
		this.channel.on('disconnect', (channel: string, res: Response) => {
			if (res.req !== undefined) {
				const { sessionId } = res.req.query;
				Logger.debug('Remove editor-UI session', { sessionId });
				delete this.connections[sessionId as string];
			}
		});
	}

	/**
	 * Adds a new push connection
	 *
	 * @param {string} sessionId The id of the session
	 * @param {Request} req The request
	 * @param {Response} res The response
	 */
	add(sessionId: string, req: Request, res: Response) {
		Logger.debug('Add editor-UI session', { sessionId });

		if (this.connections[sessionId] !== undefined) {
			// Make sure to remove existing connection with the same session
			// id if one exists already
			this.connections[sessionId].end();
			this.channel.removeClient(this.connections[sessionId]);
		}

		this.connections[sessionId] = res;
		this.channel.addClient(req, res);
	}

	/**
	 * Sends data to the client which is connected via a specific session
	 *
	 * @param {string} sessionId The session id of client to send data to
	 * @param {string} type Type of data to send
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

		if (sessionId === undefined) {
			// Send to all connected clients
			this.channel.send(JSON.stringify(sendData));
		} else {
			// Send only to a specific client
			this.channel.send(JSON.stringify(sendData), [this.connections[sessionId]]);
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
