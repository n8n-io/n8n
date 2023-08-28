import type WebSocket from 'ws';
import { AbstractPush } from './abstract.push';

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

export class WebSocketPush extends AbstractPush<WebSocket> {
	constructor() {
		super();

		// Ping all connected clients every 60 seconds
		setInterval(() => this.pingAll(), 60 * 1000);
	}

	add(sessionId: string, connection: WebSocket) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);

		super.add(sessionId, connection);

		// Makes sure to remove the session if the connection is closed
		connection.once('close', () => {
			connection.off('pong', heartbeat);
			this.remove(sessionId);
		});
	}

	protected close(connection: WebSocket): void {
		connection.close();
	}

	protected sendToOne(connection: WebSocket, data: string): void {
		connection.send(data);
	}

	private pingAll() {
		for (const sessionId in this.connections) {
			const connection = this.connections[sessionId];
			// If a connection did not respond with a `PONG` in the last 60 seconds, disconnect
			if (!connection.isAlive) {
				delete this.connections[sessionId];
				return connection.terminate();
			}

			connection.isAlive = false;
			connection.ping();
		}
	}
}
