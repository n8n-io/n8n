import type { PushClientCallbacks, PushClientOptions } from '@/push-connection/AbstractPushClient';
import { WebSocketClient } from '@/push-connection/WebSocketClient';

const WebSocketState = {
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3,
};

/** Mocked WebSocket class to help testing */
class MockWebSocket extends EventTarget {
	/** Last created MockWebSocket instance */
	static instance: MockWebSocket | null = null;

	static getInstance() {
		if (!MockWebSocket.instance) {
			throw new Error('No instance was created');
		}

		return MockWebSocket.instance;
	}

	static reset() {
		MockWebSocket.instance = null;
	}

	readyState: number = WebSocketState.CONNECTING;

	constructor(public url: string) {
		super();

		MockWebSocket.instance = this;
	}

	openConnection() {
		this.dispatchEvent(new Event('open'));
		this.readyState = WebSocketState.OPEN;
	}

	closeConnection(code: number) {
		this.dispatchEvent(new CloseEvent('close', { code }));
		this.readyState = WebSocketState.CLOSED;
	}

	dispatchMessageEvent(data: string) {
		this.dispatchEvent(new MessageEvent('message', { data }));
	}

	dispatchErrorEvent() {
		this.dispatchEvent(new Event('error'));
	}

	send = vi.fn();

	close = vi.fn();
}

/** Test class that extends WebSocketClient to expose protected methods */
class TestWebSocketClient extends WebSocketClient {
	getHeartbeatTimer() {
		return this.heartbeatTimer;
	}

	getReconnectTimer() {
		return this.reconnectTimer;
	}

	getSocket() {
		return this.socket;
	}

	getSocketOrFail() {
		if (!this.socket) {
			throw new Error('Socket is not initialized');
		}

		return this.socket;
	}
}

describe('WebSocketClient', () => {
	let client: TestWebSocketClient;
	let callbacks: PushClientCallbacks;
	let options: PushClientOptions;

	beforeEach(() => {
		vi.useFakeTimers();

		global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

		callbacks = {
			onMessage: vi.fn(),
			onConnect: vi.fn(),
			onDisconnect: vi.fn(),
		};

		options = {
			url: 'ws://test.com',
			callbacks,
		};

		client = new TestWebSocketClient(options);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
		MockWebSocket.reset();
	});

	describe('connect', () => {
		it('should establish websocket connection', () => {
			client.connect();
			expect(MockWebSocket.getInstance().url).toBe('ws://test.com');

			MockWebSocket.getInstance().openConnection();

			expect(callbacks.onConnect).toHaveBeenCalled();
		});
	});

	describe('sendMessage', () => {
		it('should send message when socket is open', () => {
			client.connect();
			MockWebSocket.getInstance().openConnection();

			client.sendMessage('test message');

			expect(client.getSocketOrFail().send).toHaveBeenCalledWith('test message');
		});

		test.each([[WebSocketState.CONNECTING], [WebSocketState.CLOSING], [WebSocketState.CLOSED]])(
			'should not send message when socket is %s',
			(state) => {
				client.connect();
				MockWebSocket.getInstance().readyState = state;

				client.sendMessage('test message');

				expect(MockWebSocket.getInstance().send).not.toHaveBeenCalled();
			},
		);
	});

	describe('heartbeat', () => {
		it('should start sending heartbeats after connection opens', () => {
			client.connect();
			MockWebSocket.getInstance().openConnection();

			expect(client.getHeartbeatTimer()).not.toBeNull();

			vi.advanceTimersByTime(30_000);

			expect(MockWebSocket.getInstance().send).toHaveBeenCalledWith(
				JSON.stringify({ type: 'heartbeat' }),
			);
		});

		it('should stop heartbeat when connection closes', () => {
			client.connect();
			MockWebSocket.getInstance().openConnection();

			vi.advanceTimersByTime(30_000);
			expect(MockWebSocket.getInstance().send).toHaveBeenCalledTimes(1);

			MockWebSocket.getInstance().closeConnection(1000);
			vi.advanceTimersByTime(30_000);

			// The reconnect timer creates a new WebSocket instance which has calls set to 0
			expect(MockWebSocket.getInstance().send).toHaveBeenCalledTimes(0);
		});
	});

	describe('disconnect', () => {
		it('should clean up connection and stop heartbeat', () => {
			client.connect();
			MockWebSocket.getInstance().openConnection();

			client.disconnect();

			expect(MockWebSocket.getInstance().close).toHaveBeenCalledWith(
				1000,
				'Client closed connection',
			);
			expect(client.getHeartbeatTimer()).toBeNull();
			expect(client.getReconnectTimer()).toBeNull();
		});
	});

	describe('event handling', () => {
		it('should handle incoming messages', () => {
			client.connect();
			MockWebSocket.getInstance().openConnection();
			MockWebSocket.getInstance().dispatchMessageEvent('test data');

			expect(callbacks.onMessage).toHaveBeenCalledWith('test data');
		});

		it('should handle connection close and reconnect', () => {
			const connectSpy = vi.spyOn(client, 'connect');
			client.connect();
			MockWebSocket.getInstance().closeConnection(1000);

			expect(callbacks.onDisconnect).toHaveBeenCalled();
			expect(client.getReconnectTimer()).not.toBeNull();

			vi.advanceTimersByTime(1000);
			expect(connectSpy).toHaveBeenCalledTimes(2);
		});
	});
});
