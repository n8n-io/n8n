import { AbstractPushClient } from './AbstractPushClient';

const WebSocketState = {
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3,
};

/**
 * A WebSocket implementation that automatically reconnects when the connection is lost.
 * It also sends a heartbeat to the server in attempt to keep the connection alive.
 * This heartbeat is sent in addition to the protocol level ping/pong mechanism the
 * server sends.
 */
export class WebSocketClient extends AbstractPushClient {
	protected socket: WebSocket | null = null;

	/** Interval between heartbeats */
	protected readonly heartbeatInterval = 30_000;

	protected heartbeatTimer: ReturnType<typeof setInterval> | null = null;

	connect() {
		this.socket = new WebSocket(this.url);

		this.socket.addEventListener('open', this.onConnectionOpen);
		this.socket.addEventListener('message', this.handleMessageEvent);
		this.socket.addEventListener('error', this.onConnectionError);
		this.socket.addEventListener('close', this.onConnectionClose);
	}

	sendMessage(serializedMessage: string) {
		if (this.socket?.readyState === WebSocketState.OPEN) {
			this.socket.send(serializedMessage);
		}
	}

	disconnect() {
		super.disconnect();

		this.stopHeartbeat();
		this.removeHandlers();
		this.socket?.close(1000, 'Client closed connection');
		this.socket = null;
	}

	//#region Event handlers

	protected onConnectionOpen = () => {
		super.handleConnectEvent();
		this.startHeartbeat();
	};

	protected onConnectionClose = (event: CloseEvent) => {
		super.handleDisconnectEvent(event.code);
		this.stopHeartbeat();
	};

	protected handleMessageEvent = (event: MessageEvent) => {
		super.handleMessageEvent(event);
	};

	protected onConnectionError = (error: unknown) => {
		super.handleErrorEvent(error);
	};

	//#endregion Event handlers

	//#region Heartbeat

	private startHeartbeat() {
		if (!this.socket) return;

		this.heartbeatTimer = setInterval(() => {
			if (this.socket?.readyState === WebSocketState.OPEN) {
				this.socket.send(JSON.stringify({ type: 'heartbeat' }));
			}
		}, this.heartbeatInterval);
	}

	private stopHeartbeat() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	//#endregion Heartbeat

	private removeHandlers() {
		this.socket?.removeEventListener('open', this.onConnectionOpen);
		this.socket?.removeEventListener('message', this.handleMessageEvent);
		this.socket?.removeEventListener('error', this.onConnectionError);
		this.socket?.removeEventListener('close', this.onConnectionClose);
	}
}
