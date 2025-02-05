import { AbstractPushClient, type PushClientOptions } from './AbstractPushClient';

export type EventSourceClientOptions = PushClientOptions;

export class EventSourceClient extends AbstractPushClient {
	private eventSource: EventSource | null = null;

	connect() {
		this.eventSource = new EventSource(this.url, { withCredentials: true });

		this.eventSource.addEventListener('open', this.onConnectionOpen);
		this.eventSource.addEventListener('message', this.handleMessageEvent);
		this.eventSource.addEventListener('error', this.onConnectionError);
	}

	disconnect() {
		super.disconnect();

		this.eventSource?.close();
		this.eventSource = null;
	}

	sendMessage() {
		// noop, not supported in EventSource
	}

	//#region Event handlers

	protected onConnectionOpen = () => {
		super.handleConnectEvent();
	};

	protected handleMessageEvent = (event: MessageEvent) => {
		super.handleMessageEvent(event);
	};

	protected onConnectionError = () => {
		// EventSource triggers an "error" event when the connection fails to open
		super.handleDisconnectEvent();
	};

	//#endregion Event handlers
}
