import type WebSocket from 'ws';
import { AbstractPush } from './abstract.push';

export class WebSocketPush extends AbstractPush<WebSocket> {
	add(sessionId: string, connection: WebSocket) {
		super.add(sessionId, connection);

		// Makes sure to remove the session if the connection is closed
		connection.once('close', () => this.remove(sessionId));
	}

	protected close(connection: WebSocket): void {
		connection.close();
	}

	protected sendToOne(connection: WebSocket, data: string): void {
		connection.send(data);
	}
}
