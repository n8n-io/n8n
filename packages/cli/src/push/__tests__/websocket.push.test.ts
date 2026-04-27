import { createHeartbeatMessage, type PushMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { EventEmitter } from 'events';
import type WebSocket from 'ws';

import { WebSocketPush } from '@/push/websocket.push';

jest.useFakeTimers();

class MockWebSocket extends EventEmitter {
	isAlive = true;

	ping = jest.fn();

	send = jest.fn();

	terminate = jest.fn();

	close = jest.fn();
}

const createMockWebSocket = () => new MockWebSocket() as unknown as jest.Mocked<WebSocket>;

describe('WebSocketPush', () => {
	const pushRef1 = 'test-session1';
	const pushRef2 = 'test-session2';
	const userId: User['id'] = 'test-user';
	const pushMessage: PushMessage = {
		type: 'executionRecovered',
		data: {
			executionId: 'test-execution-id',
		},
	};
	const expectedMsg = JSON.stringify({
		type: 'executionRecovered',
		data: {
			executionId: 'test-execution-id',
		},
	});

	mockInstance(Logger);
	const webSocketPush = Container.get(WebSocketPush);
	const mockWebSocket1 = createMockWebSocket();
	const mockWebSocket2 = createMockWebSocket();

	beforeEach(() => {
		jest.resetAllMocks();
		mockWebSocket1.removeAllListeners();
		mockWebSocket2.removeAllListeners();
	});

	it('can add a connection', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);

		expect(mockWebSocket1.listenerCount('close')).toBe(1);
		expect(mockWebSocket1.listenerCount('pong')).toBe(1);
		expect(mockWebSocket1.listenerCount('message')).toBe(1);
	});

	it('closes a connection', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);

		mockWebSocket1.emit('close');

		expect(mockWebSocket1.listenerCount('message')).toBe(0);
		expect(mockWebSocket1.listenerCount('close')).toBe(0);
		expect(mockWebSocket1.listenerCount('pong')).toBe(0);
	});

	it('sends data to one connection', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		webSocketPush.sendToOne(pushMessage, pushRef1);

		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(mockWebSocket2.send).not.toHaveBeenCalled();
	});

	it('sends data to all connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		webSocketPush.sendToAll(pushMessage);

		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(mockWebSocket2.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
	});

	it('pings all connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		jest.runOnlyPendingTimers();

		expect(mockWebSocket1.ping).toHaveBeenCalled();
		expect(mockWebSocket2.ping).toHaveBeenCalled();
	});

	it('sends data to all users connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		webSocketPush.sendToUsers(pushMessage, [userId]);

		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(mockWebSocket2.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
	});

	it('skips sending when user has no connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.sendToUsers(pushMessage, ['nonexistent-user']);

		expect(mockWebSocket1.send).not.toHaveBeenCalled();
	});

	it('does not remove replaced connection when old connection closes', () => {
		const oldSocket = createMockWebSocket();
		const newSocket = createMockWebSocket();

		webSocketPush.add(pushRef1, userId, oldSocket);
		expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);

		// Second add with same pushRef replaces the connection and closes old one
		webSocketPush.add(pushRef1, userId, newSocket);

		// Old connection's close event fires — should NOT remove the new connection
		oldSocket.emit('close');
		expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);

		// New connection still works
		webSocketPush.sendToOne(pushMessage, pushRef1);
		expect(newSocket.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(oldSocket.send).not.toHaveBeenCalled();
	});

	it('emits message event when connection receives data', async () => {
		jest.useRealTimers();
		const mockOnMessageReceived = jest.fn();
		webSocketPush.on('message', mockOnMessageReceived);
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		const data = { test: 'data' };
		const buffer = Buffer.from(JSON.stringify(data));

		mockWebSocket1.emit('message', buffer);

		// Flush the event loop
		await new Promise(process.nextTick);

		expect(mockOnMessageReceived).toHaveBeenCalledWith({
			msg: data,
			pushRef: pushRef1,
			userId,
		});
	});

	it("emits doesn' emit message for client heartbeat", async () => {
		const mockOnMessageReceived = jest.fn();
		webSocketPush.on('message', mockOnMessageReceived);
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		const data = createHeartbeatMessage();
		const buffer = Buffer.from(JSON.stringify(data));

		mockWebSocket1.emit('message', buffer);

		// Flush the event loop
		await new Promise(process.nextTick);

		expect(mockOnMessageReceived).not.toHaveBeenCalled();
	});

	// GHC-7862: Regression tests for server disconnection issue
	describe('GHC-7862: Connection stability', () => {
		let isolatedWebSocketPush: WebSocketPush;

		beforeEach(() => {
			jest.useFakeTimers();
			// Create a fresh instance for each test to ensure clean timer state
			const logger = mockInstance(Logger);
			const errorReporter = { error: jest.fn() } as any;
			isolatedWebSocketPush = new WebSocketPush(logger, errorReporter);
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should not terminate connection that responds to pong within timeout', () => {
			const mockSocket = createMockWebSocket();
			isolatedWebSocketPush.add(pushRef1, userId, mockSocket);

			// First ping cycle - connection should remain alive
			jest.advanceTimersByTime(60_000);
			expect(mockSocket.ping).toHaveBeenCalledTimes(1);
			expect(mockSocket.isAlive).toBe(false);

			// Simulate pong response
			mockSocket.emit('pong');
			expect(mockSocket.isAlive).toBe(true);

			// Second ping cycle - connection should still be alive
			jest.advanceTimersByTime(60_000);
			expect(mockSocket.ping).toHaveBeenCalledTimes(2);
			expect(mockSocket.terminate).not.toHaveBeenCalled();
		});

		it('should terminate connection that fails to respond to pong', () => {
			const mockSocket = createMockWebSocket();
			isolatedWebSocketPush.add(pushRef1, userId, mockSocket);

			// First ping cycle
			jest.advanceTimersByTime(60_000);
			expect(mockSocket.ping).toHaveBeenCalledTimes(1);
			expect(mockSocket.isAlive).toBe(false);

			// No pong response - isAlive stays false

			// Second ping cycle - should terminate
			jest.advanceTimersByTime(60_000);
			expect(mockSocket.terminate).toHaveBeenCalledTimes(1);
			expect(mockSocket.ping).toHaveBeenCalledTimes(1); // Shouldn't ping after termination
		});

		it('should keep connection alive if pong handler is properly registered', () => {
			const mockSocket = createMockWebSocket();
			isolatedWebSocketPush.add(pushRef1, userId, mockSocket);

			// Verify pong handler is registered
			expect(mockSocket.listenerCount('pong')).toBe(1);

			// Run multiple ping/pong cycles
			for (let i = 0; i < 5; i++) {
				jest.advanceTimersByTime(60_000);
				mockSocket.emit('pong');
				expect(mockSocket.terminate).not.toHaveBeenCalled();
			}

			// Connection should still be alive
			expect(isolatedWebSocketPush.hasPushRef(pushRef1)).toBe(true);
		});

		it('should handle rapid reconnections without premature termination', () => {
			// Simulate the reported issue: connection drops every 2-3 seconds
			const mockSocket = createMockWebSocket();
			isolatedWebSocketPush.add(pushRef1, userId, mockSocket);

			// Before the first ping interval (60s), connection should remain stable
			jest.advanceTimersByTime(3_000);
			expect(mockSocket.terminate).not.toHaveBeenCalled();

			// Even without explicit pong, connection should not terminate
			// until the first ping happens at 60s
			jest.advanceTimersByTime(57_000); // Total: 60s
			expect(mockSocket.ping).toHaveBeenCalledTimes(1);

			// Simulate proper pong response
			mockSocket.emit('pong');

			// Connection should remain stable for another cycle
			jest.advanceTimersByTime(60_000);
			expect(mockSocket.terminate).not.toHaveBeenCalled();
		});

		it('should terminate connection after missed pong and not accept late pongs', () => {
			const mockSocket = createMockWebSocket();
			isolatedWebSocketPush.add(pushRef1, userId, mockSocket);

			// First ping - no pong response
			jest.advanceTimersByTime(60_000);
			expect(mockSocket.isAlive).toBe(false);
			// Don't emit pong

			// Connection should be terminated on second ping
			jest.advanceTimersByTime(60_000);
			expect(mockSocket.terminate).toHaveBeenCalledTimes(1);

			// Simulate the close event that follows termination
			mockSocket.emit('close');

			// Even if pong arrives late, connection is already terminated
			mockSocket.emit('pong');
			expect(isolatedWebSocketPush.hasPushRef(pushRef1)).toBe(false);
		});
	});
});
