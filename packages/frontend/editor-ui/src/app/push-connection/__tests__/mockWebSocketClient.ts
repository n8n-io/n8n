import { WebSocketState, type WebSocketStateType } from '@/app/push-connection/useWebSocketClient';

/** Mocked WebSocket class to help testing */
export class MockWebSocket extends WebSocket {
	readyState: WebSocketStateType = WebSocketState.CONNECTING;

	constructor(url: string) {
		super(url);

		MockWebSocket._instance = this;
		MockWebSocket.init(url);
	}

	static _instance: MockWebSocket;

	static getInstance() {
		return MockWebSocket._instance;
	}

	static init = vi.fn();

	simulateConnectionOpen() {
		this.dispatchEvent(new Event('open'));
		this.readyState = WebSocketState.OPEN;
	}

	simulateConnectionClose(code: number) {
		this.dispatchEvent(new CloseEvent('close', { code }));
		this.readyState = WebSocketState.CLOSED;
	}

	simulateMessageEvent(data: string) {
		this.dispatchEvent(new MessageEvent('message', { data }));
	}

	dispatchErrorEvent() {
		this.dispatchEvent(new Event('error'));
	}

	send = vi.fn();

	close = vi.fn();
}
