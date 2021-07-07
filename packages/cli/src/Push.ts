// @ts-ignore
import * as sseChannel from 'sse-channel';
import * as express from 'express';

import {
	IPushData,
	IPushDataType,
} from '.';

import {
	LoggerProxy as Logger,
} from 'n8n-workflow';

export class Push {
	private channel: sseChannel;
	private connections: {
		[key: string]: express.Response;
	} = {};


	constructor() {
		this.channel = new sseChannel({
			cors: {
				// Allow access also from frontend when developing
				origins: ['http://localhost:8080'],
			},
		});

		this.channel.on('disconnect', (channel: string, res: express.Response) => {
			if (res.req !== undefined) {
				Logger.debug(`Remove editor-UI session`, { sessionId: res.req.query.sessionId });
				delete this.connections[res.req.query.sessionId as string];
			}
		});
	}


	/**
	 * Adds a new push connection
	 *
	 * @param {string} sessionId The id of the session
	 * @param {express.Request} req The request
	 * @param {express.Response} res The response
	 * @memberof Push
	 */
	add(sessionId: string, req: express.Request, res: express.Response) {
		Logger.debug(`Add editor-UI session`, { sessionId });

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
	 * @param {*} data
	 * @memberof Push
	 */



	send(type: IPushDataType, data: any, sessionId?: string) { // tslint:disable-line:no-any
		if (sessionId !== undefined && this.connections[sessionId] === undefined) {
			Logger.error(`The session "${sessionId}" is not registred.`, { sessionId });
			return;
		}

		Logger.debug(`Send data of type "${type}" to editor-UI`, { dataType: type, sessionId });

		const sendData: IPushData = {
			type,
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
