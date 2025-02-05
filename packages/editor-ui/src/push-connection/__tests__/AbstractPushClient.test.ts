import { describe, test, vi, beforeEach, expect } from 'vitest';
import { AbstractPushClient } from '@/push-connection/AbstractPushClient';
import type { PushClientCallbacks, PushClientOptions } from '@/push-connection/AbstractPushClient';

export class TestPushClient extends AbstractPushClient {
	connect(): void {}

	sendMessage(): void {}

	// Helper methods to expose protected methods for testing
	testHandleConnectEvent() {
		this.handleConnectEvent();
	}

	testHandleDisconnectEvent(code?: number) {
		this.handleDisconnectEvent(code);
	}

	testHandleErrorEvent(error: unknown) {
		this.handleErrorEvent(error);
	}

	testHandleMessageEvent(event: MessageEvent) {
		this.handleMessageEvent(event);
	}

	// Expose protected properties for testing
	getReconnectAttempts() {
		return this.reconnectAttempts;
	}

	setReconnectAttempts(value: number) {
		this.reconnectAttempts = value;
	}

	getReconnectTimer() {
		return this.reconnectTimer;
	}

	getUrl() {
		return this.url;
	}
}

describe('AbstractPushClient', () => {
	let client: TestPushClient;
	let callbacks: PushClientCallbacks;
	let options: PushClientOptions;

	beforeEach(() => {
		vi.useFakeTimers();
		callbacks = {
			onMessage: vi.fn(),
			onConnect: vi.fn(),
			onDisconnect: vi.fn(),
		};

		options = {
			url: 'http://localhost:5678',
			callbacks,
		};

		client = new TestPushClient(options);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('initialization', () => {
		test('should initialize with correct options', () => {
			expect(client.getUrl()).toBe(options.url);
			expect(client.getReconnectAttempts()).toBe(0);
			expect(client.getReconnectTimer()).toBeNull();
		});
	});

	describe('handleConnectEvent', () => {
		test('should reset reconnect attempts and call onConnect callback', () => {
			client.setReconnectAttempts(3);
			client.testHandleConnectEvent();

			expect(client.getReconnectAttempts()).toBe(0);
			expect(callbacks.onConnect).toHaveBeenCalled();
		});
	});

	describe('handleDisconnectEvent', () => {
		test('should call onDisconnect callback and schedule reconnect', () => {
			const consoleSpy = vi.spyOn(console, 'warn');
			client.testHandleDisconnectEvent(1006);

			expect(callbacks.onDisconnect).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith('[PushConnection] Connection lost, code=1006');
			expect(client.getReconnectTimer()).not.toBeNull();
		});

		test('should use exponential backoff for reconnect delay', async () => {
			const connectSpy = vi.spyOn(client, 'connect').mockImplementation(() => {
				client.testHandleDisconnectEvent();
			});

			client.testHandleDisconnectEvent();
			expect(client.getReconnectAttempts()).toBe(1);

			// First attempt: 1000ms
			vi.advanceTimersByTime(1000);
			expect(connectSpy).toHaveBeenCalledTimes(1);
			expect(client.getReconnectAttempts()).toBe(2);

			// Second attempt: 2000ms
			vi.advanceTimersByTime(2000);
			expect(connectSpy).toHaveBeenCalledTimes(2);
			expect(client.getReconnectAttempts()).toBe(3);

			// Third attempt: 4000ms
			vi.advanceTimersByTime(4000);
			expect(connectSpy).toHaveBeenCalledTimes(3);
			expect(client.getReconnectAttempts()).toBe(4);
		});

		test('should not exceed maximum reconnect delay', () => {
			// Set reconnect attempts high enough to exceed max delay
			client.setReconnectAttempts(10);
			const consoleSpy = vi.spyOn(console, 'info');

			client.testHandleDisconnectEvent();

			// Max delay should be 15000ms
			expect(consoleSpy).toHaveBeenCalledWith('[PushConnection] Reconnecting in 15 seconds...');
		});
	});

	describe('handleErrorEvent', () => {
		test('should log error to console', () => {
			const consoleSpy = vi.spyOn(console, 'error');
			const error = new Error('Test error');

			client.testHandleErrorEvent(error);

			expect(consoleSpy).toHaveBeenCalledWith('[PushConnection] Connection error:', error);
		});
	});

	describe('handleMessageEvent', () => {
		test('should call onMessage callback with event data', () => {
			const testData = { foo: 'bar' };
			const messageEvent = new MessageEvent('message', { data: testData });

			client.testHandleMessageEvent(messageEvent);

			expect(callbacks.onMessage).toHaveBeenCalledWith(testData);
		});
	});

	describe('disconnect', () => {
		test('should clear reconnect timer', () => {
			client.testHandleDisconnectEvent(); // This will set up a reconnect timer
			expect(client.getReconnectTimer()).not.toBeNull();

			client.disconnect();
			expect(client.getReconnectTimer()).toBeNull();
		});
	});
});
