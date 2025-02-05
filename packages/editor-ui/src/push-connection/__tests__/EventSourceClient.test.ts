import { describe, test, vi, beforeEach, expect } from 'vitest';
import { EventSourceClient } from '../EventSourceClient';
import type { PushClientCallbacks, PushClientOptions } from '../AbstractPushClient';

/** Last created MockEventSource instance */
let lastEventSourceInstance: MockEventSource;

/** Mocked EventSource class to help testing */
class MockEventSource extends EventTarget {
	constructor(
		public url: string,
		public opts: EventSourceInit,
	) {
		super();

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		lastEventSourceInstance = this;
	}

	dispatchOpenEvent() {
		this.dispatchEvent(new Event('open'));
	}

	dispatchMessageEvent(data: string) {
		this.dispatchEvent(new MessageEvent('message', { data }));
	}

	dispatchErrorEvent() {
		this.dispatchEvent(new Event('error'));
	}

	close = vi.fn();
}

describe('EventSourceClient', () => {
	let client: EventSourceClient;
	let callbacks: PushClientCallbacks;
	let options: PushClientOptions;

	beforeEach(() => {
		// Mock global EventSource constructor
		global.EventSource = MockEventSource as unknown as typeof EventSource;

		callbacks = {
			onMessage: vi.fn(),
			onConnect: vi.fn(),
			onDisconnect: vi.fn(),
		};

		options = {
			url: 'http://localhost:5678/events',
			callbacks,
		};

		client = new EventSourceClient(options);
	});

	test('should initialize with correct options', () => {
		expect(client).toBeInstanceOf(EventSourceClient);
	});

	describe('connect', () => {
		test('should create EventSource with correct URL and options', () => {
			client.connect();

			expect(lastEventSourceInstance.url).toBe('http://localhost:5678/events');
			expect(lastEventSourceInstance.opts).toEqual({ withCredentials: true });
		});

		test('should trigger onConnect event when connection is opened', () => {
			client.connect();

			lastEventSourceInstance.dispatchOpenEvent();

			expect(callbacks.onConnect).toHaveBeenCalled();
		});
	});

	describe('onMessage', () => {
		test('should trigger onMessage event when a message is received', () => {
			client.connect();

			lastEventSourceInstance.dispatchMessageEvent('test');

			expect(callbacks.onMessage).toHaveBeenCalledWith('test');
		});
	});

	describe('disconnect', () => {
		test('should close EventSource connection', () => {
			client.connect();
			client.disconnect();

			expect(lastEventSourceInstance.close).toHaveBeenCalled();
			// @ts-expect-error - reconnectTimer is protected
			expect(client.reconnectTimer).toBeNull();
		});
	});

	describe('sendMessage', () => {
		test('should be a noop function', () => {
			expect(() => {
				client.sendMessage();
			}).not.toThrow();
		});
	});
});
