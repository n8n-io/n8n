/** Mocked EventSource class to help testing */
export class MockEventSource extends EventTarget {
	constructor(public url: string) {
		super();
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
