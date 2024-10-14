import { ApplicationError } from 'n8n-workflow';
import type { Readable } from 'node:stream';
import { Service } from 'typedi';
import type WebSocket from 'ws';

import type { User } from '@/databases/entities/user';

import { AbstractPush } from './abstract.push';

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

export const EMPTY_BUFFER = Buffer.alloc(0);

@Service()
export class WebSocketPush extends AbstractPush<WebSocket> {
	add(pushRef: string, userId: User['id'], connection: WebSocket) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);

		super.add(pushRef, userId, connection);

		const onMessage = (data: WebSocket.RawData) => {
			try {
				const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);

				this.onMessageReceived(pushRef, JSON.parse(buffer.toString('utf8')));
			} catch (error) {
				this.errorReporter.error(
					new ApplicationError('Error parsing push message', {
						extra: {
							userId,
							data,
						},
						cause: error,
					}),
				);
				this.logger.error("Couldn't parse message from editor-UI", {
					error: error as unknown,
					pushRef,
					data,
				});
			}
		};

		// Makes sure to remove the session if the connection is closed
		connection.once('close', () => {
			connection.off('pong', heartbeat);
			connection.off('message', onMessage);
			this.remove(pushRef);
		});

		connection.on('message', onMessage);
	}

	protected close(connection: WebSocket): void {
		connection.close();
	}

	protected async sendTo(connections: WebSocket[], stream: Readable) {
		await new Promise<void>((resolve, reject) => {
			stream
				.once('error', reject)
				.on('data', (chunk: Buffer) => {
					connections.forEach((connection) => connection.send(chunk, { fin: false }));
				})
				.once('end', () => {
					connections.forEach((connection) => connection.send(EMPTY_BUFFER));
					resolve();
				});
		});
	}

	protected ping(connection: WebSocket): void {
		// If a connection did not respond with a `PONG` in the last 60 seconds, disconnect
		if (!connection.isAlive) {
			return connection.terminate();
		}
		connection.isAlive = false;
		connection.ping();
	}
}
