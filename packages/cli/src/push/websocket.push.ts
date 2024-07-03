import type WebSocket from 'ws';
import { Service } from 'typedi';
import { AbstractPush } from './abstract.push';

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

@Service()
export class WebSocketPush extends AbstractPush<WebSocket> {
	add(pushRef: string, connection: WebSocket) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);

		super.add(pushRef, connection);

		// Makes sure to remove the session if the connection is closed
		connection.once('close', () => {
			connection.off('pong', heartbeat);
			this.remove(pushRef);
		});
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
