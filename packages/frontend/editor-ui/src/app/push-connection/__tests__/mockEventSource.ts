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

	static getInstance() {
		return MockEventSource._instance;
	}

	simulateConnectionOpen() {
		this.dispatchEvent(new Event('open'));
	}

	simulateConnectionClose() {
		this.dispatchEvent(new Event('close'));
	}

	simulateMessageEvent(data: string) {
		this.dispatchEvent(new MessageEvent('message', { data }));
	}

	close = vi.fn();
}
