/** Mocked EventSource class to help testing */
export class MockEventSource extends EventTarget {
	constructor(
		public url: string = 'http://test.com',
		...args: unknown[]
	) {
		super();

		MockEventSource._instance = this;
		MockEventSource.init(url, ...args);
	}

	static init = vi.fn();

	static _instance: MockEventSource;

	static readonly CONNECTING = 0;

	static readonly OPEN = 1;

	static readonly CLOSED = 2;

	readyState: number = MockEventSource.CONNECTING;

	static getInstance() {
		return MockEventSource._instance;
	}

	simulateConnectionOpen() {
		this.readyState = MockEventSource.OPEN;
		this.dispatchEvent(new Event('open'));
	}

	/** Terminal failure: the browser gives up and closes the stream. */
	simulateConnectionClose() {
		this.readyState = MockEventSource.CLOSED;
		this.dispatchEvent(new Event('error'));
	}

	/** Transient failure: the browser reconnects on its own. */
	simulateTransientError() {
		this.readyState = MockEventSource.CONNECTING;
		this.dispatchEvent(new Event('error'));
	}

	simulateMessageEvent(data: string) {
		this.dispatchEvent(new MessageEvent('message', { data }));
	}

	close = vi.fn();
}
