import { heartbeatMessageSchema } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import type WebSocket from 'ws';

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

		const onMessage = async (data: WebSocket.RawData) => {
			try {
				const buffer = Array.isArray(data)
					? Buffer.concat(data)
					: data instanceof ArrayBuffer
						? Buffer.from(data)
						: data;

				const msg: unknown = JSON.parse(buffer.toString('utf8'));

				// Client sends application level heartbeat messages to react
				// to connection issues. This is in addition to the protocol
				// level ping/pong mechanism used by the server.
				if (await this.isClientHeartbeat(msg)) {
					return;
				}

				this.onMessageReceived(pushRef, msg);
			} catch (error) {
				this.errorReporter.error(
					new UnexpectedError('Error parsing push message', {
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

	protected sendToOneConnection(connection: WebSocket, data: string, asBinary: boolean): void {
		connection.send(data, { binary: asBinary });
	}

	protected ping(connection: WebSocket): void {
		// If a connection did not respond with a `PONG` in the last 60 seconds, disconnect
		if (!connection.isAlive) {
			return connection.terminate();
		}
		connection.isAlive = false;
		connection.ping();
	}

	private async isClientHeartbeat(msg: unknown) {
		const result = await heartbeatMessageSchema.safeParseAsync(msg);

		return result.success;
	}
}
