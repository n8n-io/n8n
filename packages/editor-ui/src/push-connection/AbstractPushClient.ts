export type PushClientCallbacks = {
	onMessage: (data: unknown) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
};

export type PushClientOptions = {
	url: string;
	callbacks: PushClientCallbacks;
};

/**
 * Abstract base class for push connection clients (WebSocket, EventSource)
 * Handles common functionality like connection management and reconnection logic
 */
export abstract class AbstractPushClient {
	protected readonly url: string;

	private readonly callbacks: PushClientCallbacks;

	protected reconnectAttempts = 0;

	/** Initial delay between reconnection attempts */
	protected readonly initialReconnectDelay = 1000;

	/** Maximum delay between reconnection attempts */
	protected readonly maxReconnectDelay = 15_000;

	protected reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(options: PushClientOptions) {
		this.url = options.url;
		this.callbacks = options.callbacks;
	}

	/** Connect to the push server */
	abstract connect(): void;

	abstract sendMessage(serializedMessage: string): void;

	/** Close the push connection */
	disconnect() {
		this.stopReconnectTimer();
	}

	/** Handle the connection being established */
	protected handleConnectEvent() {
		this.reconnectAttempts = 0; // Reset attempts on successful connection
		this.callbacks.onConnect?.();
	}

	/** Handle the connection being lost */
	protected handleDisconnectEvent(code?: number) {
		console.warn(`[PushConnection] Connection lost, code=${code ?? 'unknown'}`);
		this.callbacks.onDisconnect?.();
		this.scheduleReconnect();
	}

	/** Handle an error in the connection */
	protected handleErrorEvent(error: unknown) {
		console.error('[PushConnection] Connection error:', error);
	}

	/** Handle a message being received */
	protected handleMessageEvent(event: MessageEvent) {
		this.callbacks.onMessage(event.data);
	}

	private scheduleReconnect() {
		const delay = Math.min(
			this.initialReconnectDelay * 2 ** this.reconnectAttempts,
			this.maxReconnectDelay,
		);

		console.info(`[PushConnection] Reconnecting in ${delay / 1000} seconds...`);
		this.reconnectAttempts++;

		this.reconnectTimer = setTimeout(() => this.connect(), delay);
	}

	private stopReconnectTimer() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}
}
