import { Service } from '@n8n/di';
import { ApplicationError } from 'n8n-workflow';
import type WebSocket from 'ws';

import type { User } from '@/databases/entities/user';

import { AbstractPush } from './abstract.push';

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

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

	protected sendToOneConnection(connection: WebSocket, data: string): void {
		connection.send(data);
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
